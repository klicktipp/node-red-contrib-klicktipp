'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const qs = require('qs');

module.exports = function (RED) {
	/**
	 * KlickTippSignoutNode - A Node-RED node to untag an email using an API key.
	 * This node untags a user by their email using the provided API key.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
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
	function KlickTippSignoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract fields from config and msg.payload
			const apiKey = config.apiKey || msg.payload?.apiKey;
			const email = config.email || msg.payload?.email;

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

	RED.nodes.registerType('klicktipp signout', KlickTippSignoutNode);
};
