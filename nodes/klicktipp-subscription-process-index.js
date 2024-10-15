'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriptionProcessIndexNode - A Node-RED node to get all subscription processes (lists) associated with the logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscription processes. Each element in the array contains:
	 *   - `listId`: The ID of the subscription list.
	 *   - `listName`: The name of the subscription list.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/list',
					'GET',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched subscription processes',
					'Failed to fetch subscription processes',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscription processes', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType(
		'klicktipp subscription process index',
		KlickTippSubscriptionProcessIndexNode,
	);
};
