function extractUpdateSubscriberFields(config, payload = {}) {
	// Extract fields from config and payload, fallback to config values if not present
	const {
		newEmail: configNewEmail,
		subscriberId: configSubscriberId,
		newSmsNumber: configNewSmsNumber,
		...configFields
	} = config;
	
	const {
		newEmail: msgNewEmail,
		subscriberId: msgSubscriberId,
		newSmsNumber: msgNewSmsNumber,
		fields: msgFields = {}
	} = payload || {};
	
	const newEmail = msgNewEmail || configNewEmail;
	const subscriberId = msgSubscriberId || configSubscriberId;
	const newSmsNumber = msgNewSmsNumber || configNewSmsNumber;
	const fields = { ...configFields, ...msgFields };
	
	return { newEmail, subscriberId, newSmsNumber, fields };
}

module.exports = extractUpdateSubscriberFields;