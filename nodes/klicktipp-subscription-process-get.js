'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');

	/**
	 * KlickTippSubscriptionProcessGetNode - A Node-RED node to get a specific subscription process
	 * by its ID for a logged-in user. This node requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `listId`: (Required) The ID of the subscription process (list) to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscription process (list) definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const listId = msg?.payload?.listId || '';

			if (!listId) {
				handleError(node, msg, 'Missing list ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/list/${encodeURIComponent(listId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched subscription process',
					'Failed to fetch subscription process',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscription process', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscription process get', KlickTippSubscriptionProcessGetNode);
};
