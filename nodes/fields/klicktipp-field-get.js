'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const apiFieldId = config.manualFieldEnabled
				? config.manualApiFieldId || msg?.payload?.manualApiFieldId
				: config.apiFieldId || msg?.payload?.apiFieldId;

			if (!apiFieldId) {
				handleError(this, msg, 'Data field ID is required', 'Invalid input');
				return this.send(msg);
			}

			//Extract field ID, i.e. CompanyName
			const fieldId = apiFieldId.replace(/^field/, '');

			if (!fieldId) {
				handleError(this, msg, 'No data field ID found', 'Invalid input');
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
				'Data field retrieved',
				'Data field could not be retrieved',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(this, msg, 'Data field could not be retrieved', error?.response?.data?.error || error.message);
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
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-field-get', KlickTippFieldGetNode);
};
