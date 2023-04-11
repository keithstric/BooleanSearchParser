# Boolean Search Parser

This library is a boolean search string parser. This will take a search string and parse it returning "possible" boolean operators, actual boolean operators and any errors encountered. It will also provide an HTML representation of the output so that you may style errors, possible operators, operators, etc.

## Output

The main consumable of this package is the HTML output by the parser. Providing css styles for all the pieces/parts makes this highly customizable in how you communicate boolean search errors to your users.

### Here is an example with a lot of errors

![error-test.png](https://github.com/keithstric/BooleanSearchParser/raw/master/readme-assets/Error-Test.png)

#### Here are the errors within the BooleanSearch class

![error-array.png](https://github.com/keithstric/BooleanSearchParser/raw/master/readme-assets/Error-Array.png)

#### Here are the tokens within the BooleanSearch class

![error-tokens.png](https://github.com/keithstric/BooleanSearchParser/raw/master/readme-assets/Error-Tokens.png)

#### Here is the HTML output

```html
<span class="error" title="A search must not begin with an operator at position 0 &#39;AND&#39;: ">AND</span>
this
<span class="warning" title="Possible operator. Operators should be capitalized (i.e AND).">and</span>
that
<div class="grouping">
  <span class="error" title="An operator should precede a grouping at position 18 &#39;and&#39;: ">(</span>
  something
  <span class="warning" title="Possible operator. Operators should be capitalized (i.e OR).">or</span>
  else)
</div>
<span class="error" title="Cannot have operators back to back at position 38 &#39;AND  &#39;: ">AND</span>
<span class="operator" title="">AND</span>
that
<span class="error" title="A search must not end with an operator at position 51 &#39;NOT&#39;: ">NOT</span>
```

### Here is an example with no errors

![success-test.png](https://github.com/keithstric/BooleanSearchParser/raw/master/readme-assets/Success-Test.png)

#### Here are the success tokens

![success-tokens.png](https://github.com/keithstric/BooleanSearchParser/raw/master/readme-assets/Success-Tokens.png)

#### Here is the HTML output

```html
this
<span class="success" title="">AND</span>
that
<span class="success" title="">AND</span>
<div class="grouping">
  (other
  <span class="success" title="">OR</span>
  thing)
</div>
<span class="success" title="">AND</span>
foo
```

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



