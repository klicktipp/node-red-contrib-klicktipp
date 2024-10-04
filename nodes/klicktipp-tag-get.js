'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');

	/**
	 * KlickTippTagGetNode - A Node-RED node to get the definition of a specific tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the tag definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag ID is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = msg?.payload?.tagId || '';

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched tag definition',
					'Failed to fetch tag definition',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch tag definition', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag get', KlickTippTagGetNode);
};
