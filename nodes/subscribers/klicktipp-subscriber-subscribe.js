'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareSubscriptionData = require('../utils/transformers/prepareCreateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
const transformCustomFields = require('../utils/transformCustomFields');
const qs = require('qs');

module.exports = function (RED) {
	const coreFunction = async function (msg, config) {
		const node = this;

		let listId = config.manualListEnabled
			? config.manualListId || msg?.payload?.manualListId
			: config.listId || msg?.payload?.listId;

		listId = listId !== undefined ? Number(listId) : undefined;

		let tagId = config.manualTagEnabled
			? config.manualTagId || msg?.payload?.manualTagId
			: config.tagId || msg?.payload?.tagId;

		tagId = tagId !== undefined ? Number(tagId) : undefined;

		const fields = await getContactFields(RED, config, node, msg);
		const email = await evaluatePropertyAsync(RED, config.email, config.emailType, node, msg);
		const smsNumber = await evaluatePropertyAsync(
			RED,
			config.smsNumber,
			config.smsNumberType,
			node,
			msg,
		);
		// Ensure at least one parameter (email or phone number) is provided
		if (!email && !smsNumber) {
			handleError(node, msg, 'Email or SMS number is missing', 'Invalid input');
			return node.send(msg);
		}

		// Prepare data object and filter fields
		const data = prepareSubscriptionData(email, smsNumber, listId, tagId, fields);

		try {
			// Create the subscriber using the POST request.
			const subscriberResponse = await makeRequest(
				'/subscriber',
				'POST',
				qs.stringify(data),
				msg.sessionData,
			);

			// Fetch the field definitions. The response is an object mapping field keys to labels.
			const fieldResponse = await makeRequest('/field', 'GET', {}, msg.sessionData);
			const fieldsMapping = fieldResponse.data;

			// Transform the subscriber response data using the utility function
			const updatedData = transformCustomFields(subscriberResponse.data, fieldsMapping);

			// Handle the response by passing the transformed data.
			handleResponse(
				node,
				msg,
				subscriberResponse,
				'Contact created',
				'Contact could not be created',
				() => {
					msg.payload = updatedData;
				},
			);
		} catch (error) {
			handleError(
				node,
				msg,
				'Contact could not be created',
				error?.response?.data?.error || error.message,
			);
		}
	};

	function KlickTippSubscriberSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-subscribe', KlickTippSubscriberSubscribeNode);
};
