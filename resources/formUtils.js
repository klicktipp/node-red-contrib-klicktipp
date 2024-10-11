function validateEmail(email) {
	// If email is empty, skip validation
	if (!email) {
		return true;
	}
	// Apply regex validation only if email is provided
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// Helper function to check if any field is populated
function isFieldPopulated(fieldIds) {
	return fieldIds.some(function (fieldId) {
		return $(fieldId).val().trim() !== ''; // Trim to ensure empty spaces are not counted
	});
}

function toggleContactFields() {
	const checkbox = $('#toggle-contact-fields-section');
	const contactFieldsSection = $('#contact-fields-section');
	
	checkbox.on('click', function() {
		contactFieldsSection.toggle();
	});
	
	// List of contact field selectors
	const contactFields = [
		'#node-input-fieldFirstName',
		'#node-input-fieldLastName',
		'#node-input-fieldStreet1',
		'#node-input-fieldStreet2',
		'#node-input-fieldCity',
		'#node-input-fieldState',
		'#node-input-fieldZip',
		'#node-input-fieldCountry',
		'#node-input-fieldPrivatePhone',
		'#node-input-fieldMobilePhone',
		'#node-input-fieldPhone',
		'#node-input-fieldFax',
		'#node-input-fieldWebsite',
		'#node-input-fieldBirthday',
		'#node-input-fieldLeadValue'
	];
	
	// Check if at least one field is populated and show the section
	if (isFieldPopulated(contactFields)) {
		checkbox.prop('checked', true);
		contactFieldsSection.show();
	}
}