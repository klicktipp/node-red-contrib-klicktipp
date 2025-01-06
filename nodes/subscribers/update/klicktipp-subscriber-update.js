'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const prepareUpdateSubscriberData = require('../../utils/transformers/prepareUpdateSubscriberData');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const { fields } = config;
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
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		if (!subscriberId) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-update.error.missing-subscriber-id',
				RED._('klicktipp-subscriber-update.error.missing-subscriber-id'),
			);
			return node.send(msg);
		}

		const data = prepareUpdateSubscriberData(newEmail, newSmsNumber, fields);

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'PUT',
				qs.stringify(data),
				msg.sessionData,
			);

			handleResponse(
				node,
				msg,
				response,
				'klicktipp-subscriber-update.status.success',
				'klicktipp-subscriber-update.status.failed',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-update.status.failed',
				error.message
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
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-update.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-update.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-update.error.login-failed',
			requestFailed: 'klicktipp-subscriber-update.error.request-failed',
		}
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-update', KlickTippSubscriberUpdateNode);
};
