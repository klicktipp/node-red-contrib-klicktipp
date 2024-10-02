const validContactFieldList = require('../constants/validContactFieldList');

function prepareSubscriptionData(email, smsNumber = '', listId = 0, tagId = 0, fields = {}) {
	// Filter fields to include only valid keys
	const filteredFields = Object.fromEntries(
		Object.entries(fields).filter(([key]) => validContactFieldList.includes(key)),
	);

	// Create the data object
	let data = {
		email,
		smsnumber: smsNumber,
		listid: listId,
		tagid: tagId,
		fields: Object.keys(filteredFields).length ? filteredFields : undefined,
	};

	// Remove undefined, null, or empty string values
	data = Object.fromEntries(
		Object.entries(data).filter(([_, value]) => value != null && value !== ''),
	);

	return data;
}

module.exports = prepareSubscriptionData;
