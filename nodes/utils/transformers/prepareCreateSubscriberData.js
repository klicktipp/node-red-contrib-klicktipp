const validContactFieldList = require('../../constants/validContactFieldList');

/**
 * Prepares the data object for creating a subscriber by filtering valid fields and including optional parameters.
 *
 * @param {string} email - The email address for the subscriber.
 * @param {string} [smsNumber=''] - The optional SMS number for the subscriber.
 * @param {number} [listId=0] - The optional list ID to which the subscriber should be added.
 * @param {number} [tagId=0] - The optional tag ID to assign to the subscriber.
 * @param {Object} [fields={}] - An object containing additional custom fields for the subscriber.
 * @returns {Object} The prepared subscriber data object containing email, and optionally, SMS number, list ID, tag ID, and filtered fields.
 */
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
