'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const qs = require('qs');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");
const fetchKlickTippData = require("./utils/fetchKlickTippData");

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriptionProcessRedirectNode - A Node-RED node to get the redirection URL for a given subscription process and email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `listId`: (Required) The ID of the subscription process (list).
	 *   - `email`: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, a string containing the redirection URL as defined in the subscription process.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` or `email` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessRedirectNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);
		
		// Get the subscription process list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/subscription-process',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (req, res) => fetchKlickTippData(req, res, klicktippConfig, '/list')
		});

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			const email = config.email || msg?.payload?.email;
			const listId = config.listId || msg?.payload?.listId;

			if (!listId || !email) {
				handleError(node, msg, 'Missing list ID or email');
				return node.send(msg);
			}

			try {
				const data = {
					listid: listId,
					email: email,
				};

				const response = await makeRequest(
					'/list/redirect',
					'POST',
					qs.stringify(data),
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched redirection URL',
					'Failed to fetch redirection URL',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch redirection URL', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType(
		'klicktipp subscription process redirect',
		KlickTippSubscriptionProcessRedirectNode,
	);
};
