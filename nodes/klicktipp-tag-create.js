'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const qs = require('qs');
const clearCache = require("./utils/cache/clearCache");

module.exports = function (RED) {
	
	/**
	 * KlickTippTagCreateNode - A Node-RED node to create a new manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached tag data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
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
			//tagName is used to avoid conflict with the Node-RED core name property
			const name = config.tagName || msg?.payload?.name;
			const text = config.tagDescription || msg?.payload?.text;

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
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(node, msg, response, 'Tag created', 'Failed to create tag', (response) => {
					msg.payload = response.data;
					
					// Clear the cache after a successful delete
					clearCache(node, 'tagCache');
				});
			} catch (error) {
				handleError(node, msg, 'Failed to create tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag create', KlickTippTagCreateNode);
};
