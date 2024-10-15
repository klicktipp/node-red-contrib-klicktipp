'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');

module.exports = function (RED) {
	
	/**
	 * KlickTippTagIndexNode - A Node-RED node to get all manual tags of the logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
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
				const response = await makeRequest(
					'/tag',
					'GET',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

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
