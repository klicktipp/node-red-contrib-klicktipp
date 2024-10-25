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
	// Construct the initial data object with required fields
	const data = {
		apikey: apiKey,
		email,
	};

	// Add optional SMS number if provided
	if (smsNumber) {
		data.smsnumber = smsNumber.trim();
	}

	// Add fields only if it's not an empty object
	if (Object.keys(fields).length > 0) {
		data.fields = fields;
	}

	return data;
}

module.exports = prepareApiKeySubscriptionData;
