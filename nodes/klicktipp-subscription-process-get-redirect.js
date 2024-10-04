'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');
	const qs = require('qs');

	/**
	 * KlickTippSubscriptionProcessRedirectNode - A Node-RED node to get the redirection URL for a given
	 * subscription process and email. This node requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
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

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', listId = '' } = msg?.payload;

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
					getSessionHeaders(msg),
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
