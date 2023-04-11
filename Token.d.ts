import { Rule } from "./Rule";
/**
 * The type of value for this token
 */
export declare enum TokenType {
    /**
     * Usually a word or letter that is not one of the other token types
     */
    TERM = "term",
    /**
     * An actual operator (AND, OR, NOT, +, ~, -)
     */
    OPERATOR = "operator",
    /**
     * A possible operator (and, or, not)
     */
    POSSIBLE = "possible",
    /**
     * Whitespace of some kind, usually a space
     */
    WHITE_SPACE = "whitespace",
    /**
     * Usually a paren of some sort
     */
    GROUPING = "grouping",
    /**
     * A quote (")
     */
    QUOTE = "quote",
    /**
     * Currently this is just angle brackets (< >). These need their own
     * special type to prevent the browser from treating them and their text
     * as html tags
     */
    ASCII = "ascii"
}
/**
 * The actual operators. This is used to define what a possible or symbol actually is
 */
export declare enum TokenOperators {
    AND = "AND",
    OR = "OR",
    NOT = "NOT"
}
/**
 * Possible, Actual and Symbol Operators get their respective AND/OR/NOT. Quotes and parens
 * get their respective OPEN/CLOSE. Terms are NONE and errors are ERROR.
 */
export declare enum TokenOperations {
    /**
     * Possible/Actual/Symbol AND operator
     */
    AND = "AND",
    /**
     * Possible/Actual/Symbol OR operator
     */
    OR = "OR",
    /**
     * Possible/Actual/Symbol NOT operator
     */
    NOT = "NOT",
    /**
     * Opening Paren or Quote
     */
    OPEN = "open",
    /**
     * Closing Paren or Quote
     */
    CLOSE = "close",
    /**
     * Term or Whitespace
     */
    NONE = "none",
    /**
     * Error
     */
    ERROR = "error"
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
export declare class Token {
    private _children;
    private _errors;
    private _html;
    private _id;
    private _isChild;
    private _isSibling;
    private _isInsideQuotes;
    private _operation;
    private _phrase;
    private _position;
    private _rule;
    private _type;
    private _value;
    private _styleClasses;
    /**
     * Create a new instance of Token and assign a random ID string
     */
    constructor(value: string, type: TokenType, operation?: TokenOperations, position?: number);
    /**
     * Calculate the starting position
     * @param position {number} The current index from the initialMatches getter in the parser
     * @param length {number} The length of the text
     */
    calcStart(position: number, length: number): number;
    /**
     * Calculate the end position
     * @param position {number} Usually the starting position
     * @param length {number} the length of the text
     */
    calcEnd(position: number, length: number): number;
    /**
     * The child tokens. Usually text between quotes or parens
     */
    get children(): Token[];
    set children(children: Token[]);
    /**
     * Array of errors for this token
     * @type {Error[]}
     */
    get errors(): Error[];
    set errors(errors: Error[]);
    get styles(): TokenStyleClasses;
    set styles(styleClasses: TokenStyleClasses);
    /**
     * The html for this token
     * @type {string}
     */
    get html(): string;
    set html(html: string);
    /**
     * The ID for this token (This ID is not persisted as changes are made)
     * @type {string}
     */
    get id(): string;
    get isChild(): boolean;
    set isChild(isChild: boolean);
    get isSibling(): boolean;
    set isSibling(isSibling: boolean);
    /**
     * True if this token is inside quotes
     * @type {boolean}
     */
    get isInsideQuotes(): boolean;
    set isInsideQuotes(isInsideQuotes: boolean);
    /**
     * The boolean operation this token is for
     * @type {TokenOperations}
     */
    get operation(): TokenOperations | undefined;
    set operation(operation: TokenOperations | undefined);
    /**
     * If this token is a TokenType.OPERATOR or TokenType.POSSIBLE the phrase leading up this token
     * @type {string}
     */
    get phrase(): string;
    set phrase(phrase: string);
    /**
     * The position this token is at in the search string
     * @type {Position}
     */
    get position(): TokenPosition;
    set position(position: TokenPosition);
    /**
     * The rule that created this token
     * @type {Rule}
     */
    get rule(): Rule | undefined;
    set rule(rule: Rule | undefined);
    /**
     * The token type
     * @type {TokenType}
     */
    get type(): TokenType;
    set type(type: TokenType);
    /**
     * The string value of this token
     * @type {string}
     */
    get value(): string;
    set value(value: string);
}
