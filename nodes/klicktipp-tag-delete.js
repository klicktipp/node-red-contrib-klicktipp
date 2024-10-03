'use strict';

module.exports = function(RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');
	const validateSession = require('../utils/validateSession');
	const getSessionHeaders = require('../utils/getSessionHeaders');
	
	/**
	 * KlickTippTagDeleteNode - A Node-RED node to delete a manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be deleted.
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains `{ success: true }`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `tagId` is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagDeleteNode(config) {
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
					'DELETE',
					{},
					getSessionHeaders(msg),
				);
				
				handleResponse(node, msg, response, 'Tag deleted', 'Failed to delete tag', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Failed to delete tag', error.message);
			}
			
			node.send(msg);
		});
	}
	
	RED.nodes.registerType('klicktipp tag delete', KlickTippTagDeleteNode);
};