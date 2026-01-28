function adjustErrorMessage(error, code, tagHint) {
	// special-case: error 7 depends on node
	if (error === 7) {
		// Tag/Untag contact nodes
		if (tagHint) {
			return 'Subscriber email not found.';
		}

		// Default for a "Update contact" node
		return 'Field validation failed.';
	}

	const error10Messages = {
		5: 'Invalid email address.',
		6: 'There was an error sending the confirmation email.',
		9: 'The SMS number is already assigned to another contact. If you subscribe an email address and add a phone number, it must be unique.',
		10: 'The SMS number is unsubscribed. You cannot re-subscribe an SMS number if the contact has unsubscribed.',
		11: 'Invalid phone number.',
		30: 'The email address is blocked and cannot be used for subscription.',
	};

	switch (error) {
		case 4:
			return 'Subscription not found.';
		case 5:
			return 'Email address validation failed';
		// error 6 not present in last instractions
		case 6:
			return 'There was an error sending the confirmation email.';
		case 8:
			return 'Field validation failed.';
		case 9:
			return 'Subscriber not subscribed.';
		case 10:
			if (code && error10Messages[code]) {
				return `Update of contact failed: ${error10Messages[code]}`;
			} else {
				return 'Update of contact failed.';
			}
		// error 11 and 12 not present in last instractions
		case 11:
			return 'Invalid phone number.';
		case 12:
			return 'Internal error.';
		case 30:
			return 'Email address change not allowed.';
		case 31:
			return 'Untag smarttag not allowed.';
		case 32:
			return 'Email address SMS number required.';
		case 100:
			return 'Invalid API key.';
		case 401:
			return 'User not found.';
		case 402:
			return 'List not found.';
		case 403:
			return 'Tag not found.';
		case 404:
			return 'User group not found.';
		case 405:
			return 'Campaign not found.';
		case 406:
			return 'Tier not found.';
		case 501:
			return 'Email address required.';
		case 502:
			return 'Username required.';
		case 503:
			return 'Password required.';
		case 504:
			return 'First name required.';
		case 505:
			return 'Last name required.';
		case 506:
			return 'Username exists.';
		case 507:
			return 'Email address exists.';
		case 508:
			return 'User update failed.';
		default:
			return `Something went wrong. Please try again later. Error: ${error}`;
	}
}

module.exports = adjustErrorMessage;
