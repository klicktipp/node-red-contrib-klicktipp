'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const clearCache = require('./utils/cache/clearCache');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const tagId = config.tagId || msg?.payload?.tagId;
		//tagName is used to avoid conflict with the Node-RED core name property
		const name = config.tagName || msg?.payload?.name;
		const text = config.tagDescription || msg?.payload?.text;
		
		if (!tagId) {
			handleError(this, msg, 'Missing tag ID', 'Invalid input');
			return this.send(msg);
		}

		if (name === '' && text === '') {
			handleError(this, msg, 'Nothing to update', 'Invalid input');
			return this.send(msg);
		}

		try {
			const updatedTagData = {
				...(name && { name }), // Only include 'name' if it has a value
				...(text && { text }), // Only include 'text' if it has a value
			};

			const response = await makeRequest(
				`/tag/${encodeURIComponent(tagId)}`,
				'PUT',
				qs.stringify(updatedTagData),
				msg.sessionData,
			);

			handleResponse(node, msg, response, 'Tag updated', 'Failed to update tag', () => {
				msg.payload = { success: true };

				// Clear the cache after a successful update
				clearCache(this, 'tagCache');
			});
		} catch (error) {
			handleError(this, msg, 'Failed to update tag', error.message);
		}
	};

	/**
	 * KlickTippTagUpdateNode - A Node-RED node to update a manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be updated.
	 *   - `name`: (Optional) The new tag name. If not provided, it will remain unchanged.
	 *   - `text`: (Optional) The new tag description. If not provided, it will remain unchanged.
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

		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/tags',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag')
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp tag update', KlickTippTagUpdateNode);
};
