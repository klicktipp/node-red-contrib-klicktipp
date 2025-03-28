'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);

		// Use config.tagId (which is already prepared as an array in oneditsave)
		let tagIds = config.manualFieldEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagId;

		// If tagIds is a string (as an extra precaution), split it.
		if (typeof tagIds === 'string') {
			tagIds = tagIds.split(',').map((s) => Number(s.trim()));
		} else if (!Array.isArray(tagIds)) {
			tagIds = [tagIds];
		}

		if (!email) {
			handleError(node, msg, 'Email is missing', 'Invalid input');
			return node.send(msg);
		}

		// Filter out any NaN entries
		tagIds = tagIds
			.filter((v) => v !== '')
			.map((v) => Number(v))
			.filter((tagId) => !isNaN(tagId));

		if (tagIds.length === 0) {
			handleError(node, msg, 'Tag ID is missing', 'Invalid input');
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
			handleResponse(this, msg, response, 'Contact tagged', 'Contact could not be tagged', () => {
				msg.payload = { success: true };
			});
		} catch (error) {
			handleError(node, msg, 'Contact could not be tagged', error.message);
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

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-tag', KlickTippSubscriberTagNode);
};
