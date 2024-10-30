const cache = require('./cache');
const CACHE_KEYS = require("./cacheKeys"); // Import the shared cache instance

/**
 * Creates a cached API endpoint in Node-RED.
 *
 * This function sets up an HTTP GET route for a specified endpoint, serving data from cache if available and valid.
 * If the cache is invalid or expired, it fetches new data using the provided fetch function, caches it, and returns it.
 *
 * @function createCachedApiEndpoint
 * @param {object} RED - The Node-RED runtime object used to register HTTP routes and manage credentials.
 * @param {object} options - Configuration options for the caching endpoint.
 * @param {string} options.endpoint - The API endpoint to be registered as an HTTP GET route.
 * @param {string} options.cacheKey - Unique key used to store and retrieve cached data.
 * @param {function} options.fetchFunction - Async function to fetch new data if the cache is invalid or expired.
 * @returns {void}
 */
function createCachedApiEndpoint(RED, options) {
	RED.httpAdmin.get(options.endpoint, async (req, res) => {
		try {
			const { cacheKey } = options;
			const configId = req.headers['config-id'];
			
			if (!configId) {
				return res.status(400).json({ error: 'Configuration is missing' });
			}
			
			const credentials = RED.nodes.getCredentials(configId);
			if (!credentials || !credentials.username || !credentials.password) {
				return res.status(400).json({ error: `Credentials missing for config ID: ${configId}` });
			}
			
			const { username, password } = credentials;
			
			const cachedData = cache.get(cacheKey);
			if (cachedData) {
				console.log('Serving data from cache');
				return res.json(cachedData);
			}
			
			const data = await options.fetchFunction(username, password);
			cache.set(cacheKey, data);
			
			res.json(data);
		} catch (error) {
			console.error('Error fetching data:', error);
			res.status(500).json({ error: 'Failed to fetch data', message: error.message });
		}
	});
}

module.exports = createCachedApiEndpoint;
