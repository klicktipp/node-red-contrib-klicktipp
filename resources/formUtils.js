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

/**
 * Populates a dropdown with items fetched from a given action URL.
 *
 * @param {object} dropdown - The dropdown element to populate, expected to be a jQuery-wrapped element.
 * @param {(string|string[])} currentItemId - The ID of the current item(s) to pre-select in the dropdown.
 * @param {string} action - The URL to fetch the items (in JSON format) for the dropdown.
 */
function ktPopulateDropdown(dropdown, currentItemId, action) {
	// Create and display the spinner while loading the dropdown options
	const spinner = ktCreateSpinner();
	dropdown.before(spinner);
	
	spinner.show();
	dropdown.hide();
	
	// Perform the AJAX request to fetch the dropdown items
	$.getJSON(action)
		.done((items) => {
			dropdown.empty(); // Clear any existing options in the dropdown
			
			if (items && typeof items === 'object') {
				// Iterate over the items object to populate the dropdown
				$.each(items, (id, name) => {
					const displayName = (name && name.trim() !== '') ? name : 'N/A'; // Handle empty names
					dropdown.append($('<option>', { value: id, text: displayName }));
				});
				
				// Select the currentItemId if provided
				if (currentItemId) {
					dropdown.val(Array.isArray(currentItemId) ? currentItemId : [currentItemId]);
				}
				
				dropdown.show(); // Show the dropdown once populated
			} else {
				// Handle cases where no valid items are found
				dropdown.before("<span>No valid items found</span>");
			}
		})
		.fail((response) => {
			// Handle any errors that occur during the request
			const errorMessage = response.error().statusText || 'Failed to load items';
			console.error('Error:', errorMessage);
			
			RED.notify(errorMessage, 'error'); // Notify the user of the failure
			dropdown.before(`<span>${errorMessage}</span>`); // Display the error before the dropdown
		})
		.always(() => {
			// Always hide the spinner once the request completes (success or failure)
			spinner.hide();
		});
}

/**
 * Populates contact fields in a container by fetching data from a given action URL.
 *
 * @param {object} container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} [defaultValues={}] - Default values for the fields to pre-fill, where the keys are field IDs and values are the corresponding default values.
 * @param {string} action - The URL to fetch the contact field data in JSON format.
 */
function ktPopulateContactFields(container, defaultValues = {}, action) {
	// Create and display the spinner while loading the fields
	const spinner = ktCreateSpinner();
	container.before(spinner);
	
	spinner.show();
	container.hide();
	
	// Fetch the contact fields via AJAX
	$.getJSON(action)
		.done((items) => {
			container.empty(); // Clear the container before populating
			
			const standardFields = {}; // Store standard fields
			const customFields = {};   // Store custom fields
			
			// Separate items into standard and custom fields
			$.each(items, (key, label) => {
				if (ktIsCustomField(key)) {
					customFields[key] = label; // Custom field
				} else {
					standardFields[key] = label; // Standard field
				}
			});
			
			// Generate form fields for standard fields
			ktGenerateFormFields(standardFields, defaultValues);
			
			// Generate dropdowns for custom fields
			ktGenerateCustomFieldsDropdown(customFields, defaultValues);
		})
		.fail(() => {
			// Handle failure by displaying a message
			container
				.empty()
				.append($('<p>')
					.text('Failed to load contact fields. Please try again.'));
		})
		.always(() => {
			// Hide the spinner and show the container after loading
			spinner.hide();
			container.show();
		});
}

/**
 * Generates and appends standard form fields to the contact fields section.
 *
 * @param {object} fields - An object where keys represent field IDs and values are the field labels.
 * @param {object} [defaultValues={}] - Optional object with default values for the form fields, keyed by field IDs.
 */
