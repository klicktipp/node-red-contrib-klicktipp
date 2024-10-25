/**
 * Retrieves the appropriate cache context based on the provided cache context level.
 *
 * @function getCacheLevel
 * @param {object} node - The Node-RED node instance used to access context.
 * @param {string} cacheContextLevel - The level of cache to access. Valid values are 'node', 'flow', 'global'.
 * @returns {object} The appropriate cache context object (node, flow, or global).
 */
function getCacheLevel(node, cacheContextLevel) {
	let cacheContext;

	switch (cacheContextLevel) {
		case 'flow':
			cacheContext = node.context().flow;
			break;
		case 'global':
			cacheContext = node.context().global;
			break;
		case 'node':
		default:
			cacheContext = node.context();
			break;
	}

	// Return the cache context or log an error if it's invalid
	if (!cacheContext) {
		console.warn(
			`Invalid cache context '${cacheContextLevel}' provided. Defaulting to 'node' context.`,
		);
		cacheContext = node.context();
	}

	return cacheContext;
}

module.exports = getCacheLevel;
