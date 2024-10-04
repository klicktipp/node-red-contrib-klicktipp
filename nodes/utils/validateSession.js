const handleError = require('./handleError');
const getSessionData = require('./getSessionData');

/**
 * Validates the KlickTipp session data within the flow context.
 *
 * @param {Object} msg - The message object, used to pass error information.
 * @param {Object} node - The Node-RED node instance, used to access the flow context.
 * @returns {boolean} Returns `true` if the session data is valid, otherwise handles error and returns `false`.
 */
function validateSession(msg, node) {
	const sessionData = getSessionData(msg.sessionDataKey, node);

	if (!sessionData) {
		handleError(node, msg, 'Missing session data', 'Session ID or session name is missing');
		return false;
	}
	return true;
}

module.exports = validateSession;
