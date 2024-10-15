function ktValidateEmail(email) {
	// If email is empty, skip validation
	if (!email) {
		return true;
	}
	// Apply regex validation only if email is provided
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function ktPopulateDropdown(dropdown, currentItemId, action) {
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

function ktPopulateContactFields(container, defaultValues = {}) {
	const spinner = $('<span>', {
		class: 'spinner',
		css: { 'display': 'none', 'text-align': 'center', 'margin': '10px' },
	}).append('<i class="fa fa-spinner fa-spin fa-2x"></i>'); // Spinner icon
	
	container.before(spinner);
	
	// Show spinner and hide container initially
	spinner.show();
	container.hide();
	
	// Perform the request to get contact fields
	$.getJSON('/klicktipp/contact-fields', function (items) {
		// Clear current options
		container.empty();
		
		// Separate standard fields and custom fields
		const standardFields = {};
		const customFields = {};
		
		$.each(items, function (key, label) {
			if (ktIsCustomField(key)) {
				customFields[key] = label;
			} else {
				standardFields[key] = label;
			}
		});
		
		// Generate the standard form fields with the default values
		ktGenerateFormFields(standardFields, defaultValues);
		
		// Generate the dropdown for custom fields
		ktGenerateCustomFieldsDropdown(customFields);
		
		// Restore any previously added custom fields
		ktRestoreCustomFields(customFields, defaultValues);
		
	}).fail(function () {
		container.empty();
		container.append($('<p>').text('Failed to load contact fields'));
	}).always(function () {
		// Hide the spinner and show the container when the request completes
		spinner.hide();
		container.show();
	});
}

function ktIsCustomField(fieldKey) {
	const customFieldPattern = /^field\d+$/; // Matches "field" followed by one or more digits
	return customFieldPattern.test(fieldKey);
}

function ktGenerateCustomFieldsDropdown(customFields) {
	const container = $('#contact-fields-section');
	
	// Create a form row for the custom fields dropdown
	const dropdownRow = `
        <div class="form-row">
            <label for="custom-fields-dropdown">
                <i class="fa fa-plus"></i> Add Custom Field
            </label>
            <select id="custom-fields-dropdown">
                <option value="" disabled selected>Choose value</option>
                <!-- Options will be added here -->
            </select>
            <button type="button" id="add-custom-field-btn" class="btn btn-sm" style="border: none; background: none;">
    					<i class="fa fa-plus" aria-hidden="true"></i>
						</button>
        </div>
    `;
	
	container.append(dropdownRow);
	
	// Populate the dropdown
	const dropdown = $('#custom-fields-dropdown');
	dropdown.empty();
	
	// Add the placeholder option
	dropdown.append('<option value="" disabled selected>Choose value</option>');
	
	$.each(customFields, function (key, label) {
		console.log(key, label);
		dropdown.append($('<option>', { value: key, text: label }));
	});
	
	// Handle the Add Field button click
	$('#add-custom-field-btn').on('click', function () {
		const selectedFieldKey = $('#custom-fields-dropdown').val();
		const selectedFieldLabel = $('#custom-fields-dropdown option:selected').text();
		
		//Check if the field is valid
		if (!selectedFieldKey) {
			return;
		}
		
		// Check if the field is already added
		if ($('#node-input-' + selectedFieldKey).length) {
			return;
		}
		
		// Generate the form field for the selected custom field
		ktGenerateCustomField(selectedFieldKey, selectedFieldLabel);
		
		// Remove the selected option from the dropdown
		$('#custom-fields-dropdown option[value="' + selectedFieldKey + '"]').remove();
	});
}

function ktGenerateCustomField(fieldKey, fieldLabel, defaultValue = '') {
	const container = $('#contact-fields-section');
	
	// Use the icon map or default icon (if needed)
	const iconClass = 'fa-question-circle'; // Default icon for custom fields
	
	// Check if the field is already present to avoid duplicates
	if ($('#form-row-' + fieldKey).length) {
		return;
	}
	
	// Generate the HTML for the custom field with inline styling for the row
	const formRow = `
        <div class="form-row d-flex align-items-center" id="form-row-${fieldKey}" style="display: flex; align-items: center; margin-bottom: 8px;">
            <label for="node-input-${fieldKey}" style="margin-right: 10px;">
                <i class="fa ${iconClass}"></i> ${fieldLabel}
            </label>
            <input type="text" id="node-input-${fieldKey}" placeholder="Enter ${fieldLabel.toLowerCase()} (optional)" value="${defaultValue}" style="flex: 1; margin-right: 10px;">
            <button type="button" class="remove-custom-field-btn btn btn-sm btn-danger" data-field-key="${fieldKey}" data-field-label="${fieldLabel}" style="padding: 2px 8px;">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;
	
	// Append the form row to the container
	container.append(formRow);
	
	// Add event listener for the remove button (event delegation can be used here)
	$('#form-row-' + fieldKey + ' .remove-custom-field-btn').on('click', function () {
		const fieldKey = $(this).data('field-key');
		const fieldLabel = $(this).data('field-label');
		
		// Remove the form row from the container
		$('#form-row-' + fieldKey).remove();
		
		// Add the field back to the dropdown for selection again
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
	
	// Handle removing custom fields
	container.on('click', '.remove-custom-field-btn', function () {
		const fieldKey = $(this).data('field-key');
		const fieldLabel = $(this).data('field-label');
		
		// Remove the form field
		$('#form-row-' + fieldKey).remove();
		
		// Add the field back to the dropdown
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
}

function ktRestoreCustomFields(customFields, defaultValues) {
	$.each(defaultValues, function (fieldKey, value) {
		if (ktIsCustomField(fieldKey)) {
			// This is a custom field
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			ktGenerateCustomField(fieldKey, fieldLabel, value);
			
			// Remove the field from the dropdown
			$('#custom-fields-dropdown option[value="' + fieldKey + '"]').remove();
		}
	});
}

function ktGenerateFormFields(fields,  defaultValues = {}) {
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
		const iconClass = iconMap[key];
		
		// Get the default value for the field, if available
		const defaultValue = defaultValues[key] || '';
		
		// Generate HTML for each form-row, including the default value in the input field
		const formRow = `
            <div class="form-row">
                <label for="node-input-${key}">
                    <i class="fa ${iconClass}"></i> ${label}
                </label>
                <input
									type="text"
									id="node-input-${key}"
									placeholder="Enter ${label.toLowerCase()} (optional)"
									value="${defaultValue}"
                >
            </div>
        `;
		
		// Append the generated HTML to the container
		container.append(formRow);
	});
}