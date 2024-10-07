/**
 * Clears the auto logout timer if it exists.
 *
 * @param {Object} node - The Node-RED node instance.
 */
function clearAutoLogout(node) {
	if (node.autoLogoutTimer) {
		clearTimeout(node.autoLogoutTimer);
		node.autoLogoutTimer = null;
	}
}

module.exports = clearAutoLogout;
