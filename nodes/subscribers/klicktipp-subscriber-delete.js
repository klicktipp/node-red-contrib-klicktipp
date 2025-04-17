'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		if (!subscriberId) {
			handleError(node, msg, 'Contact ID is missing', 'Invalid input');
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(node, msg, response, 'Contact deleted', 'Contact could not be deleted', () => {
				msg.payload = { success: true };
			});
		} catch (error) {
			handleError(
				node,
				msg,
				'Contact could not be deleted',
				error?.response?.data?.error || error.message,
			);
		}
	};
	/**
	 * KlickTippSubscriberDeleteNode - A Node-RED node to delete a subscriber.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
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
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-delete', KlickTippSubscriberDeleteNode);

	RED.httpAdmin.post(
		'/klicktipp/contactSearch',
		RED.auth.needsPermission('klicktipp.read'),
		async function (req, res) {
			const qs = require('qs');
			const makeRequest = require('../utils/makeRequest');
			const email = req.body.email;
			if (!email) {
				return res.status(400).json({ error: 'Missing email' });
			}
			// Get the config node id from the query parameter.
			const configId = req.query.configId;
			if (!configId) {
				return res.status(400).json({ error: 'Missing config node id' });
			}
			// Retrieve the config node. This node holds your credentials.
			const configNode = RED.nodes.getNode(configId);
			if (!configNode) {
				return res.status(400).json({ error: 'Invalid config node' });
			}
			// Retrieve credentials from the config node.
			const { username, password } = configNode.credentials || {};
			if (!username || !password) {
				return res.status(400).json({ error: 'Missing username or password in config node' });
			}
			let sessionData;
			try {
				// Perform login using the config node credentials.
				const loginResponse = await makeRequest('/account/login', 'POST', { username, password });
				if (loginResponse && loginResponse.data && loginResponse.data.sessid) {
					sessionData = {
						sessionId: loginResponse.data.sessid,
						sessionName: loginResponse.data.session_name,
					};
				} else {
					return res.status(400).json({ error: 'Invalid credentials or session ID missing' });
				}
			} catch (loginError) {
				return res.status(500).json({ error: 'Login request failed: ' + loginError.message });
			}
			try {
				// Use the obtained session data to perform the contact search.
				const searchResponse = await makeRequest(
					'/subscriber/search',
					'POST',
					qs.stringify({ email: email }),
					sessionData,
				);
				res.json(searchResponse.data);
			} catch (err) {
				if (err.response && err.response.status === 404) {
					res.status(404).json({ error: `404: Email Address ${email} not found` });
				} else {
					res.status(500).json({ error: err.toString() });
				}
			} finally {
				// Logout to clean up the session.
				try {
					await makeRequest('/account/logout', 'POST', {}, sessionData);
				} catch (logoutError) {
					// Log the logout error (but don’t fail the request).
					console.error('Logout failed:', logoutError.message);
				}
			}
		},
	);
};
