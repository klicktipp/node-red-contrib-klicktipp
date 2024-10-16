'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareSubscriptionData = require('./utils/transformers/prepareCreateSubscriberData');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const { email, smsNumber, listId, tagId, fields } = config || msg.payload;

		if (!email) {
			handleError(this, msg, 'Missing email', 'Invalid input');
			return this.send(msg);
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
				this,
				msg,
				response,
				'Subscribed successfully',
				'Failed to subscribe',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to subscribe', error.message);
		}
	};

	function KlickTippSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/contact-fields',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'contactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/field')
		});

		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/tags',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag')
		});

		// Get the subscription process list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/subscription-process',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/list')
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp subscribe', KlickTippSubscribeNode);
};
