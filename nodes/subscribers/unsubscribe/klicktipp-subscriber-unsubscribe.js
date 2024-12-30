'use strict';

const handleResponse = require('../../utils/handleResponse');
const handleError = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);

		if (!email) {
			handleError(
				node,
				msg,
				'klicktipp-subscriber-unsubscribe.error.missing-email',
				'klicktipp-subscriber-unsubscribe.error.invalid-input'
			);
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/unsubscribe',
				'POST',
				qs.stringify({ email }),
				msg.sessionData,
			);

			// Handle the response
			handleResponse(
				node,
				msg,
				response,
				'klicktipp-subscriber-unsubscribe.status.success',
				'klicktipp-subscriber-unsubscribe.status.failed',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				'klicktipp-subscriber-unsubscribe.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippUnsubscribeNode - A Node-RED node to unsubscribe an email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber to unsubscribe.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully unsubscribed.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberUnsubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}
	RED.nodes.registerType('klicktipp-subscriber-unsubscribe', KlickTippSubscriberUnsubscribeNode);
};
