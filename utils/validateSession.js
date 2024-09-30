/**
 * Validates the KlickTipp session data within the provided message object.
 *
 * @param {Object} msg - The message object that contains the KlickTipp session data.
 * @param {Object} node - The Node-RED node, used to set the status.
 *
 * @returns {boolean} - Returns `true` if the session data is valid (i.e., both `sessionId` and `sessionName` are present), otherwise returns `false` and sets an error status on the node.
 *
 */
function validateSession(msg, node) {
	if (!msg?.klicktipp?.sessionId || !msg?.klicktipp?.sessionName) {
		node.status({ fill: 'red', shape: 'ring', text: 'Missing session data' });
		msg.error = 'Missing session ID or session name';
		return false; // Invalid session data
	}
	return true; // Valid session data
}

module.exports = validateSession;
