'use strict';

const { EventEmitter } = require('events');

function defaultEvaluateNodeProperty(property, propertyType, _node, msg, callback) {
	try {
		if (propertyType === 'msg') {
			const parts = String(property || '').split('.').filter(Boolean);
			const startIndex = parts[0] === 'payload' || parts[0] === 'topic' ? 0 : parts[0] === 'msg' ? 1 : 0;
			let current = msg;
			for (const key of parts.slice(startIndex)) {
				current = current?.[key];
			}
			return callback(null, current);
		}

		if (propertyType === 'num') {
			return callback(null, Number(property));
		}

		if (propertyType === 'json') {
			return callback(null, JSON.parse(property));
		}

		return callback(null, property);
	} catch (error) {
		return callback(error);
	}
}

function createResponseRecorder() {
	return {
		statusCode: 200,
		body: undefined,
		jsonBody: undefined,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.jsonBody = body;
			return this;
		},
		sendStatus(code) {
			this.statusCode = code;
			return this;
		},
	};
}

function createTestRed(options = {}) {
	const registeredTypes = new Map();
	const configNodes = new Map(Object.entries(options.configNodes || {}));
	const credentials = new Map(Object.entries(options.credentials || {}));
	const adminGetRoutes = [];
	const adminPostRoutes = [];
	const httpRoutes = [];

	const RED = {
		settings: {
			httpNodeRoot: options.httpNodeRoot || '',
		},
		util: {
			evaluateNodeProperty:
				options.evaluateNodeProperty || defaultEvaluateNodeProperty,
		},
		auth: {
			needsPermission: () => (_req, _res, next) => next && next(),
		},
		httpAdmin: {
			get(path, ...handlers) {
				adminGetRoutes.push({ path, handlers });
			},
			post(path, ...handlers) {
				adminPostRoutes.push({ path, handlers });
			},
		},
		httpNode: {
			_router: {
				stack: [],
			},
			post(path, handler) {
				httpRoutes.push({ method: 'post', path, handler });
				this._router.stack.push({
					route: {
						path,
						stack: [{ method: 'post', handle: handler }],
					},
				});
			},
		},
		nodes: {
			createNode(node, config) {
				EventEmitter.call(node);
				Object.setPrototypeOf(node, EventEmitter.prototype);
				Object.assign(node, config);
				node.credentials = config?.credentials || node.credentials || {};
				node.sentMessages = [];
				node.statusHistory = [];
				node.warnHistory = [];
				node.logHistory = [];
				node.send = (msg) => node.sentMessages.push(msg);
				node.status = (status) => node.statusHistory.push(status);
				node.warn = (message) => node.warnHistory.push(message);
				node.log = (message) => node.logHistory.push(message);
			},
			registerType(name, constructor, definition) {
				registeredTypes.set(name, { constructor, definition });
			},
			getNode(id) {
				return configNodes.get(id) || null;
			},
			getCredentials(id) {
				return credentials.get(id) || null;
			},
		},
	};

	RED.__test = {
		registeredTypes,
		configNodes,
		credentials,
		adminGetRoutes,
		adminPostRoutes,
		httpRoutes,
		createResponseRecorder,
		instantiate(type, config = {}) {
			const entry = registeredTypes.get(type);
			if (!entry) {
				throw new Error(`Node type not registered: ${type}`);
			}
			return new entry.constructor(config);
		},
	};

	return RED;
}

async function flushAsyncWork() {
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
}

async function triggerInput(node, msg = {}) {
	node.emit('input', msg);
	await flushAsyncWork();
	return msg;
}

module.exports = {
	createTestRed,
	createResponseRecorder,
	flushAsyncWork,
	triggerInput,
};
