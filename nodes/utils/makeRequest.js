const axios = require('axios');
const https = require('https');

const API_URL = 'https://api.klicktipp.com';

/**
 * Helper function to make API requests to the KlickTipp API
 * @param {string} path - The API endpoint path (e.g., '/account/login').
 * @param {string} method - The HTTP method (default is 'GET').
 * @param {object} [data={}] - The payload data to send with the request (default is an empty object).
 * @param {object} session - Object containing session data (optional).
 * @param {boolean} [verifySSL=true] - Option to verify SSL certificates.
 * @param {object} [defaultHeaders={}] - Optional custom headers to include in the request.
 * @returns {object|null} - The API response object, or null if an error occurs.
 */
async function makeRequest(
	path,
	method = 'GET',
	data = {},
	session = {},
	verifySSL = true,
	defaultHeaders = {},
) {
	// Build headers
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
		...defaultHeaders,
	};

	// Add session cookie if provided
	if (session.sessionName && session.sessionId) {
		headers['Cookie'] = `${session.sessionName}=${session.sessionId}`;
	}

	// Encode data if necessary
	let requestData = {};
	if (method === 'POST' || method === 'PUT') {
		requestData = new URLSearchParams(data);
		headers['Content-Length'] = requestData.toString().length;
	}

	// Build request config
	const config = {
		baseURL: API_URL,
		url: path,
		method: method,
		headers: headers,
		data: requestData,
		httpsAgent: new https.Agent({
			rejectUnauthorized: verifySSL, // Disable SSL checks if verifySSL is false
		}),
	};

	// Make the request
	const response = await axios(config);

	return response;
}

module.exports = makeRequest;
