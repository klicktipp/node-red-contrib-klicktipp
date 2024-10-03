const validContactFieldList = require('../constants/validContactFieldList');

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
