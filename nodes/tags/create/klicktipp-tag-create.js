'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const clearCache = require('../../utils/cache/clearCache');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');
const CACHE_KEYS = require('../../utils/cache/cacheKeys');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		//tagName is used to avoid conflict with the Node-RED core name property
		const name = await evaluatePropertyAsync(RED, config.tagName, config.tagNameType, node, msg);
		const text = await evaluatePropertyAsync(
			RED,
			config.tagDescription,
			config.tagDescriptionType,
			node,
			msg,
		);

		if (!name) {
			handleErrorWithI18n(
				this,
				msg,
				'klicktipp-tag-create.error.missing-name',
				RED._('klicktipp-tag-create.error.missing-name'),
			);
			return this.send(msg);
		}

		try {
			const data = {
				name,
			};

			if (text) {
				data.text = text;
			}

			const response = await makeRequest('/tag', 'POST', qs.stringify(data), msg.sessionData);

			handleResponse(
				node,
				msg,
				response,
				'klicktipp-tag-create.status.success',
				'klicktipp-tag-create.status.failed',
				(response) => {
					const enhancedData = {
						id: response?.data?.[0] || null,
					};

					msg.payload = enhancedData;

					// Clear the cache after a successful delete
					clearCache(CACHE_KEYS.TAGS);
				}
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-tag-create.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippTagCreateNode - A Node-RED node to create a new manual tag.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * It will also clear the cached tag data after a successful deletion.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `name`: (Required) The name of the tag to be created.
	 *   - `text`: (Optional) An additional description of the tag.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains the array with ID of the newly created tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag name is missing, the node outputs `msg.error` with a "Missing tag name" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagCreateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-tag-create.error.missing-credentials',
			invalidCredentials: 'klicktipp-tag-create.error.invalid-credentials',
			loginFailed: 'klicktipp-tag-create.error.login-failed',
			requestFailed: 'klicktipp-tag-create.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-tag-create', KlickTippTagCreateNode);
};
