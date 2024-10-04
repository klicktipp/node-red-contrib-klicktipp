'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');
	const qs = require('qs');

	/**
	 * KlickTippTagEmailNode - A Node-RED node to tag an email with one or more tags.
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
	 *   - `tagIds`: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the response from the KlickTipp API.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag IDs are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			let { email = '', tagIds = [] } = msg?.payload;

			if (!email || !Array.isArray(tagIds)) {
				return handleError(node, msg, 'Missing email or tag IDs', 'Invalid input: email or tagIds');
			}

			// Ensure tagIds is an array, even if a single tagId is provided
			if (typeof tagIds === 'number') {
				tagIds = [tagIds];
			}

			try {
				const response = await makeRequest(
					'/subscriber/tag',
					'POST',
					qs.stringify({
						email,
						tagids: tagIds,
					}),
					getSessionHeaders(msg),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Email tagged successfully',
					'Failed to tag email',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to tag email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag email', KlickTippTagEmailNode);
};
