'use strict';

const normalizeTagIds = require('./normalizeTagIds');

function hasTagInputValue(value) {
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (Array.isArray(value)) {
		return normalizeTagIds(value).length > 0;
	}

	if (typeof value === 'string') {
		return normalizeTagIds(value).length > 0;
	}

	return true;
}

function pickFirstTagInput(values) {
	return values.find((value) => hasTagInputValue(value));
}

function resolveTagIdsInput(config, msg, options = {}) {
	const {
		manualEnabledKey = 'manualFieldEnabled',
		manualValueKey = 'manualTagId',
		configValueKey = 'tagId',
		payloadManualValueKey = 'manualTagId',
		payloadValueKeys = ['tagIds', 'tagId'],
		includeMeta = false,
		maxTagIds,
	} = options;

	const payload = msg?.payload || {};
	const isManual = !!config?.[manualEnabledKey];

	const rawValue = isManual
		? pickFirstTagInput([
				payload?.[payloadManualValueKey],
				...payloadValueKeys.map((key) => payload?.[key]),
				config?.[manualValueKey],
			])
		: pickFirstTagInput([
				...payloadValueKeys.map((key) => payload?.[key]),
				config?.[configValueKey],
			]);

	return normalizeTagIds(rawValue, { includeMeta, maxTagIds });
}

module.exports = resolveTagIdsInput;
