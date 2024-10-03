'use strict';

module.exports = function(RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');
	const validateSession = require('../utils/validateSession');
	const getSessionHeaders = require('../utils/getSessionHeaders');
	const qs = require('qs');
	
	/**
	 * KlickTippTagUpdateNode - A Node-RED node to update a manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be updated.
	 *   - `name`: (Optional) The new tag name. If not provided, it will remain unchanged.
	 *   - `text`: (Optional) The new tag description. If not provided, it will remain unchanged.
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
	 * - If no `tagId` is provided or neither `name` nor `text` are provided, the node outputs `msg.error` with a "Missing tag ID or nothing to update" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		node.on('input', async function (msg) {
			const { tagId, name, text } = msg.payload;
			
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			if (!tagId || (name === '' && text === '')) {
				handleError(node, msg, 'Missing tag ID or nothing to update');
				return node.send(msg);
			}
			
			try {
				const data = {
					...(name && { name }),
					...(text && { text }),
				};
				
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'PUT',
					qs.stringify(data),
					getSessionHeaders(msg),
				);
				
				handleResponse(node, msg, response, 'Tag updated', 'Failed to update tag', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Failed to update tag', error.message);
			}
			
			node.send(msg);
		});
	}
	
	RED.nodes.registerType('klicktipp tag update', KlickTippTagUpdateNode);
};