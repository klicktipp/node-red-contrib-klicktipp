'use strict';

const evaluatePropertyAsync = require('./evaluatePropertyAsync');
const makeRequest = require('./makeRequest');
const handleError = require('./handleError');

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

	/* ──────── Match by ID (fast path) ───────────────────────── */
	if (identifierType === 'id') {
		const subscriberId = await evaluatePropertyAsync(
			RED,
			config.subscriberId,
			config.subscriberIdType,
			node,
			msg,
		);

		if (!subscriberId) {
			handleError(node, msg, 'Contact ID is missing', 'Invalid input');
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

	if (!emailAddress) {
		handleError(node, msg, 'Email address is missing', 'Invalid input');
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
	} catch (err) {
		handleError(
			node,
			msg,
			'Contact ID could not be retrieved',
			err?.response?.data?.error || err.message,
		);
		return null;
	}
};
