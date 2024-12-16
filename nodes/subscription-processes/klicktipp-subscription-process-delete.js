'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const clearCache = require("../utils/cache/clearCache");
const CACHE_KEYS = require("../utils/cache/cacheKeys");

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const listId = config.listId || msg?.payload?.listId;

		if (!listId) {
			handleError(this, msg, 'Missing opt-in ID');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/list/${encodeURIComponent(listId)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'Deleted opt-in process',
				'Failed to delete opt-in process',
				() => {
					msg.payload = { success: true };
					
					// Clear the cache after a successful delete
					clearCache(CACHE_KEYS.OPT_IN_PROCESSES);
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to delete opt-in process', error.message);
		}
	};

	/**
	 * KlickTippSubscriptionProcessDeleteNode - A Node-RED node to delete a specific subscription process by its ID for a logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `listId`: (Required) The ID of the subscription process (list) to delete.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains `{ success: true }`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscription-process-delete', KlickTippSubscriptionProcessDeleteNode);
};
