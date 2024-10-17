/**
 * Evaluates a property in Node-RED asynchronously and returns the result.
 * This function can evaluate properties from various contexts such as `msg`, `flow`, `global`, or static types such as `str` (string), `num` (number), etc.
 *
 * @param {string} property - The property to evaluate (e.g., a property path like `msg.payload`).
 * @param {string} propertyType - The type of the property (e.g., `msg`, `flow`, `global`, `str`, `num`, etc.).
 * @param {object} node - The Node-RED node object where the evaluation is taking place.
 * @param {object} msg - The message object (`msg`) being processed in the node.
 * @param {object} RED - The Node-RED runtime object that provides the utility function.
 *
 * @returns {Promise<any>} A promise that resolves with the evaluated result or rejects if an error occurs.
 *
 * @throws {Error} If the property evaluation fails, the promise is rejected with an error.
 */
function evaluatePropertyAsync(RED,property, propertyType, node, msg) {
	return new Promise((resolve, reject) => {
		RED.util.evaluateNodeProperty(
			property,
			propertyType,
			node,
			msg,
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			}
		);
	});
}

module.exports = evaluatePropertyAsync;