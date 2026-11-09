'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const loadModuleWithMocks = require('./helpers/loadModuleWithMocks');
const { createTestRed } = require('./helpers/createTestRed');

const root = process.cwd();

test('klicktipp-config registers admin endpoints and test connection route', async () => {
	const runWithSessionCalls = [];
	const createApiEndpointCalls = [];
	const moduleFactory = loadModuleWithMocks(path.join(root, 'nodes/klicktipp-config.js'), {
		'./utils/createApiEndpoint': (RED, options) => {
			createApiEndpointCalls.push({ RED, options });
		},
		'./utils/makeRequest': async () => ({ data: { ok: true } }),
		'./utils/klickTippSessionManager': {
			async runWithSession(owner, username, password, callback) {
				runWithSessionCalls.push({ owner, username, password });
				return callback({ sessionName: 'SESS', sessionId: '123' });
			},
		},
	});

	const RED = createTestRed({
		configNodes: {
			cfg: { id: 'cfg' },
		},
		credentials: {
			cfg: { username: 'stored-user', password: 'stored-pass' },
		},
	});

	moduleFactory(RED);

	assert.ok(RED.__test.registeredTypes.has('klicktipp-config'));
	assert.equal(RED.__test.adminPostRoutes.length, 1);
	assert.equal(createApiEndpointCalls.length, 3);

	const route = RED.__test.adminPostRoutes[0];
	const handler = route.handlers.at(-1);

	const missingRes = RED.__test.createResponseRecorder();
	await handler({ body: {} }, missingRes);
	assert.equal(missingRes.statusCode, 400);

	const okRes = RED.__test.createResponseRecorder();
	await handler({ body: { id: 'cfg' } }, okRes);
	assert.equal(okRes.statusCode, 200);
	assert.deepEqual(okRes.jsonBody, { ok: true, message: 'Connection successful.' });
	assert.equal(runWithSessionCalls.length, 1);
});

test('webhook trigger accepts authorized requests and rejects unauthorized ones', () => {
	const RED = createTestRed({ httpNodeRoot: '/root' });
	const moduleFactory = require(path.join(root, 'nodes/triggers/klicktipp-webhook-trigger.js'));

	moduleFactory(RED);

	const node = RED.__test.instantiate('klicktipp-webhook-trigger', {
		token: 'abc123',
		authentication: 'yes',
		authParameterKey: 'Authorization',
		credentials: { authParameterValue: 'secret' },
	});

	assert.equal(node.webhookUrl, '/root/klicktipp-webhook/abc123');
	assert.equal(RED.__test.httpRoutes.length, 1);

	const route = RED.__test.httpRoutes[0];

	const failRes = RED.__test.createResponseRecorder();
	route.handler({ body: { Authorization: 'wrong' } }, failRes);
	assert.equal(failRes.statusCode, 401);
	assert.equal(node.warnHistory.length, 1);

	const okRes = RED.__test.createResponseRecorder();
	route.handler({ body: { Authorization: 'secret', hello: 'world' } }, okRes);
	assert.equal(okRes.statusCode, 200);
	assert.deepEqual(node.sentMessages.at(-1), {
		payload: { Authorization: 'secret', hello: 'world' },
	});

	node.emit('close');
	assert.equal(RED.httpNode._router.stack.length, 0);
});
