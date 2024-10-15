/**
 * Clears the cached data and timestamp from the flow context.
 * This function sets both the cache and cache timestamp to `null`, effectively clearing them.
 *
 * @function clearCache
 * @param {object} node - The Node-RED node instance used to access the flow context.
 * @param {string} cacheKey - The key used to store the cached data in the flow context.
 *
 */
function clearCache(node, cacheKey) {
	// Clear the cache after a successful delete
	const flow = node.context().flow;
	flow.set(cacheKey, null);
	flow.set('cacheTimestamp', null);
}

module.exports = clearCache;