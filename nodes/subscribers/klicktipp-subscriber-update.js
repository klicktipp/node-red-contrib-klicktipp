'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareUpdateSubscriberData = require('../utils/transformers/prepareUpdateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
const resolveSubscriberId = require('../utils/resolveSubscriberId');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const subscriberId = await resolveSubscriberId(RED, node, config, msg);
		if (!subscriberId) return node.send(msg);

		// gather update data
		const newEmailAddress = await evaluatePropertyAsync(
			RED,
			config.newEmailAddress,
			config.newEmailAddressType,
			node,
			msg,
		);
		const newSmsNumber = await evaluatePropertyAsync(
			RED,
			config.newSmsNumber,
			config.newSmsNumberType,
			node,
			msg,
		);
		const fields = await getContactFields(RED, config, node, msg);

		const data = prepareUpdateSubscriberData(newEmailAddress, newSmsNumber, fields);

		// update request
		try {
			const resp = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'PUT',
				qs.stringify(data),
				msg.sessionData,
			);

			handleResponse(node, msg, resp, 'Contact updated', 'Contact could not be updated', () => {
				msg.payload = { success: true };
			});
		} catch (err) {
			handleError(
				node,
				msg,
				'Contact could not be updated',
				err?.response?.data?.error || err.message,
			);
		}
	};

	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
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
	 *   - `subscriberId`: (Required) The ID of the subscriber to update.
	 *   - `fields` (Optional): Fields of the subscriber to update.
	 *   - `newEmailAddress` (Optional): The new email address of the subscriber.
	 *   - `newSmsNumber` (Optional): The new SMS number of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object with `success: true` indicating the subscriber was successfully updated.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-update', KlickTippSubscriberUpdateNode);
};
