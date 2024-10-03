'use strict';

module.exports = function (RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');
	const validateSession = require('../utils/validateSession');
	const getSessionHeaders = require('../utils/getSessionHeaders');
	const qs = require('qs');

	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all active subscribers tagged with a specific tag ID.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
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

			const tagId = msg?.payload?.tagId || '';

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/tagged',
					'POST',
					qs.stringify({ tagid: tagId }),
					getSessionHeaders(msg),
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
