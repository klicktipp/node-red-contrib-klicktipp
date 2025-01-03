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
				'klicktipp-subscriber-search.error.missing-email',
				'klicktipp-subscriber-search.error.invalid-input'
			);
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/search',
				'POST',
				qs.stringify({ email }),
				msg.sessionData,
			);

			handleResponse(
				node,
				msg,
				response,
				'klicktipp-subscriber-search.status.success',
				'klicktipp-subscriber-search.status.failed',
				(response) => {
					const enhancedData = {
						id: response?.data?.[0] || null,
					};
					msg.payload = enhancedData;
				},
			);
		} catch (error) {
			handleError(node, msg, 'klicktipp-subscriber-search.status.failed', error.message);
		}
	};

	/**
	 * KlickTippSubscriberSearchNode - A Node-RED node to search for a subscriber by email and return the subscriber ID.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber to search for.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, the subscriber ID.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberSearchNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-search.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-search.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-search.error.login-failed',
			requestFailed: 'klicktipp-subscriber-search.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-search', KlickTippSubscriberSearchNode);
};