function ktGenerateFormFields(fields, defaultValues = {}) {
	const container = $('#contact-fields-section');
	
	// Ensure the container exists
	if (!container.length) {
		console.error('Container not found for form fields.');
		return;
	}
	
	// Ensure fields object is valid
	if (!fields || typeof fields !== 'object') {
		console.error('Invalid fields provided.');
		return;
	}
	
	// Loop through the fields and generate form rows
	$.each(fields, (key, label) => {
		const iconClass = KLICKTIPP_ICON_MAP[key] || 'fa-question-circle'; // Fallback icon class
		const defaultValue = defaultValues[key] || ''; // Get default value or set empty
		
		// Construct form row HTML
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

/**
 * Generates a dropdown for custom fields, restores previously added custom fields, and adds functionality to add new fields.
 *
 * @param {object} customFields - An object where keys represent field IDs and values are the field labels.
 * @param {object} defaultValues - An object containing default values for any previously added custom fields, keyed by field ID.
 */
function ktGenerateCustomFieldsDropdown(customFields, defaultValues) {
	const container = $('#contact-fields-section');
	
	// Ensure the container exists
	if (!container.length) {
		console.error('Container not found for custom fields dropdown.');
		return;
	}
	
	// Check if customFields object is empty and exit if so
	if ($.isEmptyObject(customFields)) {
		return; // Do not render anything if customFields is empty
	}
	
	// Create the dropdown row only if customFields exist
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
	
	// Append the dropdown row to the container
	container.append(dropdownRow);
	
	const dropdown = $('#custom-fields-dropdown');
	
	// Ensure dropdown exists
	if (!dropdown.length) {
		console.error('Dropdown element not found.');
		return;
	}
	
	// Populate the dropdown with custom field options
	$.each(customFields, (key, label) => {
		dropdown.append($('<option>', { value: key, text: label }));
	});
	
	// Restore previously added custom fields
	ktRestoreCustomFields(customFields, defaultValues);
	
	// Add event listener to the 'Add Custom Field' button
	$('#add-custom-field-btn').on('click', () => {
		const selectedFieldKey = dropdown.val();
		const selectedFieldLabel = dropdown.find('option:selected').text();
		
		// If no field is selected or the field is already added, exit
		if (!selectedFieldKey || $('#node-input-' + selectedFieldKey).length) {
			return;
		}
		
		// Generate the selected custom field and remove it from the dropdown
		ktGenerateCustomField(selectedFieldKey, selectedFieldLabel);
		dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
	});
}


/**
 * Generates and appends an individual custom field input with a remove button to the contact fields section.
 *
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 * @param {string} [defaultValue=''] - Optional default value for the custom field input.
 */
function ktGenerateCustomField(fieldKey, fieldLabel, defaultValue = '') {
	const container = $('#contact-fields-section');
	
	// Ensure the container exists before appending the field
	if (!container.length) {
		console.error('Container not found for custom fields.');
		return;
	}
	
	// Generate the custom field's form row HTML
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
                <i class="fa fa-minus"></i>
            </button>
        </div>
    `;
	
	// Append the custom field to the container
	container.append(formRow);
	
	// Attach the remove event to the remove button after appending the field
	$(`#form-row-${fieldKey} .remove-custom-field-btn`).on('click', function () {
		// Remove the custom field from the form
		$(`#form-row-${fieldKey}`).remove();
		
		// Add the removed field option back to the dropdown
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
}

/**
 * Restores previously added custom fields by generating them and removing the corresponding options from the dropdown.
 *
 * @param {object} customFields - An object where keys represent custom field IDs and values are the corresponding labels.
 * @param {object} defaultValues - An object containing previously saved default values, where keys represent field IDs and values are the field values.
 */
function ktRestoreCustomFields(customFields, defaultValues) {
	const dropdown = $('#custom-fields-dropdown');
	
	// Ensure the dropdown exists
	if (!dropdown.length) {
		console.error('Custom fields dropdown not found.');
		return;
	}
	
	// Iterate through the defaultValues object to restore custom fields
	$.each(defaultValues, (fieldKey, value) => {
		// Check if the field is a custom field
		if (ktIsCustomField(fieldKey)) {
			// Retrieve the field label or use a fallback label
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			
			// Generate the custom field with the provided key, label, and value
			ktGenerateCustomField(fieldKey, fieldLabel, value);
			
			// Remove the corresponding option from the dropdown to avoid duplicates
			dropdown.find(`option[value="${fieldKey}"]`).remove();
		}
	});
}

/**
 * Initializes a typed input field in the Node-RED editor.
 *
 * @param {string} elementSelector - The jQuery selector for the input element.
 * @param {string} typeFieldSelector - The jQuery selector for the hidden field storing the type.
 * @param {string} [defaultType='str'] - The default type for the typed input (e.g., 'str', 'num').
 * @param {Array} [availableTypes=['msg', 'flow', 'global', 'str', 'jsonata', 'env']] - List of types available for selection.
 */
function ktInitializeTypedInput(
	elementSelector,
	typeFieldSelector,
	defaultType = 'str',
	availableTypes = []
)
{
	// Default available types
	const defaultAvailableTypes = ['msg', 'flow', 'global', 'jsonata', 'env'];
	
	// Merge the default types with the additional ones passed in availableTypes
	const typesToUse = [...new Set([...defaultAvailableTypes, ...availableTypes])];
	
	$(elementSelector).typedInput({
		default: defaultType,
		typeField: $(typeFieldSelector),
		types: typesToUse
	});
}

function ktStoreContactFields() {
	// Iterate over all input fields in the contact fields section
	$('#contact-fields-section input').each((index, element) => {
		const fieldId = $(element).attr('id').replace('node-input-', '');
		this.fieldsData[fieldId] = $(element).val();
	});
}