'use strict';
const crypto = require('crypto');

module.exports = function (RED) {
	function safeCompare(left, right) {
		if (typeof left !== 'string' || typeof right !== 'string') {
			return false;
		}

		const leftBuffer = Buffer.from(left);
		const rightBuffer = Buffer.from(right);

		if (leftBuffer.length !== rightBuffer.length) {
			return false;
		}

		return crypto.timingSafeEqual(leftBuffer, rightBuffer);
	}

	function removeHttpRoute(method, path, handler) {
		const router = RED.httpNode && RED.httpNode._router;

		if (!router || !Array.isArray(router.stack)) {
			return;
		}

		router.stack = router.stack.filter((layer) => {
			if (!layer.route || layer.route.path !== path) {
				return true;
			}

			const routeHandler = layer.route.stack.some(
				(routeLayer) => routeLayer.method === method && routeLayer.handle === handler,
			);

			return !routeHandler;
		});
	}

	function KlickTippWebhookTriggerNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		const webhookAuth = RED.nodes.getNode(config.webhookAuth);

		// Generate a secure token if not provided in the configuration.
		if (!config.token) {
			config.token = crypto.randomBytes(16).toString('hex');
		}
		node.token = config.token;

		node.bodyFieldName = webhookAuth?.bodyFieldName || 'Authorization';
		node.webhookSecret = webhookAuth?.secret || '';

		if (!node.webhookSecret) {
			node.status({ fill: 'red', shape: 'ring', text: 'missing webhook auth secret' });
		} else {
			node.status({ fill: 'green', shape: 'dot', text: `listening on ${node.bodyFieldName}` });
		}

		// Build the full webhook URL.
		node.webhookUrl = (RED.settings.httpNodeRoot || '') + '/klicktipp-webhook/' + node.token;
		node.log('Webhook URL set to: ' + node.webhookUrl);

		// Register an HTTP POST endpoint.
		const endpoint = '/klicktipp-webhook/' + node.token;
		const handleWebhook = function (req, res) {
			const payload = req.body || {};
			const providedSecret = payload[node.bodyFieldName];

			if (!node.webhookSecret || !safeCompare(providedSecret, node.webhookSecret)) {
				node.warn(`Rejected unauthorized webhook request for ${endpoint}`);
				res.sendStatus(401);
				return;
			}

			node.send({ payload: payload });
			res.sendStatus(200);
		};

		RED.httpNode.post(endpoint, handleWebhook);

		node.on('close', function () {
			removeHttpRoute('post', endpoint, handleWebhook);
			node.log('Node closed.');
		});
	}

	RED.nodes.registerType('klicktipp-webhook-trigger', KlickTippWebhookTriggerNode);
};
