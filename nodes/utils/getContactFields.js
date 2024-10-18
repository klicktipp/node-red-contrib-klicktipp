const evaluatePropertyAsync = require("./evaluatePropertyAsync");

async function getContactFields(RED, config, node, msg) {
	if (config.fieldsType === 'fieldsFromApi') {
		return config.fieldsData;
	}
	return await evaluatePropertyAsync(RED, config.fields, config.fieldsType, node, msg);
}

module.exports = getContactFields;