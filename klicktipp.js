const qs = require('qs');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');
const handleError = require('./utils/handleError');
const handleResponse = require('./utils/handleResponse');
const prepareSubscriptionData = require('./utils/prepareCreateSubscriberData');
const getSessionHeaders = require('./utils/getSessionHeaders');
const prepareApiKeySubscriptionData = require('./utils/prepareApiKeySubscriptionData');
const prepareUpdateSubscriberData = require('./utils/prepareUpdateSubscriberData');

module.exports = function (RED) {
	'use strict';

	// Configuration node for storing API credentials
	function KlickTippConfigNode(n) {
		RED.nodes.createNode(this, n);
		this.username = this.credentials.username;
		this.password = this.credentials.password;
	}

	// Register the config node for KlickTipp credentials
	RED.nodes.registerType('klicktipp-config', KlickTippConfigNode, {
		credentials: {
			username: { type: 'text' },
			password: { type: 'password' },
		},
	});

	/**
	 * KlickTippLoginNode - A Node-RED node for logging in to the KlickTipp API
	 *
	 * This node allows you to log in to the KlickTipp API using the username and password
	 * provided in the configuration. Upon successful login, it retrieves the session ID
	 * and session name, storing them in the msg.klicktipp object for use in subsequent API requests.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Outputs:
	 *   On successful login:
	 *   	- msg.klicktipp:
	 *     		- sessionId: The session ID provided by the KlickTipp API.
	 *     		- sessionName: The session name provided by the KlickTipp API.
	 *   	- msg.payload:
	 *     		- success: true
	 *
	 *   On failed login:
	 *   	- msg.payload:
	 *     		- success: false
	 *   	- msg.error: An error message indicating what went wrong (e.g., missing credentials, login failure).
	 */
	function KlickTippLoginNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		//Get the config node
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);

		node.on('input', async function (msg) {
			const { username, password } = klicktippConfig || {};

			if (!username || !password) {
				handleError(node, msg, 'Missing email or password');
				msg.payload = { success: false };
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/account/login', 'POST', { username, password });

				handleResponse(node, msg, response, 'Logged in', 'Login failed', (response) => {
					msg.klicktipp = {
						sessionId: response.data.sessid,
						sessionName: response.data.session_name,
					};

					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Login failed', error.message);
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp login', KlickTippLoginNode);

	/**
	 * KlickTippLogoutNode - A Node-RED node for logging out from the KlickTipp API.
	 *
	 * This node logs out from the KlickTipp API by invalidating the active session.
	 * It requires a valid session ID and session name (obtained during login)
	 * to perform the logout request. Upon successful logout, the node updates its status
	 * and returns a success message in `msg.payload`.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On successful logout:
	 *     - success: true
	 *   On failed logout:
	 *     - success: false
	 *   On error:
	 *     - msg.error: An error message describing what went wrong during the logout process.
	 */
	function KlickTippLogoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/account/logout', 'POST', {}, getSessionHeaders(msg));

				handleResponse(node, msg, response, 'Logged out', 'Logout failed', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Logout failed', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp logout', KlickTippLogoutNode);

	/**
	 * KlickTippSubscriptionProcessIndexNode - A Node-RED node to get all subscription processes (lists)
	 * associated with the logged-in user. This node requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscription processes. Each element in the array contains:
	 *   - `listId`: The ID of the subscription list.
	 *   - `listName`: The name of the subscription list.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/list', 'GET', {}, getSessionHeaders(msg));

				handleResponse(
					node,
					msg,
					response,
					'Fetched subscription processes',
					'Failed to fetch subscription processes',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscription processes', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType(
		'klicktipp subscription process index',
		KlickTippSubscriptionProcessIndexNode,
	);

	/**
	 * KlickTippSubscriptionProcessGetNode - A Node-RED node to get a specific subscription process
	 * by its ID for a logged-in user. This node requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
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

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const listId = msg?.payload?.listId || '';

			if (!listId) {
				handleError(node, msg, 'Missing list ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/list/${encodeURIComponent(listId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
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

	/**
	 * KlickTippSubscriptionProcessRedirectNode - A Node-RED node to get the redirection URL for a given
	 * subscription process and email. This node requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `listId`: (Required) The ID of the subscription process (list).
	 *   - `email`: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, a string containing the redirection URL as defined in the subscription process.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `listId` or `email` is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriptionProcessRedirectNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', listId = '' } = msg?.payload;

			if (!listId || !email) {
				handleError(node, msg, 'Missing list ID or email');
				return node.send(msg);
			}

			try {
				const data = {
					listid: listId,
					email: email,
				};

				const response = await makeRequest(
					'/list/redirect',
					'POST',
					qs.stringify(data),
					getSessionHeaders(msg),
				);

				// Handle the response using handleResponse
				handleResponse(
					node,
					msg,
					response,
					'Fetched redirection URL',
					'Failed to fetch redirection URL',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch redirection URL', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType(
		'klicktipp subscription process redirect',
		KlickTippSubscriptionProcessRedirectNode,
	);

	/**
	 * KlickTippTagIndexNode - A Node-RED node to get all manual tags of the logged-in user.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an associative array of `<tag id> => <tag name>`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/tag', 'GET', {}, getSessionHeaders(msg));

				handleResponse(
					node,
					msg,
					response,
					'Fetched manual tags',
					'Failed to fetch manual tags',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch manual tags', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag index', KlickTippTagIndexNode);

	/**
	 * KlickTippTagGetNode - A Node-RED node to get the definition of a specific tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to retrieve.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the tag definition.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag ID is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = msg?.payload?.tagId || '';

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Fetched tag definition',
					'Failed to fetch tag definition',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch tag definition', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag get', KlickTippTagGetNode);

	/**
	 * KlickTippTagCreateNode - A Node-RED node to create a new manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `name`: (Required) The name of the tag to be created.
	 *   - `text`: (Optional) An additional description of the tag.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains the array with ID of the newly created tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the tag name is missing, the node outputs `msg.error` with a "Missing tag name" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagCreateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { name = '', text = '' } = msg?.payload;

			if (!name) {
				handleError(node, msg, 'Missing tag name');
				return node.send(msg);
			}

			try {
				const data = {
					name,
				};

				if (text) {
					data.text = text;
				}

				const response = await makeRequest(
					'/tag',
					'POST',
					qs.stringify(data),
					getSessionHeaders(msg),
				);

				// Handle the response using handleResponse
				handleResponse(node, msg, response, 'Tag created', 'Failed to create tag', (response) => {
					msg.payload = response.data;
				});
			} catch (error) {
				handleError(node, msg, 'Failed to create tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag create', KlickTippTagCreateNode);

	/**
	 * KlickTippTagUpdateNode - A Node-RED node to update a manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be updated.
	 *   - `name`: (Optional) The new tag name. If not provided, it will remain unchanged.
	 *   - `text`: (Optional) The new tag description. If not provided, it will remain unchanged.
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains `{ success: true }`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If no `tagId` is provided or neither `name` nor `text` are provided, the node outputs `msg.error` with a "Missing tag ID or nothing to update" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const { tagId, name, text } = msg.payload;

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!tagId || (name === '' && text === '')) {
				handleError(node, msg, 'Missing tag ID or nothing to update');
				return node.send(msg);
			}

			try {
				const data = {
					...(name && { name }),
					...(text && { text }),
				};

				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'PUT',
					qs.stringify(data),
					getSessionHeaders(msg),
				);

				handleResponse(node, msg, response, 'Tag updated', 'Failed to update tag', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Failed to update tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag update', KlickTippTagUpdateNode);

	/**
	 * KlickTippTagDeleteNode - A Node-RED node to delete a manual tag.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag to be deleted.
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, contains `{ success: true }`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If `tagId` is missing, the node outputs `msg.error` with a "Missing tag ID" message.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = msg?.payload?.tagId || '';

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'DELETE',
					{},
					getSessionHeaders(msg),
				);

				handleResponse(node, msg, response, 'Tag deleted', 'Failed to delete tag', () => {
					msg.payload = { success: true };
				});
			} catch (error) {
				handleError(node, msg, 'Failed to delete tag', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp tag delete', KlickTippTagDeleteNode);

	/**
	 * KlickTippFieldIndexNode - A Node-RED node to retrieve all contact fields for the logged-in user.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of contact fields.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippFieldIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/field', 'GET', {}, getSessionHeaders(msg));

				handleResponse(
					node,
					msg,
					response,
					'Fetched contact fields',
					'Failed to fetch contact fields',
					() => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch contact fields', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp field index', KlickTippFieldIndexNode);

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

	/**
	 * KlickTippUnsubscribeNode - A Node-RED node to unsubscribe an email.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber to unsubscribe.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully unsubscribed.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippUnsubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = msg?.payload?.email || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				return handleError(node, msg, 'Missing email');
			}

			try {
				// Make the API request to unsubscribe the email
				const response = await makeRequest(
					'/subscriber/unsubscribe',
					'POST',
					qs.stringify({ email }),
					getSessionHeaders(msg),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Unsubscribed successfully',
					'Failed to unsubscribe',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to unsubscribe', error.message);
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp unsubscribe', KlickTippUnsubscribeNode);

	/**
	 * KlickTippTagEmailNode - A Node-RED node to tag an email with one or more tags.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagIds`: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the response from the KlickTipp API.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag IDs are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippTagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			let { email = '', tagIds = [] } = msg?.payload;

			if (!email || !Array.isArray(tagIds)) {
				return handleError(node, msg, 'Missing email or tag IDs', 'Invalid input: email or tagIds');
			}

			// Ensure tagIds is an array, even if a single tagId is provided
			if (typeof tagIds === 'number') {
				tagIds = [tagIds];
			}

			try {
				const response = await makeRequest(
					'/subscriber/tag',
					'POST',
					qs.stringify({
						email,
						tagids: tagIds,
					}),
					getSessionHeaders(msg),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Email tagged successfully',
					'Failed to tag email',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to tag email', error.message);
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag email', KlickTippTagEmailNode);

	/**
	 * KlickTippUntagEmailNode - A Node-RED node to untag an email.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagId`: (Required) The ID of the manual tag to be removed from the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully untagged.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippUntagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', tagId = '' } = msg?.payload;

			if (!email || !tagId) {
				return handleError(node, msg, 'Missing email or tag ID', 'Invalid input: email or tagId');
			}

			try {
				const response = await makeRequest(
					'/subscriber/untag',
					'POST',
					qs.stringify({ email, tagid: tagId }),
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Email untagged successfully',
					'Failed to untag email',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to untag email', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp untag email', KlickTippUntagEmailNode);

	/**
	 * KlickTippResendAutoresponderNode - A Node-RED node to resend an autoresponder to an email address.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `autoresponder`: (Required) The ID of the autoresponder to resend.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the autoresponder was successfully resent.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or autoresponder ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippResendAutoresponderNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const { email = '', autoresponder = '' } = msg?.payload;

			if (!email || !autoresponder) {
				return handleError(node, msg, 'Missing email or autoresponder ID', 'Invalid input');
			}

			try {
				const response = await makeRequest(
					'/subscriber/resend',
					'POST',
					qs.stringify({ email, autoresponder }),
					getSessionHeaders(msg),
				);

				// Handle the response
				handleResponse(
					node,
					msg,
					response,
					'Autoresponder resent successfully',
					'Failed to resend autoresponder',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to resend autoresponder', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp resend autoresponder', KlickTippResendAutoresponderNode);

	/**
	 * KlickTippSubscriberIndexNode - A Node-RED node to retrieve all active subscribers.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscriber IDs.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest('/subscriber', 'GET', {}, getSessionHeaders(msg));

				handleResponse(
					node,
					msg,
					response,
					'Fetched subscribers successfully',
					'Failed to fetch subscribers',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscribers', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber index', KlickTippSubscriberIndexNode);

	/**
	 * KlickTippSubscriberGetNode - A Node-RED node to retrieve information for a specific subscriber.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object representing the subscriber.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const subscriberId = msg?.payload?.subscriberId || '';

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'GET',
					{},
					getSessionHeaders(msg),
				);

				// Handle the response using handleResponse utility
				handleResponse(
					node,
					msg,
					response,
					'Fetched subscriber information',
					'Failed to fetch subscriber information',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to fetch subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber get', KlickTippSubscriberGetNode);

	/**
	 * KlickTippSubscriberSearchNode - A Node-RED node to search for a subscriber by email and return the subscriber ID.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `email`: (Required) The email address of the subscriber to search for.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, the subscriber ID.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberSearchNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = msg?.payload?.email || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				handleError(node, msg, 'Missing email');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/search',
					'POST',
					qs.stringify({ email }),
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber ID retrieved',
					'Failed to search for subscriber',
					() => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to search for subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber search', KlickTippSubscriberSearchNode);

	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all active subscribers tagged with a specific tag ID.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `tagId`: (Required) The ID of the tag used to filter subscribers.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an array of subscribers tagged with the given tag.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberTaggedNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const tagId = msg?.payload?.tagId || '';

			if (!tagId) {
				handleError(node, msg, 'Missing tag ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber/tagged',
					'POST',
					qs.stringify({ tagid: tagId }),
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscribers tagged retrieved',
					'Failed to retrieve tagged subscribers',
					(response) => {
						msg.payload = response.data;
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to retrieve tagged subscribers', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber tagged', KlickTippSubscriberTaggedNode);

	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
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

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const {
				subscriberId = '',
				fields = {},
				newEmail = '',
				newSmsNumber = '',
			} = msg?.payload || {};

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
					getSessionHeaders(msg),
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

	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * This node requires valid session credentials (sessionId and sessionName) to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login.
	 *   - `sessionName`: (Required) The session name obtained during login.
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber to delete.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `{ success: true }` indicating the subscriber was successfully deleted.
	 *   On failure:
	 *   - `msg.payload`: An object containing `{ success: false }`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `{ success: false }`.
	 * - If the API request fails, the node outputs `msg.error` and returns `{ success: false }`.
	 */
	function KlickTippSubscriberDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			const subscriberId = msg?.payload?.subscriberId || '';

			if (!subscriberId) {
				handleError(node, msg, 'Missing subscriber ID');
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'DELETE',
					{},
					getSessionHeaders(msg),
				);

				handleResponse(
					node,
					msg,
					response,
					'Subscriber deleted',
					'Failed to delete subscriber',
					() => {
						msg.payload = { success: true };
					},
				);
			} catch (error) {
				handleError(node, msg, 'Failed to delete subscriber', error.message);
			}

			node.send(msg);
		});
	}

	RED.nodes.registerType('klicktipp subscriber delete', KlickTippSubscriberDeleteNode);

	/**
	 * KlickTippSigninNode - A Node-RED node to subscribe an email using an API key.
	 * This node subscribes a user by their email or SMS number using the provided API key.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `apikey`: The KlickTipp API key (listbuildng configuration).
	 *   - `email` (Required): The email address of the subscriber.
	 *   - `smsnumber` (Optional): The SMS number of the subscriber.
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
			const { apiKey, email = '', smsNumber = '', fields = {} } = msg.payload;

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

	/**
	 * KlickTippSignoutNode - A Node-RED node to untag an email using an API key.
	 * This node untags a user by their email using the provided API key.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `apikey`: (Required) The API key for list building configuration.
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
			const { apiKey, email = '' } = msg.payload;

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
