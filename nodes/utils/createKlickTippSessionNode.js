const makeRequest = require('./makeRequest');
const { handleErrorWithI18n } = require('./handleError');

/**
 * createKlickTippSessionNode - A higher-order function to create a Node-RED node with KlickTipp login and logout functionality.
 *
 * This function handles the login process, executes the core functionality, and performs the logout process automatically.
 * It also manages session handling and ensures that if login fails, the error is properly propagated.
 *
 * @param {object} RED - The Node-RED runtime object. This provides access to Node-RED's API.
 * @param node
 * @param {function} coreFunction - The core function to execute once the KlickTipp session has been established. This function will be called with the current Node-RED message and configuration.
 * * @param {object} i18n - An object containing translation keys or messages for error and status handling.
 *
 * @returns {function} - A function that is used to create the actual Node-RED node.
 */
function createKlickTippSessionNode(RED, node, coreFunction, i18n = {}) {
	return function (config) {
		node.on('input', async function (msg) {
			const klicktippConfig = RED.nodes.getNode(config.klicktipp);
			const { username, password } = klicktippConfig || {};
			
			const missingCredentialsMessage = i18n?.missingCredentials || 'Missing credentials';
			const invalidCredentialsMessage = i18n?.invalidCredentials || 'Invalid credentials or session ID missing';
			const loginFailedMessage = i18n?.loginFailed || 'Login request failed';
			const requestFailedMessage = i18n?.requestFailed || 'Request failed';
			if (!username || !password) {
				handleErrorWithI18n(
					node,
					msg,
					missingCredentialsMessage,
					RED._(missingCredentialsMessage)
				);
				return node.send(msg);
			}

			let sessionData;

			try {
				// Login wrapped in try/catch for specific error handling
				try {
					const loginResponse = await makeRequest('/account/login', 'POST', { username, password });
					if (loginResponse?.data?.sessid) {
						sessionData = {
							sessionId: loginResponse.data.sessid,
							sessionName: loginResponse.data.session_name,
						};
						msg.sessionData = sessionData;
					} else {
						handleErrorWithI18n(
							node,
							msg,
							invalidCredentialsMessage
						);
						return node.send(msg);
					}
				} catch (loginError) {
					handleErrorWithI18n(
						node,
						msg,
						loginFailedMessage,
						loginError.message
					);
					return node.send(msg);
				}

				// Execute core functionality
				await coreFunction.call(node, msg, config);
			} catch (error) {
				handleErrorWithI18n(
					node,
					msg,
					requestFailedMessage,
					error.message
				);
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
