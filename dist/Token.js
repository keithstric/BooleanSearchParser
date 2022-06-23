"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = exports.TokenOperations = exports.TokenOperators = exports.TokenType = void 0;
/**
 * The type of value for this token
 */
var TokenType;
(function (TokenType) {
    /**
     * Usually a word or letter that is not one of the other token types
     */
    TokenType["TERM"] = "term";
    /**
     * An actual operator (AND, OR, NOT, +, ~, -)
     */
    TokenType["OPERATOR"] = "operator";
    /**
     * A possible operator (and, or, not)
     */
    TokenType["POSSIBLE"] = "possible";
    /**
     * Whitespace of some kind, usually a space
     */
    TokenType["WHITE_SPACE"] = "whitespace";
    /**
     * Usually a paren of some sort
     */
    TokenType["GROUPING"] = "grouping";
    /**
     * A quote (")
     */
    TokenType["QUOTE"] = "quote";
    /**
     * Currently this is just angle brackets (< >). These need their own
     * special type to prevent the browser from treating them and their text
     * as html tags
     */
    TokenType["ASCII"] = "ascii";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
/**
 * The actual operators. This is used to define what a possible or symbol actually is
 */
var TokenOperators;
(function (TokenOperators) {
    TokenOperators["AND"] = "AND";
    TokenOperators["OR"] = "OR";
    TokenOperators["NOT"] = "NOT";
})(TokenOperators = exports.TokenOperators || (exports.TokenOperators = {}));
/**
 * Possible, Actual and Symbol Operators get their respective AND/OR/NOT. Quotes and parens
 * get their respective OPEN/CLOSE. Terms are NONE and errors are ERROR.
 */
var TokenOperations;
(function (TokenOperations) {
    /**
     * Possible/Actual/Symbol AND operator
     */
    TokenOperations["AND"] = "AND";
    /**
     * Possible/Actual/Symbol OR operator
     */
    TokenOperations["OR"] = "OR";
    /**
     * Possible/Actual/Symbol NOT operator
     */
    TokenOperations["NOT"] = "NOT";
    /**
     * Opening Paren or Quote
     */
    TokenOperations["OPEN"] = "open";
    /**
     * Closing Paren or Quote
     */
    TokenOperations["CLOSE"] = "close";
    /**
     * Term or Whitespace
     */
    TokenOperations["NONE"] = "none";
    /**
     * Error
     */
    TokenOperations["ERROR"] = "error";
})(TokenOperations = exports.TokenOperations || (exports.TokenOperations = {}));
/**
 * A token defines a piece of text found in the search string. This can be single words and characters
 * but also multiple words (i.e. the text between quotes)
 * @class {Token}
 */
class Token {
    /**
     * Create a new instance of Token and assign a random ID string
     */
    constructor(value, type, operation = TokenOperations.NONE, position) {
        this._children = [];
        this._errors = [];
        this._html = '';
        this._id = '';
        this._isChild = false;
        this._isInsideQuotes = false;
        this._phrase = '';
        this._position = { start: -1, end: -1 };
        this._type = TokenType.TERM;
        this._value = value;
        this._type = type;
        if (operation) {
            this._operation = operation;
        }
        if (position !== null && position !== undefined) {
            const length = value.length;
            const startPos = this.calcStart(position, length);
            const endPos = this.calcEnd(startPos, length);
            this._position = { start: startPos, end: endPos };
        }
        this._id = Math.random().toString(36).substring(7);
    }
    /**
     * Calculate the starting position
     * @param position {number} The current index from the initialMatches getter in the parser
     * @param length {number} The length of the text
     */
    calcStart(position, length) {
        return position - (length - 1);
    }
    /**
     * Calculate the end position
     * @param position {number} Usually the starting position
     * @param length {number} the length of the text
     */
    calcEnd(position, length) {
        return position + (length - 1);
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
    /**
     * The html for this token
     * @type {string}
     */
    get html() {
        let span = null;
        let styleClass = null;
        const { errors, rule, _html, type, value } = this;
        if (errors && errors.length) {
            styleClass = 'error';
            span = `<span class="${styleClass}">${value}</span>`;
            this._html = value.replace(value, span);
        }
        else if (!_html && rule && value) {
            styleClass = type === TokenType.POSSIBLE ? 'warning' : type === TokenType.OPERATOR ? 'operator' : '';
            span = type !== TokenType.POSSIBLE && type !== TokenType.OPERATOR
                ? value
                : `<span class="${styleClass}">${value}</span>`;
            this._html = rule.pattern ? value.replace(rule.pattern, span) : this.value;
        }
        else if (!_html && value) {
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
exports.Token = Token;
