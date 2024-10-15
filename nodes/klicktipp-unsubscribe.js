'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const qs = require('qs');

module.exports = function (RED) {

	/**
	 * KlickTippUnsubscribeNode - A Node-RED node to unsubscribe an email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber to unsubscribe.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully unsubscribed.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippUnsubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = config.email || msg?.payload?.email;

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				return handleError(node, msg, 'Missing email');
			}

			try {
				const response = await makeRequest(
					'/subscriber/unsubscribe',
					'POST',
					qs.stringify({ email }),
					getSessionData(msg.sessionDataKey, node),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Unsubscribed successfully',
					'Failed to unsubscribe',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to unsubscribe', error.message);
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp unsubscribe', KlickTippUnsubscribeNode);
};
