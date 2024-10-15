/**
 * Generates a unique session key by combining a timestamp with a random number.
 *
 * @returns {string} A unique session key for storing session data.
 */
function generateUniqueSessionKey() {
	const timestamp = Date.now();
	const randomNum = Math.floor(Math.random() * 1000000);
	return `klicktippSession_${timestamp}_${randomNum}`;
}

module.exports = generateUniqueSessionKey;
