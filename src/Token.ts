import { Rule } from "./Rule";
/**
 * The type of value for this token
 */
export enum TokenType {
	/**
	 * Usually a word or letter that is not one of the other token types
	 */
	TERM = 'term',
	/**
	 * An actual operator (AND, OR, NOT, +, ~, -)
	 */
	OPERATOR = 'operator',
	/**
	 * A possible operator (and, or, not)
	 */
	POSSIBLE = 'possible',
	/**
	 * Whitespace of some kind, usually a space
	 */
	WHITE_SPACE = 'whitespace',
	/**
	 * Usually a paren of some sort
	 */
	GROUPING = 'grouping',
	/**
	 * A quote (")
	 */
	QUOTE = 'quote',
	/**
	 * Currently this is just angle brackets (< >). These need their own
	 * special type to prevent the browser from treating them and their text
	 * as html tags
	 */
	ASCII = 'ascii'
}

/**
 * The actual operators. This is used to define what a possible or symbol actually is
 */
export enum TokenOperators {
	AND = 'AND',
	OR = 'OR',
	NOT = 'NOT',
}

/**
 * Possible, Actual and Symbol Operators get their respective AND/OR/NOT. Quotes and parens
 * get their respective OPEN/CLOSE. Terms are NONE and errors are ERROR.
 */
export enum TokenOperations {
	/**
	 * Possible/Actual/Symbol AND operator
	 */
	AND = 'AND',
	/**
	 * Possible/Actual/Symbol OR operator
	 */
	OR = 'OR',
	/**
	 * Possible/Actual/Symbol NOT operator
	 */
	NOT = 'NOT',
	/**
	 * Opening Paren or Quote
	 */
	OPEN = 'open',
	/**
	 * Closing Paren or Quote
	 */
	CLOSE = 'close',
	/**
	 * Term or Whitespace
	 */
	NONE = 'none',
	/**
	 * Error
	 */
	ERROR = 'error'
}

/**
 * The token position
 */
export interface TokenPosition {
	start: number;
	end: number;
}

export interface TokenStyleClasses {
	error: string;
	operator: string;
	possibleOperator: string;
}

/**
 * A token defines a piece of text found in the search string. This can be single words and characters
 * but also multiple words (i.e. the text between quotes)
 * @class {Token}
 */
export class Token {
	private _children: Token[] = [];
	private _errors: Error[] = [];
	private _html: string = '';
	private _id: string = '';
	private _isChild: boolean = false;
	private _isSibling: boolean = false;
	private _isInsideQuotes: boolean = false;
	private _operation: TokenOperations | undefined;
	private _phrase: string = '';
	private _position: TokenPosition = {start: -1, end: -1};
	private _rule: Rule | undefined;
	private _type: TokenType = TokenType.TERM;
	private _value: string;
	private _styleClasses: TokenStyleClasses = {
		error: 'error',
		operator: 'operator',
		possibleOperator: 'warning'
	};

	/**
	 * Create a new instance of Token and assign a random ID string
	 */
	constructor(
		value: string,
		type: TokenType,
		operation: TokenOperations = TokenOperations.NONE,
		position?: number) {
		this._value = value;
		this._type = type;
		if (operation) {
			this._operation = operation;
		}
		if (position !== null && position !== undefined) {
			const length = value.length;
			const startPos = this.calcStart(position, length);
			const endPos = this.calcEnd(startPos, length);
			this._position = {start: startPos, end: endPos};
		}
		this._id = Math.random().toString(36).substring(7);
	}

	/**
	 * Calculate the starting position
	 * @param position {number} The current index from the initialMatches getter in the parser
	 * @param length {number} The length of the text
	 */
	calcStart(position: number, length: number) {
		return position - (length -1);
	}

	/**
	 * Calculate the end position
	 * @param position {number} Usually the starting position
	 * @param length {number} the length of the text
	 */
	calcEnd(position: number, length: number) {
		return position + (length -1);
	}

	/**
	 * The child tokens. Usually text between quotes or parens
	 */
	get children() {
		return this._children;
	}

	set children(children) {
		this._children = children;
	}

	/**
	 * Array of errors for this token
	 * @type {Error[]}
	 */
	get errors() {
		return this._errors;
	}

	set errors(errors) {
		this._errors = errors;
	}

	get styles() {
		return this._styleClasses;
	}

	set styles(styleClasses) {
		this._styleClasses = styleClasses;
	}

	/**
	 * The html for this token
	 * @type {string}
	 */
	get html() {
		let span = null;
		let styleClass = null;
		const {errors, rule, _html, type, value} = this;
		if (errors && errors.length) {
			styleClass = this.styles.error;
			const errorStr: string = errors.map((err, idx) => err.message).join('&#10;');
			span = `<span class="${styleClass}" title="${errorStr}">${value}</span>`;
			this._html = value.replace(value, span);
		}else if (!_html && rule && value) {
			styleClass = type === TokenType.POSSIBLE
				? this.styles.possibleOperator
				: type === TokenType.OPERATOR
					? this.styles.operator
					: '';
			const titleStr = type === TokenType.POSSIBLE ? `Possible operator. Operators should be capitalized (i.e ${value.toUpperCase()}).` : '';
			span = type !== TokenType.POSSIBLE && type !== TokenType.OPERATOR
				? value
				: `<span class="${styleClass}" title="${titleStr}">${value}</span>`;
			this._html = rule.pattern ? value.replace(rule.pattern, span) : this.value;
		}else if (!_html && value) {
			this._html = this.value;
		}
		return this._html;
	}

	set html(html) {
		this._html = html;
	}

	/**
	 * The ID for this token (This ID is not persisted as changes are made)
	 * @type {string}
	 */
	get id() {
		return this._id;
	}

	get isChild() {
		return this._isChild;
	}

	set isChild(isChild) {
		this._isChild = isChild;
	}

	get isSibling() {
		return this._isSibling;
	}

	set isSibling(isSibling) {
		this._isSibling = isSibling;
	}

	/**
	 * True if this token is inside quotes
	 * @type {boolean}
	 */
	get isInsideQuotes() {
		return this._isInsideQuotes;
	}

	set isInsideQuotes(isInsideQuotes) {
		this._isInsideQuotes = isInsideQuotes;
	}

	/**
	 * The boolean operation this token is for
	 * @type {TokenOperations}
	 */
	get operation() {
		return this._operation;
	}

	set operation(operation) {
		this._operation = operation;
	}

	/**
	 * If this token is a TokenType.OPERATOR or TokenType.POSSIBLE the phrase leading up this token
	 * @type {string}
	 */
	get phrase() {
		return this._phrase;
	}

	set phrase(phrase) {
		this._phrase = phrase;
	}

	/**
	 * The position this token is at in the search string
	 * @type {Position}
	 */
	get position() {
		return this._position;
	}

	set position(position) {
		this._position = position;
	}

	/**
	 * The rule that created this token
	 * @type {Rule}
	 */
	get rule() {
		return this._rule;
	}

	set rule(rule) {
		this._rule = rule;
	}

	/**
	 * The token type
	 * @type {TokenType}
	 */
	get type() {
		return this._type;
	}
	
	set type(type) {
		this._type = type;
	}

	/**
	 * The string value of this token
	 * @type {string}
	 */
	get value() {
		return this._value;
	}

	set value(value) {
		this._value = value;
	}
}

