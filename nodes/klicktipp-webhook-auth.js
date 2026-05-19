'use strict';

module.exports = function (RED) {
	function KlickTippWebhookAuthNode(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.authParameterKey = (config.authParameterKey || 'Authorization').trim() || 'Authorization';
		this.authParameterValue = this.credentials.authParameterValue || '';
	}

	RED.nodes.registerType('klicktipp-webhook-auth', KlickTippWebhookAuthNode, {
		credentials: {
			authParameterValue: { type: 'password' },
		},
	});
};
