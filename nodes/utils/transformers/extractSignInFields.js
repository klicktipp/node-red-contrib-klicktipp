function extractSignInFields(config, payload = {}) {
	// Extract fields from config and payload, fallback to config values if not present
	const {
		apiKey: configApiKey,
		email: configEmail,
		smsNumber: configSmsNumber,
		...configFields
	} = config;
	
	const {
		apiKey: msgApiKey,
		email: msgEmail,
		smsNumber: msgSmsNumber,
		fields: msgFields = {}
	} = payload;
	
	const apiKey = msgApiKey || configApiKey;
	const email = msgEmail || configEmail;
	const smsNumber = msgSmsNumber || configSmsNumber;
	const fields = { ...configFields, ...msgFields };
	
	return { apiKey, email, smsNumber, fields };
}

module.exports = extractSignInFields;