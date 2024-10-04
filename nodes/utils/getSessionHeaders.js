/**
 * Retrieves the session headers for KlickTipp API requests.
 *
 * @param {Object} msg - The message object passed through Node-RED.
 * @param {Object} msg.klicktipp - The KlickTipp session data stored in the message.
 * @param {string} msg.klicktipp.sessionId - The session ID used for authentication.
 * @param {string} msg.klicktipp.sessionName - The session name used for authentication.
 * @returns {Object} An object containing the sessionId and sessionName to be used as headers.
 */
function getSessionHeaders(msg) {
	return {
		sessionId: msg.klicktipp.sessionId,
		sessionName: msg.klicktipp.sessionName,
	};
}

module.exports = getSessionHeaders;
