function prepareApiKeySubscriptionData({ apiKey, email, smsNumber, fields }) {
	return {
		apikey: apiKey,
		...(email && { email }),
		...(smsNumber && { smsnumber: smsNumber }),
		...(Object.keys(fields).length && { fields }),
	};
}

module.exports = prepareApiKeySubscriptionData;
