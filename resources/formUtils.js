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

function populateDropdown(dropdown, currentItemId, action) {
	const spinner = $('<span>', {
		class: 'spinner',
		css: { 'display': 'none', 'text-align': 'center', 'margin': '10px' },
	}).append('<i class="fa fa-spinner fa-spin fa-2x"></i>'); // Spinner icon
	
	dropdown.before(spinner);
	
	// Show spinner and hide dropdown initially
	spinner.show();
	dropdown.hide();
	
	// Perform the request to get items (tags or others)
	$.getJSON(action, function (items) {
		// Clear current options
		dropdown.empty();
		
		// Populate the select dropdown with the tag options
		$.each(items, function (id, name = 'N/A') {
			// Check if the name is undefined, null, or an empty string and assign 'N/A' if so
			const displayName = name && name.trim() !== '' ? name : 'N/A';
			dropdown.append($('<option>', { value: id, text: displayName }));
		});
		
		// Handle pre-selecting items
		if (currentItemId) {
			if (Array.isArray(currentItemId)) {
				// For multi-select (array of items), select multiple options
				dropdown.val(currentItemId);
			} else {
				// For single-select, just select the single option
				dropdown.val([currentItemId]); // Ensure it's treated as an array
			}
		}
		
	}).fail(function () {
		RED.notify('Failed to load KlickTipp items', 'error');
		dropdown.empty();
		dropdown.append($('<option>').text('Failed to load items'));
	}).always(function () {
		// Hide the spinner and show the dropdown when the request completes
		spinner.hide();
		dropdown.show();
	});
}

function populateContactFields(container, fields) {
	const spinner = $('<span>', {
		class: 'spinner',
		css: { 'display': 'none', 'text-align': 'center', 'margin': '10px' },
	}).append('<i class="fa fa-spinner fa-spin fa-2x"></i>'); // Spinner icon
	
	container.before(spinner);
	
	// Show spinner and hide dropdown initially
	spinner.show();
	container.hide();
	
	// Perform the request to get items (tags or others)
	$.getJSON('/klicktipp/contact-fields', function (items) {
		// Clear current options
		container.empty();
		
		generateFormFields(items, fields);
	}).fail(function () {
		console.log('Errror')
		container.empty();
		container.append($('<option>').text('Failed to load items'));
	}).always(function () {
		// Hide the spinner and show the dropdown when the request completes
		spinner.hide();
		container.show();
	});
}

function generateFormFields(fields,  defaultValues = {}) {
	// Mapping of field keys to corresponding Font Awesome icons
	const iconMap = {
		"fieldFirstName": "fa-user",
		"fieldLastName": "fa-user",
		"fieldCompanyName": "fa-building",
		"fieldStreet1": "fa-home",
		"fieldStreet2": "fa-home",
		"fieldCity": "fa-home",
		"fieldState": "fa-globe",
		"fieldZip": "fa-envelope",
		"fieldCountry": "fa-globe",
		"fieldPrivatePhone": "fa-phone",
		"fieldMobilePhone": "fa-mobile",
		"fieldPhone": "fa-phone",
		"fieldFax": "fa-fax",
		"fieldWebsite": "fa-globe",
		"fieldBirthday": "fa-birthday-cake",
		"fieldLeadValue": "fa-usd"
	};
	
	// Target container for the generated form
	const container = $('#contact-fields-section');
	
	// Iterate over each field in the fields object
	$.each(fields, function(key, label) {
		// Use iconMap to get the correct icon or assign a default icon for unknown fields
		const iconClass = iconMap[key] || "fa-question-circle";  // Default for custom fields
		
		// Get the default value for the field, if available
		const defaultValue = defaultValues[key] || '';
		
		// Generate HTML for each form-row, including the default value in the input field
		const formRow = `
            <div class="form-row">
                <label for="node-input-${key}">
                    <i class="fa ${iconClass}"></i> ${label}
                </label>
                <input type="text" id="node-input-${key}" placeholder="Enter ${label.toLowerCase()} (optional)" value="${defaultValue}">
            </div>
        `;
		
		// Append the generated HTML to the container
		container.append(formRow);
	});
}