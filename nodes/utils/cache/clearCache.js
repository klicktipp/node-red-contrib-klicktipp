const getCacheLevel = require('./getCacheLevel'); // Assuming getCacheLevel is in a separate file

/**
 * Clears the cached data and timestamp from the specified context.
 * This function sets both the cache and cache timestamp to `null`, effectively clearing them.
 *
 * @function clearCache
 * @param {object} node - The Node-RED node instance used to access the context.
 * @param {string} cacheKey - The key used to store the cached data in the context.
 * @param {string} [cacheTimestampKey='cacheTimestamp'] - The key used to store the cache timestamp (optional, default is 'cacheTimestamp').
 * @param {string} [cacheContextLevel='flow'] - The context level where the cache is stored ('node', 'flow', or 'global'). Defaults to 'flow'.
 */
function clearCache(
	node,
	cacheKey,
	cacheTimestampKey = 'cacheTimestamp',
	cacheContextLevel = 'flow',
) {
	// Get the correct cache context (node, flow, or global) using getCacheLevel
	const cacheContext = getCacheLevel(node, cacheContextLevel);

	if (!cacheContext) {
		console.warn(
			`Invalid cache context '${cacheContextLevel}' provided. Defaulting to 'node' context.`,
		);
		return;
	}

	// Clear the cache and timestamp
	cacheContext.set(cacheKey, null);
	cacheContext.set(cacheTimestampKey, null);
}

module.exports = clearCache;
