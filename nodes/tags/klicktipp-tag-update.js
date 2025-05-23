'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const clearCache = require('../utils/cache/clearCache');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const CACHE_KEYS = require('../utils/cache/cacheKeys');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const tagId = config.manualFieldEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagId;
		const name = await evaluatePropertyAsync(RED, config.tagName, config.tagNameType, node, msg);
		const text = await evaluatePropertyAsync(
			RED,
			config.tagDescription,
			config.tagDescriptionType,
			node,
			msg,
		);

		if (!tagId) {
			handleError(node, msg, 'Tag ID is missing', 'Invalid input');
			return this.send(msg);
		}

		if (name === '' && text === '') {
			handleError(node, msg, 'No changes detected', 'Invalid input');
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

			handleResponse(node, msg, response, 'Tag updated', 'Tag could not be updated', () => {
				msg.payload = { success: true };

				// Clear the cache after a successful update
				clearCache(CACHE_KEYS.TAGS);
			});
		} catch (error) {
			handleError(
				node,
				msg,
				'Tag could not be updated',
				error?.response?.data?.error || error.message,
			);
		}
	};

	/**
	 * KlickTippTagUpdateNode - A Node-RED node to update a manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
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

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-tag-update', KlickTippTagUpdateNode);
};
