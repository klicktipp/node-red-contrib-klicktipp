'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		if (!subscriberId) {
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-subscriber-get.error.missing-subscriber-id',
				RED._('klicktipp-subscriber-get.error.missing-subscriber-id'),
			);
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'GET',
				{},
				msg.sessionData,
			);

			// Handle the response using handleResponse utility
			handleResponse(
				node,
				msg,
				response,
				'klicktipp-subscriber-get.status.success',
				'klicktipp-subscriber-get.status.failed',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-get.status.failed',
				error.message
			);
		}
	};
	/**
	 * KlickTippSubscriberGetNode - A Node-RED node to retrieve information for a specific subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `subscriberId`: (Required) The ID of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscriber.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-get.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-get.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-get.error.login-failed',
			requestFailed: 'klicktipp-subscriber-get.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-get', KlickTippSubscriberGetNode);
};
