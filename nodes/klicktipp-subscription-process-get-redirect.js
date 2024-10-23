'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('./utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		const listId = config.listId;

		if (!listId) {
			handleError(node, msg, 'Missing list ID ', 'Invalid input');
			return node.send(msg);
		}

		if (!email) {
			handleError(node, msg, 'Missing email', 'Invalid input');
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
				msg.sessionData,
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
	};

	/**
	 * KlickTippSubscriptionProcessRedirectNode - A Node-RED node to get the redirection URL for a given subscription process and email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
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

		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: '/klicktipp/subscription-process/get-redirect-node',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/list'),
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType(
		'klicktipp-subscription-process-get-redirect',
		KlickTippSubscriptionProcessRedirectNode,
	);
};
