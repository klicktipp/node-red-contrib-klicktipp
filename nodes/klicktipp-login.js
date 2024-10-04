'use strict';

const handleResponse = require('./utils/handleResponse');
module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const getSessionData = require('./utils/getSessionData');

	// Constants
	const LOGOUT_TIMEOUT_IN_MINUTES = 10;
	const LOGOUT_TIMEOUT_MS = LOGOUT_TIMEOUT_IN_MINUTES * 60 * 1000; // Convert minutes to milliseconds

	/**
	 * KlickTippLoginNode - A Node-RED node for logging in to the KlickTipp API
	 *
	 * This node logs in to the KlickTipp API using the username and password
	 * provided in the configuration. On successful login, it retrieves the session ID
	 * and session name, storing them in the msg.klicktipp object for use in other API requests.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Outputs:
	 *   On successful login:
	 *     - msg.klicktipp:
	 *         - sessionId: The session ID from the KlickTipp API.
	 *         - sessionName: The session name from the KlickTipp API.
	 *     - msg.payload:
	 *         - success: true
	 *
	 *   On failed login:
	 *     - msg.payload:
	 *         - success: false
	 *     - msg.error: An error message indicating what went wrong (e.g., missing credentials, login failure).
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
					const sessionKey = generateSessionKey();
					const sessionData = {
						sessionId: response.data.sessid,
						sessionName: response.data.session_name,
					};

					// Store session data in flow context
					const flow = node.context().flow;
					flow.set(sessionKey, sessionData);
					msg.sessionDataKey = sessionKey;

					// Set payload to success and schedule automatic logout
					msg.payload = { success: true };
					scheduleAutoLogout(sessionKey, node);
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

	/**
	 * Generates a unique session key by combining a timestamp with a random number.
	 *
	 * @returns {string} A unique session key for storing session data.
	 */
	function generateSessionKey() {
		const timestamp = Date.now();
		const randomNum = Math.floor(Math.random() * 1000000);
		return `klicktippSession_${timestamp}_${randomNum}`;
	}

	/**
	 * Schedules automatic logout after a predefined timeout period.
	 *
	 * @param {string} sessionKey - The key for retrieving session data from flow context.
	 * @param {Object} node - The Node-RED node instance, used for context and error handling.
	 */
	function scheduleAutoLogout(sessionKey, node) {
		clearAutoLogout(node);

		// Schedule the new timer for automatic logout
		node.autoLogoutTimer = setTimeout(async () => {
			try {
				const flow = node.context().flow;
				const sessionData = flow.get(sessionKey);

				// Check if session data exists before attempting logout
				if (!sessionData) {
					node.warn('Session already logged out, skipping auto-logout');
					return;
				}

				// Attempt to log out
				const response = await makeRequest(
					'/account/logout',
					'POST',
					{},
					getSessionData(sessionKey, node),
				);
				handleAutoLogoutResponse(response, sessionKey, node);
			} catch (error) {
				handleError(node, {}, 'Automatic logout failed', error.message);
				node.warn('Automatic logout failed', error);
			}
		}, LOGOUT_TIMEOUT_MS);
	}

	/**
	 * Handles the response of the automatic logout process.
	 *
	 * @param {Object} response - The response object from the KlickTipp logout request.
	 * @param {string} sessionKey - The session key used to access session data.
	 * @param {Object} node - The Node-RED node instance.
	 */
	function handleAutoLogoutResponse(response, sessionKey, node) {
		const flow = node.context().flow;
		handleResponse(
			node,
			{},
			response,
			`Logged out after ${LOGOUT_TIMEOUT_IN_MINUTES} minutes`,
			'Logout failed',
			() => {
				// Clear session details from flow context after successful logout
				flow.set(sessionKey, undefined);
			},
		);
	}

	/**
	 * Clears the auto logout timer if it exists.
	 *
	 * @param {Object} node - The Node-RED node instance.
	 */
	function clearAutoLogout(node) {
		if (node.autoLogoutTimer) {
			clearTimeout(node.autoLogoutTimer);
			node.autoLogoutTimer = null;
		}
	}
};
