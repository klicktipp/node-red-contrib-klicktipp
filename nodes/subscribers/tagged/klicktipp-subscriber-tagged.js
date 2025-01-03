'use strict';

const handleResponse = require('../../utils/handleResponse');
const handleError = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const objectToIdValueArray = require('../../utils/objectToIdValueArray');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const tagId = config.tagId || msg?.payload?.tagId;

		if (!tagId) {
			handleError(
				this,
				msg,
				'klicktipp-subscriber-tagged.error.missing-tag',
				'klicktipp-subscriber-tagged.error.invalid-input',
			);
			return this.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/tagged',
				'POST',
				qs.stringify({ tagid: tagId }),
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'klicktipp-subscriber-tagged.status.success',
				'klicktipp-subscriber-tagged.status.failed',
				(response) => {
					const transformedData = objectToIdValueArray(response.data);

					const formattedData = transformedData.map(({ id, value }) => ({
						id,
						timestamp: value,
					}));

					msg.payload = formattedData;
				},
			);
		} catch (error) {
			handleError(node, msg, 'klicktipp-subscriber-tagged.status.failed', error.message);
		}
	};

	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all active subscribers tagged with a specific tag ID.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `tagId`: (Required) The ID of the tag used to filter subscribers.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscribers tagged with the given tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberTaggedNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-tagged.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-tagged.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-tagged.error.login-failed',
			requestFailed: 'klicktipp-subscriber-tagged.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-tagged', KlickTippSubscriberTaggedNode);
};
