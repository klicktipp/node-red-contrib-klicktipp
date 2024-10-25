'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const { CACHE_DURATION_MS } = require('./utils/constants');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const tagId = config.tagId || msg?.payload?.tagId;

		if (!tagId) {
			handleError(this, msg, 'Missing tag ID');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/tagged',
				'POST',
				qs.stringify({ tagid: tagId }),
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'Subscribers tagged retrieved',
				'Failed to retrieve tagged subscribers',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(node, msg, 'Failed to retrieve tagged subscribers', error.message);
		}
	};

	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all active subscribers tagged with a specific tag ID.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `tagId`: (Required) The ID of the tag used to filter subscribers.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscribers tagged with the given tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberTaggedNode(config) {
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

	RED.nodes.registerType('klicktipp-subscriber-tagged', KlickTippSubscriberTaggedNode);
};
