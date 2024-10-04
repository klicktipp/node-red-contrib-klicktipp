const validContactFieldList = require('../constants/validContactFieldList');

/**
 * Prepares the data object for updating a subscriber by filtering valid fields and including optional new email and SMS number.
 *
 * @param {string} newEmail - The new email address for the subscriber.
 * @param {string} [newSmsNumber=''] - The optional new SMS number for the subscriber.
 * @param {Object} [fields={}] - An object containing additional custom fields for the subscriber.
 * @returns {Object} The prepared update subscriber data object containing the new email, and optionally, the new SMS number and filtered fields.
 */
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
