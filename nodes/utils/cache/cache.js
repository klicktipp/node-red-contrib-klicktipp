const NodeCache = require('node-cache');

const CACHE_DURATION_SECONDS = 600; //10 minutes

// Initialize a shared NodeCache instance with a default TTL of 10 minutes
const cache = new NodeCache({ stdTTL: CACHE_DURATION_SECONDS });

module.exports = cache;
