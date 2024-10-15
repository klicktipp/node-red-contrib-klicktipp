const validContactFieldList = require('../../constants/validContactFieldList');

/**
 * Prepares the subscription data object for API requests by filtering and including only valid contact fields.
 *
 * @param {string} apiKey - The API key to authenticate the request.
 * @param {string} email - The email address for the subscription.
 * @param {string} [smsNumber] - The optional SMS number for the subscription.
 * @param {Object} fields - An object containing additional contact fields.
 * @returns {Object} The prepared subscription data object containing the API key, email, and optionally, SMS number and filtered fields.
 */
function prepareApiKeySubscriptionData(apiKey, email, smsNumber, fields) {
	// Filter fields to include only valid keys
	const filteredFields = Object.fromEntries(
		Object.entries(fields).filter(([key]) => validContactFieldList.includes(key)),
	);

	const data = {
		apikey: apiKey,
		email,
	};

	if (smsNumber) {
		data.smsnumber = smsNumber;
	}

	if (filteredFields) {
		data.fields = filteredFields;
	}

	return data;
}

module.exports = prepareApiKeySubscriptionData;
