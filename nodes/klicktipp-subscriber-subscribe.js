'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareSubscriptionData = require('./utils/transformers/prepareCreateSubscriberData');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('./utils/evaluatePropertyAsync');
const getContactFields = require('./utils/getContactFields');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const { listId, tagId } = config;

		const fields = await getContactFields(RED, config, node, msg);
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		const smsNumber = await evaluatePropertyAsync(
			RED,
			config.smsNumber,
			config.smsNumberType,
			node,
			msg,
		);

		if (!email) {
			handleError(node, msg, 'Missing email', 'Invalid input');
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
				'Subscribed successfully',
				'Failed to subscribe',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(node, msg, 'Failed to subscribe', error.message);
		}
	};

	function KlickTippSubscriberSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);
		console.log({klicktippConfig});
		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: `/klicktipp/contact-fields/${node.id}`,
			permission: 'klicktipp.read',
			cacheContext: 'node',
			cacheKey: 'subscribeNodeContactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/field'),
		});

		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: `/klicktipp/tags/${node.id}`,
			permission: 'klicktipp.read',
			cacheContext: 'node',
			cacheKey: 'subscribeNodeTagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag'),
		});

		// Get the subscription process list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: `/klicktipp/subscription-processes/${node.id}`,
			permission: 'klicktipp.read',
			cacheContext: 'node',
			cacheKey: 'subscribeNodeCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/list'),
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-subscribe', KlickTippSubscriberSubscribeNode);
};
