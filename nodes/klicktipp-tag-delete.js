'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const clearCache = require('./utils/cache/clearCache');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const { CACHE_DURATION_MS } = require('./utils/constants');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const tagId = config.tagId || msg?.payload?.tagId;

		if (!tagId) {
			handleError(this, msg, 'Missing tag ID', 'Invalid input');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/tag/${encodeURIComponent(tagId)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(this, msg, response, 'Tag deleted', 'Failed to delete tag', () => {
				msg.payload = { success: true };

				// Clear the cache after a successful delete
				clearCache(this, 'tagCache');
			});
		} catch (error) {
			handleError(this, msg, 'Failed to delete tag', error.message);
		}
	};

	/**
	 * KlickTippTagDeleteNode - A Node-RED node to delete a manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached tag data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
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
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: `/klicktipp/tags/${node.id}`,
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: CACHE_DURATION_MS,
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag'),
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-tag-delete', KlickTippTagDeleteNode);
};
