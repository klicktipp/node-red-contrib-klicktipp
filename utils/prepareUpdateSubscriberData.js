const validContactFieldList = require('../constants/validContactFieldList');

function prepareUpdateSubscriberData(newEmail, newSmsNumber = '', fields = {}) {
	// Filter fields to include only valid keys
	const filteredFields = Object.fromEntries(
		Object.entries(fields).filter(([key]) => validContactFieldList.includes(key)),
	);

	const data = {
		newEmail: newEmail,
	};

	if (newSmsNumber) {
		data.newSmsNumber = newSmsNumber;
	}

	if (filteredFields) {
		data.fields = filteredFields;
	}

	return data;
}

module.exports = prepareUpdateSubscriberData;
