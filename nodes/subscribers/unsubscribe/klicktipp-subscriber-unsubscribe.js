'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);

		if (!email) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-unsubscribe.error.missing-email',
				'klicktipp-subscriber-unsubscribe.error.missing-email'
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
			handleErrorWithI18n(
				node,
				msg,
				RED._('klicktipp-subscriber-unsubscribe.status.failed'),
				error
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
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-unsubscribe.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-unsubscribe.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-unsubscribe.error.login-failed',
			requestFailed: 'klicktipp-subscriber-unsubscribe.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}
	RED.nodes.registerType('klicktipp-subscriber-unsubscribe', KlickTippSubscriberUnsubscribeNode);
};
