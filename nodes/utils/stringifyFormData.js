'use strict';

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function encode(value) {
	return encodeURIComponent(String(value));
}

function appendPair(pairs, key, value) {
	if (value === undefined) {
		return;
	}

	if (value === null) {
		pairs.push(`${encode(key)}=`);
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			appendPair(pairs, `${key}[${index}]`, item);
		});
		return;
	}

	if (isPlainObject(value)) {
		Object.entries(value).forEach(([nestedKey, nestedValue]) => {
			appendPair(pairs, `${key}[${nestedKey}]`, nestedValue);
		});
		return;
	}

	pairs.push(`${encode(key)}=${encode(value)}`);
}

function stringifyFormData(data = {}) {
	const pairs = [];

	Object.entries(data).forEach(([key, value]) => {
		appendPair(pairs, key, value);
	});

	return pairs.join('&');
}

module.exports = stringifyFormData;
