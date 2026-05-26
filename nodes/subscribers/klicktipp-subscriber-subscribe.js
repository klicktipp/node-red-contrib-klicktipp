'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareSubscriptionData = require('../utils/transformers/prepareCreateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
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
			: config.tagId || msg?.payload?.tagId;

		tagId = tagId !== undefined ? Number(tagId) : undefined;

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
		const data = prepareSubscriptionData(email, smsNumber, listId, tagId, fields);

		try {
			const response = await makeRequest(
				'/subscriber',
				'POST',
				qs.stringify(data),
				msg.sessionData,
			);

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
