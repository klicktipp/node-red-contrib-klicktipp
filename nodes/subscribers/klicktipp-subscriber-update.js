'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareUpdateSubscriberData = require('../utils/transformers/prepareUpdateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		// determine ID
		let subscriberId;
		const mode =
			typeof msg.identifierType === 'string' ? msg.identifierType : config.identifierType || 'id';

		if (mode === 'email') {
			const emailAddress = await evaluatePropertyAsync(
				RED,
				config.emailAddress,
				config.emailAddressType,
				node,
				msg,
			);
			if (!emailAddress) {
				handleError(node, msg, 'Email address is missing', 'Invalid input');
				return node.send(msg);
			}
			try {
				const searchResp = await makeRequest(
					'/subscriber/search',
					'POST',
					{ email: emailAddress },
					msg.sessionData,
				);
				const body = searchResp?.data ?? searchResp;
				if (Array.isArray(body) && body.length) {
					subscriberId = body[0];
				} else {
					handleError(
						node,
						msg,
						'Contact ID could not be retrieved',
						'Request failed with status code 404',
					);
					return node.send(msg);
				}
			} catch (err) {
				handleError(
					node,
					msg,
					'Contact ID could not be retrieved',
					err?.response?.data?.error || err.message,
				);
				return node.send(msg);
			}
		} else {
			subscriberId = await evaluatePropertyAsync(
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
		}

		// gather update data
		const newEmail = await evaluatePropertyAsync(
			RED,
			config.newEmail,
			config.newEmailType,
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

		const data = prepareUpdateSubscriberData(newEmail, newSmsNumber, fields);

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
	 * - `msg.payload`: Expected object with the following properties
	 *   - `subscriberId`: (Required) The ID of the subscriber to update.
	 *   - `fields` (Optional): Fields of the subscriber to update.
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
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-update', KlickTippSubscriberUpdateNode);
};
