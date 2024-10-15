'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");
const clearCache = require("./utils/cache/clearCache");
const fetchKlickTippData = require("./utils/fetchKlickTippData");

module.exports = function (RED) {
	
	/**
	 * KlickTippTagDeleteNode - A Node-RED node to delete a manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached tag data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be deleted.
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
		
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);
		
		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/tags',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (req, res) => fetchKlickTippData(req, res, klicktippConfig, '/tag')
		});

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = config.tagId || msg?.payload?.tagId;

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'DELETE',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(node, msg, response, 'Tag deleted', 'Failed to delete tag', () => {
					msg.payload = { success: true };
					
					// Clear the cache after a successful delete
					clearCache(node, 'tagCache');
				});
			} catch (error) {
				handleError(node, msg, 'Failed to delete tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag delete', KlickTippTagDeleteNode);
};
