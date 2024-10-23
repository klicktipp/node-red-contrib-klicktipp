function extractSubscribeFields(config, payload = {}) {
	// Extract fields from config and payload, fallback to config values if not present
	const {
		email: configEmail,
		listId: configListId,
		tagId: configTagId,
		smsNumber: configSmsNumber,
		...configFields
	} = config;
	
	const {
		email: msgEmail,
		listId: msgListId,
		tagId: msgTagId,
		smsNumber: msgSmsNumber,
		fields: msgFields = {}
	} = payload;
	
	const email = msgEmail || configEmail;
	const listId = msgListId || configListId;
	const tagId = msgTagId || configTagId;
	const smsNumber = msgSmsNumber || configSmsNumber;
	const fields = { ...configFields, ...msgFields };
	
	return { email, listId, tagId, smsNumber, fields };
}

module.exports = extractSubscribeFields;