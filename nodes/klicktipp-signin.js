'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareApiKeySubscriptionData = require('./utils/prepareApiKeySubscriptionData');
const extractSignInFields = require('./utils/extractSignInFields');
const qs = require('qs');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");

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
		
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/contact-fields',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'contactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: async (req, res) => {
				const klicktippConfig = RED.nodes.getNode(config.klicktipp);
				
				if (!klicktippConfig || !klicktippConfig.username || !klicktippConfig.password) {
					res.status(400).json({ error: 'KlickTipp credentials missing' });
					return;
					//throw new Error('KlickTipp credentials missing');
				}
				
				console.log('Fetching data from KlickTipp API');
				
				// Login to KlickTipp API
				const loginResponse = await makeRequest('/account/login', 'POST', {
					username: klicktippConfig.username,
					password: klicktippConfig.password,
				});
				
				if (!loginResponse.data || !loginResponse.data.sessid || !loginResponse.data.session_name) {
					res.status(400).json({ error: 'Login failed' });
					return;
					//throw new Error('Login failed');
				}
				
				const sessionData = {
					sessionId: loginResponse.data.sessid,
					sessionName: loginResponse.data.session_name,
				};
				
				// Fetch tags from KlickTipp API
				const response = await makeRequest('/field', 'GET', {}, sessionData);
				
				// Logout from KlickTipp API
				await makeRequest('/account/logout', 'POST', {}, sessionData);
				
				return response.data; // Assuming response.data contains the tags
			},
		});
		

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
