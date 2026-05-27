const handleError = require('./handleError');
const { runWithSession } = require('./klickTippSessionManager');

/**
 * createKlickTippSessionNode - A higher-order function to create a Node-RED node with KlickTipp session handling.
 *
 * This function reuses a stored session cookie, performs a login only when needed,
 * and retries the request once after a 401/403 by refreshing the session.
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

			try {
				await runWithSession(klicktippConfig, username, password, async (sessionData) => {
					msg.sessionData = sessionData;
					await coreFunction.call(node, msg, config);
				});
			} catch (error) {
				handleError(node, msg, 'Request failed', error?.response?.data || error?.message);
			} finally {
				delete msg.sessionData;
				node.send(msg);
			}
		});
	};
}

module.exports = createKlickTippSessionNode;
