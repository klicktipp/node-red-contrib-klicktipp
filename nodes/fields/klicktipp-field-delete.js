'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const clearCache = require('../utils/cache/clearCache');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const CACHE_KEYS = require('../utils/cache/cacheKeys');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const fieldId = config.fieldId || msg?.payload?.fieldId;
		
		//Extract just field name, i.e. CompanyName
		const fieldName = fieldId.replace(/^field/, '');
		
		if (!fieldName) {
			handleError(this, msg, 'Missing field ID', 'Invalid input');
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/field/${encodeURIComponent(fieldName)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(this, msg, response, 'Field deleted', 'Failed to delete field', () => {
				msg.payload = {
					success: true
				};

				// Clear the cache after a successful delete
				clearCache(CACHE_KEYS.FIELDS);
			});
		} catch (error) {
			handleError(this, msg, 'Failed to delete field', error.message);
		}
	};

	/**
	 * KlickTippFieldDeleteNode - A Node-RED node to delete a field.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached field data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `fieldId`: (Required) The ID of the field to be deleted.
	 * Outputs:
	 * - `msg.payload`: On success, contains `{ success: true }`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `fieldId` is missing, the node outputs `msg.error` with a "Missing field ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippFieldDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-field-delete', KlickTippFieldDeleteNode);
};
