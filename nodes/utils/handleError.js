/**
 * Base error handler that updates the node status, sets the `msg.error`,
 * and modifies `msg.payload.success` to false.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The Node-RED message object.
 * @param {string} text - The text or message describing the error.
 */
function baseErrorHandler(node, msg, text) {
	node.status({ fill: 'red', shape: 'ring', text });
	msg.error = text;
	msg.payload = { success: false };
}

/**
 * A simple error handler that delegates to `baseErrorHandler`.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The Node-RED message object.
 * @param {string} [statusMessage='Error occurred'] - A brief error message for the node status.
 * @param {string|null} [errorDetails=null] - More detailed information about the error (optional).
 */
function handleError(node, msg, statusMessage = 'Error occurred', errorDetails = null) {
	const text = errorDetails ? `${statusMessage}: ${errorDetails}` : statusMessage;
	baseErrorHandler(node, msg, text);
}

/**
 * Handles errors in an internationalized (i18n) context, updating the node’s status,
 * marking the payload as failed, setting the final error message on `msg.error`,
 * and optionally logging the error via Node-RED.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The Node-RED message object.
 * @param {string} [statusKey=''] - i18n key for the node status text.
 * @param {(string|null)} [errorMessage=null] - The error message to be assigned to `msg.error`
 */
function handleErrorWithI18n(
	node,
	msg,
	statusKey = '',
	errorMessage = null
) {
	// Pass the i18n status key for the Node-RED UI
	baseErrorHandler(node, msg, statusKey);
	
	// Assign the final error message to msg.error
	msg.error = errorMessage || 'Unknown error';
}

module.exports = {
	handleError,
	handleErrorWithI18n,
}