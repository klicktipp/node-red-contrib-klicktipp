'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createTestRed } = require('./helpers/createTestRed');

const root = process.cwd();

const moduleExpectations = [
	['nodes/klicktipp-config.js', 'klicktipp-config'],
	['nodes/subscribers/klicktipp-subscriber-subscribe.js', 'klicktipp-subscriber-subscribe'],
	['nodes/subscribers/klicktipp-subscriber-update.js', 'klicktipp-subscriber-update'],
	['nodes/subscribers/klicktipp-subscriber-delete.js', 'klicktipp-subscriber-delete'],
	['nodes/subscribers/klicktipp-subscriber-unsubscribe.js', 'klicktipp-subscriber-unsubscribe'],
	['nodes/subscribers/klicktipp-subscriber-get.js', 'klicktipp-subscriber-get'],
	['nodes/subscribers/klicktipp-subscriber-search.js', 'klicktipp-subscriber-search'],
	['nodes/subscribers/klicktipp-subscriber-index.js', 'klicktipp-subscriber-index'],
	['nodes/subscribers/klicktipp-subscriber-tagged.js', 'klicktipp-subscriber-tagged'],
	['nodes/subscribers/klicktipp-subscriber-tag.js', 'klicktipp-subscriber-tag'],
	['nodes/subscribers/klicktipp-subscriber-untag.js', 'klicktipp-subscriber-untag'],
	['nodes/tags/klicktipp-tag-create.js', 'klicktipp-tag-create'],
	['nodes/tags/klicktipp-tag-update.js', 'klicktipp-tag-update'],
	['nodes/tags/klicktipp-tag-delete.js', 'klicktipp-tag-delete'],
	['nodes/tags/klicktipp-tag-get.js', 'klicktipp-tag-get'],
	['nodes/tags/klicktipp-tag-index.js', 'klicktipp-tag-index'],
	['nodes/subscription-processes/klicktipp-subscription-process-get.js', 'klicktipp-subscription-process-get'],
	['nodes/subscription-processes/klicktipp-subscription-process-index.js', 'klicktipp-subscription-process-index'],
	['nodes/subscription-processes/klicktipp-subscription-process-get-redirect.js', 'klicktipp-subscription-process-get-redirect'],
	['nodes/fields/klicktipp-field-get.js', 'klicktipp-field-get'],
	['nodes/fields/klicktipp-field-index.js', 'klicktipp-field-index'],
	['nodes/triggers/klicktipp-webhook-trigger.js', 'klicktipp-webhook-trigger'],
];

for (const [modulePath, nodeType] of moduleExpectations) {
	test(`registers ${nodeType}`, () => {
		const RED = createTestRed();
		const factory = require(path.join(root, modulePath));

		factory(RED);

		assert.ok(RED.__test.registeredTypes.has(nodeType));
	});
}
