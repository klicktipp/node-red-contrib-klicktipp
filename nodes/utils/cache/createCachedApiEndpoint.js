function createCachedApiEndpoint(RED, node, config, options) {
	RED.httpAdmin.get(
		options.endpoint,
		RED.auth.needsPermission(options.permission),
		async function(req, res) {
			try {
				const context = node.context();
				const cacheContext = context[options.cacheContext || 'flow'];
				
				let cacheData = cacheContext.get(options.cacheKey) || null;
				let cacheTimestamp = cacheContext.get(options.cacheTimestampKey) || null;
				
				const CACHE_DURATION_MS = options.cacheDurationMs || (10 * 60 * 1000);
				
				function isCacheValid() {
					if (!cacheData || !cacheTimestamp) {
						return false;
					}
					const currentTime = Date.now();
					return (currentTime - cacheTimestamp) < CACHE_DURATION_MS;
				}
				
				if (isCacheValid()) {
					console.log('Using cached data');
					return res.json(cacheData);
				}
				
				const data = await options.fetchFunction(req, res);
				
				cacheData = data;
				cacheTimestamp = Date.now();
				
				cacheContext.set(options.cacheKey, cacheData);
				cacheContext.set(options.cacheTimestampKey, cacheTimestamp);
				
				res.json(cacheData);
			} catch (error) {
				console.error(error);
				res.status(500).json({ error: 'Failed to fetch data', message: error.message });
			}
		}
	);
}

module.exports = createCachedApiEndpoint;
