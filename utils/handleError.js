/**
 * Handles errors by setting the Node-RED node's status and sending an error message.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The message object passed through Node-RED.
 * @param {string} [statusMessage='Error occurred'] - The high-level status message to display in the Node-RED UI.
 * @param {string|null} [errorDetails=null] - Additional error details to append to the status message. If not provided, only the statusMessage is shown.
 */
function handleError(node, msg, statusMessage = 'Error occurred', errorDetails = null) {
	// Determine the status text based on whether errorDetails is provided
	const statusText = errorDetails ? `${statusMessage}: ${errorDetails}` : statusMessage;

	// Update the node status with the appropriate text
	node.status({ fill: 'red', shape: 'ring', text: statusText });

	// Set error details in the message; if no errorDetails, just set statusMessage as the error
	msg.error = errorDetails || statusMessage;

	msg.payload = { success: false };
}

module.exports = handleError;
