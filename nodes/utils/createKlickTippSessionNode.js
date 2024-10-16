const makeRequest = require('./makeRequest');
const handleError = require('./handleError');

/**
 * createKlickTippSessionNode - A higher-order function to create a Node-RED node with KlickTipp login and logout functionality.
 *
 * This function handles the login process, executes the core functionality, and performs the logout process automatically.
 * It also manages session handling and ensures that if login fails, the error is properly propagated.
 *
 * @param {object} RED - The Node-RED runtime object. This provides access to Node-RED's API.
 * @param node
 * @param {function} coreFunction - The core function to execute once the KlickTipp session has been established. This function will be called with the current Node-RED message and configuration.
 *
 * @returns {function} - A function that is used to create the actual Node-RED node.
 */
function createKlickTippSessionNode(RED, node, coreFunction) {
	return function (config) {
		node.on('input', async function (msg) {
			const klicktippConfig = RED.nodes.getNode(config.klicktipp);
			const { username, password } = klicktippConfig || {};

			if (!username || !password) {
				handleError(node, msg, 'Missing email or password');
				return node.send(msg);
			}

			let sessionData;

			try {
				// Login
				const loginResponse = await makeRequest('/account/login', 'POST', { username, password });
				if (loginResponse && loginResponse.data && loginResponse.data.sessid) {
					sessionData = {
						sessionId: loginResponse.data.sessid,
						sessionName: loginResponse.data.session_name,
					};

					msg.sessionData = sessionData;
				} else {
					handleError(node, msg, 'Login failed');
					return node.send(msg);
				}

				// Execute core functionality
				await coreFunction.call(node, msg, config);
			} catch (error) {
				handleError(node, msg, 'Request failed', error.message);
			} finally {
				//Logout
				if (sessionData) {
					try {
						await makeRequest('/account/logout', 'POST', {}, sessionData);
					} catch (logoutError) {
						node.error('Logout failed: ' + logoutError.message, msg);
					}
				}
				node.send(msg);
			}
		});
	};
}

module.exports = createKlickTippSessionNode;
