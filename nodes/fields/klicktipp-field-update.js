'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const clearCache = require('../utils/cache/clearCache');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const CACHE_KEYS = require('../utils/cache/cacheKeys');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		console.log({config});
		const fieldId = config.fieldId || msg?.payload?.fieldId;
		
		//Extract just field name, i.e. CompanyName
		const fieldName = fieldId.replace(/^field/, '');
		const name = await evaluatePropertyAsync(RED, config.fieldName, config.fieldNameType, node, msg);
		const category = await evaluatePropertyAsync(RED, config.fieldCategory, config.fieldCategoryType, node, msg);
		
		let fieldType;
		if (config.fieldDataTypeType === 'customFieldType') {
			fieldType = config.fieldDataTypeList;
		} else {
			fieldType = await evaluatePropertyAsync(RED, config.fieldDataType, config.fieldDataTypeType, node, msg);
		}
		
		let labels;
		if (config.fieldLabelType === 'customFieldLabel') {
			labels = config.fieldLabelsData;
		} else {
			labels = await evaluatePropertyAsync(RED, config.fieldLabel, config.fieldLabelType, node, msg);
		}
		
		// if (!name) {
		// 	handleError(node, msg, 'Missing field name');
		// 	return this.send(msg);
		// }
		
		if (!fieldName) {
			handleError(this, msg, 'Missing field ID', 'Invalid input');
			return this.send(msg);
		}
		
		// if (!fieldType) {
		// 	handleError(node, msg, 'Missing field type');
		// 	return this.send(msg);
		// }
		
		const data = {
			name,
			type: fieldType,
			category,
			metalabels: labels
		}
		
		try {
			const response = await makeRequest(
				`/field/${encodeURIComponent(fieldName)}`,
				'PUT',
				qs.stringify(data),
				msg.sessionData
			);

			handleResponse(node, msg, response, 'Field updated', 'Failed to update field', (response) => {
				const enhancedData = {
					id: response?.data?.[0] || null,
				};

				msg.payload = enhancedData;

				// Clear the cache after a successful delete
				clearCache(CACHE_KEYS.FIELDS);
			});
		} catch (error) {
			handleError(node, msg, 'Failed to update field', error.message);
		}
	};

	/**
	 * KlickTippFieldUpdateNode - A Node-RED node to update a field.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached field data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `name`: (Required) The name of the field to be created.
	 *   - `text`: (Optional) An additional description of the field.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains the array with ID of the newly created field.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the field name is missing, the node outputs `msg.error` with a "Missing field name" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippFieldUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-field-update', KlickTippFieldUpdateNode);
};
