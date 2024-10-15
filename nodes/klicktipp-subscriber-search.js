'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/session/validateSession');
const getSessionData = require('./utils/session/getSessionData');
const qs = require('qs');

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriberSearchNode - A Node-RED node to search for a subscriber by email and return the subscriber ID.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber to search for.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, the subscriber ID.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberSearchNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = config.email || msg?.payload?.email;

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				handleError(node, msg, 'Missing email');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/search',
					'POST',
					qs.stringify({ email }),
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber ID retrieved',
					'Failed to search for subscriber',
					() => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to search for subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber search', KlickTippSubscriberSearchNode);
};
