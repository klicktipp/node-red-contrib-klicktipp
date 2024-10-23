const getCacheLevel = require("./getCacheLevel");

/**
 * Creates a cached API endpoint in Node-RED.
 *
 * This function sets up an HTTP GET route that either serves cached data (if valid) or fetches fresh data using the provided fetch function.
 * The fetched data is then cached for future requests within the specified duration.
 *
 * @function createCachedApiEndpoint
 * @param {object} RED - The Node-RED runtime object used to register HTTP routes.
 * @param {object} node - The Node-RED node instance used to access the context for caching.
 * @param {object} klicktippConfig - The Node-RED node configuration object.
 * @param {object} options - Configuration options for the caching endpoint.
 * @param {string} options.endpoint - The API endpoint to be registered.
 * @param {string} options.permission - The permission required to access this endpoint.
 * @param {string} [options.cacheContext='flow'] - The context level where the cache is stored (e.g., 'flow' or 'global').
 * @param {string} options.cacheKey - The key used to store the cached data.
 * @param {string} options.cacheTimestampKey - The key used to store the timestamp of when the data was cached.
 * @param {number} [options.cacheDurationMs=600000] - The duration (in milliseconds) for which the cache is considered valid. Defaults to 10 minutes.
 * @param {function} options.fetchFunction - The function that fetches new data if the cache is invalid or expired.
 *
 */
function createCachedApiEndpoint(RED, node, klicktippConfig, options) {
	if (!klicktippConfig) {
		return;
	}

	RED.httpAdmin.get(
		options.endpoint,
		RED.auth.needsPermission(options.permission),
		async (req, res) => {
			try {
				const { cacheKey, cacheTimestampKey, cacheDurationMs = 10 * 60 * 1000 } = options;
				const { username = '', password = '' } = klicktippConfig || {};
				
				const fullCacheKey = `${cacheKey}_${node.id}`;
				
				if (!username || !password) {
					return res.status(400).json({ error: 'Missing KlickTipp credentials' });
				}
				
				const cacheContextLevel = options.cacheContext || 'node'; // 'node', 'flow', 'global'
				const cacheContext = getCacheLevel(node, cacheContextLevel);
				
				if (!cacheContext) {
					console.log(`Unable to access '${cacheContextLevel}' context`);
					return res.status(400).json({ error: (`Unable to access '${cacheContextLevel}' context`) });
				}
				
				// Use the cache context to get and set values
				let cachedData = cacheContext.get(fullCacheKey) || null;
				let cacheTimestamp = cacheContext.get(cacheTimestampKey) || null;
				
				const isCacheValid =
					cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDurationMs;
				
				if (isCacheValid) {
					console.log('Serving from cache');
					return res.json(cachedData);
				}
				
				// Fetch new data using credentials
				const data = await options.fetchFunction(username, password);
				
				// Cache the new data
				cacheContext.set(fullCacheKey, data);
				cacheContext.set(cacheTimestampKey, Date.now());
				
				res.json(data);
			} catch (error) {
				console.error('Error fetching data:', error);
				res.status(500).json({ error: 'Failed to fetch data', message: error.message });
			}
		}
	);
}

module.exports = createCachedApiEndpoint;
