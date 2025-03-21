'use strict';
const crypto = require('crypto');

module.exports = function (RED) {
	function KlickTippWebhookTriggerNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		// Generate a secure token if not provided in the configuration.
		if (!config.token) {
			config.token = crypto.randomBytes(16).toString('hex');
		}
		node.token = config.token;

		// Build the full webhook URL.
		node.webhookUrl = (RED.settings.httpNodeRoot || '') + '/klicktipp-webhook/' + node.token;
		node.log('Webhook URL set to: ' + node.webhookUrl);

		// Register an HTTP POST endpoint.
		const endpoint = '/klicktipp-webhook/' + node.token;
		RED.httpNode.post(endpoint, function (req, res) {
			// Use the request body as the payload (or an empty object if none).
			const payload = req.body || {};
			node.send({ payload: payload });
			res.sendStatus(200);
		});

		node.on('close', function () {
			node.log('Node closed.');
		});
	}

	RED.nodes.registerType('klicktipp-webhook-trigger', KlickTippWebhookTriggerNode, {
		credentials: {
			klicktipp: { type: 'klicktipp-config' },
		},
	});
};
