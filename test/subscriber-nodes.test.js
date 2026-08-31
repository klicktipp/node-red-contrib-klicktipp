'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const loadModuleWithMocks = require('./helpers/loadModuleWithMocks');
const { createTestRed, triggerInput } = require('./helpers/createTestRed');

const root = process.cwd();

function directSessionWrapper(_RED, node, coreFunction) {
	return function (config) {
		node.on('input', async function (msg) {
			msg.sessionData = { sessionName: 'SESS', sessionId: '123' };
			await coreFunction.call(node, msg, config);
		});
	};
}

function loadSubscriberModule(fileName, extraMocks = {}) {
	return loadModuleWithMocks(path.join(root, fileName), {
		'../utils/createKlickTippSessionNode': directSessionWrapper,
		...extraMocks,
	});
}

test('subscriber subscribe refreshes contact after email multi-tag flow', async () => {
	const requests = [];
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-subscribe.js', {
		'../utils/makeRequest': async (url, method, data) => {
			requests.push({ url, method, data });
			if (url === '/subscriber') return { data: { id: 'orig', tags: ['101'] } };
			if (url === '/subscriber/tag') return { data: { success: true } };
			if (url === '/subscriber/search') return { data: ['sub-1'] };
			if (url === '/subscriber/sub-1') return { data: { id: 'sub-1', tags: ['101', '102', '103'] } };
			throw new Error(`Unexpected request: ${url}`);
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) => {
			if (property === 'payload.email') return 'john@example.com';
			if (property === 'payload.smsNumber') return '';
			return '';
		},
		'../utils/getContactFields': async () => ({ fieldFirstName: 'John' }),
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const node = RED.__test.instantiate('klicktipp-subscriber-subscribe', {
		email: 'payload.email',
		emailType: 'msg',
		smsNumber: 'payload.smsNumber',
		smsNumberType: 'msg',
		tagId: [101, 102, 103],
		listId: '77',
	});

	const msg = { payload: {} };
	await triggerInput(node, msg);

	assert.equal(node.statusHistory.at(-1).text, 'Contact created');
	assert.deepEqual(msg.payload, { id: 'sub-1', tags: ['101', '102', '103'] });
	assert.deepEqual(requests.map((entry) => entry.url), [
		'/subscriber',
		'/subscriber/tag',
		'/subscriber/search',
		'/subscriber/sub-1',
	]);
});

test('subscriber subscribe returns last response for sms-only multi-tag flow', async () => {
	const responses = [
		{ data: { tags: ['11'] } },
		{ data: { tags: ['11', '12'] } },
		{ data: { tags: ['11', '12', '13'] } },
	];
	const requests = [];
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-subscribe.js', {
		'../utils/makeRequest': async (url, method, data) => {
			requests.push({ url, method, data });
			return responses.shift();
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) => {
			if (property === 'payload.email') return '';
			if (property === 'payload.smsNumber') return '0049123';
			return '';
		},
		'../utils/getContactFields': async () => ({}),
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const node = RED.__test.instantiate('klicktipp-subscriber-subscribe', {
		email: 'payload.email',
		emailType: 'msg',
		smsNumber: 'payload.smsNumber',
		smsNumberType: 'msg',
		tagId: [11, 12, 13],
	});

	const msg = { payload: {} };
	await triggerInput(node, msg);

	assert.deepEqual(msg.payload, { tags: ['11', '12', '13'] });
	assert.equal(requests.filter((entry) => entry.url === '/subscriber').length, 3);
});

test('subscriber subscribe rewrites first add-or-update tag failure', async () => {
	const error = { response: { status: 406, data: { error: 403 } } };
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-subscribe.js', {
		'../utils/makeRequest': async () => {
			throw error;
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) =>
			property === 'payload.email' ? 'john@example.com' : '',
		'../utils/getContactFields': async () => ({}),
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const node = RED.__test.instantiate('klicktipp-subscriber-subscribe', {
		email: 'payload.email',
		emailType: 'msg',
		smsNumber: 'payload.smsNumber',
		smsNumberType: 'msg',
		tagId: [123456],
	});

	const msg = { payload: {} };
	await triggerInput(node, msg);

	assert.equal(msg.error, 'Failed to add or update contact with tag ID "123456". [406] Tag not found.');
});

