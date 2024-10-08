const handleResponse = require('./handleResponse');
const handleError = require('./handleError');
const getSessionData = require('../utils/getSessionData');
const makeRequest = require('./makeRequest');
const clearAutoLogout = require('./clearAutoLogout');
const resetSessionData = require('./resetSessionData');

/**
 * Schedules automatic logout after a predefined timeout period.
 *
 * @param {Object} msg - The message object, used to pass error information.
 * @param {Object} node - The Node-RED node instance, used for context and error handling.
 * @param {Number} timeout - The timeout in ms
 */
function scheduleAutoLogout(msg, node, timeout) {
	clearAutoLogout(node);

	// Schedule the new timer for automatic logout
	node.autoLogoutTimer = setTimeout(async () => {
		try {
			const { sessionId, sessionName } = getSessionData(msg.sessionDataKey, node);

			if (!sessionId || !sessionName) {
				//Session already logged out, skipping auto-logout
				return;
			}

			const response = await makeRequest('/account/logout', 'POST', {}, { sessionId, sessionName });

			handleResponse(
				node,
				{},
				response,
				`Logged out after ${timeout / 60000} minutes`,
				'Logout failed',
				() => {
					resetSessionData(msg.sessionDataKey, node);
				},
			);
		} catch (error) {
			handleError(node, {}, 'Automatic logout failed', error.message);
			node.warn('Automatic logout failed');
			console.log(error);
		}
	}, timeout);
}

module.exports = scheduleAutoLogout;
