/**
 * Transforms custom field keys in the API response using the field mapping.
 *
 * @param {object} data - The API response data that contains custom fields.
 * @param {object} fieldsMapping - The mapping object where keys are the original field keys (e.g. "field213329")
 *                                 and values are the corresponding friendly labels.
 * @returns {object} - The updated data with custom field keys replaced by their friendly labels.
 */
function transformCustomFields(data, fieldsMapping) {
	// Create a shallow copy to avoid mutating original data
	const updatedData = { ...data };

	// Iterate over each key in the object
	Object.keys(updatedData).forEach((key) => {
		// Check if the key starts with "field" and exists in the mapping
		if (key.startsWith('field') && fieldsMapping[key]) {
			// Add a new key with the friendly label and assign the original value
			updatedData[fieldsMapping[key]] = updatedData[key];
			// Remove the original numeric field key from the data
			delete updatedData[key];
		}
	});
	return updatedData;
}

module.exports = transformCustomFields;
