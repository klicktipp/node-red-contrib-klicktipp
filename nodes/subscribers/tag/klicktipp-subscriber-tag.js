'use strict';

const handleResponse = require('../../utils/handleResponse');
const { handleErrorWithI18n } = require('../../utils/handleError');
const makeRequest = require('../../utils/makeRequest');
const createKlickTippSessionNode = require('../../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		let tagIds = config.tagId || [];

		if (!email) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-tag.error.missing-email',
				RED._('klicktipp-subscriber-tag.error.missing-email')
			);
			return node.send(msg);
		}
		// Ensure tagIds is an array, even if a single value, and convert all to numbers
		tagIds = (Array.isArray(tagIds) ? tagIds : [tagIds]).map((tagId) => Number(tagId));

		// Remove any invalid or NaN entries
		tagIds = tagIds.filter((tagId) => !isNaN(tagId));

		// Validate that we have valid tag IDs to proceed
		if (tagIds.length === 0) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-tag.error.missing-tag',
				RED._('klicktipp-subscriber-tag.error.missing-tag')
			);
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/tag',
				'POST',
				qs.stringify({
					email,
					tagids: tagIds,
				}),
				msg.sessionData,
			);

			// Handle the response
			handleResponse(
				this,
				msg,
				response,
				'klicktipp-subscriber-tag.status.success',
				'klicktipp-subscriber-tag.status.failed',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleErrorWithI18n(
				node,
				msg,
				'klicktipp-subscriber-tag.status.failed',
				error.message
			);
		}
	};

	/**
	 * KlickTippSubscriberTagNode - A Node-RED node to tag an email with one or more tags.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: Expected object with the following properties
	 *   - `email`: (Required) The email address of the subscriber.
	 *   - `tagIds`: (Required) The ID (or an array of IDs) of the manual tags to apply to the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: An object containing `success: true`.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the email or tag IDs are missing, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberTagNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		
		const i18n = {
			missingCredentials: 'klicktipp-subscriber-tag.error.missing-credentials',
			invalidCredentials: 'klicktipp-subscriber-tag.error.invalid-credentials',
			loginFailed: 'klicktipp-subscriber-tag.error.login-failed',
			requestFailed: 'klicktipp-subscriber-tag.error.request-failed',
		}
		
		createKlickTippSessionNode(RED, node, coreFunction, i18n)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-tag', KlickTippSubscriberTagNode);
};
