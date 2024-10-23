'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');
const prepareUpdateSubscriberData = require('./utils/prepareUpdateSubscriberData');
const extractUpdateSubscriberFields = require('./utils/extractUpdateSubscriberFields');
const qs = require('qs');

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber to update.
	 *   - `fields` (Optional): Fields of the subscriber to update. See validContactFieldList variable
	 *   - `newEmail` (Optional): The new email address of the subscriber.
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

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			const {
				subscriberId,
				fields,
				newEmail,
				newSmsNumber
			} = extractUpdateSubscriberFields(config, msg.payload);

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			const data = prepareUpdateSubscriberData(newEmail, newSmsNumber, fields);

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'PUT',
					qs.stringify(data),
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber updated',
					'Failed to update subscriber',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to update subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber update', KlickTippSubscriberUpdateNode);
};
