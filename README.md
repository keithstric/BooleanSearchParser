# Boolean Search Parser

This library is the boolean search parser used in the Allbirds Explore UI. This will take a search string and parse it returning "possible" boolean operators, actual boolean operators and any errors encountered.

## Using this library

Either use `npm install` or clone directly into your project. If you use npm, you will need to provide credentials.

Once cloned, you should be able to instantiate a new `BooleanSearch` object and get it's tokens:

````ts
import {BooleanSearch} from 'boolean-search-parser';
const bs: BooleanSearch = new BooleanSearch('this and that or other not thing');
const html: string = bs.html; // will automatically run the parser
const tokens: Token[] = bs.tokens; // will automatically run the parser
````

Errors will be stored in the individual tokens where the error was encountered and also in the Errors array in the `BooleanSearch` instance.

````ts
const errors: Error[] = bs.errors;
const tokens: Token[] = bs.tokens;
const err: Error[] = tokens[0].errors;
````



