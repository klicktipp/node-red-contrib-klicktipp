/**
 * Retrieves the session data from the flow context.
 *
 * @param {string} sessionDataKey - The key used to retrieve the session data from flow context.
 * @param {Object} node - The Node-RED node instance, used to access the flow context.
 * @returns {Object|null} The session data object if it exists and is valid, otherwise `null`.
 */
function getSessionData(sessionDataKey, node) {
	const flow = node.context().flow;
	const sessionData = flow.get(sessionDataKey) || {}; // Use empty object if sessionData is null

	const { sessionId = null, sessionName = null } = sessionData;

	return {
		sessionId,
		sessionName,
	};
}

module.exports = getSessionData;
