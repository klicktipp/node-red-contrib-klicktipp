'use strict';

const createCachedApiEndpoint = require("./utils/cache/createCachedApiEndpoint");
const fetchKlickTippData = require("./utils/fetchKlickTippData");

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
	
	// Helper function to register endpoints with caching
	const registerKlickTippEndpoint = (endpointPath, apiPath) => {
		createCachedApiEndpoint(RED, {
			endpoint: endpointPath,
			cacheKey: `${apiPath}_cache`,
			fetchFunction: async (username, password) => {
				return await fetchKlickTippData(username, password, apiPath);
			}
		});
	};
	
	// Register each endpoint with caching
	registerKlickTippEndpoint('/klicktipp/tags/:nodeId', '/tag');
	registerKlickTippEndpoint('/klicktipp/contact-fields/:nodeId', '/field');
	registerKlickTippEndpoint('/klicktipp/subscription-processes/:nodeId', '/list');
};
