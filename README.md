# Boolean Search Parser

This library is a boolean search string parser. This will take a search string and parse it returning "possible" boolean operators, actual boolean operators and any errors encountered. It will also provide an HTML representation of the output so that you may style errors, possible operators, operators, etc.

## Using this library

Either use `npm install` or clone directly into your project.

Once cloned, you should be able to instantiate a new `BooleanSearch` object and get its tokens:

````ts
import {BooleanSearch} from 'boolean-search-parser';
const bs: BooleanSearch = new BooleanSearch('this and that or other NOT thing');
const html: string = bs.html; // will automatically run the parser
const tokens: Token[] = bs.tokens; // will automatically run the parser
````

Errors will be stored in the individual tokens where the error was encountered and also in the Errors array in the `BooleanSearch` instance.

````ts
const errors: Error[] = bs.errors;
const tokens: Token[] = bs.tokens;
const err: Error[] = tokens[0].errors;
````



