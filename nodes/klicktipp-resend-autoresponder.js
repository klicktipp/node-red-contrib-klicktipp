'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const email = config.email || msg.payload?.email;
		const autoresponder = config.autoresponder || msg.payload?.autoresponder;
		
		if (!email) {
			handleError(this, msg, 'Missing email', 'Invalid input');
			return this.send(msg);
		}
		
		if (!autoresponder) {
			handleError(this, msg, 'Missing autoresponder ID', 'Invalid input');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/resend',
				'POST',
				qs.stringify({ email, autoresponder }),
				msg.sessionData,
			);

			// Handle the response
			handleResponse(
				this,
				msg,
				response,
				'Autoresponder resent successfully',
				'Failed to resend autoresponder',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to resend autoresponder', error.message);
		}
	};
	/**
	 * KlickTippResendAutoresponderNode - A Node-RED node to resend an autoresponder to an email address.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
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
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp resend autoresponder', KlickTippResendAutoresponderNode);
};
