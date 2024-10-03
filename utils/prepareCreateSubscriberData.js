const validContactFieldList = require('../constants/validContactFieldList');

function prepareCreateSubscriberData(email, smsNumber = '', listId = 0, tagId = 0, fields = {}) {
	// Filter fields to include only valid keys
	const filteredFields = Object.fromEntries(
		Object.entries(fields).filter(([key]) => validContactFieldList.includes(key)),
	);

	const data = {
		email: email,
	};

	if (smsNumber) {
		data.smsnumber = smsNumber;
	}

	if (listId) {
		data.listid = listId;
	}

	if (tagId) {
		data.tagid = tagId;
	}

	if (filteredFields) {
		data.fields = filteredFields;
	}

	return data;
}

module.exports = prepareCreateSubscriberData;
