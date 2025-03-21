/**
 * Prepares the data object for creating a subscriber by filtering valid fields and including optional parameters.
 *
 * @param {string} [email=''] - The email address for the subscriber.
 * @param {string} [smsNumber=''] - The optional SMS number for the subscriber.
 * @param {number} [listId=0] - The optional list ID to which the subscriber should be added.
 * @param {number} [tagId=0] - The optional tag ID to assign to the subscriber.
 * @param {Object} [fields={}] - An object containing additional custom fields for the subscriber.
 * @returns {Object} The prepared subscriber data object containing email, SMS number, list ID, tag ID, and filtered fields.
 */
function prepareCreateSubscriberData(
	email = '',
	smsNumber = '',
	listId = 0,
	tagId = 0,
	fields = {},
) {
	const data = {};

	// Add email if provided and trim it
	if (typeof email === 'string' && email.trim()) {
		data.email = email.trim();
	}

	// Add SMS number if provided and trim it
	if (typeof smsNumber === 'string' && smsNumber.trim()) {
		data.smsnumber = smsNumber.trim();
	}

	// Add list ID if greater than zero
	if (Number.isInteger(listId) && listId > 0) {
		data.listid = listId;
	}

	// Add tag ID if greater than zero
	if (Number.isInteger(tagId) && tagId > 0) {
		data.tagid = tagId;
	}

	// Add custom fields if it's an object and not empty
	if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
		data.fields = fields;
	}

	return data;
}

module.exports = prepareCreateSubscriberData;
