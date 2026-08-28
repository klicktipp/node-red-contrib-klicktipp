'use strict';

function buildNormalizedTagIds(rawValue) {
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return [];
	}

	const values = Array.isArray(rawValue) ? rawValue : [rawValue];

	return [
		...new Set(
			values
				.flatMap((value) =>
					typeof value === 'string' ? value.split(',').map((item) => item.trim()) : [value],
				)
				.filter((value) => value !== '')
				.map((value) => Number(value))
				.filter((value) => Number.isInteger(value) && value > 0),
		),
	];
}

function normalizeTagIds(rawValue, options = {}) {
	const normalizedTagIds = buildNormalizedTagIds(rawValue);
	const maxTagIds =
		Number.isInteger(options.maxTagIds) && options.maxTagIds > 0 ? options.maxTagIds : null;
	const limitedTagIds = maxTagIds ? normalizedTagIds.slice(0, maxTagIds) : normalizedTagIds;

	if (options.includeMeta) {
		return {
			tagIds: limitedTagIds,
			exceedsMax: maxTagIds ? normalizedTagIds.length > maxTagIds : false,
			maxAllowed: maxTagIds,
			totalCount: normalizedTagIds.length,
		};
	}

	return limitedTagIds;
}

module.exports = normalizeTagIds;
