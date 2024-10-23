'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');
const qs = require('qs');

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all active subscribers tagged with a specific tag ID.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
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

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = config.tagId || msg?.payload?.tagId;

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/tagged',
					'POST',
					qs.stringify({ tagid: tagId }),
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscribers tagged retrieved',
					'Failed to retrieve tagged subscribers',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to retrieve tagged subscribers', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber tagged', KlickTippSubscriberTaggedNode);
};
