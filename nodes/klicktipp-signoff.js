'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const qs = require('qs');

	/**
	 * KlickTippSignoffNode - A Node-RED node to unsubscribe an email using an API key.
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
	function KlickTippSignoffNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const { apiKey, email = '' } = msg.payload;

			if (!apiKey || !email) {
				handleError(node, msg, 'Missing API key or email');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/signoff',
					'POST',
					qs.stringify({ apikey: apiKey, email }),
				);

				// Handle the response using the handleResponse utility
				handleResponse(
					node,
					msg,
					response,
					'Unsubscription successful',
					'Failed to unsubscribe email',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to unsubscribe email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp signoff', KlickTippSignoffNode);
};
