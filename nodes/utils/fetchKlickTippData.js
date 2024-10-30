const makeRequest = require('./makeRequest');

/**
 * Fetches data from the KlickTipp API for a specific endpoint.
 * This function handles the session login, fetching the data, and session logout process.
 *
 * @async
 * @function fetchKlickTippData
 * @param {string} username - The KlickTipp username.
 * @param {string} password - The KlickTipp password.
 * @param {string} endpoint - The specific API endpoint to fetch data from (e.g., '/tag', '/field').
 * @returns {Promise<object>} - Returns a Promise that resolves to the fetched data or throws an error.
 *
 * @throws {Error} If the KlickTipp credentials are missing or invalid.
 * @throws {Error} If the API request fails at any point (login, fetching data, logout).
 *
 */
async function fetchKlickTippData(username, password, endpoint) {
	// try {
		// Login to KlickTipp API
		const loginResponse = await makeRequest('/account/login', 'POST', {
			username,
			password,
		});

		if (!loginResponse.data?.sessid || !loginResponse.data?.session_name) {
			console.log('Login failed');
			return;
		}

		const sessionData = {
			sessionId: loginResponse.data.sessid,
			sessionName: loginResponse.data.session_name,
		};

		// Fetch data from the specified endpoint
		const response = await makeRequest(endpoint, 'GET', {}, sessionData);

		// Logout from KlickTipp API
		await makeRequest('/account/logout', 'POST', {}, sessionData);

		return response.data; // Return the fetched data
	// } catch (error) {
	// 	console.error(`Failed to fetch data from ${endpoint}`, error);
	// 	return error;
	// }
}

module.exports = fetchKlickTippData;
