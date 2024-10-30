'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');

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
				'GET',
				{},
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'Fetched opt-in process',
				'Failed to fetch opt-in process',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to fetch opt-in process', error.message);
		}
	};

	/**
	 * KlickTippSubscriptionProcessGetNode - A Node-RED node to get a specific subscription process by its ID for a logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `listId`: (Required) The ID of the subscription process (list) to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscription process (list) definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscription-process-get', KlickTippSubscriptionProcessGetNode);
};
