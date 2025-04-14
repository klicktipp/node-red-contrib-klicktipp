/**
 * Transforms keys in the response object that start with "field" based on the provided fieldMappings.
 * For custom fields (where the part after "field" is numeric only), the new key will have the format "Label (fieldID)".
 * For standard fields (with text after "field"), the new key will simply be the label.
 *
 * @param {object} responseData - The original response object that contains field keys.
 * @param {object} fieldMappings - The mapping object with keys as field ids and values as user-friendly labels.
 * @returns {object} - The transformed response object with updated field keys.
 */
function transformFieldNames(responseData, fieldMappings) {
  // Iterate over each key in the response object
  for (const key in responseData) {
    if (key.startsWith('field') && fieldMappings[key]) {
      let newKey;
      // Check if it is a custom field: "field" followed by digits only (e.g. "field213737")
      if (/^field\d+$/.test(key)) {
        newKey = `${fieldMappings[key]} (${key})`;
      } else {
        // For standard fields like "fieldCity", use the label directly.
        newKey = fieldMappings[key];
      }
      // Assign the value to the new key and remove the original key.
      responseData[newKey] = responseData[key];
      delete responseData[key];
    }
  }
  return responseData;
}

module.exports = transformFieldNames;