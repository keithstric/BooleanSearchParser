import { TokenType, TokenOperations } from "./Token";

/**
 * Top level class for a rule. Rules define a regular expression pattern to look for
 * within a {@link Token#value}
 * @class {Rule}
 */
export class Rule {
	private _pattern?: RegExp;
	private _operation?: TokenOperations;
	private _type?: TokenType;

	constructor(pattern: RegExp, operation: TokenOperations, type: TokenType = TokenType.OPERATOR) {
		this._pattern = pattern;
		this._operation = operation;
		this._type = type;
	}

	/**
	 * A regular expression pattern
	 * @type {RegExp}
	 */
	get pattern() {
		if (!this._pattern) {
			throw new Error('No Pattern defined');
		}
		return this._pattern;
	}

	set pattern(pattern) {
		this._pattern = pattern;
	}

	/**
	 * The operation tokens that match this rule perform
	 * @type {TokenOperations}
	 */
	get operation() {
		return this._operation;
	}

	set operation(operation) {
		this._operation = operation;
	}

	/**
	 * The token type for tokens matching this rule
	 * @type {TokenType}
	 */
	get type() {
		return this._type;
	}

	set type(type) {
		this._type = type;
	}

	/**
	 * Test if the passed in str matches the pattern of this rule
	 * @param str {string}
	 */
	test (str: string) {
		if (this.pattern) {
			return str.search(this.pattern);
		}
		throw new Error('No Pattern defined');
	}
}

/**
 * Checks if the pattern is escaped
 * @class {EscapableRule}
 * @extends {Rule}
 */
export class EscapeableRule extends Rule {
	
	constructor(name: RegExp, operation: TokenOperations, type: TokenType = TokenType.OPERATOR) {
		super(name, operation, type);
	}

	test(str: string) {
		let result = super.test(str)
    if (result === -1) {
      return result
    }
    if (str.charAt(result - 1) === '\\') {
      return -1
    }
    return result
	}
}

/**
 * Rule for validating tokens
 * @class {ValidationRule}
 * @extends {Rule}
 */
export class ValidationRule extends Rule {
	private _character: string;

	constructor(pattern: RegExp, character: string) {
		super(pattern, TokenOperations.ERROR);
		this._character = character;
	}

	/**
	 * The character that will be reported as an error message inside the token
	 * with the error
	 */
	get character() {
		return this._character;
	}

	set character(character) {
		this._character = character;
	}
}
