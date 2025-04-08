/**
 * Prepares the data object for updating a subscriber by filtering valid fields and including optional new email and SMS number.
 *
 * @param {string} newEmail - The new email address for the subscriber.
 * @param {string} [newSmsNumber=''] - The optional new SMS number for the subscriber.
 * @param {Object} [fields={}] - An object containing additional custom fields for the subscriber.
 * @returns {Object} The prepared update subscriber data object containing the new email, and optionally, the new SMS number and filtered fields.
 */
function prepareUpdateSubscriberData(newEmail = '', newSmsNumber = '', fields = {}) {
	const data = {
		newemail: newEmail.trim(),
	};

	// Add optional SMS number if provided
	if (typeof newSmsNumber === 'string' && newSmsNumber.trim()) {
		data.newsmsnumber = newSmsNumber.trim();
	}

	// Add custom fields if it's an object and not empty
	if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
		data.fields = fields;
	}

	return data;
}

module.exports = prepareUpdateSubscriberData;
