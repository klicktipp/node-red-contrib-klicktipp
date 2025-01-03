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
		const autoresponderId = await evaluatePropertyAsync(
			RED,
			config.autoresponderId,
			config.autoresponderIdType,
			node,
			msg,
		);

		if (!email) {
			handleError(
				node,
				msg,
				'klicktipp-resend-autoresponder.error.missing-email',
				'klicktipp-resend-autoresponder.error.invalid-input'
			);
			return this.send(msg);
		}

		if (!autoresponderId) {
			handleError(
				node,
				msg,
				'klicktipp-resend-autoresponder.error.missing-autoresponder',
				'klicktipp-resend-autoresponder.error.invalid-input'
			);
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/resend',
				'POST',
				qs.stringify({ email, autoresponder: autoresponderId }),
				msg.sessionData,
			);

			// Handle the response
			handleResponse(
				node,
				msg,
				response,
				'klicktipp-resend-autoresponder.status.success',
				'klicktipp-resend-autoresponder.status.failed',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				'klicktipp-resend-autoresponder.status.failed',
				error.message
			);
		}
	};
	/**
	 * KlickTippResendAutoresponderNode - A Node-RED node to resend an autoresponder to an email address.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `autoresponder`: (Required) The ID of the autoresponder to resend.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the autoresponder was successfully resent.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or autoresponder ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippResendAutoresponderNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-resend-autoresponder.error.missing-credentials',
			invalidCredentials: 'klicktipp-resend-autoresponder.error.invalid-credentials',
			loginFailed: 'klicktipp-resend-autoresponder.error.login-failed',
			requestFailed: 'klicktipp-resend-autoresponder.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-resend-autoresponder', KlickTippResendAutoresponderNode);
};
