'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');
	const qs = require('qs');

	/**
	 * KlickTippUntagEmailNode - A Node-RED node to untag an email.
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
	 *   - `tagId`: (Required) The ID of the manual tag to be removed from the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully untagged.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippUntagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', tagId = '' } = msg?.payload;

			if (!email || !tagId) {
				return handleError(node, msg, 'Missing email or tag ID', 'Invalid input: email or tagId');
			}

			try {
				const response = await makeRequest(
					'/subscriber/untag',
					'POST',
					qs.stringify({ email, tagid: tagId }),
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Email untagged successfully',
					'Failed to untag email',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to untag email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp untag email', KlickTippUntagEmailNode);
};
