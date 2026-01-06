'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);

		// Use config.tagId (which is already prepared as an array in oneditsave)
		let tagIds = config.manualFieldEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagId;

		// If tagIds is a string (as an extra precaution), split it.
		if (typeof tagIds === 'string') {
			tagIds = tagIds.split(',').map((s) => Number(s.trim()));
		} else if (!Array.isArray(tagIds)) {
			tagIds = [tagIds];
		}

		if (!email) {
			handleError(node, msg, 'Email is missing', 'Invalid input');
			return node.send(msg);
		}

		// Filter out any NaN entries
		tagIds = tagIds
			.filter((v) => v !== '')
			.map((v) => Number(v))
			.filter((tagId) => !isNaN(tagId));

		if (tagIds.length === 0) {
			handleError(node, msg, 'Tag ID is missing', 'Invalid input');
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/tag',
				'POST',
				qs.stringify({
					email,
					tagids: tagIds,
				}),
				msg.sessionData,
			);

			// Handle the response
			handleResponse(this, msg, response, 'Contact tagged', 'Contact could not be tagged', () => {
				msg.payload = { success: true };
			});
		} catch (error) {
			handleError(
				node,
				msg,
				'Contact could not be tagged',
				error?.response?.data || error?.message,
				tagIds,
			);
		}
	};

	/**
	 * KlickTippSubscriberTagNode - A Node-RED node to tag an email with one or more tags.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagIds`: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: An object containing `success: true`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag IDs are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberTagNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-tag', KlickTippSubscriberTagNode);

	RED.httpAdmin.post(
		'/klicktipp/createTag',
		RED.auth.needsPermission('klicktipp.write'), // if no custom perm, use 'klicktipp.read'
		async function (req, res) {
			const { name, text } = req.body || {};
			if (!name) {
				return res.status(400).json({ error: 'Missing tag name' });
			}
			const configId = req.query.configId;
			if (!configId) {
				return res.status(500).json({ error: 'Missing config node id' });
			}
			const configNode = RED.nodes.getNode(configId);
			if (!configNode) {
				return res.status(500).json({ error: 'Invalid config node' });
			}
			const { username, password } = configNode.credentials || {};
			if (!username || !password) {
				return res.status(401).json({ error: 'Missing username or password in config node' });
			}

			let sessionData;
			try {
				// Login
				const loginResponse = await makeRequest('/account/login', 'POST', { username, password });
				if (loginResponse && loginResponse.data && loginResponse.data.sessid) {
					sessionData = {
						sessionId: loginResponse.data.sessid,
						sessionName: loginResponse.data.session_name,
					};
				} else {
					return res.status(401).json({ error: 'Invalid credentials or session ID missing' });
				}
			} catch (loginError) {
				return res.status(500).json({ error: 'Login request failed: ' + loginError.message });
			}

			try {
				// Create tag
				const payload = { name: name };
				if (text && String(text).trim() !== '') {
					payload.text = text;
				}
				const response = await makeRequest('/tag', 'POST', qs.stringify(payload), sessionData);
				// Pass through API payload
				return res.json(response.data);
			} catch (err) {
				const msg =
					(err.response && err.response.data && err.response.data.error) ||
					err.message ||
					'Create tag failed';
				return res.status(err.response?.status || 500).json({ error: msg });
			} finally {
				// Logout best-effort
				try {
					await makeRequest('/account/logout', 'POST', {}, sessionData);
				} catch (logoutError) {
					console.error('Logout failed:', logoutError.message);
				}
			}
		},
	);
};
