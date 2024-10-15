/**
 * Prepares the data object for updating a subscriber by filtering valid fields and including optional new email and SMS number.
 *
 * @param {string} newEmail - The new email address for the subscriber.
 * @param {string} [newSmsNumber=''] - The optional new SMS number for the subscriber.
 * @param {Object} [fields={}] - An object containing additional custom fields for the subscriber.
 * @returns {Object} The prepared update subscriber data object containing the new email, and optionally, the new SMS number and filtered fields.
 */
function prepareUpdateSubscriberData(newEmail, newSmsNumber = '', fields = {}) {
	const data = { newEmail };
	
	// Include new SMS number only if it is non-empty after trimming
	if (newSmsNumber.trim()) {
		data.newSmsNumber = newSmsNumber;
	}
	
	// Add fields only if it's not an empty object
	if (Object.keys(fields).length > 0) {
		data.fields = fields;
	}
	
	return data;
}

module.exports = prepareUpdateSubscriberData;
