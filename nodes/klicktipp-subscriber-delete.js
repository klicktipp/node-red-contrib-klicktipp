'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber to delete.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `{ success: true }` indicating the subscriber was successfully deleted.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `{ success: false }`.
	 * - If the API request fails, the node outputs `msg.error` and returns `{ success: false }`.
	 */
	function KlickTippSubscriberDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			const subscriberId = config.subscriberId || msg?.payload?.subscriberId;

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'DELETE',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber deleted',
					'Failed to delete subscriber',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to delete subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber delete', KlickTippSubscriberDeleteNode);
};
