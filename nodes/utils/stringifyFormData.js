'use strict';

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function encode(value) {
	return encodeURIComponent(String(value));
}

function appendPair(pairs, key, value, seen) {
	if (value === undefined) {
		return;
	}

	if (value === null) {
		pairs.push(`${encode(key)}=`);
		return;
	}

	if (Array.isArray(value)) {
		if (seen.has(value)) {
			throw new TypeError(`Cyclic value detected at key "${key}"`);
		}

		seen.add(value);
		value.forEach((item, index) => {
			appendPair(pairs, `${key}[${index}]`, item, seen);
		});
		seen.delete(value);
		return;
	}

	if (isPlainObject(value)) {
		if (seen.has(value)) {
			throw new TypeError(`Cyclic value detected at key "${key}"`);
		}

		seen.add(value);
		Object.entries(value).forEach(([nestedKey, nestedValue]) => {
			appendPair(pairs, `${key}[${nestedKey}]`, nestedValue, seen);
		});
		seen.delete(value);
		return;
	}

	pairs.push(`${encode(key)}=${encode(value)}`);
}

function stringifyFormData(data = {}) {
	const pairs = [];
	const seen = new WeakSet();

	Object.entries(data).forEach(([key, value]) => {
		appendPair(pairs, key, value, seen);
	});

	return pairs.join('&');
}

module.exports = stringifyFormData;
