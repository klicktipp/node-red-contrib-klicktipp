function clearCache(node, cacheKey) {
	// Clear the cache after a successful delete
	const flow = node.context().flow;
	flow.set(cacheKey, null);
	flow.set('cacheTimestamp', null);
}

module.exports = clearCache;