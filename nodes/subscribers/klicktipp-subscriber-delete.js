'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		if (!subscriberId) {
			handleError(node, msg, 'Contact ID is missing', 'Invalid input');
			return node.send(msg);
		}

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
		} catch (error) {
			handleError(node, msg, 'Contact could not be deleted', error.message);
		}
	};
	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `subscriberId`: (Required) The ID of the subscriber to delete.
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
