'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const setSessionData = require('./utils/setSessionData');
const generateUniqueSessionKey = require('./utils/generateUniqueSessionKey');
const scheduleAutoLogout = require('./utils/sheduleAutoLogout');
const clearAutoLogout = require('./utils/clearAutoLogout');

module.exports = function (RED) {
	// Constants
	// const LOGOUT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes converted to milliseconds
	const LOGOUT_TIMEOUT_MS = 60 * 1000; // 10 minutes converted to milliseconds

	/**
	 * KlickTippLoginNode - A Node-RED node for logging in to the KlickTipp API.
	 *
	 * This node logs in to the KlickTipp API using the username and password provided in the configuration.
	 * On successful login, it retrieves the session ID and session name, and stores the session data in the Node-RED flow context for use in subsequent API requests.
	 * It also schedules automatic logout after a predefined period to ensure the session expires after the specified timeout.
	 *
	 * Configuration:
	 * - The node expects the KlickTipp credentials (username and password) to be configured in a separate config node.
	 *
	 * Outputs:
	 * - On successful login:
	 *   - msg.payload:
	 *     - success: true (Indicates that the login was successful).
	 *   - msg.sessionDataKey: A unique key used to retrieve the session data from flow context.
	 *
	 * - On failed login:
	 *   - msg.payload:
	 *     - success: false (Indicates that the login failed).
	 *   - msg.error: An error message explaining the failure (e.g., "Missing email or password", "Login failed").
	 *
	 * @param {object} config - The configuration object passed from Node-RED, containing the KlickTipp credentials.
	 */
	function KlickTippLoginNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);

		node.on('input', async function (msg) {
			const { username, password } = klicktippConfig || {};

			if (!username || !password) {
				handleError(node, msg, 'Missing email or password');
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/account/login', 'POST', { username, password });
				handleResponse(node, msg, response, 'Logged in', 'Login failed', (response) => {
					const sessionKey = generateUniqueSessionKey();
					const sessionData = {
						sessionId: response.data.sessid,
						sessionName: response.data.session_name,
					};

					msg.sessionDataKey = sessionKey;

					setSessionData(sessionKey, node, sessionData);
					scheduleAutoLogout(msg, node, LOGOUT_TIMEOUT_MS);

					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Login failed', error.message);
			}

			node.send(msg);
		});

		node.on('close', function () {
			clearAutoLogout(node);
		});
	}

	RED.nodes.registerType('klicktipp login', KlickTippLoginNode);
};
