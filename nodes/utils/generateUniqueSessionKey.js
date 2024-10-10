const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique session key by combining a customizable prefix and a UUID.
 *
 * @param {string} [prefix='klicktippSession'] - Optional prefix for the session key.
 * @returns {string} A unique session key for storing session data.
 */
function generateUniqueSessionKey(prefix = 'klicktippSession') {
	// Create a session key using the provided prefix and UUID
	return `${prefix}_${uuidv4()}`;
}

module.exports = generateUniqueSessionKey;
