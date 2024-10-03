'use strict';

module.exports = function (RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');
	const validateSession = require('../utils/validateSession');
	const getSessionHeaders = require('../utils/getSessionHeaders');

	/**
	 * KlickTippTagIndexNode - A Node-RED node to get all manual tags of the logged-in user.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an associative array of `<tag id> => <tag name>`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/tag', 'GET', {}, getSessionHeaders(msg));

				handleResponse(
					node,
					msg,
					response,
					'Fetched manual tags',
					'Failed to fetch manual tags',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch manual tags', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag index', KlickTippTagIndexNode);
};
