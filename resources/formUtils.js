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

const PREDEFINED_OPT_IN_PROCESS_NAME = 'Predefined double opt-in process';

/**
 * Creates a spinner element using jQuery.
 *
 * @returns {object} - A jQuery-wrapped span element containing a Font Awesome spinner icon.
 */
function ktCreateSpinner() {
	return $('<span>', {
		class: 'spinner',
		css: { display: 'none', textAlign: 'center', margin: '10px' },
	}).append('<i class="fa fa-spinner fa-spin fa-2x"></i>');
}

/**
 * Determines if a field key represents a custom field.
 *
 * Custom field keys are expected to match the pattern 'field' followed by one or more digits (e.g., 'field123').
 *
 * @param {string} fieldKey - The key of the field to check.
 * @returns {boolean} - True if the field key matches the custom field pattern, false otherwise.
 */
function ktIsCustomField(fieldKey) {
	return /^field\d+$/.test(fieldKey);
}

/**
 * Populates a dropdown with items fetched from a given action URL.
 *
 * @param {object} $dropdown - The jQuery-wrapped dropdown element to populate.
 * @param {(string|string[])} selectedItemId - The ID or array of IDs of the current item(s) to pre-select in the dropdown.
 * @param {string} actionUrl - The URL to fetch the items (in JSON format) for the dropdown.
 */
function ktPopulateDropdown($dropdown, selectedItemId, actionUrl) {
	const $spinner = ktCreateSpinner();
	
	$dropdown.before($spinner);
	$spinner.show();
	$dropdown.hide();
	
	$.getJSON(actionUrl)
		.done((items) => {
			$dropdown.empty();
			
			if (ktIsValidItemsObject(items)) {
				$.each(items, (id, name) => {
					const optionLabel = ktGetOptionLabel(name, actionUrl);
					$dropdown.append(ktCreateOptionElement(id, optionLabel));
				});
				
				ktPreselectItems($dropdown, selectedItemId);
				$dropdown.show();
			} else {
				ktShowError($dropdown, 'No valid items found');
			}
		})
		.fail((jqXHR) => {
			const errorMessage = ktGetErrorMessage(jqXHR);
			console.error('Error:', errorMessage);
			ktShowError($dropdown, `Error: ${errorMessage}`);
		})
		.always(() => {
			$spinner.hide();
		});
}

/**
 * Checks if the fetched items object is valid.
 *
 * @param {object} items - The items object to check.
 * @returns {boolean} - True if the items object is valid, false otherwise.
 */
function ktIsValidItemsObject(items) {
	return items && typeof items === 'object';
}

/**
 * Generates the label to display in the dropdown option.
 *
 * If the `name` is empty or consists only of whitespace, a predefined label is returned for subscription process nodes.
 * Specifically, if the `actionUrl` corresponds to the URL for retrieving subscription process nodes
 * (`/klicktipp/subscription-process/get-process-node`), it returns a predefined name for the opt-in process.
 * Otherwise, it returns "N/A".
 *
 * @param {string} name - The name of the item.
 * @param {string} actionUrl - The action URL to determine special cases for labeling.
 * @returns {string} - The label to display.
 */
function ktGetOptionLabel(name, actionUrl) {
	return name && name.trim() !== ''
		? name
		: (actionUrl === '/klicktipp/subscription-process/get-process-node'
			? PREDEFINED_OPT_IN_PROCESS_NAME
			: 'N/A');
}

/**
 * Creates an option element for the dropdown.
 *
 * @param {string} id - The ID for the option.
 * @param {string} text - The display text for the option.
 * @returns {object} - The jQuery-wrapped option element.
 */
function ktCreateOptionElement(id, text) {
	return $('<option>', { value: id, text });
}

/**
 * Pre-selects the given item(s) in the dropdown.
 *
 * @param {object} $dropdown - The jQuery-wrapped dropdown element.
 * @param {(string|string[])} selectedItemId - The ID or array of IDs to select.
 */
