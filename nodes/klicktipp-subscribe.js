'use strict';

module.exports = function (RED) {
	const handleResponse = require('./utils/handleResponse');
	const handleError = require('./utils/handleError');
	const makeRequest = require('./utils/makeRequest');
	const validateSession = require('./utils/validateSession');
	const getSessionHeaders = require('./utils/getSessionHeaders');
	const prepareSubscriptionData = require('./utils/prepareCreateSubscriberData');
	const qs = require('qs');

	/**
	 * KlickTippSubscribeNode - A Node-RED node to subscribe an email.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the recipient.
	 *   - `listId`: (Optional) The ID of the double opt-in process.
	 *   - `tagId`: (Optional) The ID of the tag with which your contacts are tagged.
	 *   - `fields`: (Optional) Additional data for the recipient (e.g., first name, address). See validContactFieldList variable
	 *   - `smsNumber`: (Optional) The SMS mobile number of the recipient.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing the subscriber data.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', smsNumber = '', listId = 0, tagId = 0, fields = {} } = msg.payload;

			if (!email) {
				handleError(node, msg, 'Missing email or SMS number');
				return node.send(msg);
			}

			// Prepare data object and filter fields
			const data = prepareSubscriptionData(email, smsNumber, listId, tagId, fields);

			try {
				const response = await makeRequest(
					'/subscriber',
					'POST',
					qs.stringify(data),
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscribed successfully',
					'Failed to subscribe',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to subscribe', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscribe', KlickTippSubscribeNode);
};
