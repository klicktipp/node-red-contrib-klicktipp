'use strict';

function normalizeTagIds(rawValue) {
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

module.exports = normalizeTagIds;
