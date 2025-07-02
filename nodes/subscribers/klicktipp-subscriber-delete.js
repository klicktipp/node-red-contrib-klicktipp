'use strict';

const handleResponse = require('../utils/handleResponse');
const handleError = require('../utils/handleError');
const makeRequest = require('../utils/makeRequest');
const createKlickTippSessionNode = require('../utils/createKlickTippSessionNode');
const evaluatePropertyAsync = require('../utils/evaluatePropertyAsync');

module.exports = function (RED) {
	async function coreFunction(msg, config) {
		const node = this;

		const identifierType =
			typeof msg.identifierType === 'string' ? msg.identifierType : config.identifierType || 'id';

		let subscriberId;

		if (identifierType === 'email') {
			const emailAddress = await evaluatePropertyAsync(
				RED,
				config.emailAddress,
				config.emailAddressType,
				node,
				msg,
			);

			if (!emailAddress) {
				handleError(node, msg, 'Email address is missing', 'Invalid input');
				return node.send(msg);
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
					subscriberId = body[0];
				} else {
					handleError(
						node,
						msg,
						'Contact ID could not be retrieved',
						'Request failed with status code 404',
					);
					return node.send(msg);
				}
			} catch (err) {
				handleError(
					node,
					msg,
					'Contact ID could not be retrieved',
					err?.response?.data?.error || err.message,
				);
				return node.send(msg);
			}
		} else {
			subscriberId = await evaluatePropertyAsync(
				RED,
				config.subscriberId,
				config.subscriberIdType,
				node,
				msg,
			);

			if (!subscriberId) {
				handleError(node, msg, 'Contact ID is missing', 'Invalid input');
				return node.send(msg);
			}
		}

		try {
			const response = await makeRequest(
				`/subscriber/${encodeURIComponent(subscriberId)}`,
				'DELETE',
				{},
				msg.sessionData,
			);

			handleResponse(node, msg, response, 'Contact deleted', 'Contact could not be deleted', () => {
				msg.payload = { success: true };
			});
		} catch (err) {
			handleError(
				node,
				msg,
				'Contact could not be deleted',
				err?.response?.data?.error || err.message,
			);
			msg.rawError = err;
			node.send(msg);
		}
	}

	function KlickTippSubscriberDeleteNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		createKlickTippSessionNode(RED, node, coreFunction)(config);
	}

	RED.nodes.registerType('klicktipp-subscriber-delete', KlickTippSubscriberDeleteNode);
};
