'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareApiKeySubscriptionData = require('./utils/prepareApiKeySubscriptionData');
const extractSignInFields = require('./utils/extractSignInFields');
const qs = require('qs');

module.exports = function (RED) {
	
	/**
	 * KlickTippSigninNode - A Node-RED node to subscribe an email using an API key.
	 * This node subscribes a user by their email or SMS number using the provided API key.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `apiKey`: The KlickTipp API key (listbuildng configuration).
	 *   - `email` (Required): The email address of the subscriber.
	 *   - `smsNumber` (Optional): The SMS number of the subscriber.
	 *   - `fields` (Optional): Additional fields for the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, the redirection URL as defined in the subscription process.
	 *   On failure:
	 *   - `msg.error`: An error message describing what went wrong.
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *
	 * Error Handling:
	 * - If required fields (API key, email, or SMS) are missing, the node will output `msg.error` and return `{ success: false }`.
	 * - If the API request fails, the node will output `msg.error` and return `{ success: false }`.
	 */
	function KlickTippSigninNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const {
				apiKey,
				email,
				smsNumber,
				fields
			} = extractSignInFields(config, msg.payload);

			if (!apiKey || (!email && !smsNumber)) {
				handleError(node, msg, 'Missing API key or email/SMS number');
				return node.send(msg);
			}

			const data = prepareApiKeySubscriptionData(apiKey, email, smsNumber, fields);

			try {
				const response = await makeRequest('/subscriber/signin', 'POST', qs.stringify(data));

				handleResponse(
					node,
					msg,
					response,
					'Subscription successful',
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

	RED.nodes.registerType('klicktipp signin', KlickTippSigninNode);
};