test('subscriber subscribe rewrites email follow-up tag failure', async () => {
	const calls = [];
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-subscribe.js', {
		'../utils/makeRequest': async (url) => {
			calls.push(url);
			if (url === '/subscriber') return { data: { id: 'sub-1' } };
			if (url === '/subscriber/tag') throw { response: { status: 406, data: { error: 403 } } };
			throw new Error('Unexpected request');
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) =>
			property === 'payload.email' ? 'john@example.com' : '',
		'../utils/getContactFields': async () => ({}),
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const node = RED.__test.instantiate('klicktipp-subscriber-subscribe', {
		email: 'payload.email',
		emailType: 'msg',
		smsNumber: 'payload.smsNumber',
		smsNumberType: 'msg',
		tagId: [111, 222, 333],
	});

	const msg = { payload: {} };
	await triggerInput(node, msg);

	assert.deepEqual(calls, ['/subscriber', '/subscriber/tag']);
	assert.equal(msg.error, 'Failed to tag contact with tag ID "222". [406] Tag not found.');
});

test('subscriber subscribe rewrites sms follow-up tag failure', async () => {
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-subscribe.js', {
		'../utils/makeRequest': async (url, _method, data) => {
			if (url !== '/subscriber') throw new Error('Unexpected request');
			if (String(data).includes('tagid=222')) {
				throw { response: { status: 406, data: { error: 403 } } };
			}
			return { data: { ok: true } };
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) =>
			property === 'payload.smsNumber' ? '0049123' : '',
		'../utils/getContactFields': async () => ({}),
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const node = RED.__test.instantiate('klicktipp-subscriber-subscribe', {
		email: 'payload.email',
		emailType: 'msg',
		smsNumber: 'payload.smsNumber',
		smsNumberType: 'msg',
		tagId: [111, 222],
	});

	const msg = { payload: {} };
	await triggerInput(node, msg);

	assert.equal(msg.error, 'Failed to tag contact with tag ID "222". [406] Tag not found.');
});

test('subscriber tag validates required inputs and tags contact', async () => {
	const requests = [];
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-tag.js', {
		'../utils/makeRequest': async (url, method, data) => {
			requests.push({ url, method, data });
			return { data: { ok: true } };
		},
		'../utils/evaluatePropertyAsync': async (_RED, property) =>
			property === 'payload.email' ? 'john@example.com' : '',
	});

	const RED = createTestRed();
	moduleFactory(RED);
	const okNode = RED.__test.instantiate('klicktipp-subscriber-tag', {
		email: 'payload.email',
		emailType: 'msg',
		tagId: [],
	});
	const okMsg = { payload: { tagIds: '7,8,8' } };
	await triggerInput(okNode, okMsg);

	assert.deepEqual(okMsg.payload, { success: true });
	assert.equal(requests[0].url, '/subscriber/tag');

	const invalidNode = RED.__test.instantiate('klicktipp-subscriber-tag', {
		email: 'payload.email',
		emailType: 'msg',
		tagId: [],
	});
	const invalidMsg = { payload: {} };
	await triggerInput(invalidNode, invalidMsg);
	assert.equal(invalidMsg.error, 'Invalid input');
	assert.equal(invalidNode.statusHistory.at(-1).text, 'Tag ID is missing: Invalid input');
});

test('subscriber untag enforces max 50 unique tags and reports failing tag id', async () => {
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-untag.js', {
		'../utils/makeRequest': async (_url, _method, data) => {
			if (String(data).includes('tagid=22')) {
				throw { response: { status: 406, data: { error: 403 } } };
			}
			return { data: { ok: true } };
		},
		'../utils/evaluatePropertyAsync': async () => 'john@example.com',
	});

	const RED = createTestRed();
	moduleFactory(RED);

	const limitNode = RED.__test.instantiate('klicktipp-subscriber-untag', {
		email: 'payload.email',
		emailType: 'msg',
		tagId: [],
	});
	const limitMsg = {
		payload: {
			tagIds: Array.from({ length: 51 }, (_, index) => index + 1).join(','),
		},
	};
	await triggerInput(limitNode, limitMsg);
	assert.equal(limitMsg.error, 'Invalid input');
	assert.equal(
		limitNode.statusHistory.at(-1).text,
		'The number of allowable tags has been exceeded. The maximum allowable is 50 at a time: Invalid input',
	);

	const failNode = RED.__test.instantiate('klicktipp-subscriber-untag', {
		email: 'payload.email',
		emailType: 'msg',
		tagId: [],
	});
	const failMsg = { payload: { tagIds: '21,22,23' } };
	await triggerInput(failNode, failMsg);
	assert.equal(failMsg.error, 'Failed to untag tag ID "22". [406] Tag not found.');
});

