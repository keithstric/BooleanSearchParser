const BSP = require('boolean-search-parser');

const searchField = document.querySelector('input');
const output = document.querySelector('#output-container');
const button = document.querySelector('#submit');
button.addEventListener('click', onSubmit);

function onSubmit() {
	console.log('onSubmit')
	const searchStr = searchField.value;
	const bs = new BSP.BooleanSearch(searchStr);
	output.innerHTML = bs.html;
	console.log('bs=', bs);
}
