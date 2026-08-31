'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const loadModuleWithMocks = require('./helpers/loadModuleWithMocks');
const { createTestRed, triggerInput } = require('./helpers/createTestRed');

const root = process.cwd();

test('normalizeTagIds deduplicates and validates numeric ids', () => {
	const normalizeTagIds = require(path.join(root, 'nodes/utils/normalizeTagIds.js'));

	assert.deepEqual(normalizeTagIds('1, 2,2,,3,abc,-1,0,4'), [1, 2, 3, 4]);
});

test('normalizeTagIds returns metadata when limit is configured', () => {
	const normalizeTagIds = require(path.join(root, 'nodes/utils/normalizeTagIds.js'));

	const result = normalizeTagIds('1,2,3,4', { includeMeta: true, maxTagIds: 3 });

	assert.deepEqual(result, {
		tagIds: [1, 2, 3],
		exceedsMax: true,
		maxAllowed: 3,
		totalCount: 4,
	});
});

test('resolveTagIdsInput prefers payload values when config tag ids are empty', () => {
	const resolveTagIdsInput = require(path.join(root, 'nodes/utils/resolveTagIdsInput.js'));

	const result = resolveTagIdsInput(
		{ tagId: [] },
		{ payload: { tagIds: '11,12,12' } },
	);

	assert.deepEqual(result, [11, 12]);
});

test('resolveTagIdsInput supports manual mode metadata and limit', () => {
	const resolveTagIdsInput = require(path.join(root, 'nodes/utils/resolveTagIdsInput.js'));

	const result = resolveTagIdsInput(
		{ manualFieldEnabled: true, manualTagId: '' },
		{ payload: { manualTagId: '1,2,3' } },
		{ includeMeta: true, maxTagIds: 2 },
	);

	assert.deepEqual(result, {
		tagIds: [1, 2],
		exceedsMax: true,
		maxAllowed: 2,
		totalCount: 3,
	});
});

test('createKlickTippSessionNode sends validation error when credentials are missing', async () => {
	const createKlickTippSessionNode = require(path.join(root, 'nodes/utils/createKlickTippSessionNode.js'));
	const RED = createTestRed({
		configNodes: {
			cfg: {},
		},
	});

	const node = {};
	RED.nodes.createNode(node, {});
	createKlickTippSessionNode(RED, node, async () => {
		throw new Error('should not run');
	})({ klicktipp: 'cfg' });

	const msg = {};
	await triggerInput(node, msg);

	assert.equal(msg.error, 'Missing email or password');
	assert.deepEqual(msg.payload, { success: false });
	assert.equal(node.sentMessages.length, 1);
});

test('createKlickTippSessionNode injects session, calls core function, and cleans up msg', async () => {
	const runWithSessionCalls = [];
	const createKlickTippSessionNode = loadModuleWithMocks(
		path.join(root, 'nodes/utils/createKlickTippSessionNode.js'),
		{
			'./klickTippSessionManager': {
				async runWithSession(configNode, username, password, callback) {
					runWithSessionCalls.push({ configNode, username, password });
					return callback({ sessionName: 'SESS', sessionId: '123' });
				},
			},
		},
	);

	const RED = createTestRed({
		configNodes: {
			cfg: { username: 'user', password: 'pass' },
		},
	});

	const node = {};
	RED.nodes.createNode(node, {});

	createKlickTippSessionNode(RED, node, async function (msg) {
		assert.deepEqual(msg.sessionData, { sessionName: 'SESS', sessionId: '123' });
		msg.payload = { ok: true };
	})({ klicktipp: 'cfg' });

	const msg = {};
	await triggerInput(node, msg);

	assert.deepEqual(runWithSessionCalls, [
		{
			configNode: { username: 'user', password: 'pass' },
			username: 'user',
			password: 'pass',
		},
	]);
	assert.equal(msg.sessionData, undefined);
	assert.deepEqual(msg.payload, { ok: true });
	assert.equal(node.sentMessages.length, 1);
});

test('resolveSubscriberId validates id input and resolves email lookups', async () => {
	const resolveSubscriberId = loadModuleWithMocks(
		path.join(root, 'nodes/utils/resolveSubscriberId.js'),
		{
			'./makeRequest': async () => ({ data: ['subscriber-1'] }),
		},
	);

	const RED = createTestRed();
	const node = {};
	RED.nodes.createNode(node, {});

	const byId = await resolveSubscriberId(
		RED,
		node,
		{
			identifierType: 'id',
			subscriberId: 'payload.subscriberId',
			subscriberIdType: 'msg',
		},
		{ payload: { subscriberId: 'abc-1' } },
	);

	const byEmail = await resolveSubscriberId(
		RED,
		node,
		{
			identifierType: 'email',
			emailAddress: 'payload.emailAddress',
			emailAddressType: 'msg',
		},
		{ payload: { emailAddress: 'john@example.com' }, sessionData: {} },
	);

	assert.equal(byId, 'abc-1');
	assert.equal(byEmail, 'subscriber-1');
});
