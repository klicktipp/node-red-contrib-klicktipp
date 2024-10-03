'use strict';

module.exports = function (RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');
	const validateSession = require('../utils/validateSession');
	const getSessionHeaders = require('../utils/getSessionHeaders');
	const qs = require('qs');

	/**
	 * KlickTippTagCreateNode - A Node-RED node to create a new manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `name`: (Required) The name of the tag to be created.
	 *   - `text`: (Optional) An additional description of the tag.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains the array with ID of the newly created tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag name is missing, the node outputs `msg.error` with a "Missing tag name" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagCreateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { name = '', text = '' } = msg?.payload;

			if (!name) {
				handleError(node, msg, 'Missing tag name');
				return node.send(msg);
			}

			try {
				const data = {
					name,
				};

				if (text) {
					data.text = text;
				}

				const response = await makeRequest(
					'/tag',
					'POST',
					qs.stringify(data),
					getSessionHeaders(msg),
				);

				handleResponse(node, msg, response, 'Tag created', 'Failed to create tag', (response) => {
					msg.payload = response.data;
				});
			} catch (error) {
				handleError(node, msg, 'Failed to create tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag create', KlickTippTagCreateNode);
};
