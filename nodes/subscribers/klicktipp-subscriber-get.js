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
			handleError(this, msg, 'Contact ID is missing', 'Invalid input');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'GET',
				{},
				msg.sessionData,
			);

			// Handle the response using handleResponse utility
			handleResponse(
				node,
				msg,
				response,
				'Contact information retrieved',
				'Contact information could not be retrieved',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				'Contact information could not be retrieved',
				error?.response?.data?.error || error.message,
			);
		}
	};
	/**
	 * KlickTippSubscriberGetNode - A Node-RED node to retrieve information for a specific subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `subscriberId`: (Required) The ID of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscriber.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-get', KlickTippSubscriberGetNode);
};
