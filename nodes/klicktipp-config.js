'use strict';

const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const CACHE_KEYS = require('./utils/cache/cacheKeys');
const makeRequest = require('./utils/makeRequest');
const getErrorMessage = require('./utils/getErrorMessage');

module.exports = function (RED) {
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

	RED.httpAdmin.post(
		'/klicktipp/test-connection',
		RED.auth.needsPermission('klicktipp-config.write'),
		async (req, res) => {
			try {
				let { id, username, password } = req.body || {};

				// If testing an existing config node, use stored credentials
				if (id) {
					const creds = RED.nodes.getCredentials(id);
					if (creds?.username) username = creds.username;
					if (creds?.password) password = creds.password;
				}

				if (!username || !password) {
					return res
						.status(400)
						.json({ ok: false, message: 'Username and password are required.' });
				}

				// 1) login
				const loginResponse = await makeRequest('/account/login', 'POST', { username, password });

				const sessid = loginResponse?.data?.sessid;
				const sessionName = loginResponse?.data?.session_name;

				if (!sessid || !sessionName) {
					return res.status(401).json({
						ok: false,
						message: 'Login failed: missing sessid/session_name in response.',
					});
				}

				const sessionData = { sessionId: sessid, sessionName };

				// 2) verify session by calling an authenticated endpoint /list as "subscription-processes"
				try {
					await makeRequest('/list', 'GET', {}, sessionData);
				} catch (verifyErr) {
					// logout, then report verify failure
					try {
						await makeRequest('/account/logout', 'POST', {}, sessionData);
					} catch (_) {}

					return res.status(401).json({ ok: false, message: getErrorMessage(verifyErr) });
				}

				// 3) logout
				try {
					await makeRequest('/account/logout', 'POST', {}, sessionData);
				} catch (_) {}

				return res.json({ ok: true, message: 'Connection successful.' });
			} catch (err) {
				// Most likely wrong creds -> 401 with body array message
				const msg = getErrorMessage(err);
				const status = err?.response?.status || err?.statusCode || 500;

				return res.status(status).json({ ok: false, message: msg });
			}
		},
	);

	// Helper function to register endpoints with caching
	const registerKlickTippEndpoint = (endpointPath, apiPath, cacheKey) => {
		createCachedApiEndpoint(RED, {
			endpoint: endpointPath,
			cacheKey: cacheKey,
			fetchFunction: async (username, password) => {
				return await fetchKlickTippData(username, password, apiPath);
			},
		});
	};

	// Register each endpoint with caching, using centralized cache keys
	registerKlickTippEndpoint('/klicktipp/tags/:nodeId', '/tag', CACHE_KEYS.TAGS);
	registerKlickTippEndpoint('/klicktipp/contact-fields/:nodeId', '/field', CACHE_KEYS.FIELDS);
	registerKlickTippEndpoint(
		'/klicktipp/subscription-processes/:nodeId',
		'/list',
		CACHE_KEYS.OPT_IN_PROCESSES,
	);
};
