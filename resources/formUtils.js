// ===========================
// Constants and Configuration
// ===========================
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

const KT_CONTACT_FIELDS_API_TYPE = "fieldsFromApi";
const PREDEFINED_OPT_IN_PROCESS_NAME = 'Predefined double opt-in process';
const SUBSCRIPTION_PROCESS = 'subscription-process';
const KT_CUSTOM_FIELD_TYPE = 'customFieldType';

const KT_CUSTOM_CONTACT_FIELDS_TYPE = {
	value: KT_CONTACT_FIELDS_API_TYPE,
	label: "Data fields list",
	icon: "fa fa-cog",
	hasValue: false
};

const KT_CUSTOM_CONTACT_FIELDS_TYPES = {
	value: KT_CUSTOM_FIELD_TYPE,
	label: "List of available types",
	icon: "fa fa-cog",
	hasValue: false
};

const KT_CUSTOM_CONTACT_FIELDS_LABEL = {
	value: 'customFieldLabel',
	label: "Custom field labels",
	icon: "fa fa-cog",
	hasValue: false
};

const KT_CUSTOM_FIELD_TYPE_LIST = {
	'Single line': 'field-single',
	'Paragraph text': 'field-paragraph',
	'Email address': 'field-email',
	'Numbers': 'field-number',
	'Decimal': 'field-decimal',
	'URL': 'field-url',
	'Date field': 'field-date',
	'Time field': 'field-time',
	'Datetime field': 'field-datetime',
	'HTML field': 'field-html',
};

// ===========================
// Utility Functions
// ===========================
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
	if (name && name.trim() !== '') {
		return name;
	}
	
	return actionUrl.includes(SUBSCRIPTION_PROCESS)
		? PREDEFINED_OPT_IN_PROCESS_NAME
		: 'N/A';
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

// ===========================
// Dropdown and Field Population
// ===========================

