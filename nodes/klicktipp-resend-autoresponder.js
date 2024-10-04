'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionData = require('./utils/getSessionData');
	const qs = require('qs');

	/**
	 * KlickTippResendAutoresponderNode - A Node-RED node to resend an autoresponder to an email address.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `autoresponder`: (Required) The ID of the autoresponder to resend.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the autoresponder was successfully resent.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or autoresponder ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippResendAutoresponderNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', autoresponder = '' } = msg?.payload;

			if (!email || !autoresponder) {
				return handleError(node, msg, 'Missing email or autoresponder ID', 'Invalid input');
			}

			try {
				const response = await makeRequest(
					'/subscriber/resend',
					'POST',
					qs.stringify({ email, autoresponder }),
					getSessionData(msg.sessionDataKey, node),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Autoresponder resent successfully',
					'Failed to resend autoresponder',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to resend autoresponder', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp resend autoresponder', KlickTippResendAutoresponderNode);
};
