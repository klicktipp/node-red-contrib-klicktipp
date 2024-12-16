'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../utils/objectToIdValueArray');
const evaluatePropertyAsync = require("../utils/evaluatePropertyAsync");

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const fieldId = config.fieldId || msg?.payload?.fieldId;
			
			//Extract just field name, i.e. CompanyName
			const fieldName = fieldId.replace(/^field/, '');
			
			if (!fieldName) {
				handleError(this, msg, 'Missing field ID', 'Invalid input');
				return this.send(msg);
			}
			
			const response = await makeRequest(
				`/field/${encodeURIComponent(fieldName)}`,
				'GET',
				{},
				msg.sessionData,
			);
			
			handleResponse(
				this,
				msg,
				response,
				'Fetched field definition',
				'Failed to fetch field data',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			console.log(error);
			handleError(this, msg, 'Failed to fetch field data', error.message);
		}
	};

	/**
	 * KlickTippFieldGetNode - A Node-RED node to retrieve all contact fields for the logged-in user.
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
	function KlickTippFieldGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-field-get', KlickTippFieldGetNode);
};
