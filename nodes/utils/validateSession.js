const handleError = require('./handleError');

/**
 * Validates the KlickTipp session data within the provided message object.
 *
 * @param {Object} msg - The message object that contains the KlickTipp session data.
 * @param {Object} node - The Node-RED node, used to set the status.
 * @returns {boolean} - Returns `true` if the session data is valid (i.e., both `sessionId` and `sessionName` are present), otherwise returns `false` and sets an error status on the node using handleError.
 */
function validateSession(msg, node) {
	if (!msg?.klicktipp?.sessionId || !msg?.klicktipp?.sessionName) {
		handleError(node, msg, 'Missing session data', 'Session ID or session name is missing');
		return false;
	}
	return true;
}

module.exports = validateSession;