test('subscriber search validates email and maps id response', async () => {
	const moduleFactory = loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-search.js', {
		'../utils/makeRequest': async () => ({ data: ['sub-99'] }),
		'../utils/evaluatePropertyAsync': async (_RED, property, _type, _node, msg) => msg.payload.email,
	});

	const RED = createTestRed();
	moduleFactory(RED);

	const okNode = RED.__test.instantiate('klicktipp-subscriber-search', {
		email: 'payload.email',
		emailType: 'msg',
	});
	const okMsg = { payload: { email: 'john@example.com' } };
	await triggerInput(okNode, okMsg);
	assert.deepEqual(okMsg.payload, { id: 'sub-99' });

	const invalidNode = RED.__test.instantiate('klicktipp-subscriber-search', {
		email: 'payload.email',
		emailType: 'msg',
	});
	const invalidMsg = { payload: { email: '' } };
	await triggerInput(invalidNode, invalidMsg);
	assert.equal(invalidMsg.error, 'Invalid input');
});

test('subscriber index, tagged, get, delete, update, and unsubscribe perform their core transformations', async () => {
	const makeRequest = async (url) => {
		if (url.startsWith('/subscriber/tagged')) return { data: { a: '2026-08-31 10:00:00' } };
		if (url === '/subscriber?status=active&bounceStatus=notBounced') return { data: { a: 'Alice' } };
		if (url === '/subscriber/sub-1') return { data: { id: 'sub-1' } };
		if (url === '/subscriber/unsubscribe') return { data: { ok: true } };
		if (url === '/subscriber/search') return { data: ['sub-1'] };
		return { data: { ok: true } };
	};

	const sharedMocks = {
		'../utils/makeRequest': makeRequest,
		'../utils/evaluatePropertyAsync': async (_RED, property, _type, _node, msg) => {
			if (property === 'payload.email') return msg.payload.email;
			if (property === 'payload.newEmail') return msg.payload.newEmail;
			if (property === 'payload.newSms') return msg.payload.newSms;
			return '';
		},
	};

	const RED = createTestRed();

	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-index.js', sharedMocks)(RED);
	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-tagged.js', sharedMocks)(RED);
	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-get.js', {
		...sharedMocks,
		'../utils/resolveSubscriberId': async () => 'sub-1',
	})(RED);
	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-delete.js', {
		...sharedMocks,
		'../utils/resolveSubscriberId': async () => 'sub-1',
	})(RED);
	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-update.js', {
		...sharedMocks,
		'../utils/resolveSubscriberId': async () => 'sub-1',
		'../utils/getContactFields': async () => ({ fieldFirstName: 'Alice' }),
	})(RED);
	loadSubscriberModule('nodes/subscribers/klicktipp-subscriber-unsubscribe.js', sharedMocks)(RED);

	const indexNode = RED.__test.instantiate('klicktipp-subscriber-index', {
		subscriptionStatus: ['active', 'active'],
		bounceStatus: ['notBounced', 'notBounced'],
	});
	const taggedNode = RED.__test.instantiate('klicktipp-subscriber-tagged', {
		tagId: '123',
		subscriptionStatus: [],
		bounceStatus: [],
	});
	const getNode = RED.__test.instantiate('klicktipp-subscriber-get', {});
	const deleteNode = RED.__test.instantiate('klicktipp-subscriber-delete', {});
	const updateNode = RED.__test.instantiate('klicktipp-subscriber-update', {
		newEmailAddress: 'payload.newEmail',
		newEmailAddressType: 'msg',
		newSmsNumber: 'payload.newSms',
		newSmsNumberType: 'msg',
	});
	const unsubscribeNode = RED.__test.instantiate('klicktipp-subscriber-unsubscribe', {
		email: 'payload.email',
		emailType: 'msg',
	});

	const indexMsg = { payload: {} };
	const taggedMsg = { payload: {} };
	const getMsg = { payload: {} };
	const deleteMsg = { payload: {} };
	const updateMsg = { payload: { newEmail: 'new@example.com', newSms: '0049' } };
	const unsubscribeMsg = { payload: { email: 'john@example.com' } };

	await triggerInput(indexNode, indexMsg);
	await triggerInput(taggedNode, taggedMsg);
	await triggerInput(getNode, getMsg);
	await triggerInput(deleteNode, deleteMsg);
	await triggerInput(updateNode, updateMsg);
	await triggerInput(unsubscribeNode, unsubscribeMsg);

	assert.deepEqual(indexMsg.payload, [{ id: 'a', value: 'Alice' }]);
	assert.deepEqual(taggedMsg.payload, [{ id: 'a', timestamp: '2026-08-31 10:00:00' }]);
	assert.deepEqual(getMsg.payload, { id: 'sub-1' });
	assert.deepEqual(deleteMsg.payload, { success: true });
	assert.deepEqual(updateMsg.payload, { success: true });
	assert.deepEqual(unsubscribeMsg.payload, { success: true });
});
