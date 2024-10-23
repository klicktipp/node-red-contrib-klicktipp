'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
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
				'GET',
				{},
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'Fetched tag definition',
				'Failed to fetch tag definition',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to fetch tag definition', error.message);
		}
	};

	/**
	 * KlickTippTagGetNode - A Node-RED node to get the definition of a specific tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `tagId`: (Required) The ID of the tag to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the tag definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag ID is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);

		// Get the tag list for display in Node UI
		createCachedApiEndpoint(RED, node, klicktippConfig, {
			endpoint: '/klicktipp/tags/get-tag-node',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'tagCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/tag'),
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp tag get', KlickTippTagGetNode);
};
