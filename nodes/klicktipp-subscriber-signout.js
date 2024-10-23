'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const evaluatePropertyAsync = require('./utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	/**
	 * KlickTippSubscriberSignoutNode - A Node-RED node to untag an email using an API key.
	 * This node untags a user by their email using the provided API key.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `apiKey`: (Required) The API key for list building configuration.
	 *   - `email`: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If required fields (API key or email) are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberSignoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
			const apiKey = await evaluatePropertyAsync(RED, config.apiKey, config.apiKeyType, node, msg);

			if (!apiKey || !email) {
				handleError(node, msg, 'Missing API key or email');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/signout',
					'POST',
					qs.stringify({ apikey: apiKey, email }),
				);

				// Handle the response using the handleResponse utility
				handleResponse(node, msg, response, 'Untag successful', 'Failed to untag email', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Failed to untag email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber signout', KlickTippSubscriberSignoutNode);
};
