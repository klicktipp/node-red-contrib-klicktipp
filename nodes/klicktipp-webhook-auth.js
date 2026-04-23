'use strict';

module.exports = function (RED) {
	function KlickTippWebhookAuthNode(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.bodyFieldName = (config.bodyFieldName || 'Authorization').trim() || 'Authorization';
		this.secret = this.credentials.secret;
	}

	RED.nodes.registerType('klicktipp-webhook-auth', KlickTippWebhookAuthNode, {
		credentials: {
			secret: { type: 'password' },
		},
	});
};
