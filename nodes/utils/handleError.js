const adjustErrorMessage = require('./adjustErrorMessage');

/**
 * Handles errors by setting the Node-RED node's status and sending an error message.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The message object passed through Node-RED.
 * @param {string} [statusMessage='Error occurred'] - The high-level status message to display in the Node-RED UI.
 * @param {string|null} [errorDetails=null] - Additional error details to append to the status message. If not provided, only the statusMessage is shown.
 */
function handleError(node, msg, statusMessage = 'Error occurred', errorDetails = null) {
	let errorMsg;
	// Attempt to parse errorDetails as a numeric code.
	if (typeof errorDetails === 'number') {
		errorMsg = adjustErrorMessage(errorDetails);
	} else {
		errorMsg = errorDetails;
	}

	const statusText = errorMsg ? `${statusMessage}: ${errorMsg}` : statusMessage;

	// Update the node status with the appropriate text
	node.status({ fill: 'red', shape: 'ring', text: statusText });

	// Set error details in the message; if no errorDetails, just set statusMessage as the error
	msg.error = errorMsg || statusMessage;

	msg.payload = { success: false };
}

module.exports = handleError;
