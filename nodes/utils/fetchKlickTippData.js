const makeRequest = require("./makeRequest");

/**
 * Fetches data from the KlickTipp API for a specific endpoint.
 * This function handles the session login, fetching the data, and session logout process.
 *
 * @async
 * @function fetchKlickTippData
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 * @param {object} klicktippConfig - The KlickTipp configuration object containing the username and password.
 * @param {string} klicktippConfig.username - The KlickTipp username.
 * @param {string} klicktippConfig.password - The KlickTipp password.
 * @param {string} endpoint - The specific API endpoint to fetch data from (e.g., '/tag', '/field').
 * @returns {Promise<object>} - Returns a Promise that resolves to the fetched data or an error response.
 *
 * @throws {Error} If the KlickTipp credentials are missing or invalid.
 * @throws {Error} If the API request fails at any point (login, fetching data, logout).
 *
 */
async function fetchKlickTippData(req, res, klicktippConfig, endpoint) {
	if (!klicktippConfig || !klicktippConfig.username || !klicktippConfig.password) {
		return res.status(400).json({ error: 'KlickTipp credentials missing' });
	}
	
	try {
		console.log(`Fetching data from KlickTipp API for endpoint ${endpoint}`);
		
		// Login to KlickTipp API
		const loginResponse = await makeRequest('/account/login', 'POST', {
			username: klicktippConfig.username,
			password: klicktippConfig.password,
		});
		
		if (!loginResponse.data?.sessid || !loginResponse.data?.session_name) {
			return res.status(400).json({ error: 'Login failed' });
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
		
	} catch (error) {
		console.error(`Failed to fetch data from ${endpoint}`, error);
		return res.status(500).json({ error: `Failed to fetch data from ${endpoint}`, message: error.message });
	}
}

module.exports = fetchKlickTippData;
