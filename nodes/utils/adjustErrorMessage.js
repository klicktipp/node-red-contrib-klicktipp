function adjustErrorMessage(error) {
  let errorMessage = '';
  switch (error) {
    case 4:
      errorMessage =
        'The email address is unsubscribed. You cannot re-subscribe an email address if the contact has unsubscribed.';
      break;
    case 5:
      errorMessage = 'Invalid email address.';
      break;
    case 6:
      errorMessage = 'There was an error sending the confirmation email.';
      break;
    case 7:
      errorMessage = 'Email address not found.';
      break;
    case 8:
      errorMessage =
        'Invalid value in custom field. The provided value is not valid for the field type.';
      break;
    case 9:
      errorMessage =
        'The SMS number is already assigned to another contact. If you subscribe an email address and add a phone number, it must be unique.';
      break;
    case 10:
      errorMessage = 'Update of contact failed.';
      break;
    case 11:
      errorMessage = 'Invalid phone number.';
      break;
    case 12:
      errorMessage = 'Internal error.';
      break;
    case 30:
      errorMessage = 'The email address is blocked and cannot be used for subscription.';
      break;
    case 31:
      errorMessage = 'SmartTags are only assigned by the system.';
      break;
    case 32:
      errorMessage = 'You must specify either an email address or a SMS number.';
      break;
    case 401:
      errorMessage = 'Contact not found.';
      break;
    case 402:
      errorMessage = 'Opt-in process not found.';
      break;
    case 403:
      errorMessage = 'Tag not found.';
      break;
    case 507:
      errorMessage =
        'You tried to add an email address to a contact that is already assigned to another contact.';
      break;
    default:
      errorMessage = `Something went wrong. Please try again later. Error: ${error}`;
      break;
  }
  return errorMessage;
}

module.exports = adjustErrorMessage;
