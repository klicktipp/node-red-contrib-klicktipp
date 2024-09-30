const qs = require('qs');
const makeRequest = require('./utils/makeRequest');
const validateSession = require('./utils/validateSession');

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
	 *     	- sessionId: (Required) The session ID provided by the KlickTipp API.
	 *     	- sessionName: (Required) The session name provided by the KlickTipp API.
	 * 	 On failed login:
	 * 		- msg.error: An error message indicating what went wrong (e.g., missing credentials, login failure).
	 */
	function KlickTippLoginNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		// Get the config node
		const klicktippConfig = RED.nodes.getNode(config.klicktipp);

		node.on('input', async function (msg) {
			// Extract username and password from the config node
			const username = klicktippConfig.username;
			const password = klicktippConfig.password;

			// Validate: Check if the username and password are provided
			if (!username || !password) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email or password' });
				msg.klicktipp = { error: 'Missing email or password' };
				node.send(msg);
				return;
			}

			try {
				const response = await makeRequest('/account/login', 'POST', {
					username,
					password,
				});

				// Handle the API response
				if (response && !response.error) {
					if (response.data && response.data.sessid && response.data.session_name) {
						// Assign session info to msg.klicktipp
						msg.klicktipp = {
							sessionId: response.data.sessid,
							sessionName: response.data.session_name,
						};
						node.status({ fill: 'green', shape: 'dot', text: 'Logged in' });
					} else {
						// If session data is missing, consider it a failure
						const errorMessage = 'Missed session ID or name';
						node.status({ fill: 'red', shape: 'ring', text: errorMessage });
						msg.error = errorMessage;
						msg.klicktipp = null;
					}
				} else {
					// Handle error case from response
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Login failed: ${errorMessage}` });
					msg.error = errorMessage;
					msg.klicktipp = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to delete tag' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp login', KlickTippLoginNode);

	/**
	 * KlickTippLogoutNode - A Node-RED node for logging out from the KlickTipp API
	 *
	 * This node logs out from the KlickTipp API by invalidating the active session.
	 * It requires a valid session ID and session name (obtained from the login process)
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
	 */
	function KlickTippLogoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/account/logout',
					'POST',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response) {
					node.status({ fill: 'yellow', shape: 'dot', text: 'Logged out' });
					msg.payload = {
						success: true,
					};
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Logout failed: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = {
						success: false,
					};
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Logout failed' });
				msg.error = error.message;
				msg.payload = {
					success: false,
				};
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp logout', KlickTippLogoutNode);

	/**
	 * KlickTippSubscriptionProcessIndexNode - A Node-RED node to get all subscription processes (lists)
	 * associated with the logged-in user. This requires valid session credentials (sessionId and sessionName)
	 * to be passed within the `msg.klicktipp` object.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.klicktipp`: An object that must contain:
	 *   - `sessionId`: (Required) The session ID obtained during login (required).
	 *   - `sessionName`: (Required) The session name obtained during login (required).
	 *
	 * Outputs:
	 * - `msg.payload`: An associative array of subscription processes <list id> => <list name> (on success).
	 *
	 * Error Handling:
	 * - If the session data is missing or invalid, the node will output an error in `msg.error`.
	 * - If no subscription processes are found or the API request fails, the node will return an error message in `msg.error`.
	 */
	function KlickTippSubscriptionProcessIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/list',
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched subscription processes' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch subscription processes: ${errorMessage}`,
					});
					msg.error = errorMessage;
				}
			} catch (error) {
				node.status({
					fill: 'red',
					shape: 'ring',
					text: 'Failed to fetch subscription processes.',
				});
				msg.error = error.message;
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
	 * by its ID for a logged-in user. This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *   - listId: (Required) The ID of the subscription process (list) to retrieve.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An object representing the subscription process.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriptionProcessGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const listId = msg?.payload?.listId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!listId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing list ID' });
				msg.payload = { error: 'Missing list ID' };
				return node.send(msg);
			}

			try {
				// Make the API request to get the specific subscription process by its list ID
				const response = await makeRequest(
					`/list/${encodeURIComponent(listId)}`,
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched subscription process' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch subscription process: ${errorMessage}`,
					});
					msg.error = errorMessage;
				}
			} catch (error) {
				// Handle failed API request
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch subscription process' });
				msg.error = error.message;
			}

			// Send the message with the result
			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscription process get', KlickTippSubscriptionProcessGetNode);

	/**
	 * KlickTippSubscriptionProcessRedirectNode - A Node-RED node to get the redirection URL for a given
	 * subscription process and email. This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *   - listId: (Required) The ID of the subscription process (list).
	 *   - email: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A string containing the redirection URL as defined in the subscription process.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriptionProcessRedirectNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract listId, and email from msg.payload
			const listId = msg?.payload?.listId || '';
			const email = msg?.payload?.email || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!listId || !email) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing list ID or email' });
				msg.error = 'Missing list ID or email';
				return node.send(msg);
			}

			try {
				const data = {
					listid: listId,
					email: email,
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/list/redirect', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched redirection URL' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch redirection URL: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch redirection URL' });
				msg.error = error.message;
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
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An associative array <tag id> => <tag name>.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippTagIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				// Make the API request to get the tags
				const response = await makeRequest(
					'/tag',
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched manual tags' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch manual tags: ${errorMessage}`,
					});
					msg.payload = null;
					msg.error = errorMessage;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch manual tags' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag index', KlickTippTagIndexNode);

	/**
	 * KlickTippTagGetNode - A Node-RED node to get the definition of a specific tag.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *   - tagId: (Required) The ID of the tag to retrieve.
	 *
	 * Outputs:
	 * - msg.klicktipp:
	 *   On success:
	 *     - An object representing the tag definition.
	 *   On failure:
	 *     - An error message describing what went wrong.).
	 */
	function KlickTippTagGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const tagId = msg?.payload?.tagId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!tagId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing tag ID' });
				msg.error = 'Missing tag ID';
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched tag definition' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch tag definition: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch tag definition' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag get', KlickTippTagGetNode);

	/**
	 * KlickTippTagCreateNode - A Node-RED node to create a new manual tag.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *   - sessionId: (Required) The session ID obtained during login.
	 *   - sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *   - name: (Required) The name of the tag to be created.
	 *   - text (Optional): An additional description of the tag.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - The ID of the newly created tag.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippTagCreateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const name = msg?.payload?.name || '';
			const text = msg?.payload?.text || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!name) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing tag name' });
				msg.error = 'Missing tag name';
				return node.send(msg);
			}

			try {
				const data = {
					name,
					...(text && { text }),
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/tag', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Tag created' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to create tag: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to create tag' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag create', KlickTippTagCreateNode);

	/**
	 * KlickTippTagUpdateNode - A Node-RED node to update a manual tag.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.payload: An object that must contain:
	 *   - tagId: (Required) The ID of the tag to be updated.
	 *   - name (Optional): The new tag name. If not provided, it will remain unchanged.
	 *   - text (Optional): The new tag description. If not provided, it will remain unchanged.
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the tag was successfully updated.
	 *   On failure:
	 *     - An error message describing what went wrong..
	 */
	function KlickTippTagUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const tagId = msg?.payload?.tagId || '';
			const name = msg?.payload?.name || '';
			const text = msg?.payload?.text || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!tagId || (name === '' && text === '')) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing tag ID or nothing to update' });
				msg.error = 'Missing tag ID or no updates provided';
				return node.send(msg);
			}

			try {
				const data = {
					...(name && { name }),
					...(text && { text }),
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'PUT',
					serializedData,
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Tag updated' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to update tag: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to update tag' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag update', KlickTippTagUpdateNode);

	/**
	 * KlickTippTagDeleteNode - A Node-RED node to delete a manual tag.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.payload: An object that must contain:
	 *   - tagId: The ID of the tag to be deleted.
	 *
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: The session ID obtained during login.
	 *  	- sessionName: The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the tag was successfully deleted.
	 *   On failure:
	 *     - An error message describing what went wrong..
	 */
	function KlickTippTagDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract tagId from msg.payload
			const tagId = msg?.payload?.tagId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!tagId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing tag ID' });
				msg.error = 'Missing tag ID';
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/tag/${encodeURIComponent(tagId)}`,
					'DELETE',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && !response.error) {
					msg.payload = {
						success: true,
					};
					node.status({ fill: 'green', shape: 'dot', text: 'Tag deleted' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to delete tag:  ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				// Handle failed API request
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to delete tag' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	// Register the tag deletion node with Node-RED
	RED.nodes.registerType('klicktipp tag delete', KlickTippTagDeleteNode);

	/**
	 * KlickTippFieldIndexNode - A Node-RED node to retrieve all contact fields of the logged-in user.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An associative array <field id> => <field name>.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippFieldIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/field',
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched contact fields' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to fetch contact fields: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch contact fields' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp field index', KlickTippFieldIndexNode);

	/**
	 * KlickTippSubscribeNode - A Node-RED node to subscribe an email.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload:
	 *    - email: (Required) E-mail address of the recipient
	 *    - listId (Optional): ID of the double opt-in process
	 *    - tagId (Optional) ID of the tag with which your contacts
	 *    - fields (Optional) Additional data of the recipient
	 *    - smsNumber (Optional) SMS mobile number of the recipient
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A subscriber data
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		// List of valid fields
		const validFieldList = [
			'fieldFirstName',
			'fieldLastName',
			'fieldCompanyName',
			'fieldStreet1',
			'fieldStreet2',
			'fieldCity',
			'fieldState',
			'fieldZip',
			'fieldCountry',
			'fieldPrivatePhone',
			'fieldMobilePhone',
			'fieldPhone',
			'fieldFax',
			'fieldWebsite',
			'fieldBirthday',
			'fieldLeadValue',
		];

		node.on('input', async function (msg) {
			const { email = '', smsNumber = '', listId = 0, tagId = 0, fields = {} } = msg.payload;

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email or SMS number' });
				msg.error = 'Missing email';
				return node.send(msg);
			}

			const filteredFields = {};
			for (const key in fields) {
				if (validFieldList.includes(key)) {
					filteredFields[key] = fields[key];
				} else {
					node.warn(`Ignoring invalid field: ${key}`);
				}
			}

			let data = {
				email,
				smsnumber: smsNumber,
				listid: listId || undefined,
				tagid: tagId || undefined,
				fields: Object.keys(filteredFields).length > 0 ? filteredFields : undefined,
			};

			// Remove undefined or empty parameters
			data = Object.fromEntries(
				Object.entries(data).filter(([key, value]) => value !== undefined && value !== null),
			);

			// Serialize the entire data object to URL-encoded string
			const serializedData = qs.stringify(data);

			try {
				const response = await makeRequest('/subscriber', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Subscribed successfully' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to subscribe: ${errorMessage}` });
					msg.error = errorMessage;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to subscribe' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscribe', KlickTippSubscribeNode);

	/**
	 * KlickTippUnsubscribeNode - A Node-RED node to unsubscribe an email.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *   - email: (Required) The email address of the subscriber to unsubscribe.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the email was successfully unsubscribed.
	 *   On failure:
	 *     - An error message describing what went wrong.
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
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email' });
				msg.error = 'Missing email';
				return node.send(msg);
			}

			try {
				const data = { email };

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/subscriber/unsubscribe', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Unsubscribed successfully' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to unsubscribe: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				console.log(error);
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to unsubscribe' });
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp unsubscribe', KlickTippUnsubscribeNode);

	/**
	 * KlickTippTagEmailNode - A Node-RED node to tag an email with one or more tags.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *    - email: (Required) The email address of the subscriber.
	 *    - tagIds: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An object representing the response from the KlickTipp API.
	 *   On failure:
	 *     - An error message describing what went wrong.).
	 */
	function KlickTippTagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = msg?.payload?.email || '';
			let tagIds = msg?.payload?.tagIds || [];

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email || !Array.isArray(tagIds)) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email or tag IDs' });
				msg.error = 'Missing email or tag IDs';
				return node.send(msg);
			}

			// Ensure tagIds is an array, even if a single tagId is provided
			if (typeof tagIds === 'number') {
				tagIds = [tagIds];
			}

			try {
				const data = {
					email,
					tagids: tagIds,
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/subscriber/tag', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && !response.error) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Email tagged successfully' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to tag email: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to tag email' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp tag email', KlickTippTagEmailNode);

	/**
	 * KlickTippUntagEmailNode - A Node-RED node to untag an email.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *    - email: (Required) The email address of the subscriber.
	 *    - tagId: (Required) The ID of the manual tag to be removed from the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the email was successfully untagged.
	 *   On failure:
	 *     - A boolean value `false`
	 *     - An error message describing what went wrong..
	 */
	function KlickTippUntagEmailNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = msg?.payload?.email || '';
			const tagId = msg?.payload?.tagId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email || !tagId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email or tag ID' });
				msg.error = 'Missing email or tag ID';
				return node.send(msg);
			}

			try {
				const data = {
					email,
					tagid: tagId,
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/subscriber/untag', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Email untagged successfully' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to untag email: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to untag email' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp untag email', KlickTippUntagEmailNode);

	/**
	 * KlickTippResendAutoresponderNode - A Node-RED node to resend an autoresponder to an email address.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *    - email: (Required) The email address of the subscriber.
	 *    - autoresponder: (Required) The ID of the autoresponder to resend.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the autoresponder was successfully resent.
	 *   On failure:
	 *     - A boolean value `false`
	 *     - An error message describing what went wrong.
	 */
	function KlickTippResendAutoresponderNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const email = msg?.payload?.email || '';
			const autoresponder = msg?.payload?.autoresponder || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email || !autoresponder) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email or autoresponder ID' });
				msg.error = 'Missing email or autoresponder ID';
				return node.send(msg);
			}

			try {
				const data = {
					email,
					autoresponder,
				};

				const serializedData = qs.stringify(data);

				// Make the API request to resend the autoresponder
				const response = await makeRequest('/subscriber/resend', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Autoresponder resent successfully' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to resend: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to resend autoresponder' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp resend autoresponder', KlickTippResendAutoresponderNode);

	/**
	 * KlickTippSubscriberIndexNode - A Node-RED node to retrieve all active subscribers.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An array of subscriber IDs.
	 *   On failure:
	 *     - An error message describing what went wrong.).
	 */
	function KlickTippSubscriberIndexNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					'/subscriber',
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched subscribers' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to fetch: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch subscribers' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber index', KlickTippSubscriberIndexNode);

	/**
	 * KlickTippSubscriberGetNode - A Node-RED node to retrieve information for a specific subscriber.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login.
	 * - msg.payload: An object that must contain:
	 *    - subscriberId: (Required) The ID of the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An object representing the KlickTipp subscriber.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriberGetNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const subscriberId = msg?.payload?.subscriberId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!subscriberId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing subscriber ID' });
				msg.error = 'Missing subscriber ID';
				return node.send(msg);
			}

			try {
				// Make the API request to get the subscriber information
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'GET',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Fetched subscriber information' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to fetch: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to fetch subscriber' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber get', KlickTippSubscriberGetNode);

	/**
	 * KlickTippSubscriberSearchNode - A Node-RED node to search for a subscriber by email and return the subscriber ID.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login
	 * - msg.payload: An object that must contain:
	 *    - email: (Required) The email address of the subscriber to search for.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - The ID of the subscriber.
	 *   On failure:
	 *     - An error message describing what went wrong..
	 */
	function KlickTippSubscriberSearchNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract email from msg.payload
			const email = msg?.payload?.email || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!email) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing email' });
				msg.error = 'Missing email';
				return node.send(msg);
			}

			try {
				const data = { email };

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/subscriber/search', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Subscriber ID retrieved' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to search: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to search for subscriber' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber search', KlickTippSubscriberSearchNode);

	/**
	 * KlickTippSubscriberTaggedNode - A Node-RED node to retrieve all subscribers tagged with a specific tag ID.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login
	 * - msg.payload: An object that must contain:
	 *   - tagId: (Required) The ID of the tag used to filter subscribers.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - An array of subscribers with their subscription dates, tagged with the given tag.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriberTaggedNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const tagId = msg?.payload?.tagId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!tagId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing tag ID' });
				msg.payload = { error: 'Missing tag ID' };
				return node.send(msg);
			}

			try {
				const data = { tagid: tagId };

				const serializedData = qs.stringify(data);

				const response = await makeRequest('/subscriber/tagged', 'POST', serializedData, {
					sessionId: msg.klicktipp.sessionId,
					sessionName: msg.klicktipp.sessionName,
				});

				if (response && response.data) {
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Subscribers tagged retrieved' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to retrieve: ${errorMessage}` });
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to retrieve tagged subscribers' });
				msg.payload = { error: error.message };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber tagged', KlickTippSubscriberTaggedNode);

	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login
	 * - msg.payload: An object that must contain:
	 *    - subscriberId: (Required) The ID of the subscriber to update.
	 *    - fields (Optional): Fields of the subscriber to update.
	 *    - newEmail (Optional): The new email address of the subscriber.
	 *    - newSmsNumber (Optional): The new SMS number of the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the subscriber was successfully updated.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriberUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const subscriberId = msg?.payload?.subscriberId || '';
			const fields = msg?.payload?.fields || {};
			const newEmail = msg?.payload?.newEmail || '';
			const newSmsNumber = msg?.payload?.newSmsNumber || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!subscriberId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing subscriber ID' });
				msg.error = 'Missing subscriber ID';
				return node.send(msg);
			}

			try {
				const data = {
					...(Object.keys(fields).length > 0 && { fields }),
					...(newEmail && { newemail: newEmail }),
					...(newSmsNumber && { newsmsnumber: newSmsNumber }),
				};

				const serializedData = qs.stringify(data);

				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'PUT',
					serializedData,
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Subscriber updated' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to update subscriber: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = null;
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to update subscriber' });
				msg.error = error.message;
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber update', KlickTippSubscriberUpdateNode);

	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * This requires the user to be logged in and have a valid session.
	 *
	 * Inputs:
	 * - msg.klicktipp: An object that must contain:
	 *  	- sessionId: (Required) The session ID obtained during login.
	 *  	- sessionName: (Required) The session name obtained during login
	 * - msg.payload: An object that must contain:
	 *    - subscriberId: (Required) The ID of the subscriber to delete.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the subscriber was successfully deleted.
	 *   On failure:
	 *     - A boolean value `false`.
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSubscriberDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const subscriberId = msg?.payload?.subscriberId || '';

			if (!validateSession(msg, node)) {
				return node.send(msg);
			}

			if (!subscriberId) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing subscriber ID' });
				msg.error = 'Missing subscriber ID';
				return node.send(msg);
			}

			try {
				const response = await makeRequest(
					`/subscriber/${encodeURIComponent(subscriberId)}`,
					'DELETE',
					{},
					{
						sessionId: msg.klicktipp.sessionId,
						sessionName: msg.klicktipp.sessionName,
					},
				);

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Subscriber deleted' });
				} else {
					const errorMessage = response ? response.error : 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to delete subscriber: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to delete subscriber' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			node.send(msg);
		});
	}
	RED.nodes.registerType('klicktipp subscriber delete', KlickTippSubscriberDeleteNode);

	/**
	 * KlickTippSigninNode - A Node-RED node to subscribe an email using an API key.
	 *
	 * Inputs:
	 * - msg.payload: An object that must contain:
	 *   - apikey: The API key for list building configuration.
	 *   - email (Required): The email address of the subscriber.
	 *   - smsnumber (Optional): The SMS number of the subscriber.
	 *   - fields (Optional): Additional fields for the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - The redirection URL as defined in the subscription process.
	 *   On failure:
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSigninNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract API key, email, and optional fields from msg.payload
			const { apiKey, email = '', smsNumber = '', fields = {} } = msg.payload;

			// Validate: Check if API key and either email or SMS number are provided
			if (!apiKey || (!email && !smsNumber)) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing API key or email/SMS number' });
				msg.error = 'Missing API key or email/SMS number';
				return node.send(msg);
			}

			try {
				// Build the data for the POST request
				const data = {
					apikey: apiKey,
					...(email && { email }), // Include email only if it's provided
					...(smsNumber && { smsnumber: smsNumber }), // Include smsNumber only if it's provided
					...(Object.keys(fields).length && { fields }), // Include fields only if not empty
				};

				// Serialize the entire data object to URL-encoded string
				const serializedData = qs.stringify(data);

				// Make the API request to subscribe the user
				const response = await makeRequest('/subscriber/signin', 'POST', serializedData);

				if (response && response.data) {
					// On success, return the response data
					msg.payload = response.data;
					node.status({ fill: 'green', shape: 'dot', text: 'Subscription successful' });
				} else {
					const errorMessage = response?.error || 'Unknown error';
					node.status({ fill: 'red', shape: 'ring', text: `Failed to subscribe: ${errorMessage}` });
					msg.error = errorMessage;
				}
			} catch (error) {
				// Handle failed API request
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to subscribe.' });
				msg.error = error.message;
			}

			// Send the message with the result
			node.send(msg);
		});
	}
	// Register the signin node with Node-RED
	RED.nodes.registerType('klicktipp signin', KlickTippSigninNode);

	/**
	 * KlickTippSignoutNode - A Node-RED node to untag an email using an API key.
	 *
	 * Inputs:
	 * - msg.payload: An object that must contain:
	 *   - apikey: (Required) The API key for list building configuration.
	 *   - email: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the email was successfully untagged.
	 *   On failure:
	 *     - A boolean value `false`.
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSignoutNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			// Extract API key and email from msg.payload
			const apiKey = msg.payload.apiKey;
			const email = msg.payload.email || '';

			// Validate: Check if API key and email are provided
			if (!apiKey || !email) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing API key or email' });
				msg.error = 'Missing API key or email';
				return node.send(msg);
			}

			try {
				// Build the data to send in the POST request
				const data = { apikey: apiKey, email };

				// Serialize the entire data object to URL-encoded string
				const serializedData = qs.stringify(data);

				// Make the API request to untag the subscriber
				const response = await makeRequest('/subscriber/signout', 'POST', serializedData);

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Untag successful' });
				} else {
					const errorMessage = response?.error || 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to untag email: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				console.log(error);
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to untag email' });
				msg.payload = { success: false };
			}

			// Send the message with the result
			node.send(msg);
		});
	}
	// Register the signout node with Node-RED
	RED.nodes.registerType('klicktipp signout', KlickTippSignoutNode);

	/**
	 * KlickTippSignoffNode - A Node-RED node to unsubscribe an email using an API key.
	 *
	 * Inputs:
	 * - msg.payload: An object that must contain:
	 *   - apiKey: (Required) The API key for list building configuration.
	 *   - email: (Required) The email address of the subscriber.
	 *
	 * Outputs:
	 * - msg.payload:
	 *   On success:
	 *     - A boolean value `true` indicating the email was successfully unsubscribed.
	 *   On failure:
	 *   	 - A boolean value `false`.
	 *     - An error message describing what went wrong.
	 */
	function KlickTippSignoffNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		node.on('input', async function (msg) {
			const apiKey = msg.payload.apiKey;
			const email = msg.payload.email || '';

			// Validate: Check if API key and email are provided
			if (!apiKey || !email) {
				node.status({ fill: 'red', shape: 'ring', text: 'Missing API key or email' });
				msg.error = 'Missing API key or email';
				return node.send(msg);
			}

			try {
				// Build the data to send in the POST request
				const data = { apikey: apiKey, email };

				// Serialize the entire data object to URL-encoded string
				const serializedData = qs.stringify(data);

				// Make the API request to unsubscribe the subscriber
				const response = await makeRequest('/subscriber/signoff', 'POST', serializedData);

				if (response && !response.error) {
					msg.payload = { success: true };
					node.status({ fill: 'green', shape: 'dot', text: 'Unsubscription successful' });
				} else {
					const errorMessage = response?.error || 'Unknown error';
					node.status({
						fill: 'red',
						shape: 'ring',
						text: `Failed to unsubscribe email: ${errorMessage}`,
					});
					msg.error = errorMessage;
					msg.payload = { success: false };
				}
			} catch (error) {
				console.log(error);
				node.status({ fill: 'red', shape: 'ring', text: 'Failed to unsubscribe email' });
				msg.error = error.message;
				msg.payload = { success: false };
			}

			// Send the message with the result
			node.send(msg);
		});
	}
	// Register the signoff node with Node-RED
	RED.nodes.registerType('klicktipp signoff', KlickTippSignoffNode);
};
