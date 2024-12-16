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
		const { listId, tagId } = config;
		
		const name = await evaluatePropertyAsync(RED, config.subscriptionProcessName, config.subscriptionProcessNameType, node, msg);
		const isSingleOptIn = config.useSingleOptIn || msg?.payload?.isSingleOptIn;
		const customOptInConfirmationPage = config.customOptInConfirmationPage || msg?.payload?.customOptInConfirmationPage;
		
		const customOptInConfirmationPageUrl = await evaluatePropertyAsync(RED, config.customOptInConfirmationPageUrl, config.customOptInConfirmationPageUrlType, node, msg);
		const customOptInConfirmationPageContactId = await evaluatePropertyAsync(RED, config.customOptInConfirmationPageContactId, config.customOptInConfirmationPageContactIdType, node, msg);
		const customOptInConfirmationPageEmail = await evaluatePropertyAsync(RED, config.customOptInConfirmationPageEmail, config.customOptInConfirmationPageEmailType, node, msg);
		const customOptInConfirmationPageContactKey = await evaluatePropertyAsync(RED, config.customOptInConfirmationPageContactKey, config.customOptInConfirmationPageContactKeyType, node, msg);
		
		const customPendingConfirmationPageUrl = await evaluatePropertyAsync(RED, config.customPendingConfirmationPageUrl, config.customPendingConfirmationPageUrlType, node, msg);
		const customPendingConfirmationPageContactId = await evaluatePropertyAsync(RED, config.customPendingConfirmationPageContactId, config.customPendingConfirmationPageContactIdType, node, msg);
		const customPendingConfirmationPageEmail = await evaluatePropertyAsync(RED, config.customPendingConfirmationPageEmail, config.customPendingConfirmationPageEmailType, node, msg);
		const customPendingConfirmationPageContactKey = await evaluatePropertyAsync(RED, config.customPendingConfirmationPageContactKey, config.customPendingConfirmationPageContactKeyType, node, msg);
		
		const pendingContacts = config.pendingContacts || msg?.payload?.pendingContacts;
		
		if (!name) {
			handleError(node, msg, 'Missing name', 'Invalid input');
			return node.send(msg);
		}
		
		// Prepare data object and filter fields
		const data = {
			name,
			usesingleoptin: isSingleOptIn,
			
		};
		
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
				'Subscribed successfully',
				'Failed to subscribe',
				(response) => {
					msg.payload = response.data;
				},
			);
		} catch (error) {
			handleError(node, msg, 'Failed to subscribe', error.message);
		}
	};
	
	function KlickTippSubscriptionProcessCreateNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}
	
	RED.nodes.registerType('klicktipp-subscription-process-create', KlickTippSubscriptionProcessCreateNode);
};
