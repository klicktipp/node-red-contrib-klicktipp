const makeRequest = require("../makeRequest");

async function fetchTagList(klicktippConfig) {
	if (!klicktippConfig || !klicktippConfig.username || !klicktippConfig.password) {
		throw new Error('KlickTipp credentials missing');
	}
	
	console.log('Fetching data from KlickTipp API');
	
	// Login to KlickTipp API
	const loginResponse = await makeRequest('/account/login', 'POST', {
		username: klicktippConfig.username,
		password: klicktippConfig.password,
	});
	
	if (!loginResponse.data || !loginResponse.data.sessid || !loginResponse.data.session_name) {
		throw new Error('Login failed');
	}
	
	const sessionData = {
		sessionId: loginResponse.data.sessid,
		sessionName: loginResponse.data.session_name,
	};
	
	// Fetch tags from KlickTipp API
	const response = await makeRequest('/tag', 'GET', {}, sessionData);
	
	// Logout from KlickTipp API
	await makeRequest('/account/logout', 'POST', {}, sessionData);
	
	return response.data; // Assuming response.data contains the tags
}

module.exports = fetchTagList;