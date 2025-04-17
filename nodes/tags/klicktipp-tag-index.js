'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../utils/objectToIdValueArray');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		try {
			const response = await makeRequest('/tag', 'GET', {}, msg.sessionData);

			handleResponse(
				this,
				msg,
				response,
				'Tags retrieved',
				'Tags could not be retrieved',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);
					msg.payload = transformedData;
				},
			);
		} catch (error) {
			handleError(
				this,
				msg,
				'Tags could not be retrieved',
				error?.response?.data?.error || error.message,
			);
		}
	};

	/**
	 * KlickTippTagIndexNode - A Node-RED node to get all manual tags of the logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 * Outputs:
	 * - `msg.payload`: On success, an associative array of `<tag id> => <tag name>`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-tag-index', KlickTippTagIndexNode);
};
