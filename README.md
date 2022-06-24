# Boolean Search Parser

This library is a boolean search string parser. This will take a search string and parse it returning "possible" boolean operators, actual boolean operators and any errors encountered. It will also provide an HTML representation of the output so that you may style errors, possible operators, operators, etc.

## Theory and How it works

This library will parse a search string and create an array of tokens. We can then parse the tokens and create the innerHTML for an HTML element that can be styled to point out errors and valid operators.

### Tokens

Tokens are created during the parsing of a search string. It takes each part of the search and breaks it down into its relevant parts. Relevant token types are:

* TERM - A term in the search string
* OPERATOR - A valid boolean search operator (i.e. AND, OR, NOT, +, -, ~, etc)
* POSSIBLE - A possible operator, usually a lowercase version of an operator (i.e. and, or, not, etc)
* WHITE_SPACE - White space between operators and terms
* GROUPING - A "sub" search string, usually encapsulated within parens or quotes
* QUOTE - A quote (i.e ")
* ASCII - Currently this is just angle brackets (i.e. < >)

A token is aware of a few things about itself:

* The rule that created the token
* Any errors it may contain
* The HTML representation for itself
* It's value
* If its inside quotes or not
* Its context within the search string (operation)

Tokens have the following operations which define their context within the search string.

* AND - Operator
* OR - Operator
* NOT - Operator
* OPEN - An opening paren or quote
* CLOSE - A closing paren or quote
* NONE - Generally a term or whitespace
* ERROR - An error

As an example the following search string: `this AND that` will produce 5 tokens:

1) "this" - Token type = "TERM", Operation = "NONE"
2) " " - Token type = "WHITESPACE", Operation = "NONE"
3) "AND" - Token type = "OPERATOR", Operation = "AND"
4) " " = Token type = "WHITESPACE", Operation = "NONE"
5) "that" = Token type = "TERM", Operation = "NONE"

### Rules

Rules are used to identify tokens, their types and operation. Each piece of the search string is tested against each rule. If that part of the search matches the defined rule, that is the rule used to create a token. A rule contains the following information:

* Regular expression that identifies the something inside a search string
* The token operation
* The token type

### Validation Rules

Validation rules are similar to rules and do extend a rule. However, their token operation is always "ERROR". A validation rule defines things that should fail validation.

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



