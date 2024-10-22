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

const KT_CONTACT_FIELDS_API_TYPE = "fieldsFromApi"

const KT_CUSTOM_CONTACT_FIELDS_TYPE = {
	value: KT_CONTACT_FIELDS_API_TYPE,
	label: "Contact fields list",
	icon: "fa fa-cog",
	hasValue: false
}

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
	const spinner = ktCreateSpinner();
	dropdown.before(spinner);
	
	spinner.show();
	dropdown.hide();
	
	$.getJSON(action)
		.done((items) => {
			dropdown.empty();
			
			if (items && typeof items === 'object') {
				$.each(items, (id, name) => {
					const displayName = name && name.trim() !== '' ? name : 'N/A';
					dropdown.append($('<option>', { value: id, text: displayName }));
				});
				
				if (currentItemId) {
					dropdown.val(Array.isArray(currentItemId) ? currentItemId : [currentItemId]);
				}
				
				dropdown.show();
			} else {
				dropdown.before('<span>No valid items found</span>');
			}
		})
		.fail((jqXHR) => {
			const errorMessage = (jqXHR.responseJSON && jqXHR.responseJSON.error) ? jqXHR.responseJSON.error : 'Failed to load items';
			console.error('Error:', errorMessage);
			
			RED.notify(errorMessage, 'error');
			dropdown.before(`<span>Error: ${errorMessage}</span>`);
		})
		.always(() => {
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
	const spinner = ktCreateSpinner();
	container.before(spinner);
	
	spinner.show();
	container.hide();
	
	// Clear previous error messages
	container.siblings('.kt-error-message').remove();
	
	$.getJSON(action)
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
			
			ktGenerateFormFields(container, standardFields, defaultValues);
			ktGenerateCustomFieldsDropdown(container, customFields, defaultValues);
		})
		.fail((jqXHR) => {
			const errorMessage = jqXHR.responseJSON?.error || 'Failed to load contact fields';
			console.error('Error:', errorMessage);
			
			// Notify user and display error message
			RED.notify(errorMessage, 'error');
			container.before(`<span class="kt-error-message">Error: ${errorMessage}</span>`)
		})
		.always(() => {
			spinner.hide();
			container.show();
		});
}

/**
 * Generates and appends standard form fields to the contact fields section.
 *
 * @param {object} container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} fields - An object where keys represent field IDs and values are the field labels.
 * @param {object} [defaultValues={}] - Optional object with default values for the form fields, keyed by field IDs.
 */
function ktGenerateFormFields(container, fields, defaultValues = {}) {
	if (!container.length) {
		console.error('Container not found for form fields.');
		return;
	}
	
	if (!fields || typeof fields !== 'object') {
		console.error('Invalid fields provided.');
		return;
	}
	
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

/**
 * Generates a dropdown for custom fields, restores previously added custom fields, and adds functionality to add new fields.
 *
 * @param {object} container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} customFields - An object where keys represent field IDs and values are the field labels.
 * @param {object} defaultValues - An object containing default values for any previously added custom fields, keyed by field ID.
 */
function ktGenerateCustomFieldsDropdown(container, customFields, defaultValues) {
	if (!container.length) {
		console.error('Container not found for custom fields dropdown.');
		return;
	}
	
	if ($.isEmptyObject(customFields)) {
		return;
	}
	
	// Create the dropdown row with class selectors instead of IDs
	const dropdownRow = `
    <div class="form-row">
      <label>
        <i class="fa fa-plus"></i> Add Custom Field
      </label>
      <select class="custom-fields-dropdown">
        <option value="" disabled selected>Choose value</option>
      </select>
      <button type="button" class="add-custom-field-btn btn btn-sm" style="border: none; background: none;">
        <i class="fa fa-plus" aria-hidden="true"></i>
      </button>
    </div>
  `;
	
	// Append the dropdown row to the container
	container.append(dropdownRow);
	
	// Select elements within the container to prevent conflicts
	const dropdown = container.find('.custom-fields-dropdown');
	const addButton = container.find('.add-custom-field-btn');
	
	if (!dropdown.length) {
		console.error('Dropdown element not found.');
		return;
	}
	
	// Populate the dropdown with custom field options
	$.each(customFields, (key, label) => {
		dropdown.append($('<option>', { value: key, text: label }));
	});
	
	// Restore previously added custom fields
	ktRestoreCustomFields(container, dropdown, customFields, defaultValues);
	
	// Add event listener to the 'Add Custom Field' button
	addButton.on('click', () => {
		const selectedFieldKey = dropdown.val();
		const selectedFieldLabel = dropdown.find('option:selected').text();
		
		// If no field is selected or the field is already added, exit
		if (!selectedFieldKey || container.find(`#node-input-${selectedFieldKey}`).length) {
			return;
		}
		
		// Generate the selected custom field and remove it from the dropdown
		ktGenerateCustomField(container, selectedFieldKey, selectedFieldLabel);
		dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
	});
}

/**
 * Generates and appends an individual custom field input with a remove button to the contact fields section.
 *
 * @param {object} container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 * @param {string} [defaultValue=''] - Optional default value for the custom field input.
 */
function ktGenerateCustomField(container, fieldKey, fieldLabel, defaultValue = '') {
	if (!container.length) {
		console.error('Container not found for custom fields.');
		return;
	}
	
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
	
	container.append(formRow);
	
	$(`#form-row-${fieldKey} .remove-custom-field-btn`).on('click', function () {
		$(`#form-row-${fieldKey}`).remove();
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
}

/**
 * Restores previously added custom fields by generating them and removing the corresponding options from the dropdown.
 *
 * @param {object} container - The DOM element where the custom fields will be added.
 * @param {object} dropdown - The dropdown element containing custom field options.
 * @param {object} customFields - An object where keys represent custom field IDs and values are the corresponding labels.
 * @param {object} defaultValues - An object containing previously saved default values, where keys represent field IDs and values are the field values.
 */
function ktRestoreCustomFields(container, dropdown, customFields, defaultValues) {
	if (!dropdown.length) {
		console.error('Custom fields dropdown not found.');
		return;
	}
	
	$.each(defaultValues, (fieldKey, value) => {
		if (ktIsCustomField(fieldKey)) {
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			ktGenerateCustomField(container, fieldKey, fieldLabel, value);
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

/**
 * Handles the visibility and population of the contact fields section
 * based on the selected input type.
 *
 * @param {object} container - The container for the contact fields.
 * @param {object} input - The input element triggering the change event.
 * @param {string} action - The action endpoint used to populate the contact fields.
 */
function ktHandleContactFieldsDisplay(container, input, action) {
	$(input).on("change", (event, type) => {
		// Remove previous error messages
		container.siblings('.kt-error-message').remove();
		
		if (type === KT_CONTACT_FIELDS_API_TYPE) {
			// Show and populate the contact fields section if 'fieldsFromApi' is selected
			container.show();
			ktPopulateContactFields(container, this.fieldsData, `/klicktipp/contact-fields/${action}`);
		} else {
			// Hide the contact fields section for other input types
			container.hide();
		}
	});
}

/**
 * Collects all field values from the provided container and stores them in the fields object.
 *
 * @param {object} container - The container element that holds the input fields.
 * @param {Object} fields - The object where the collected field values will be stored.
 */
function ktSaveContactFieldValues(container, fields) {
	container.find('input').each((index, element) => {
		const fieldId = $(element).attr('id').replace('node-input-', '');
		fields[fieldId] = $(element).val();
	});
}