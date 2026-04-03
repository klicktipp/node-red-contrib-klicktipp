'use strict';

const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const CACHE_KEYS = require('./utils/cache/cacheKeys');
const makeRequest = require('./utils/makeRequest');
const getErrorMessage = require('./utils/getErrorMessage');
const { runWithSession } = require('./utils/klickTippSessionManager');

module.exports = function (RED) {
	// Configuration node for storing API credentials
	function KlickTippConfigNode(n) {
		RED.nodes.createNode(this, n);
		this.username = this.credentials.username;
		this.password = this.credentials.password;
		this._klickTippSessionData = null;
		this._klickTippSessionPromise = null;
		this._klickTippSessionAuthKey = null;
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

				const sessionOwner = id ? RED.nodes.getNode(id) : null;
				await runWithSession(sessionOwner, username, password, async (sessionData) => {
					await makeRequest('/list', 'GET', {}, sessionData);
				});

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
			fetchFunction: async (username, password, configNode) => {
				return await fetchKlickTippData(username, password, apiPath, configNode);
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
