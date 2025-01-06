'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const listId = config.listId || msg?.payload?.listId;

		if (!listId) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscription-process-get.error.missing-list-id',
				RED._('klicktipp-subscription-process-get.error.missing-list-id')
			);
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/list/${encodeURIComponent(listId)}`,
				'GET',
				{},
				msg.sessionData,
			);

			handleResponse(
				node,
				msg,
				response,
				'klicktipp-subscription-process-get.status.success',
				'klicktipp-subscription-process-get.status.failed',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscription-process-get.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippSubscriptionProcessGetNode - A Node-RED node to get a specific subscription process by its ID for a logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `listId`: (Required) The ID of the subscription process (list) to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscription process (list) definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscription-process-get.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscription-process-get.error.invalid-credentials',
			loginFailed: 'klicktipp-subscription-process-get.error.login-failed',
			requestFailed: 'klicktipp-subscription-process-get.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscription-process-get', KlickTippSubscriptionProcessGetNode);
};
