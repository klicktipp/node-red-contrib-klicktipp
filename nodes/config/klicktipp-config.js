'use strict';

const createCachedApiEndpoint = require('../utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('../utils/fetchKlickTippData');
const CACHE_KEYS = require('../utils/cache/cacheKeys');
const cache = require("../utils/cache/cache");

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
		}
	});
	
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