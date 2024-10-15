// Constants
const KLICKTIPP_ICON_MAP = {
	fieldFirstName: "fa-user",
	fieldLastName: "fa-user",
	fieldCompanyName: "fa-building",
	fieldStreet1: "fa-home",
	fieldStreet2: "fa-home",
	fieldCity: "fa-home",
	fieldState: "fa-globe",
	fieldZip: "fa-envelope",
	fieldCountry: "fa-globe",
	fieldPrivatePhone: "fa-phone",
	fieldMobilePhone: "fa-mobile",
	fieldPhone: "fa-phone",
	fieldFax: "fa-fax",
	fieldWebsite: "fa-globe",
	fieldBirthday: "fa-birthday-cake",
	fieldLeadValue: "fa-usd",
};

// Helper Functions
function ktCreateSpinner() {
	return $('<span>', {
		class: 'spinner',
		css: { display: 'none', textAlign: 'center', margin: '10px' },
	}).append('<i class="fa fa-spinner fa-spin fa-2x"></i>');
}

function ktIsCustomField(fieldKey) {
	return /^field\d+$/.test(fieldKey);
}

// Email Validation
function ktValidateEmail(email) {
	// Skip validation if email is empty
	if (!email) {
		return true;
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// Dropdown Population
function ktPopulateDropdown(dropdown, currentItemId, action) {
	const spinner = ktCreateSpinner();
	dropdown.before(spinner);
	
	spinner.show();
	dropdown.hide();
	
	$.getJSON(action)
		.done((items) => {
			dropdown.empty();
			
			$.each(items, (id, name) => {
				const displayName = name && name.trim() !== '' ? name : 'N/A';
				dropdown.append($('<option>', { value: id, text: displayName }));
			});
			
			if (currentItemId) {
				dropdown.val(Array.isArray(currentItemId) ? currentItemId : [currentItemId]);
			}
		})
		.fail(() => {
			RED.notify('Failed to load KlickTipp items', 'error');
			dropdown.empty().append($('<option>').text('Failed to load items'));
		})
		.always(() => {
			spinner.hide();
			dropdown.show();
		});
}

// Contact Fields Population
function ktPopulateContactFields(container, defaultValues = {}) {
	const spinner = ktCreateSpinner();
	container.before(spinner);
	
	spinner.show();
	container.hide();
	
	$.getJSON('/klicktipp/contact-fields')
		.done((items) => {
			container.empty();
			
			const standardFields = {};
			const customFields = {};
			
			$.each(items, (key, label) => {
				if (ktIsCustomField(key)) {
					customFields[key] = label;
				} else {
					standardFields[key] = label;
				}
			});
			
			ktGenerateFormFields(standardFields, defaultValues);
			ktGenerateCustomFieldsDropdown(customFields, defaultValues);
		})
		.fail(() => {
			container.empty().append($('<p>').text('Failed to load contact fields'));
		})
		.always(() => {
			spinner.hide();
			container.show();
		});
}

// Generate Standard Form Fields
function ktGenerateFormFields(fields, defaultValues = {}) {
	const container = $('#contact-fields-section');
	
	$.each(fields, (key, label) => {
		const iconClass = KLICKTIPP_ICON_MAP[key] || 'fa-question-circle';
		const defaultValue = defaultValues[key] || '';
		
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
		container.append(formRow);
	});
}

// Generate Custom Fields Dropdown and Restore Fields
function ktGenerateCustomFieldsDropdown(customFields, defaultValues) {
	const container = $('#contact-fields-section');
	
	const dropdownRow = `
        <div class="form-row">
            <label for="custom-fields-dropdown">
                <i class="fa fa-plus"></i> Add Custom Field
            </label>
            <select id="custom-fields-dropdown">
                <option value="" disabled selected>Choose value</option>
            </select>
            <button type="button" id="add-custom-field-btn" class="btn btn-sm" style="border: none; background: none;">
                <i class="fa fa-plus" aria-hidden="true"></i>
            </button>
        </div>
    `;
	
	container.append(dropdownRow);
	
	const dropdown = $('#custom-fields-dropdown');
	$.each(customFields, (key, label) => {
		dropdown.append($('<option>', { value: key, text: label }));
	});
	
	// Restore previously added custom fields
	ktRestoreCustomFields(customFields, defaultValues);
	
	// Add event listener for adding custom fields
	$('#add-custom-field-btn').on('click', () => {
		const selectedFieldKey = dropdown.val();
		const selectedFieldLabel = dropdown.find('option:selected').text();
		
		if (!selectedFieldKey || $('#node-input-' + selectedFieldKey).length) return;
		
		ktGenerateCustomField(selectedFieldKey, selectedFieldLabel);
		dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
	});
}

// Generate Individual Custom Field
function ktGenerateCustomField(fieldKey, fieldLabel, defaultValue = '') {
	const container = $('#contact-fields-section');
	
	const formRow = `
        <div class="form-row d-flex align-items-center" id="form-row-${fieldKey}">
            <label for="node-input-${fieldKey}">
                <i class="fa fa-question-circle"></i> ${fieldLabel}
            </label>
            <input
                type="text"
                id="node-input-${fieldKey}"
                placeholder="Enter ${fieldLabel.toLowerCase()} (optional)"
                value="${defaultValue}"
            >
            <button
                type="button"
                class="remove-custom-field-btn btn btn-sm btn-danger"
                data-field-key="${fieldKey}"
                data-field-label="${fieldLabel}"
            >
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;
	
	// Event Delegation for Removing Custom Fields
	container.on('click', '.remove-custom-field-btn', function () {
		const fieldKey = $(this).data('field-key');
		const fieldLabel = $(this).data('field-label');
		$(`#form-row-${fieldKey}`).remove();
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
	
	container.append(formRow);
}

// Restore Custom Fields
function ktRestoreCustomFields(customFields, defaultValues) {
	const dropdown = $('#custom-fields-dropdown');
	$.each(defaultValues, (fieldKey, value) => {
		if (ktIsCustomField(fieldKey)) {
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			ktGenerateCustomField(fieldKey, fieldLabel, value);
			dropdown.find(`option[value="${fieldKey}"]`).remove();
		}
	});
}