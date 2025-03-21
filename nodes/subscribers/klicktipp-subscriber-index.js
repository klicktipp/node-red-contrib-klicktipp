'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../utils/objectToIdValueArray');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const response = await makeRequest('/subscriber', 'GET', {}, msg.sessionData);

			handleResponse(
				this,
				msg,
				response,
				'Contacts retrieved',
				'Contacts could not be retrieved',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);
					msg.payload = transformedData;
				},
			);
		} catch (error) {
			handleError(this, msg, 'Contacts could not be retrieved', error.message);
		}
	};

	/**
	 * KlickTippSubscriberIndexNode - A Node-RED node to retrieve all active subscribers.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscriber IDs.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-index', KlickTippSubscriberIndexNode);
};
