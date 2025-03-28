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
		const tagId = config.manualFieldEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagId;

		if (!email) {
			handleError(node, msg, 'Email is missing', 'Invalid input');
			return node.send(msg);
		}

		if (!tagId) {
			handleError(node, msg, 'Tag ID is missing', 'Invalid input');
			return node.send(msg);
		}

		try {
			const response = await makeRequest(
				'/subscriber/untag',
				'POST',
				qs.stringify({ email, tagid: tagId }),
				msg.sessionData,
			);

			handleResponse(
				node,
				msg,
				response,
				'Tag removed from contact',
				'Tag could not be removed from contact',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(node, msg, 'Tag could not be removed from contact', error.message);
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
