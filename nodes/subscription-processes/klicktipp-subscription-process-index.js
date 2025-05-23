'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../utils/objectToIdValueArray');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const response = await makeRequest('/list', 'GET', {}, msg.sessionData);

			handleResponse(
				this,
				msg,
				response,
				'Opt-in processes retrieved',
				'Opt-in processes could not be retrieved',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);
					msg.payload = transformedData;
				},
			);
		} catch (error) {
			handleError(
				this,
				msg,
				'Opt-in processes could not be retrieved',
				error?.response?.data?.error || error.message,
			);
		}
	};

	/**
	 * KlickTippSubscriptionProcessIndexNode - A Node-RED node to get all subscription processes (lists) associated with the logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscription processes. Each element in the array contains:
	 *   - `listId`: The ID of the subscription list.
	 *   - `listName`: The name of the subscription list.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType(
		'klicktipp-subscription-process-index',
		KlickTippSubscriptionProcessIndexNode,
	);
};
