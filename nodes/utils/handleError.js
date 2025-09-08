const adjustErrorMessage = require('./adjustErrorMessage');

/**
 * Handles errors by setting the Node-RED node's status and sending an error message.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The message object passed through Node-RED.
 * @param {string} [statusMessage='Error occurred'] - The high-level status message to display in the Node-RED UI.
 * @param {number|string|object|null} [errorDetails=null] - Error code, message, or object with { error, code }.
 */
function handleError(node, msg, statusMessage = 'Error occurred', errorDetails = null) {
	let errorMsg;

	if (typeof errorDetails === 'number') {
		// simple numeric code
		errorMsg = adjustErrorMessage(errorDetails);
	} else if (typeof errorDetails === 'object' && errorDetails !== null) {
		// object with { error, code }
		const { error, code } = errorDetails;
		if (typeof error === 'number') {
			errorMsg = adjustErrorMessage(error, code);
		} else {
			errorMsg = errorDetails.error || errorDetails.message || String(errorDetails);
		}
	} else if (typeof errorDetails === 'string') {
		errorMsg = errorDetails;
	} else {
		errorMsg = null;
	}

	const statusText = errorMsg ? `${statusMessage}: ${errorMsg}` : statusMessage;

	// Update the node status with the appropriate text
	node.status({ fill: 'red', shape: 'ring', text: statusText });

	// Set error details in the message; if no errorDetails, just set statusMessage as the error
	msg.error = errorMsg || statusMessage;

	msg.payload = { success: false };
}

module.exports = handleError;
