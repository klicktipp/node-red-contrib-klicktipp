'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const resolveSubscriberId = require('../utils/resolveSubscriberId');

module.exports = function (RED) {
	async function coreFunction(msg, config) {
		const node = this;

		const subscriberId = await resolveSubscriberId(RED, node, config, msg);
		if (!subscriberId) return node.send(msg);

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(node, msg, response, 'Contact deleted', 'Contact could not be deleted', () => {
				msg.payload = { success: true };
			});
		} catch (err) {
			handleError(
				node,
				msg,
				'Contact could not be deleted',
				err?.response?.data?.error || err.message,
			);
			msg.rawError = err;
			node.send(msg);
		}
	}

	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.identifierType`: How the contact should be found
	 *   - `id`: look up by contact ID (default).
	 *   - `email`: look up by email address
	 *
	 * - `msg.payload`: Expected object with the following properties
	 *   - `subscriberId`: (Required) Contact ID (when identifierType = "id").
	 *   - `emailAddress`: (Required) Email address (when identifierType = "email")
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `{ success: true }` indicating the subscriber was successfully deleted.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `{ success: false }`.
	 * - If the API request fails, the node outputs `msg.error` and returns `{ success: false }`.
	 */

	function KlickTippSubscriberDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-delete', KlickTippSubscriberDeleteNode);
};
