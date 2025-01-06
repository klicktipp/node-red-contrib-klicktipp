'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const apiFieldId = config.apiFieldId || msg?.payload?.apiFieldId;
			
			if (!apiFieldId) {
				handleErrorWithI18n(
					this,
					msg,
					'klicktipp-field-get.error.missing-api-field',
					RED._('klicktipp-field-get.error.missing-api-field')
				);
				return this.send(msg);
			}
			
			//Extract field ID, i.e. CompanyName
			const fieldId = apiFieldId.replace(/^field/, '');
			
			if (!fieldId) {
				handleErrorWithI18n(
					this,
					msg,
					'klicktipp-field-get.error.missing-field-id',
					RED._('klicktipp-field-get.error.missing-field-id')
				);
				return this.send(msg);
			}
			
			const response = await makeRequest(
				`/field/${encodeURIComponent(fieldId)}`,
				'GET',
				{},
				msg.sessionData,
			);
			
			handleResponse(
				this,
				msg,
				response,
				'klicktipp-field-get.status.success',
				'klicktipp-field-get.status.failed',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			console.log(error);
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-field-get.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippFieldGetNode - A Node-RED node to get the definition of a specific custom field.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the custom field definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippFieldGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-field-get.error.missing-credentials',
			invalidCredentials: 'klicktipp-field-get.error.invalid-credentials',
			loginFailed: 'klicktipp-field-get.error.login-failed',
			requestFailed: 'klicktipp-field-get.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-field-get', KlickTippFieldGetNode);
};