function ktPreselectItems($dropdown, selectedItemId) {
	if (selectedItemId) {
		$dropdown.val(Array.isArray(selectedItemId) ? selectedItemId : [selectedItemId]);
	}
}

/**
 * Displays an error message before the dropdown element.
 *
 * @param {object} $element - The jQuery-wrapped element.
 * @param {string} message - The error message to display.
 */
function ktShowError($element, message) {
	$element.before(`<span class="kt-error-message">${message}</span>`);
}

/**
 * Extracts the error message from the failed AJAX request.
 *
 * @param {object} jqXHR - The jQuery-wrapped XMLHttpRequest object.
 * @returns {string} - The extracted or default error message.
 */
function ktGetErrorMessage(jqXHR) {
	return jqXHR?.responseJSON?.error || 'Failed to load items';
}

/**
 * Populates contact fields in a container by fetching data from a given action URL.
 *
 * @param {object} $container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} [defaultValues={}] - Default values for the fields to pre-fill, where the keys are field IDs and values are the corresponding default values.
 * @param {string} action - The URL to fetch the contact field data in JSON format.
 */
function ktPopulateContactFields($container, defaultValues = {}, action) {
	const $spinner = ktCreateSpinner();
	$container.before($spinner);
	$spinner.show();
	$container.hide();
	
	// Clear previous error messages
	$container.siblings('.kt-error-message').remove();
	
	$.getJSON(action)
		.done((items) => {
			$container.empty();
			
			const standardFields = {};
			const customFields = {};
			
			if (ktIsValidItemsObject(items)) {
				$.each(items, (key, label) => {
					if (ktIsCustomField(key)) {
						customFields[key] = label;
					} else {
						standardFields[key] = label;
					}
				});
				
				ktGenerateFormFields($container, standardFields, defaultValues);
				ktGenerateCustomFieldsDropdown($container, customFields, defaultValues);
				$container.show();
			} else {
				ktShowError($container, 'No valid items found');
			}
		})
		.fail((jqXHR) => {
			const errorMessage = ktGetErrorMessage(jqXHR);
			console.error('Error:', errorMessage);
			ktShowError($container, `Error: ${errorMessage}`);
		})
		.always(() => {
			$spinner.hide();
			$container.show();
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
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {object} customFields - An object where keys represent field IDs and values are the field labels.
 * @param {object} defaultValues - An object containing default values for any previously added custom fields, keyed by field ID.
 */
function ktGenerateCustomFieldsDropdown($container, customFields, defaultValues) {
	if (!$container.length) {
		return;
	}
	
	if ($.isEmptyObject(customFields)) {
		return;
	}
	
	// Create and append the custom fields dropdown row
	const $dropdownRow = ktCreateDropdownRow();
	$container.append($dropdownRow);
	
	const $dropdown = $container.find('.custom-fields-dropdown');
	const $addButton = $container.find('.add-custom-field-btn');
	
	if (!$dropdown.length) {
		return;
	}
	
	// Populate the dropdown with custom field options
	ktPopulateDropdownOptions($dropdown, customFields);
	
	// Restore any previously added custom fields
	ktRestoreCustomFields($container, $dropdown, customFields, defaultValues);
	
	// Add functionality to the "Add Custom Field" button
	$addButton.on('click', () => {
		ktHandleAddCustomField($container, $dropdown);
	});
}

/**
 * Creates the dropdown row for custom fields.
 *
 * @returns {object} - A jQuery-wrapped dropdown row element.
 */
function ktCreateDropdownRow() {
	return $(`
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
	`);
}

/**
 * Populates the dropdown with custom field options.
 *
 * @param {object} $dropdown - The jQuery-wrapped dropdown element.
 * @param {object} customFields - An object where keys represent field IDs and values are the field labels.
 */
function ktPopulateDropdownOptions($dropdown, customFields) {
	$.each(customFields, (key, label) => {
		$dropdown.append($('<option>', { value: key, text: label }));
	});
}

/**
 * Handles adding a custom field when the "Add Custom Field" button is clicked.
 *
 * @param {object} $container - The jQuery-wrapped container element.
 * @param {object} $dropdown - The jQuery-wrapped dropdown element.
 */
function ktHandleAddCustomField($container, $dropdown) {
	const selectedFieldKey = $dropdown.val();
	const selectedFieldLabel = $dropdown.find('option:selected').text();
	
	// Exit if no field is selected or the field is already added
	if (!selectedFieldKey || $container.find(`#node-input-${selectedFieldKey}`).length) {
		return;
	}
	
	// Generate the selected custom field and remove it from the dropdown
	ktGenerateCustomField($container, selectedFieldKey, selectedFieldLabel);
	$dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
}

/**
 * Generates and appends an individual custom field input with a remove button to the contact fields section.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 * @param {string} [defaultValue=''] - Optional default value for the custom field input.
 */
function ktGenerateCustomField($container, fieldKey, fieldLabel, defaultValue = '') {
	if (!$container.length) {
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
	
	$container.append(formRow);
	
	$(`#form-row-${fieldKey} .remove-custom-field-btn`).on('click', function () {
		$(`#form-row-${fieldKey}`).remove();
		$('#custom-fields-dropdown').append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
}

/**
 * Restores previously added custom fields by generating them and removing the corresponding options from the dropdown.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {object} dropdown - The dropdown element containing custom field options.
 * @param {object} customFields - An object where keys represent custom field IDs and values are the corresponding labels.
 * @param {object} defaultValues - An object containing previously saved default values, where keys represent field IDs and values are the field values.
 */
function ktRestoreCustomFields($container, dropdown, customFields, defaultValues) {
	if (!dropdown.length) {
		return;
	}
	
	$.each(defaultValues, (fieldKey, value) => {
		if (ktIsCustomField(fieldKey)) {
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			ktGenerateCustomField($container, fieldKey, fieldLabel, value);
			dropdown.find(`option[value="${fieldKey}"]`).remove();
		}
	});
}

/**
 * Initializes a typed input field in the Node-RED editor.
 *
 * @param {string} inputSelector - The jQuery selector for the input element.
 * @param {string} typeFieldSelector - The jQuery selector for the hidden field storing the type.
 * @param {string} [defaultType='str'] - The default type for the typed input (e.g., 'str', 'num').
 * @param {Array} [additionalTypes=[]] - List of additional types available for selection.
 */
function ktInitializeTypedInput(
	inputSelector,
	typeFieldSelector,
	defaultType = 'str',
	additionalTypes = []
) {
	// Default types available for selection in the input field
	const defaultTypeOptions = ['msg', 'flow', 'global', 'jsonata', 'env'];
	
	// Combine default types with any additional types, ensuring no duplicates
	const combinedTypeOptions = [...new Set([...defaultTypeOptions, ...additionalTypes])];
	
	// Initialize the typed input with the combined options
	$(inputSelector).typedInput({
		default: defaultType,
		typeField: $(typeFieldSelector),
		types: combinedTypeOptions
	});
}

/**
 * Handles the visibility and population of the contact fields section
 * based on the selected input type.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {object} input - The input element triggering the change event.
 * @param {string} action - The action endpoint used to populate the contact fields.
 */
function ktHandleContactFieldsDisplay($container, input, action) {
	$(input).on("change", (event, type) => {
		// Remove previous error messages
		$container.siblings('.kt-error-message').remove();
		
		if (type === KT_CONTACT_FIELDS_API_TYPE) {
			// Show and populate the contact fields section if 'fieldsFromApi' is selected
			$container.show();
			ktPopulateContactFields($container, this.fieldsData, `/klicktipp/contact-fields/${action}`);
		} else {
			// Hide the contact fields section for other input types
			$container.hide();
		}
	});
}

/**
 * Collects all field values from the provided container and stores them in the fields object.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {Object} fields - The object where the collected field values will be stored.
 */
function ktSaveContactFieldValues($container, fields) {
	$container.find('input').each((index, element) => {
		const fieldId = $(element).attr('id').replace('node-input-', '');
		fields[fieldId] = $(element).val();
	});
}