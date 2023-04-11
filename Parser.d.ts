import { Rule, ValidationRule } from "./Rule";
import { Token, TokenOperations, TokenType } from "./Token";
/**
 * The match interface
 */
interface Match {
    subStr: string;
    currentIdx: number;
    matchStart: number;
    type: TokenType;
    operation: TokenOperations;
    rule: Rule | undefined;
    phrase?: string;
}
/**
 * The parser will parse the search string and create matches from the rules and then tokens.
 * This class also puts words that were split by possible/actual operators back toghether again.
 * Ensures text between quotes is made into a single term token. All tokens and matches created
 * along the way are stored as properties, mainly for troubleshooting purposes.
 * @class {Parser}
 */
export declare class Parser {
    private _finalTokens;
    private _initialMatches;
    private _initialTokens;
    private _searchString;
    private _selectedRules;
    private _tree;
    private _validatedTokens;
    private _validationRules;
    private _wholeTokens;
    constructor(searchString: string, selectedRules: Rule[], selectedValidationRules: ValidationRule[]);
    /**
     * The string we're going to parse
     * @type {string}
     */
    get searchString(): string;
    set searchString(searchString: string);
    /**
     * The tokens with errors and all manipulation done. 4th pass
     * @type {Token[]}
     */
    get validatedTokens(): Token[];
    /**
     * Tokens that have had split words put back togther and words between quotes
     * combined. 3rd pass
     * @type {Token[]}
     */
    get finalTokens(): Token[];
    /**
     * The tokens with split words combined. 2nd pass
     */
    get wholeTokens(): Token[];
    /**
     * The tokens taken from the matches. 1st pass
     * @type {Token[]}
     */
    get initialTokens(): Token[];
    /**
     * The initial matches gathered from the searchString
     * @type {Match[]}
     */
    get initialMatches(): Match[];
    /**
     * The selected rules we will use when creating matches and setting token types
     * @type {Rule[]}
     */
    get selectedRules(): Rule[];
    /**
     * The rules we use for validating tokens
     * @type {ValidationRule[]}
     */
    get validationRules(): ValidationRule[];
    /**
     * The tokens structured as a tree instead of a flat array
     * @type {Token[]}
     */
    get tree(): Token[];
    /**
     * Parse the search string and create matches based on the provided rules
     * @param searchString {string}
     * @param selectedRules {Rule[]}
     * @returns {Token[]}
     */
    getInitialMatches(searchString: string, selectedRules: Rule[]): Match[];
    /**
     * Get the phrases between operators and put in the operator token phrase property
     * @param matches {Match[]}
     * @returns {Match[]}
     */
    getMatchPhrases(matches: Match[]): Match[];
    /**
     * Convert matches to tokens
     * @param matches {Match[]}
     * @returns {Token[]}
     */
    matchesToTokens(matches: Match[]): Token[];
    /**
     * When a match is found and it's part of a word (i.e. operator, forklift, ect.) multiple
     * tokens are created. This takes those multiple tokens and makes them one token
     * @param tokens {Token[]}
     * @returns {Token[]}
     */
    createTermsFromSplits(tokens: Token[]): Token[];
    /**
     * Create a new token
     * @param value {string}
     * @param type {TokenType}
     * @param start {number}
     * @param end {number}
     * @returns {Token}
     */
    createNewToken(value: string, type: TokenType, start: number, end: number): Token;
    /**
     * Get the text between quotes and convert it to a term token
     * @param tokens {Token[]}
     * @returns {Token[]}
     */
    createTermsFromQuotes(tokens: Token[]): Token[];
    /**
     * Validate the tokens to ensure no unallowed characters, or malformed text (i.e. opening paren with no closing paren, etc)
     * @param tokens {Token[]}
     * @param selectedValidationRules {ValidationRule[]}
     * @returns {Token[]}
     */
    validateTokens(tokens: Token[], selectedValidationRules: ValidationRule[]): Token[];
    /**
     * Take the array of tokens and build a tree structure
     * @param tokens {Token[]}
     */
    createTree(tokens: Token[]): Token[];
    /**
     * Ensure we've got the right token type after manipulating the match. For example:
     * the first element of this match array will have a token type of POSSIBLE:
     * [for, klift]
     * after a token is created, we'll end up with:
     * [f, or, klift]
     * the fist element will still have a token type of POSSIBLE as will the second element
     * we need to ensure that the first element's token type gets set to TERM so that we may
     * put this split word back together later in the process
     * @param token {Token}
     */
    checkTokenType(token: Token): Token;
    /**
     * Get the first previous OPERATOR from the token at the startIdx index
     * @param tokens {Token[]}
     * @param startIdx {number} The token index in the tokens array
     */
    getPrecedingOperatorToken(tokens: Token[], startIdx: number): {
        token: Token;
        distance: number;
    } | null;
    /**
     * Ensure there are no unclosed group tokens
     * @param tokens {Token[]}
     * @param tokenType {TokenType} The group token type to check for
     * @returns {Token}
     */
    getUnclosedGroupItem(tokens: Token[], tokenType: TokenType): Token | null;
    /**
     * Returns true if the token is a Paren or Quote
     * @param token {Token}
     */
    isGrouping(token: Token): boolean;
    /**
     * Returns true if token is a TERM, POSSIBLE or OPERATOR
     * @param token {Token}
     * @returns {boolean}
     */
    isTermOrOperator(token: Token): boolean;
    /**
     * Parse the search string and build out all the properties
     */
    parse(): Token[];
    /**
     * Reset all the arrays of this class
     */
    reset(): void;
}
export {};
