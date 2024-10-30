const cache = require('./cache'); // Import the shared cache instance

/**
 * Clears the cached data in node-cache.
 * This function deletes the cached entry in node-cache, effectively clearing it.
 *
 * @function clearCache
 * @param {string} cacheKey - The key used to store the cached data in the context.
 */
function clearCache(cacheKey) {
	cache.del(cacheKey);
}

module.exports = clearCache;
