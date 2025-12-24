const adjustErrorMessage = require('./adjustErrorMessage');
const buildValidationMessage = require('./buildValidationMessage');

/**
 * Handles errors by setting the Node-RED node's status and sending an error message.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The message object passed through Node-RED.
 * @param {string} [statusMessage='Error occurred'] - High-level status message to display in the UI.
 * @param {number|string|object|null} [errorDetails=null] - Error code, message, or object with:
 *   - legacy: { error, code }
 *   - new: { field, name, reason, error?, code? }
 */
function handleError(node, msg, statusMessage = 'Error occurred', errorDetails = null) {
	let errorMsg = null;

	// 1) If object: prefer field/name/reason validation message
	if (errorDetails && typeof errorDetails === 'object') {
		const validationMsg = buildValidationMessage(errorDetails);
		if (validationMsg) {
			errorMsg = validationMsg;
		} else {
			// 2) Legacy fallback: { error, code }
			const error = errorDetails.error;
			const code = errorDetails.code;

			if (typeof error === 'number') {
				errorMsg = adjustErrorMessage(error, code);
			} else if (typeof error === 'string' && error.trim() !== '') {
				errorMsg = error;
			} else if (typeof errorDetails.message === 'string' && errorDetails.message.trim() !== '') {
				errorMsg = errorDetails.message;
			} else {
				errorMsg = String(errorDetails);
			}
		}
	} else if (typeof errorDetails === 'number') {
		// numeric code only
		errorMsg = adjustErrorMessage(errorDetails);
	} else if (typeof errorDetails === 'string') {
		errorMsg = errorDetails;
	}

	const statusText = errorMsg ? `${statusMessage}: ${errorMsg}` : statusMessage;

	node.status({ fill: 'red', shape: 'ring', text: statusText });

	msg.error = errorMsg || statusMessage;
	msg.payload = { success: false };
}

module.exports = handleError;
