/**
 * Retrieves the appropriate cache context based on the provided cache context level.
 *
 * @function getCacheLevel
 * @param {object} node - The Node-RED node instance used to access context.
 * @param {string} cacheContextLevel - The level of cache to access. Valid values are 'node', 'flow', 'global'.
 * @returns {object} The appropriate cache context object (node, flow, or global).
 */
function getCacheLevel(node, cacheContextLevel) {
	switch (cacheContextLevel) {
		case 'flow':
			return node.context().flow;
		case 'global':
			return node.context().global;
		case 'node':
		default:
			// Default to 'node' context if an invalid or no context level is provided
			console.warn(`Invalid or unspecified cacheContext '${cacheContextLevel}' provided. Defaulting to 'node' context.`);
			return node.context();
	}
}

module.exports = getCacheLevel;
