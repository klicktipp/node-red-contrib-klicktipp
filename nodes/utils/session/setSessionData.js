/**
 * Retrieves the session data from the flow context.
 *
 * @param {string} sessionDataKey - The key used to retrieve the session data from flow context.
 * @param {Object} node - The Node-RED node instance, used to access the flow context.
 * @param data - The KlickTipp session data
 * @returns {Object|null} The session data object if it exists and is valid, otherwise `null`.
 */
function setSessionData(sessionDataKey, node, data) {
	const flow = node.context().flow;
	flow.set(sessionDataKey, data);
}

module.exports = setSessionData;
