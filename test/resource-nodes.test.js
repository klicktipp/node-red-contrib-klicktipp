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

function loadNodeModule(fileName, extraMocks = {}) {
	return loadModuleWithMocks(path.join(root, fileName), {
		'../utils/createKlickTippSessionNode': directSessionWrapper,
		...extraMocks,
	});
}

test('tag nodes cover create, update, delete, get, and index flows', async () => {
	const requests = [];
	const makeRequest = async (url, method, data) => {
		requests.push({ url, method, data });
		if (url === '/tag' && method === 'POST') return { data: ['tag-1'] };
		if (url === '/tag' && method === 'GET') return { data: { 1: 'Alpha' } };
		if (url === '/tag/77' && method === 'GET') return { data: { id: '77', name: 'VIP' } };
		return { data: { ok: true } };
	};
	const evaluatePropertyAsync = async (_RED, property, _type, _node, msg) => {
		if (property === 'payload.name') return msg.payload.name || '';
		if (property === 'payload.text') return msg.payload.text || '';
		return '';
	};

	const RED = createTestRed();

	loadNodeModule('nodes/tags/klicktipp-tag-create.js', {
		'../utils/makeRequest': makeRequest,
		'../utils/evaluatePropertyAsync': evaluatePropertyAsync,
	})(RED);
	loadNodeModule('nodes/tags/klicktipp-tag-update.js', {
		'../utils/makeRequest': makeRequest,
		'../utils/evaluatePropertyAsync': evaluatePropertyAsync,
	})(RED);
	loadNodeModule('nodes/tags/klicktipp-tag-delete.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);
	loadNodeModule('nodes/tags/klicktipp-tag-get.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);
	loadNodeModule('nodes/tags/klicktipp-tag-index.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);

	const createNode = RED.__test.instantiate('klicktipp-tag-create', {
		tagName: 'payload.name',
		tagNameType: 'msg',
		tagDescription: 'payload.text',
		tagDescriptionType: 'msg',
	});
	const updateNode = RED.__test.instantiate('klicktipp-tag-update', {
		tagId: '77',
		tagName: 'payload.name',
		tagNameType: 'msg',
		tagDescription: 'payload.text',
		tagDescriptionType: 'msg',
	});
	const deleteNode = RED.__test.instantiate('klicktipp-tag-delete', { tagId: '77' });
	const getNode = RED.__test.instantiate('klicktipp-tag-get', { tagId: '77' });
	const indexNode = RED.__test.instantiate('klicktipp-tag-index', {});

	const createMsg = { payload: { name: 'VIP', text: 'Very important' } };
	const updateMsg = { payload: { name: 'VIP+', text: '' } };
	const deleteMsg = { payload: {} };
	const getMsg = { payload: {} };
	const indexMsg = { payload: {} };

	await triggerInput(createNode, createMsg);
	await triggerInput(updateNode, updateMsg);
	await triggerInput(deleteNode, deleteMsg);
	await triggerInput(getNode, getMsg);
	await triggerInput(indexNode, indexMsg);

	assert.deepEqual(createMsg.payload, { id: 'tag-1' });
	assert.deepEqual(updateMsg.payload, { success: true });
	assert.deepEqual(deleteMsg.payload, { success: true });
	assert.deepEqual(getMsg.payload, { id: '77', name: 'VIP' });
	assert.deepEqual(indexMsg.payload, [{ id: '1', value: 'Alpha' }]);
	assert.equal(requests.length, 5);
});

test('tag update and tag create validation errors are handled', async () => {
	const moduleCreate = loadNodeModule('nodes/tags/klicktipp-tag-create.js', {
		'../utils/evaluatePropertyAsync': async () => '',
		'../utils/makeRequest': async () => ({ data: ['x'] }),
	});
	const moduleUpdate = loadNodeModule('nodes/tags/klicktipp-tag-update.js', {
		'../utils/evaluatePropertyAsync': async () => '',
		'../utils/makeRequest': async () => ({ data: { ok: true } }),
	});

	const RED = createTestRed();
	moduleCreate(RED);
	moduleUpdate(RED);

	const createNode = RED.__test.instantiate('klicktipp-tag-create', {
		tagName: 'payload.name',
		tagNameType: 'msg',
	});
	const updateNode = RED.__test.instantiate('klicktipp-tag-update', {
		tagId: '7',
		tagName: 'payload.name',
		tagNameType: 'msg',
		tagDescription: 'payload.text',
		tagDescriptionType: 'msg',
	});

	const createMsg = { payload: {} };
	const updateMsg = { payload: {} };

	await triggerInput(createNode, createMsg);
	await triggerInput(updateNode, updateMsg);

	assert.equal(createMsg.error, 'Tag name is missing');
	assert.equal(updateMsg.error, 'Invalid input');
});

test('field nodes cover get and index flows plus validation', async () => {
	const RED = createTestRed();
	const makeRequest = async (url) => {
		if (url === '/field/123') return { data: { id: '123', name: 'Company' } };
		if (url === '/field') return { data: { field123: 'Company' } };
		throw new Error('Unexpected request');
	};

	loadNodeModule('nodes/fields/klicktipp-field-get.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);
	loadNodeModule('nodes/fields/klicktipp-field-index.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);

	const getNode = RED.__test.instantiate('klicktipp-field-get', { apiFieldId: 'field123' });
	const getMsg = { payload: {} };
	await triggerInput(getNode, getMsg);
	assert.deepEqual(getMsg.payload, { id: '123', name: 'Company' });

	const invalidGetNode = RED.__test.instantiate('klicktipp-field-get', { apiFieldId: '' });
	const invalidGetMsg = { payload: {} };
	await triggerInput(invalidGetNode, invalidGetMsg);
	assert.equal(invalidGetMsg.error, 'Invalid input');

	const indexNode = RED.__test.instantiate('klicktipp-field-index', {});
	const indexMsg = { payload: {} };
	await triggerInput(indexNode, indexMsg);
	assert.deepEqual(indexMsg.payload, [{ id: 'field123', value: 'Company' }]);
});

test('subscription process nodes cover get, index, and redirect flows', async () => {
	const requests = [];
	const RED = createTestRed();
	const makeRequest = async (url, method) => {
		requests.push({ url, method });
		if (url === '/list/12') return { data: { id: '12', name: 'DOI' } };
		if (url === '/list') return { data: { 12: 'DOI' } };
		if (url === '/list/redirect') return { data: ['https://example.com/redirect'] };
		throw new Error(`Unexpected request: ${url}`);
	};

	loadNodeModule('nodes/subscription-processes/klicktipp-subscription-process-get.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);
	loadNodeModule('nodes/subscription-processes/klicktipp-subscription-process-index.js', {
		'../utils/makeRequest': makeRequest,
	})(RED);
	loadNodeModule('nodes/subscription-processes/klicktipp-subscription-process-get-redirect.js', {
		'../utils/makeRequest': makeRequest,
		'../utils/evaluatePropertyAsync': async () => 'john@example.com',
	})(RED);

	const getNode = RED.__test.instantiate('klicktipp-subscription-process-get', { listId: '12' });
	const indexNode = RED.__test.instantiate('klicktipp-subscription-process-index', {});
	const redirectNode = RED.__test.instantiate('klicktipp-subscription-process-get-redirect', {
		listId: '12',
		email: 'payload.email',
		emailType: 'msg',
	});

	const getMsg = { payload: {} };
	const indexMsg = { payload: {} };
	const redirectMsg = { payload: { email: 'john@example.com' } };

	await triggerInput(getNode, getMsg);
	await triggerInput(indexNode, indexMsg);
	await triggerInput(redirectNode, redirectMsg);

	assert.deepEqual(getMsg.payload, { id: '12', name: 'DOI' });
	assert.deepEqual(indexMsg.payload, [{ id: '12', value: 'DOI' }]);
	assert.deepEqual(redirectMsg.payload, { redirectUrl: 'https://example.com/redirect' });
	assert.equal(requests.length, 3);
});
