'use strict';

module.exports = function (RED) {
	const handleResponse = require('../utils/handleResponse');
	const handleError = require('../utils/handleError');
	const makeRequest = require('../utils/makeRequest');

	/**
	 * KlickTippLoginNode - A Node-RED node for logging in to the KlickTipp API
	 *
	 * This node allows you to log in to the KlickTipp API using the username and password
	 * provided in the configuration. Upon successful login, it retrieves the session ID
	 * and session name, storing them in the msg.klicktipp object for use in subsequent API requests.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Outputs:
	 *   On successful login:
	 *   	- msg.klicktipp:
	 *     		- sessionId: The session ID provided by the KlickTipp API.
	 *     		- sessionName: The session name provided by the KlickTipp API.
	 *   	- msg.payload:
	 *     		- success: true
	 *
	 *   On failed login:
	 *   	- msg.payload:
	 *     		- success: false
	 *   	- msg.error: An error message indicating what went wrong (e.g., missing credentials, login failure).
	 */
	function KlickTippLoginNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		//Get the config node
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
					msg.klicktipp = {
						sessionId: response.data.sessid,
						sessionName: response.data.session_name,
					};

					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Login failed', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp login', KlickTippLoginNode);
};
