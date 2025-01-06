const { handleErrorWithI18n} = require('./handleError');

/**
 * Handles the API response and updates the Node-RED node's status accordingly.
 *
 * @param {object} node - The current Node-RED node instance.
 * @param {object} msg - The message object passed through Node-RED.
 * @param {object} response - The API response object.
 * @param {string} successMessage - The message to display if the request is successful.
 * @param {string} failureMessage - The message to display if the request fails.
 * @param {Function} onSuccess - A callback function to execute when the request is successful.
 */
function handleResponse(node, msg, response, successMessage, failureMessage, onSuccess) {
	if (response && !response.error) {
		if (onSuccess) {
			onSuccess(response);
		}
		node.status({ fill: 'green', shape: 'dot', text: successMessage });
	} else {
		const errorMessage = response?.error || 'Unknown error';
		handleErrorWithI18n(node, msg, failureMessage, errorMessage);
	}
}

module.exports = handleResponse;
