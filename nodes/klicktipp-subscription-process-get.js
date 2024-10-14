'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const getSessionData = require('./utils/getSessionData');
const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");

module.exports = function (RED) {
	
	/**
	 * KlickTippSubscriptionProcessGetNode - A Node-RED node to get a specific subscription process by its ID for a logged-in user.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `listId`: (Required) The ID of the subscription process (list) to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscription process (list) definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/subscription-process',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'subscriptionProcessCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: async (req, res) => {
				const klicktippConfig = RED.nodes.getNode(config.klicktipp);
				
				if (!klicktippConfig || !klicktippConfig.username || !klicktippConfig.password) {
					res.status(400).json({ error: 'KlickTipp credentials missing' });
					throw new Error('KlickTipp credentials missing');
				}
				
				console.log('Fetching data from KlickTipp API');
				
				// Login to KlickTipp API
				const loginResponse = await makeRequest('/account/login', 'POST', {
					username: klicktippConfig.username,
					password: klicktippConfig.password,
				});
				
				if (!loginResponse.data || !loginResponse.data.sessid || !loginResponse.data.session_name) {
					throw new Error('Login failed');
				}
				
				const sessionData = {
					sessionId: loginResponse.data.sessid,
					sessionName: loginResponse.data.session_name,
				};
				
				// Fetch subscription processes from KlickTipp API
				const response = await makeRequest('/list', 'GET', {}, sessionData);
				
				// Logout from KlickTipp API
				await makeRequest('/account/logout', 'POST', {}, sessionData);
				
				return response.data; // Assuming response.data contains the tags
			},
		});

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const listId = config.listId || msg?.payload?.listId;

			if (!listId) {
				handleError(node, msg, 'Missing list ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/list/${encodeURIComponent(listId)}`,
					'GET',
					{},
					getSessionData(msg.sessionDataKey, node),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched subscription process',
					'Failed to fetch subscription process',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscription process', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscription process get', KlickTippSubscriptionProcessGetNode);
};
