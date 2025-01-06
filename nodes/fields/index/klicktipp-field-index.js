'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../../utils/objectToIdValueArray');

module.exports = function (RED) {
	const coreFunction = async function (msg) {
		const node = this;
		try {
			const response = await makeRequest('/field', 'GET', {}, msg.sessionData);

			handleResponse(
				node,
				msg,
				response,
				'klicktipp-field-index.status.success',
				'klicktipp-field-index.status.failed',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);
					msg.payload = transformedData;
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-field-index.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippFieldIndexNode - A Node-RED node to retrieve all contact fields for the logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of contact fields.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippFieldIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-field-index.error.missing-credentials',
			invalidCredentials: 'klicktipp-field-index.error.invalid-credentials',
			loginFailed: 'klicktipp-field-index.error.login-failed',
			requestFailed: 'klicktipp-field-index.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-field-index', KlickTippFieldIndexNode);
};
