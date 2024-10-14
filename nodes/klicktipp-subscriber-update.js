'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');
const prepareUpdateSubscriberData = require('./utils/prepareUpdateSubscriberData');
const extractUpdateSubscriberFields = require('./utils/extractUpdateSubscriberFields');
const qs = require('qs');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber to update.
	 *   - `fields` (Optional): Fields of the subscriber to update. See validContactFieldList variable
	 *   - `newEmail` (Optional): The new email address of the subscriber.
	 *   - `newSmsNumber` (Optional): The new SMS number of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object with `success: true` indicating the subscriber was successfully updated.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberUpdateNode(config) {
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
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}
			
			const {
				subscriberId,
				fields,
				newEmail,
				newSmsNumber
			} = extractUpdateSubscriberFields(config, msg.payload);

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			const data = prepareUpdateSubscriberData(newEmail, newSmsNumber, fields);

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'PUT',
					qs.stringify(data),
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber updated',
					'Failed to update subscriber',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to update subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber update', KlickTippSubscriberUpdateNode);
};
