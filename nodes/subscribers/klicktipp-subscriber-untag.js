'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const normalizeTagIds = require('../utils/normalizeTagIds');
const getErrorMessage = require('../utils/getErrorMessage');
const adjustErrorMessage = require('../utils/adjustErrorMessage');
const qs = require('qs');

function formatUntagFailure(error, tagId) {
	const body = error?.response?.data ?? error?.response?.body ?? error?.body;
	const statusCode =
		error?.response?.status ??
		(typeof body?.code === 'number' ? body.code : null) ??
		(typeof body?.error === 'number' ? body.error : null);

	let message = getErrorMessage(error);

	if (typeof body?.error === 'number') {
		message = adjustErrorMessage(body.error, body.code);
	} else if (typeof body === 'number') {
		message = adjustErrorMessage(body);
	}

	return `Failed to untag tag ID "${tagId}".${statusCode ? ` [${statusCode}]` : ''} ${message}`;
}

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		let tagIds = config.manualFieldEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagIds || msg?.payload?.tagId;
		tagIds = normalizeTagIds(tagIds);

		if (!email) {
			handleError(node, msg, 'Email is missing', 'Invalid input');
			return node.send(msg);
		}

		if (tagIds.length === 0) {
			handleError(node, msg, 'Tag ID is missing', 'Invalid input');
			return node.send(msg);
		}

		try {
			for (const tagId of tagIds) {
				try {
					await makeRequest(
						'/subscriber/untag',
						'POST',
						qs.stringify({ email, tagid: tagId }),
						msg.sessionData,
					);
				} catch (error) {
					error.untagFailureMessage = formatUntagFailure(error, tagId);
					throw error;
				}
			}

			handleResponse(
				node,
				msg,
				{ success: true },
				'Tag removed from contact',
				'Tag could not be removed from contact',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				'Tag could not be removed from contact',
				error?.untagFailureMessage || error?.response?.data || error?.message,
			);
		}
	};
	/**
	 * KlickTippSubscriberUntagNode - A Node-RED node to untag an email.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagId`: (Required) The ID of the manual tag to be removed from the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object containing `success: true` indicating the email was successfully untagged.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag ID is missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberUntagNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-untag', KlickTippSubscriberUntagNode);
};
