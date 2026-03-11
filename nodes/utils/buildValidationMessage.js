function buildValidationMessage(details) {
	if (!details || typeof details !== 'object') return null;

	const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

	const field = normalizeString(details.field);
	const name = normalizeString(details.name);
	const reason = normalizeString(details.reason);
	const fieldValue = normalizeString(details.field_value);
	const parts = [];

	if (!reason || (!field && !name && !fieldValue)) return null;

	if (field) parts.push(field);
	if (name) parts.push(`"${name}"`);
	if (fieldValue) parts.push(`with value "${fieldValue}"`);

	return `Validation error: ${parts.join(' ')} ${reason}`;
}

module.exports = buildValidationMessage;
