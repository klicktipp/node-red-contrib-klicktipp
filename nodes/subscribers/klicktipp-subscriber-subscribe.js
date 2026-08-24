'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareSubscriptionData = require('../utils/transformers/prepareCreateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
const normalizeTagIds = require('../utils/normalizeTagIds');
const { runWithSession } = require('../utils/klickTippSessionManager');

const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		let listId = config.manualListEnabled
			? config.manualListId || msg?.payload?.manualListId
			: config.listId || msg?.payload?.listId;

		listId = listId !== undefined ? Number(listId) : undefined;

		let tagId = config.manualTagEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: (config.tagId ?? msg?.payload?.tagIds ?? msg?.payload?.tagId);

		const tagIds = normalizeTagIds(tagId);
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
			let response = await createOrUpdateContact(data);

			if (tagIds.length > 1) {
				const remainingTagIds = tagIds.slice(1);
				const resolvedEmail = String(email || '').trim();

				if (resolvedEmail) {
					await tagContact(resolvedEmail, remainingTagIds);
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
					response = await createOrUpdateContact(fallbackData);
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
			handleError(node, msg, undefined, error?.response?.data || error?.message);
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
