'use strict';

const normalizeTagIds = require('./normalizeTagIds');

function pickFirstDefined(values) {
	return values.find((value) => value !== undefined && value !== null && value !== '');
}

function resolveTagIdsInput(config, msg, options = {}) {
	const {
		manualEnabledKey = 'manualFieldEnabled',
		manualValueKey = 'manualTagId',
		configValueKey = 'tagId',
		payloadManualValueKey = 'manualTagId',
		payloadValueKeys = ['tagIds', 'tagId'],
	} = options;

	const payload = msg?.payload || {};
	const isManual = !!config?.[manualEnabledKey];

	const rawValue = isManual
		? pickFirstDefined([config?.[manualValueKey], payload?.[payloadManualValueKey]])
		: pickFirstDefined([
				config?.[configValueKey],
				...payloadValueKeys.map((key) => payload?.[key]),
			]);

	return normalizeTagIds(rawValue);
}

module.exports = resolveTagIdsInput;
