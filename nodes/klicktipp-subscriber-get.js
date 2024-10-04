'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');

	/**
	 * KlickTippSubscriberGetNode - A Node-RED node to retrieve information for a specific subscriber.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscriber.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const subscriberId = msg?.payload?.subscriberId || '';

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
				);

				// Handle the response using handleResponse utility
				handleResponse(
					node,
					msg,
					response,
					'Fetched subscriber information',
					'Failed to fetch subscriber information',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber get', KlickTippSubscriberGetNode);
};
