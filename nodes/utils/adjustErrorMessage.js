function adjustErrorMessage(error, code, tagHint) {
	// special-case: error 7 depends on node
	if (error === 7) {
		// Tag/Untag contact nodes
		if (tagHint) {
			return 'Email address not found.';
		}

		// Default for a "Update contact" node
		return 'Invalid value in custom field. The provided value is not valid for the field type.';
	}

	const error10Messages = {
		4: 'The email address is unsubscribed. You cannot re-subscribe an email address if the contact has unsubscribed.',
		5: 'Invalid email address.',
		6: 'There was an error sending the confirmation email.',
		9: 'The SMS number is already assigned to another contact. If you subscribe an email address and add a phone number, it must be unique.',
		11: 'Invalid phone number.',
		12: 'Internal error.',
		30: 'The email address is blocked and cannot be used for subscription.',
		31: 'SmartTags are only assigned by the system.',
		32: 'You must specify either an email address or a SMS number.',
	};

	switch (error) {
		case 4:
			return 'The email address is unsubscribed. You cannot re-subscribe an email address if the contact has unsubscribed.';
		case 5:
			return 'Invalid email address.';
		case 6:
			return 'There was an error sending the confirmation email.';
		case 8:
			return 'Invalid value in custom field. The provided value is not valid for the field type.';
		case 9:
			return 'The SMS number is already assigned to another contact. If you subscribe an email address and add a phone number, it must be unique.';
		case 10:
			if (code && error10Messages[code]) {
				return `Update of contact failed: ${error10Messages[code]}`;
			} else {
				return 'Update of contact failed.';
			}
		case 11:
			return 'Invalid phone number.';
		case 12:
			return 'Internal error.';
		case 30:
			return 'The email address is blocked and cannot be used for subscription.';
		case 31:
			return 'SmartTags are only assigned by the system.';
		case 32:
			return 'You must specify either an email address or a SMS number.';
		case 401:
			return 'Contact not found.';
		case 402:
			return 'Opt-in process not found.';
		case 403:
			return 'Tag not found.';
		case 507:
			return 'You tried to add an email address to a contact that is already assigned to another contact.';
		default:
			return `Something went wrong. Please try again later. Error: ${error}`;
	}
}

module.exports = adjustErrorMessage;
