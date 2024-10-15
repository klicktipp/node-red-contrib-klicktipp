'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const prepareSubscriptionData = require('./utils/transformers/prepareCreateSubscriberData');
const qs = require('qs');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");
const fetchKlickTippData = require("./utils/fetchKlickTippData");

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscribeNode - A Node-RED node to subscribe an email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the recipient.
	 *   - `listId`: (Optional) The ID of the double opt-in process.
	 *   - `tagId`: (Optional) The ID of the tag with which your contacts are tagged.
	 *   - `fields`: (Optional) Additional data for the recipient (e.g., first name, address).
	 *   - `smsNumber`: (Optional) The SMS mobile number of the recipient.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing the subscriber data.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);
		
		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/contact-fields',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'contactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: () => fetchKlickTippData(klicktippConfig, '/field'),
		});
		
		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/tags',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: () => fetchKlickTippData(klicktippConfig, '/tag')
		});
		
		// Get the subscription process list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/subscription-process',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: () => fetchKlickTippData(klicktippConfig, '/list')
		});

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			const {
				email,
				smsNumber,
				listId,
				tagId,
				fields
			} = config || msg.payload;

			if (!email) {
				handleError(node, msg, 'Missing email or SMS number');
				return node.send(msg);
			}

			// Prepare data object and filter fields
			const data = prepareSubscriptionData(email, smsNumber, listId, tagId, fields);

			try {
				const response = await makeRequest(
					'/subscriber',
					'POST',
					qs.stringify(data),
					getSessionData(msg.sessionDataKey, node),
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

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscribe', KlickTippSubscribeNode);
};
