function buildValidationMessage(details) {
  if (!details || typeof details !== 'object') return null;

  const field = typeof details.field === 'string' ? details.field.trim() : '';
  const name = typeof details.name === 'string' ? details.name.trim() : '';
  const reason = typeof details.reason === 'string' ? details.reason.trim() : '';

  // Prefer full message
  if (field && name && reason) {
    return `Validation error: ${field} "${name}" ${reason}`;
  }

  // Partial fallback without double spaces
  if (reason && (field || name)) {
    const parts = [];
    if (field) parts.push(field);
    if (name) parts.push(`"${name}"`);
    return `Validation error: ${parts.join(' ')} ${reason}`;
  }

  return null;
}

module.exports = buildValidationMessage;