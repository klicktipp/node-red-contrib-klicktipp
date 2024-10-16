'use strict';

const handleResponse = require('./utils/handleResponse');
const handleError = require('./utils/handleError');
const makeRequest = require('./utils/makeRequest');
const prepareUpdateSubscriberData = require('./utils/transformers/prepareUpdateSubscriberData');
const qs = require('qs');
const createCachedApiEndpoint = require('./utils/cache/createCachedApiEndpoint');
const fetchKlickTippData = require('./utils/fetchKlickTippData');
const createKlickTippSessionNode = require('./utils/createKlickTippSessionNode');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const { subscriberId, fields, newEmail, newSmsNumber } = config || msg.payload;

		if (!subscriberId) {
			handleError(node, msg, 'Missing subscriber ID');
			return this.send(msg);
		}

		const data = prepareUpdateSubscriberData(newEmail, newSmsNumber, fields);

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'PUT',
				qs.stringify(data),
				msg.sessionData,
			);

			handleResponse(
				this,
				msg,
				response,
				'Subscriber updated',
				'Failed to update subscriber',
				() => {
					msg.payload = { success: true };
				},
			);
		} catch (error) {
			handleError(this, msg, 'Failed to update subscriber', error.message);
		}
	};

	/**
	 * KlickTippSubscriberUpdateNode - A Node-RED node to update a subscriber's information.
	 * It requires a valid session ID and session name (obtained during login) to perform the request.
	 *
	 * @param {object} config - The configuration object passed from Node-RED.
	 *
	 * Inputs:
	 * - `msg.payload`: An object that must contain:
	 *   - `subscriberId`: (Required) The ID of the subscriber to update.
	 *   - `fields` (Optional): Fields of the subscriber to update.
	 *   - `newEmail` (Optional): The new email address of the subscriber.
	 *   - `newSmsNumber` (Optional): The new SMS number of the subscriber.
	 *
	 * Outputs:
	 * - `msg.payload`: On success, an object with `success: true` indicating the subscriber was successfully updated.
	 *   On failure:
	 *   - `msg.payload`: An object containing `success: false`.
	 *   - `msg.error`: An error message indicating what went wrong.
	 *
	 * Error Handling:
	 * - If session credentials are missing or invalid, the node outputs `msg.error` and returns `success: false`.
	 * - If the API request fails, the node outputs `msg.error` and returns `success: false`.
	 */
	function KlickTippSubscriberUpdateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;

		// Get the contact field list for display in Node UI
		createCachedApiEndpoint(RED, node, config, {
			endpoint: '/klicktipp/contact-fields',
			permission: 'klicktipp.read',
			cacheContext: 'flow',
			cacheKey: 'contactFieldsCache',
			cacheTimestampKey: 'cacheTimestamp',
			cacheDurationMs: 10 * 60 * 1000, // 10 minutes
			fetchFunction: (username, password) => fetchKlickTippData(username, password, '/field')
		});

		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp subscriber update', KlickTippSubscriberUpdateNode);
};
