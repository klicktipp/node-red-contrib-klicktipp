/**
 * Converts an object or an array into an array of objects with `id` and optionally `value` properties.
 *
 * @param {Object|Array} obj - The input data to transform. Can be an object or an array of strings.
 * @returns {Array<Object>} - Returns an array of objects in the format:
 *   - [{ id: string }] if the input is an array of strings.
 *   - [{ id: string, value: any }] if the input is an object.
 */
function objectToIdValueArray(obj) {
	if (Array.isArray(obj)) {
		// Handle array of strings: map to [{ id: string }]
		return obj.map((id) => ({ id }));
	}

	// Handle object: map to [{ id, value }]
	return Object.entries(obj).map(([id, value]) => ({ id, value }));
}

module.exports = objectToIdValueArray;
