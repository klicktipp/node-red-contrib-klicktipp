'use strict';

const evaluatePropertyAsync = require('./evaluatePropertyAsync');
const makeRequest = require('./makeRequest');
const handleError = require('./handleError');
const VALID_EMAIL_MESSAGE = 'Valid email address required. Example: jsmith@example.com';
const CONTACT_IDENTIFIER_MESSAGE = 'Contact ID or Key is required and cannot contain whitespace.';

function containsTemplateVariable(value) {
	return /\{\{[^}]+\}\}|\$\{[^}]+\}/.test(String(value || ''));
}

function usesVariableSource(type) {
	return !!type && !['str', 'num'].includes(type);
}

function validateSubscriberEmail(value, type) {
	const normalizedValue = String(value || '').trim();

	if (!normalizedValue) {
		return VALID_EMAIL_MESSAGE;
	}

	if (usesVariableSource(type) || containsTemplateVariable(normalizedValue)) {
		return null;
	}

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue) ? null : VALID_EMAIL_MESSAGE;
}

function validateSubscriberIdentifier(value, type) {
	const normalizedValue = String(value || '');

	if (!normalizedValue.trim()) {
		return CONTACT_IDENTIFIER_MESSAGE;
	}

	if (usesVariableSource(type) || containsTemplateVariable(normalizedValue)) {
		return null;
	}

	return normalizedValue.length >= 1 && !/\s/.test(normalizedValue)
		? null
		: CONTACT_IDENTIFIER_MESSAGE;
}

/**
 * Resolve the klick-tipp subscriber ID the same way across all nodes.
 *
 * @param {object} RED     – Node-RED runtime (passed from module.exports)
 * @param {object} node    – `this` inside the node’s coreFunction
 * @param {object} config  – node configuration object
 * @param {object} msg     – current message object
 *
 * @returns {Promise<string|null>}  String ID on success, or null when
 *          the function has already emitted an error via handleError.
 */
module.exports = async function resolveSubscriberId(RED, node, config, msg) {
	const identifierType =
		typeof msg.identifierType === 'string' ? msg.identifierType : config.identifierType || 'id';

	/* ──────── Match by contact identifier (fast path) ───────── */
	if (identifierType === 'id') {
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		const identifierValidationError = validateSubscriberIdentifier(
			subscriberId,
			config.subscriberIdType,
		);
		if (identifierValidationError) {
			handleError(node, msg, identifierValidationError);
			return null;
		}
		return subscriberId;
	}

	/* ──────── Match by e-mail address ───────────────────────── */
	const emailAddress = await evaluatePropertyAsync(
		RED,
		config.emailAddress,
		config.emailAddressType,
		node,
		msg,
	);

	const emailValidationError = validateSubscriberEmail(emailAddress, config.emailAddressType);
	if (emailValidationError) {
		handleError(node, msg, emailValidationError);
		return null;
	}

	try {
		const searchResp = await makeRequest(
			'/subscriber/search',
			'POST',
			{ email: emailAddress },
			msg.sessionData,
		);

		const body = searchResp?.data ?? searchResp;

		if (Array.isArray(body) && body.length) {
			return body[0];
		}

		handleError(
			node,
			msg,
			'Contact ID could not be retrieved',
			'Request failed with status code 404',
		);
		return null;
	} catch (error) {
		handleError(
			node,
			msg,
			'Contact ID could not be retrieved',
			error?.response?.data || error?.message,
		);
		return null;
	}
};
