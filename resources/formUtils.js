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
	label: "Data fields list",
	icon: "fa fa-cog",
	hasValue: false
}

const PREDEFINED_OPT_IN_PROCESS_NAME = 'Predefined double opt-in process';

const SUBSCRIPTION_PROCESS = 'subscription-process';

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
 * Checks if the fetched items object is valid.
 *
 * @param {object} item - The item to check.
 * @returns {boolean} - True if the item object is valid, false otherwise.
 */
function ktIsObject(item) {
	return item && typeof item === 'object';
}

/**
 * Generates the label to display in the dropdown option.
 *
 * If the `name` is empty or consists only of whitespace, a predefined label is returned for subscription process nodes.
 * Specifically, if the `actionUrl` corresponds to the URL for retrieving subscription process
 * (`/klicktipp/subscription-process`), it returns a predefined name for the opt-in process.
 * Otherwise, it returns "N/A".
 *
 * @param {string} name - The name of the item.
 * @param {string} actionUrl - The action URL to determine special cases for labeling.
 * @returns {string} - The label to display.
 */
function ktGetOptionLabel(name, actionUrl) {
	return name && name.trim() !== ''
		? name
		: (actionUrl.includes(SUBSCRIPTION_PROCESS)
			? PREDEFINED_OPT_IN_PROCESS_NAME
			: 'N/A');
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
 * Populates a dropdown with items fetched from a given action URL.
 *
 * @param {object} $dropdown - The jQuery-wrapped dropdown element to populate.
 * @param {(string|string[])} selectedItemId - The ID or array of IDs of the current item(s) to pre-select in the dropdown.
 * @param {string} configId - The KlickTipp config ID.
 * @param {string} actionUrl - The URL to fetch the items (in JSON format) for the dropdown.
 */
function ktPopulateDropdown($dropdown, selectedItemId, configId, actionUrl) {
	const $spinner = ktCreateSpinner();
	
	$dropdown.before($spinner);
	$spinner.show();
	$dropdown.hide();
	
	// Always reinsert the placeholder option at the top
	$dropdown.empty().append(
		new Option('Select an option', '', !selectedItemId)
	);
	
	$.ajax({
			url: actionUrl,
			method: 'GET',
			headers: {
				'config-id': configId
			},
			dataType: 'json'
		})
		.done((items) => {
			let itemExists = false;
			
			if (ktIsObject(items)) {
				$.each(items, (id, name) => {
					const optionLabel = ktGetOptionLabel(name, actionUrl);
					$dropdown.append(new Option(optionLabel, id));
				});
				
				// Check if selectedItemId is an array
				if (Array.isArray(selectedItemId)) {
					// If selectedItemId is an array, check if each ID exists in items
					itemExists = selectedItemId.some(id => items[id] !== undefined);
				} else {
					// If selectedItemId is a single ID, check if it exists in items
					itemExists = items[selectedItemId] !== undefined;
				}
				
				// Set the dropdown value based on selectedItemId; fallback to placeholder if not found
				$dropdown.val(itemExists ? selectedItemId : '');
			} else {
				$dropdown.append(new Option('Error: No valid items found', '', true, true));
			}
		})
		.fail((jqXHR) => {
			const errorMessage = `Error: ${ktGetErrorMessage(jqXHR)}`;
			console.error('Error:', errorMessage);
			$dropdown.append(new Option(errorMessage, '', true, true));
		})
		.always(() => {
			$spinner.hide();
			$dropdown.show();
		});
}

/**
 * Populates contact fields in a container by fetching data from a given action URL.
 *
 * @param {object} $container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} [defaultValues={}] - Default values for the fields to pre-fill, where the keys are field IDs and values are the corresponding default values.
 * @param {string} configId - The KlickTipp config ID.
 * @param {string} actionUrl - The URL to fetch the items (in JSON format) for the dropdown.
 */
function ktPopulateContactFields($container, defaultValues = {}, configId, actionUrl) {
	const $spinner = ktCreateSpinner();
	$container.before($spinner);
	$spinner.show();
	$container.hide();
	
	// Clear previous content and error messages
	$container.empty();
	$container.siblings('.kt-error-message').remove();
	
	$.ajax({
			url: actionUrl,
			method: 'GET',
			headers: {
				'config-id': configId
			},
			dataType: 'json'
		})
		.done((items) => {
			// Clear fields on each request to avoid duplicates
			const standardFields = {};
			const customFields = {};
			
			if (ktIsObject(items)) {
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
			$container.show();
		})
		.always(() => {
			$spinner.hide();
			$container.show();
		});
}

/**
 * Generates and appends standard form fields to the contact fields section.
 *
 * @param {object} $container - The DOM element (jQuery-wrapped) where the contact fields will be rendered.
 * @param {object} fields - An object where keys represent field IDs and values are the field labels.
 * @param {object} [defaultValues={}] - Optional object with default values for the form fields, keyed by field IDs.
 */
function ktGenerateFormFields($container, fields, defaultValues = {}) {
	if (!$container.length) {
		return;
	}
	
	if (!ktIsObject(fields)) {
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
		$container.append(formRow);
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
	ktGenerateCustomField($container, selectedFieldKey, selectedFieldLabel, '', $dropdown);
	$dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
}

/**
 * Generates and appends an individual custom field input with a remove button to the contact fields section.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 * @param {string} [defaultValue=''] - Optional default value for the custom field input.
 * @param $dropdown
 */
function ktGenerateCustomField($container, fieldKey, fieldLabel, defaultValue = '', $dropdown) {
	if (!$container.length) {
		return;
	}
	
	// Create and append the custom field row
	const $formRow = ktCreateFormRow(fieldKey, fieldLabel, defaultValue);
	$container.append($formRow);
	
	// Add functionality to the remove button
	$formRow.find('.remove-custom-field-btn').on('click', () => {
		ktHandleRemoveCustomField($dropdown, $formRow, fieldKey, fieldLabel);
	});
}

/**
 * Creates a form row for the custom field with the input and remove button.
 *
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 * @param {string} defaultValue - The default value for the custom field input.
 * @returns {object} - A jQuery-wrapped form row element.
 */
function ktCreateFormRow(fieldKey, fieldLabel, defaultValue) {
	return $(`
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
	`);
}

/**
 * Handles the removal of a custom field.
 *
 * @param $dropdown
 * @param {object} $formRow - The jQuery-wrapped form row element containing the custom field.
 * @param {string} fieldKey - The unique key/ID for the custom field.
 * @param {string} fieldLabel - The label to display for the custom field.
 */
function ktHandleRemoveCustomField($dropdown, $formRow, fieldKey, fieldLabel) {
	$formRow.remove();
	$dropdown.append($('<option>', { value: fieldKey, text: fieldLabel }));
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
			ktGenerateCustomField($container, fieldKey, fieldLabel, value, dropdown);
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
 * Collects all field values from the provided container and stores them in the fields object.
 *
 * @param {object} $container - The jQuery-wrapped DOM element where the contact fields will be rendered.
 */
function ktSaveContactFieldValues($container ) {
	// Ensure the container is valid
	if (!$container || !$container.length) {
		return {};
	}
	
	let fields = {};
	
	// Collect values from all input, select, and textarea elements
	$container.find('input, select, textarea').each((index, element) => {
		const $element = $(element);
		const fieldId = $element.attr('id') ? $element.attr('id').replace('node-input-', '') : null;
		
		// Proceed only if fieldId is valid
		if (fieldId) {
			fields[fieldId] = $element.val().trim(); // Trim whitespace from values
		}
	});
	
	return fields;
}

/**
 * Populates the specified property of the node with the first available KlickTipp configuration node.
 *
 * @param {Object} node - The Node-RED node object where the configuration will be set.
 */
function ktPopulateConfig(node) {
	const configs = []
	
	if (!node) {
		console.warn("ktPopulateConfig: No node provided.");
		return;
	}
	
	// Find 'klicktipp-config' configs
	RED.nodes.eachConfig(function(config) {
		if (config.type === "klicktipp-config") {
			configs.push(config);
		}
	});
	
	// Sort the configs alphabetically by name
	configs.sort((a, b) => {
		const nameA = a.name.toLowerCase();
		const nameB = b.name.toLowerCase();
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});
	
	// Automatically set the config ID if a 'klicktipp-config' node was found
	if (configs.length > 0) {
		node.klicktipp = configs[0].id; // Set the first one from the sorted array
	}
}

/**
 * Binds a dropdown to an input field, populating the dropdown with items from an action URL whenever the input changes.
 *
 * @param {object} $input - The jQuery-wrapped input element to watch for changes.
 * @param {object} $dropdown - The jQuery-wrapped dropdown element to populate.
 * @param {string} selectedItemId - The ID of the current item to pre-select in the dropdown.
 * @param {string} configId - The KlickTipp config ID to be used in the header.
 * @param {string} actionUrl - The URL to fetch the items (in JSON format) for the dropdown.
 */
function ktBindDropdownToInput($input, $dropdown, selectedItemId, configId, actionUrl) {
	let lastValue = $input.val();
	ktPopulateDropdown($dropdown, selectedItemId, lastValue, actionUrl);
	
	// Event listener for input changes
	$input.on('change', () => {
		const newValue = $input.val();
		if (newValue !== lastValue) {
			lastValue = newValue;
			
			// Populate the dropdown based on the new input value
			ktPopulateDropdown($dropdown, selectedItemId, newValue, actionUrl);
		}
	});
}

/**
 * Toggles visibility of the contact fields section and populates it if visible.
 *
 * @param {boolean} show - Whether to show the contact fields section.
 * @param {Object} contactFieldsSection - jQuery object representing the contact fields section.
 * @param {Object} fieldsData - Data for contact fields to populate the section.
 * @param {Object} klicktippInput - jQuery object representing the input field related to KlickTipp.
 * @param {string} nodeId - Unique identifier for the node to fetch contact fields data.
 */
function ktToggleContactFieldsSection(show, contactFieldsSection, fieldsData, klicktippInput, nodeId) {
	if (show) {
		contactFieldsSection.show();
		ktPopulateContactFields(contactFieldsSection, fieldsData, klicktippInput.val(), `/klicktipp/contact-fields/${nodeId}`);
	} else {
		contactFieldsSection.hide();
	}
}

/**
 * Initializes the logic for toggling and populating the contact fields section based on the input changes.
 *
 * @param {Object} fieldsInput - jQuery object for the fields input to detect changes.
 * @param {Object} contactFieldsSection - jQuery object representing the contact fields section.
 * @param {Object} klicktippInput - jQuery object representing the input field related to KlickTipp.
 * @param {Object} fieldsData - Data for contact fields to populate the section.
 * @param {string} nodeId - Unique identifier for the node to fetch contact fields data.
 */
function ktInitializeContactFieldsSection(fieldsInput, contactFieldsSection, klicktippInput, fieldsData, nodeId) {
	// Event listener for fields input changes
	fieldsInput.on('change', (event, type) => {
		// Remove any previous error messages
		contactFieldsSection.siblings('.kt-error-message').remove();
		
		// Toggle and populate the contact fields section based on input type
		ktToggleContactFieldsSection(
			type === KT_CONTACT_FIELDS_API_TYPE,
			contactFieldsSection,
			fieldsData,
			klicktippInput,
			nodeId
		);
	});
}

/**
 * Initializes a select input with detection for user-triggered changes and updates the contact fields section accordingly.
 *
 * @param {Object} klicktippInput - jQuery object for the KlickTipp select input to monitor for user changes.
 * @param {string} fieldsTypeSelector - Selector for the field type input to determine the current selection type.
 * @param {Object} contactFieldsSection - jQuery object representing the contact fields section.
 * @param {Object} fieldsData - Data for contact fields to populate the section.
 * @param {string} nodeId - Unique identifier for the node to fetch contact fields data.
 */
function ktInitializeUserSelectHandler(klicktippInput, fieldsTypeSelector, contactFieldsSection, fieldsData, nodeId) {
	let userChangedSelect = false;
	
	// Set the flag for user interaction on mousedown
	klicktippInput.on('mousedown', () => {
		userChangedSelect = true;
	});
	
	// Handle select changes with differentiation for user vs. programmatic
	klicktippInput.on('change', () => {
		// Dynamically fetch the current fieldsType value from the DOM
		const currentFieldsType = $(fieldsTypeSelector).val();
		
		if (!userChangedSelect) {
			// Ignore programmatic changes
			return;
		}
		
		// Reset the flag after handling the user change
		userChangedSelect = false;
		
		// Toggle the contact fields section if the current fieldsType is 'fieldsFromApi'
		ktToggleContactFieldsSection(
			currentFieldsType === KT_CONTACT_FIELDS_API_TYPE,
			contactFieldsSection,
			fieldsData,
			klicktippInput,
			nodeId
		);
	});
}