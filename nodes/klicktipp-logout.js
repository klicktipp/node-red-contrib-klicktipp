'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');
const resetSessionData = require('./utils/resetSessionData');

module.exports = function (RED) {
	
	/**
	 * KlickTippLogoutNode - A Node-RED node for logging out from the KlickTipp API.
	 *
	 * This node logs out from the KlickTipp API by invalidating the active session.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 * Upon successful logout, the node destroy the session data, updates its status and returns a success message in `msg.payload`.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On successful logout:
	 *     - success: true
	 *   On failed logout:
	 *     - success: false
	 *   On error:
	 *     - msg.error: An error message describing what went wrong during the logout process.
	 */
	function KlickTippLogoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/account/logout',
					'POST',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(node, msg, response, 'Logged out', 'Logout failed', () => {
					resetSessionData(msg.sessionDataKey, node);

					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Logout failed', error.message);
				console.log(error);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp logout', KlickTippLogoutNode);
};