function ktPopulateDropdown($dropdown, selectedItemId, configId, actionUrl, filterCallback = null) {
	const $spinner = ktCreateSpinner();
	
	$dropdown
		.before($spinner)
		.hide();
	
	$spinner.show();

	// Always reinsert the placeholder option at the top
	$dropdown
		.empty()
		.append(
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
			if (!ktIsObject(items)) {
				$dropdown.append(new Option('Error: No valid items found', '', true, true));
				return;
			}
			
			// Apply optional filtering
			if (typeof filterCallback === 'function') {
				items = Object.fromEntries(Object.entries(items).filter(([key, value]) => filterCallback(key, value)));
			}
			
			// Populate dropdown
			$.each(items, (id, name) => {
				$dropdown.append(new Option(ktGetOptionLabel(name, actionUrl), id));
			});
			
			// Determine if item exists
			const itemExists = Array.isArray(selectedItemId)
				? selectedItemId.some(id => items[id] !== undefined)
				: items[selectedItemId] !== undefined;
			
			$dropdown.val(itemExists ? selectedItemId : '');
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

function ktPopulateContactFields($container, defaultValues = {}, configId, actionUrl) {
	const $spinner = ktCreateSpinner();
	$container.before($spinner).hide();
	$spinner.show();
	$container.empty().siblings('.kt-error-message').remove();
	
	$.ajax({
			url: actionUrl,
			method: 'GET',
			headers: { 'config-id': configId },
			dataType: 'json'
		})
		.done((items) => {
			if (!ktIsObject(items)) {
				ktShowError($container, 'No valid items found');
				return;
			}
			
			const standardFields = {};
			const customFields = {};
			
			$.each(items, (key, label) => {
				ktIsCustomField(key) ? customFields[key] = label : standardFields[key] = label;
			});
			
			ktGenerateFormFields($container, standardFields, defaultValues);
			ktGenerateCustomFieldsUI($container, customFields, defaultValues);
			$container.show();
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

// ===========================
// UI Generation Functions
// ===========================

function ktGenerateFormFields($container, fields, defaultValues = {}) {
	if (!ktIsObject(fields)) return;
	
	$.each(fields, (key, label) => {
		const iconClass = KLICKTIPP_ICON_MAP[key] || 'fa-question-circle';
		const defaultValue = defaultValues[key] || '';
		
		const $formRow = $(`
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
		`);
		
		$container.append($formRow);
	});
}

function ktGenerateCustomFieldsUI($container, customFields, defaultValues) {
	if ($.isEmptyObject(customFields)) return;
	
	const $dropdownRow = $(`
		<div class="form-row">
			<label><i class="fa fa-plus"></i> Add Custom Field</label>
			<select class="custom-fields-dropdown">
				<option value="" disabled selected>Choose value</option>
			</select>
			<button type="button" class="add-custom-field-btn btn btn-sm" style="border: none; background: none;">
				<i class="fa fa-plus" aria-hidden="true"></i>
			</button>
		</div>
	`);
	
	$container.append($dropdownRow);
	const $dropdown = $container.find('.custom-fields-dropdown');
	const $addButton = $container.find('.add-custom-field-btn');
	
	// Populate dropdown
	$.each(customFields, (key, label) => {
		$dropdown.append($('<option>', { value: key, text: label }));
	});
	
	// Restore previously added custom fields
	$.each(defaultValues, (fieldKey, value) => {
		if (ktIsCustomField(fieldKey)) {
			const fieldLabel = customFields[fieldKey] || 'Custom Field';
			ktGenerateCustomField($container, fieldKey, fieldLabel, value, $dropdown);
			$dropdown.find(`option[value="${fieldKey}"]`).remove();
		}
	});
	
	// Add new custom field on button click
	$addButton.on('click', () => {
		const selectedFieldKey = $dropdown.val();
		const selectedFieldLabel = $dropdown.find('option:selected').text();
		if (!selectedFieldKey || $container.find(`#node-input-${selectedFieldKey}`).length) return;
		
		ktGenerateCustomField($container, selectedFieldKey, selectedFieldLabel, '', $dropdown);
		$dropdown.find(`option[value="${selectedFieldKey}"]`).remove();
	});
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
	const $formRow = $(`
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
	
	$container.append($formRow);
	
	// Remove custom field handler
	$formRow.find('.remove-custom-field-btn').on('click', () => {
		$formRow.remove();
		$dropdown.append($('<option>', { value: fieldKey, text: fieldLabel }));
	});
}

// ===========================
// Typed Input and Field Labels Setup
// ===========================

function ktInitializeTypedInput(inputSelector, typeFieldSelector, defaultType = 'str', additionalTypes = []) {
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

function ktSetupFieldLabelsUI(node, fieldLabelInputSelector, wrapperSelector, containerSelector, addBtnSelector, removeBtnSelector) {
	const $container = $(containerSelector);
	const $wrapper = $(wrapperSelector);
	
	function createFieldLabelElement(labelValue = "") {
		return $(`
            <div class="repeater-item" style="text-align:end; margin-top: 5px">
                <input type="text" name="fieldLabels[]" placeholder="Enter label" value="${labelValue}" />
                <button class="remove-field"><i class="fa fa-minus"></i></button>
            </div>
        `);
	}
	
	$(fieldLabelInputSelector).on('change', (event, type) => {
		if (type === 'customFieldLabel') {
			$wrapper.show();
			$container.empty();
			
			if (node.fieldLabelsData && node.fieldLabelsData.length > 0) {
				node.fieldLabelsData.forEach(labelValue => {
					$container.append(createFieldLabelElement(labelValue));
				});
			} else {
				$container.append(createFieldLabelElement());
			}
			
			$(addBtnSelector).off('click').on('click', function(e) {
				e.preventDefault();
				$container.append(createFieldLabelElement());
			});
			
			$container.off('click', removeBtnSelector).on('click', removeBtnSelector, function(e) {
				e.preventDefault();
				$(this).closest(".repeater-item").remove();
			});
		} else {
			$wrapper.hide();
		}
	});
}

function ktSetupFieldTypeUI(fieldDataTypeSelector, fieldTypeWrapperSelector, fieldTypeListSelector) {
	const $fieldTypeWrapper = $(fieldTypeWrapperSelector);
	const $select = $(fieldTypeListSelector);
	
	$(fieldDataTypeSelector).on('change', (event, type) => {
		if (type === KT_CUSTOM_FIELD_TYPE) {
			$fieldTypeWrapper.show();
			$select.empty();
			$.each(KT_CUSTOM_FIELD_TYPE_LIST, (label, value) => {
				$select.append($('<option>', { value: value, text: label }));
			});
		} else {
			$fieldTypeWrapper.hide();
		}
	});
}

// ===========================
// Config and Dropdown Binding
// ===========================

function ktPopulateConfig(node) {
	const configs = [];
	
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
	
	configs.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	
	if (configs.length > 0) {
		node.klicktipp = configs[0].id;
	}
}

function ktBindDropdownToInput($input, $dropdown, fieldId, configId, url, filterFn) {
	let lastValue = $input.val();
	
	// Initial population
	ktPopulateDropdown($dropdown, fieldId, configId, url, filterFn);
	
	$input.on('change', () => {
		const newValue = $input.val();
		if (newValue === lastValue) return;
		lastValue = newValue;
		ktPopulateDropdown($dropdown, fieldId, configId, url, filterFn);
	});
}

// ===========================
// Contact Fields Toggle
// ===========================

function ktToggleContactFieldsSection(show, $contactFieldsSection, fieldsData, $klicktippInput, nodeId) {
	if (show) {
		$contactFieldsSection.show();
		ktPopulateContactFields($contactFieldsSection, fieldsData, $klicktippInput.val(), `/klicktipp/contact-fields/${nodeId}`);
	} else {
		$contactFieldsSection.hide();
	}
}

function ktInitializeContactFieldsSection($fieldsInput, $contactFieldsSection, $klicktippInput, fieldsData, nodeId) {
	$fieldsInput.on('change', (event, type) => {
		$contactFieldsSection.siblings('.kt-error-message').remove();
		ktToggleContactFieldsSection(type === KT_CONTACT_FIELDS_API_TYPE, $contactFieldsSection, fieldsData, $klicktippInput, nodeId);
	});
}

function ktInitializeUserSelectHandler($klicktippInput, fieldsTypeSelector, $contactFieldsSection, fieldsData, nodeId) {
	let userChangedSelect = false;
	
	$klicktippInput.on('mousedown', () => {
		userChangedSelect = true;
	});
	
	$klicktippInput.on('change', () => {
		const currentFieldsType = $(fieldsTypeSelector).val();
		if (!userChangedSelect) return;
		userChangedSelect = false;
		
		// Toggle the contact fields section if the current fieldsType is 'fieldsFromApi'
		ktToggleContactFieldsSection(
			currentFieldsType === KT_CONTACT_FIELDS_API_TYPE,
			$contactFieldsSection,
			fieldsData,
			$klicktippInput,
			nodeId
		);
	});
}

// ===========================
// Saving Contact Field Values
// ===========================

function ktSaveContactFieldValues($container) {
	let fields = {};
	
	if (!$container || !$container.length) {
		return fields;
	}
	
	$container.find('input, select, textarea').each((_, element) => {
		const $element = $(element);
		const fieldId = $element.attr('id')?.replace('node-input-', '');
		if (fieldId) {
			fields[fieldId] = $element.val().trim();
		}
	});
	
	return fields;
}
