'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../../utils/objectToIdValueArray');

module.exports = function (RED) {
	const coreFunction = async function (msg) {
		try {
			const response = await makeRequest('/subscriber', 'GET', {}, msg.sessionData);

			handleResponse(
				this,
				msg,
				response,
				'klicktipp-subscriber-index.status.success',
				'klicktipp-subscriber-index.status.failed',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);
					msg.payload = transformedData;
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-subscriber-index.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippSubscriberIndexNode - A Node-RED node to retrieve all active subscribers.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscriber IDs.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-index.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-index.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-index.error.login-failed',
			requestFailed: 'klicktipp-subscriber-index.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-index', KlickTippSubscriberIndexNode);
};
