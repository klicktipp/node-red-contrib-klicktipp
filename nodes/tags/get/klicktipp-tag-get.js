'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const tagId = config.tagId || msg?.payload?.tagId;

		if (!tagId) {
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-tag-get.error.missing-tag',
				RED._('klicktipp-tag-get.error.missing-tag'),
			);
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				`/tag/${encodeURIComponent(tagId)}`,
				'GET',
				{},
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'klicktipp-tag-get.status.success',
				'klicktipp-tag-get.status.failed',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-tag-get.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippTagGetNode - A Node-RED node to get the definition of a specific tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `tagId`: (Required) The ID of the tag to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the tag definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag ID is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-tag-get.error.missing-credentials',
			invalidCredentials: 'klicktipp-tag-get.error.invalid-credentials',
			loginFailed: 'klicktipp-tag-get.error.login-failed',
			requestFailed: 'klicktipp-tag-get.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-tag-get', KlickTippTagGetNode);
};
