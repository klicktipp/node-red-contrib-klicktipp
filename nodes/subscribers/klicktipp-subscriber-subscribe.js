'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareSubscriptionData = require('../utils/transformers/prepareCreateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
const resolveTagIdsInput = require('../utils/resolveTagIdsInput');
const { runWithSession } = require('../utils/klickTippSessionManager');
const getErrorMessage = require('../utils/getErrorMessage');
const adjustErrorMessage = require('../utils/adjustErrorMessage');

const qs = require('qs');

function isTagRelatedFailure(error) {
	const body = error?.response?.data ?? error?.response?.body ?? error?.body;
	const httpStatus = error?.response?.status;
	const apiError = typeof body?.error === 'number' ? body.error : null;

	return httpStatus === 406 && apiError === 403;
}

function formatTagFailure(error, tagId, action) {
	const body = error?.response?.data ?? error?.response?.body ?? error?.body;
	const httpStatus = error?.response?.status;
	const code = typeof body?.code === 'number' ? body.code : null;
	const message =
		typeof body?.error === 'number' ? adjustErrorMessage(body.error, code) : getErrorMessage(error);

	return `Failed to ${action} contact with tag ID "${tagId}".${httpStatus ? ` [${httpStatus}]` : ''} ${message}`;
}

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		let listId = config.manualListEnabled
			? config.manualListId || msg?.payload?.manualListId
			: config.listId || msg?.payload?.listId;

		listId = listId !== undefined ? Number(listId) : undefined;

		const tagIds = resolveTagIdsInput(config, msg, {
			manualEnabledKey: 'manualTagEnabled',
		});
		const primaryTagId = tagIds[0];

		const fields = await getContactFields(RED, config, node, msg);
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		const smsNumber = await evaluatePropertyAsync(
			RED,
			config.smsNumber,
			config.smsNumberType,
			node,
			msg,
		);
		// Ensure at least one parameter (email or phone number) is provided
		if (!email && !smsNumber) {
			handleError(node, msg, 'Email or SMS number is missing', 'Invalid input');
			return node.send(msg);
		}

		// Prepare data object and filter fields
		const data = prepareSubscriptionData(email, smsNumber, listId, primaryTagId, fields);
		const isSmsOnly = !String(email || '').trim() && Boolean(smsNumber);

		const createOrUpdateContact = async (payload) =>
			makeRequest('/subscriber', 'POST', qs.stringify(payload), msg.sessionData);

		const tagContact = async (emailAddress, remainingTagIds) =>
			makeRequest(
				'/subscriber/tag',
				'POST',
				qs.stringify({
					email: emailAddress,
					tagids: remainingTagIds,
				}),
				msg.sessionData,
			);

		const getContact = async (emailAddress) => {
			const searchResponse = await makeRequest(
				'/subscriber/search',
				'POST',
				{ email: emailAddress },
				msg.sessionData,
			);
			const searchBody = searchResponse?.data ?? searchResponse;
			const subscriberId = Array.isArray(searchBody) && searchBody.length ? searchBody[0] : null;

			if (!subscriberId) {
				throw new Error('Contact ID could not be retrieved after tagging');
			}

			return makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'GET',
				{},
				msg.sessionData,
			);
		};

		try {
			let response;

			try {
				response = await createOrUpdateContact(data);
			} catch (error) {
				if (primaryTagId && isTagRelatedFailure(error)) {
					error.tagAwareMessage = formatTagFailure(error, primaryTagId, 'add or update');
				}
				throw error;
			}
			if (isSmsOnly && (!response || response.error)) {
				return handleResponse(
					node,
					msg,
					response,
					'Contact created',
					'Contact could not be created',
					undefined,
				);
			}

			if (tagIds.length > 1) {
				const remainingTagIds = tagIds.slice(1);
				const resolvedEmail = String(email || '').trim();

				if (resolvedEmail) {
					try {
						await tagContact(resolvedEmail, remainingTagIds);
					} catch (error) {
						if (isTagRelatedFailure(error)) {
							const failedTagId = remainingTagIds[0];
							error.tagAwareMessage = formatTagFailure(error, failedTagId, 'tag');
						}
						throw error;
					}
					const refreshedContact = await getContact(resolvedEmail);
					return handleResponse(
						node,
						msg,
						refreshedContact,
						'Contact created',
						'Contact could not be created',
						(refreshedResponse) => {
							msg.payload = refreshedResponse.data;
						},
					);
				}

				for (const extraTagId of remainingTagIds) {
					const fallbackData = prepareSubscriptionData('', smsNumber, undefined, extraTagId, {});
					try {
						response = await createOrUpdateContact(fallbackData);

						if (!response || response.error) {
							return handleResponse(
								node,
								msg,
								response,
								'Contact created',
								'Contact could not be created',
								undefined,
							);
						}
					} catch (error) {
						if (isTagRelatedFailure(error)) {
							error.tagAwareMessage = formatTagFailure(error, extraTagId, 'tag');
						}
						throw error;
					}
				}
			}

			handleResponse(
				node,
				msg,
				response,
				'Contact created',
				'Contact could not be created',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				undefined,
				error?.tagAwareMessage || error?.response?.data || error?.message,
			);
		}
	};

	function KlickTippSubscriberSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-subscribe', KlickTippSubscriberSubscribeNode);

	RED.httpAdmin.post(
		'/klicktipp/createTag',
		RED.auth.needsPermission('klicktipp.write'), // if no custom perm, use 'klicktipp.read'
		async function (req, res) {
			const { name, text } = req.body || {};
			if (!name) {
				return res.status(400).json({ error: 'Missing tag name' });
			}
			const configId = req.query.configId;
			if (!configId) {
				return res.status(500).json({ error: 'Missing config node id' });
			}
			const configNode = RED.nodes.getNode(configId);
			if (!configNode) {
				return res.status(500).json({ error: 'Invalid config node' });
			}
			const { username, password } = configNode.credentials || {};
			if (!username || !password) {
				return res.status(401).json({ error: 'Missing username or password in config node' });
			}

			try {
				const payload = { name: name };
				if (text && String(text).trim() !== '') {
					payload.text = text;
				}
				const response = await runWithSession(
					configNode,
					username,
					password,
					async (sessionData) => {
						return makeRequest('/tag', 'POST', qs.stringify(payload), sessionData);
					},
				);
				// Pass through API payload
				return res.json(response.data);
			} catch (err) {
				const msg =
					(err.response && err.response.data && err.response.data.error) ||
					err.message ||
					'Create tag failed';
				return res.status(err.response?.status || 500).json({ error: msg });
			}
		},
	);
};
