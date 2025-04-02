'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const prepareSubscriptionData = require('../utils/transformers/prepareCreateSubscriberData');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');
const getContactFields = require('../utils/getContactFields');
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
			const response = await makeRequest(
				'/subscriber',
				'POST',
				qs.stringify(data),
				msg.sessionData,
			);

			handleResponse(
				node,
				msg,
				response,
				'Contact created',
				'Contact could not be created',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(node, msg, 'Contact could not be created', error?.response?.data?.error || error.message);
		}
	};

	function KlickTippSubscriberSubscribeNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-subscribe', KlickTippSubscriberSubscribeNode);
};
