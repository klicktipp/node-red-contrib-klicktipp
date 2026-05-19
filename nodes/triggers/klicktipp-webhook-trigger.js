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

			const routeHandler = layer.route.stack.some((routeLayer) => {
				if (routeLayer.method !== method) {
					return false;
				}

				if (!handler) {
					return true;
				}

				return routeLayer.handle === handler;
			});

			return !routeHandler;
		});
	}

	function KlickTippWebhookTriggerNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		// Generate a secure token if not provided in the configuration.
		if (!config.token) {
			config.token = crypto.randomBytes(16).toString('hex');
		}
		node.token = config.token;

		node.authentication = config.authentication;
		node.authParameterKey = (config.authParameterKey || 'Authorization').trim() || 'Authorization';
		node.authParameterValue =
			typeof node.credentials?.authParameterValue === 'string'
				? node.credentials.authParameterValue.trim()
				: '';
		node.hasAuthentication = node.authentication === 'yes';

		// Build the full webhook URL.
		node.webhookUrl = (RED.settings.httpNodeRoot || '') + '/klicktipp-webhook/' + node.token;
		node.log('Webhook URL set to: ' + node.webhookUrl);

		// Register an HTTP POST endpoint.
		const endpoint = '/klicktipp-webhook/' + node.token;
		const handleWebhook = function (req, res) {
			const payload = req.body || {};
			const providedAuthParameterValue = payload[node.authParameterKey];

			if (node.hasAuthentication && !node.authParameterValue) {
				node.warn(`Rejected webhook request for ${endpoint}: empty authentication value`);
				res.sendStatus(401);
				return;
			}

			if (node.hasAuthentication && !safeCompare(providedAuthParameterValue, node.authParameterValue)) {
				node.warn(`Rejected unauthorized webhook request for ${endpoint}`);
				res.sendStatus(401);
				return;
			}

			node.send({ payload: payload });
			res.sendStatus(200);
		};

		// Remove any stale handlers left behind for the same token before registering the new one.
		removeHttpRoute('post', endpoint);
		RED.httpNode.post(endpoint, handleWebhook);

		node.on('close', function () {
			removeHttpRoute('post', endpoint, handleWebhook);
			node.log('Node closed.');
		});
	}

	RED.nodes.registerType('klicktipp-webhook-trigger', KlickTippWebhookTriggerNode, {
		credentials: {
			authParameterValue: { type: 'password' },
		},
	});
};
