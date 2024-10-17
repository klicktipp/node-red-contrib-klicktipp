'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareSubscriptionData = require('./utils/transformers/prepareCreateSubscriberData');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require("./utils/evaluatePropertyAsync");
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const { listId, tagId, fields } = config;
		
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		const smsNumber = await evaluatePropertyAsync(RED, config.smsNumber, config.smsNumberType, node, msg);

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

	function KlickTippSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);

		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: '/klicktipp/subscribe/contact-fields',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscribeNodeContactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/field')
		});

		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: '/klicktipp/tags',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscribeNodetagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag')
		});

		// Get the subscription process list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: '/klicktipp/subscription-process',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscribeNodesubscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/list')
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp subscribe', KlickTippSubscribeNode);
};
