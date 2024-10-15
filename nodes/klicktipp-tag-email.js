'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const qs = require('qs');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");
const fetchKlickTippData = require("./utils/fetchKlickTippData");


module.exports = function (RED) {

	/**
	 * KlickTippTagEmailNode - A Node-RED node to tag an email with one or more tags.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagIds`: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: An object containing `success: true`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag IDs are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagEmailNode(config) {
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

			const email = config.email || msg?.payload?.email;
			let tagIds = config.tagId || msg?.payload?.tagIds;
			console.log({tagIds})
			if (!email || !Array.isArray(tagIds)) {
				return handleError(node, msg, 'Missing email or tag IDs', 'Invalid input: email or tagIds');
			}

			// Ensure tagIds is an array, even if a single tagId is provided
			if (typeof tagIds === 'number') {
				tagIds = [tagIds];
			}

			try {
				const response = await makeRequest(
					'/subscriber/tag',
					'POST',
					qs.stringify({
						email,
						tagids: tagIds,
					}),
					getSessionData(msg.sessionDataKey, node),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Email tagged successfully',
					'Failed to tag email',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to tag email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag email', KlickTippTagEmailNode);
};
