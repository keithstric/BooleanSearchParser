import { TokenType, TokenOperations } from "./Token";
/**
 * Top level class for a rule. Rules define a regular expression pattern to look for
 * within a {@link Token#value}
 * @class {Rule}
 */
export declare class Rule {
    private _pattern?;
    private _operation?;
    private _type?;
    constructor(pattern: RegExp, operation: TokenOperations, type?: TokenType);
    /**
     * A regular expression pattern
     * @type {RegExp}
     */
    get pattern(): RegExp;
    set pattern(pattern: RegExp);
    /**
     * The operation tokens that match this rule perform
     * @type {TokenOperations}
     */
    get operation(): TokenOperations | undefined;
    set operation(operation: TokenOperations | undefined);
    /**
     * The token type for tokens matching this rule
     * @type {TokenType}
     */
    get type(): TokenType | undefined;
    set type(type: TokenType | undefined);
    /**
     * Test if the passed in str matches the pattern of this rule
     * @param str {string}
     */
    test(str: string): number;
}
/**
 * Checks if the pattern is escaped
 * @class {EscapableRule}
 * @extends {Rule}
 */
export declare class EscapeableRule extends Rule {
    constructor(name: RegExp, operation: TokenOperations, type?: TokenType);
    test(str: string): number;
}
/**
 * Rule for validating tokens
 * @class {ValidationRule}
 * @extends {Rule}
 */
export declare class ValidationRule extends Rule {
    private _character;
    constructor(pattern: RegExp, character: string);
    /**
     * The character that will be reported as an error message inside the token
     * with the error
     */
    get character(): string;
    set character(character: string);
}
