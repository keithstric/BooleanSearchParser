const BSP = require('boolean-search-parser');

const defaultSearchField = document.querySelector('#default-field');
const defaultOutput = document.querySelector('#default-output-container');
const defaultButton = document.querySelector('#default-submit');

const customSearchField = document.querySelector('#custom-field');
const customOutput = document.querySelector('#custom-output-container');
const customButton = document.querySelector('#custom-submit');

defaultButton.addEventListener('click', defaultOnSubmit);
customButton.addEventListener('click', customOnSubmit);

function defaultOnSubmit() {
	const searchStr = defaultSearchField.value;
	// default configuration
	const bs = new BSP.BooleanSearch(searchStr);
	defaultOutput.innerHTML = bs.html;
	console.log('Default BooleanSearch instance=', bs);
}

function customOnSubmit() {
	const searchStr = customSearchField.value;
	const rules = {...BSP.DEFAULT_RULES};
	const validationRules = {
		...BSP.DEFAULT_VALIDATION_RULES,
		number: new BSP.ValidationRule(/[0-9]+/g, '#')
	};
	const customConfig = {
		rules,
		validationRules,
		operatorStyleClass: 'success'
	};
	// custom configuration
	const bs = new BSP.BooleanSearch(searchStr, customConfig);
	customOutput.innerHTML = bs.html;
	console.log('Custom BooleanSearch instance=', bs);
}
