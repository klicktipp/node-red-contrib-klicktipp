const makeRequest = require('./makeRequest');
const { runWithSession } = require('./klickTippSessionManager');

/**
 * Fetches data from the KlickTipp API for a specific endpoint.
 * This function reuses a stored session cookie and refreshes it once if it expires.
 *
 * @async
 * @function fetchKlickTippData
 * @param {string} username - The KlickTipp username.
 * @param {string} password - The KlickTipp password.
 * @param {string} endpoint - The specific API endpoint to fetch data from (e.g., '/tag', '/field').
 * @returns {Promise<object>} - Returns a Promise that resolves to the fetched data or throws an error.
 *
 * @throws {Error} If the KlickTipp credentials are missing or invalid.
 * @param {object} [sessionOwner] - Mutable owner object used to cache the session between calls.
 * @throws {Error} If the API request fails at any point (login or fetching data).
 *
 */
async function fetchKlickTippData(username, password, endpoint, sessionOwner) {
	const response = await runWithSession(sessionOwner, username, password, async (sessionData) => {
		return await makeRequest(endpoint, 'GET', {}, sessionData);
	});

	return response.data;
}

module.exports = fetchKlickTippData;
