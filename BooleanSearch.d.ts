import { Parser } from "./Parser";
import { Rule, ValidationRule } from "./Rule";
import { Token, TokenStyleClasses } from "./Token";
/**
 * The definition for Rules. The key will be the name
 * of a rule
 */
export declare type Rules = {
    [key: string]: Rule;
};
/**
 * The definition for ValidationRules. This follows the
 * same pattern as {@see Rules}. The key will be the name
 * of the rule
 */
export declare type ValidationRules = {
    [key: string]: ValidationRule;
};
/**
 * Configuration object for defining your own rules
 */
export declare type Config = {
    rules?: Rules;
    validationRules?: ValidationRules;
    possibleOperatorStyleClass?: string;
    operatorStyleClass?: string;
    errorStyleClass?: string;
};
export declare const DEFAULT_RULES: Rules;
export declare const DEFAULT_VALIDATION_RULES: ValidationRules;
/**
 * The classes and methods in this package were based off of the {@link https://github.com/frederickf/bqpjs} library.
 * The BooleanSearch class is the entry point to the parser. The following
 * properties will parse the search string automatically:
 * {@link BooleanSearch#tokens}
 * {@link BooleanSearch#html}
 * @class {BooleanSearch}
 */
export declare class BooleanSearch {
    private _errors;
    private _html;
    private _isMalformed;
    private _maxLength;
    private _operators;
    private _parser;
    private _possibleOperators;
    private _rules;
    private _selectedRules;
    private _selectedValidationRules;
    private _srchString;
    private _tokens;
    private _validationRules;
    private _styles;
    constructor(srchString?: string, config?: Config);
    /**
     * Add a rule
     * @param ruleName {string}
     * @param rule {Rule}
     */
    addRule(ruleName: string, rule: Rule): void;
    /**
     * Fix the possible operators and update the search string
     * @param resetSearch {boolean} - set true to reset search string, tokens and html
     * @returns {string}
     */
    fixOperators(resetSearchString?: boolean): string;
    /**
     * Array of errors
     * @type {Error[]}
     */
    get errors(): Error[];
    /**
     * Get the html for the entire search string
     * @type {string}
     */
    get html(): string;
    get styles(): TokenStyleClasses;
    /**
     * True if there are errors
     * @type {boolean}
     */
    get isMalformed(): boolean;
    /**
     * The max length the search string is allowed to be
     * @type {number}
     */
    get maxLength(): number;
    set maxLength(maxLength: number);
    /**
     * Get an array of the operator tokens
     * @type {Token[]}
     */
    get operators(): Token[];
    /**
     * The parser which will populate all the various Token arrays
     * @type {Parser}
     */
    get parser(): Parser;
    set parser(parser: Parser);
    /**
     * Get an array of the possible operators
     * @type {Token[]}
     */
    get possibleOperators(): Token[];
    /**
     * Array of the rule names we want to use when matching tokens
     * @type {string[]}
     */
    get ruleNames(): string[];
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {Rules}
     */
    get rules(): Rules;
    set rules(rules: Rules);
    /**
     * The search string to parse
     * @type {string}
     */
    get searchString(): string;
    set searchString(searchString: string);
    /**
     * The selected rules based off of the values provided in the ruleNames
     * @type {Rule[]}
     */
    get selectedRules(): Rule[];
    set selectedRules(selectedRules: Rule[]);
    /**
     * The selected validation rules based off of the values provided in the validationRuleNames
     * @type {ValidationRule[]}
     */
    get selectedValidationRules(): ValidationRule[];
    set selectedValidationRules(selectedValidationRules: ValidationRule[]);
    /**
     * The array of tokens found in the search string
     * @type {Token[]}
     */
    get tokens(): Token[];
    set tokens(tokens: Token[]);
    get tree(): Token[];
    /**
     * Array of the rule names we want to use when matching tokens
     * @type {string[]}
     */
    get validationRuleNames(): string[];
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {ValidationRules}
     */
    get validationRules(): ValidationRules;
    set validationRules(validationRules: ValidationRules);
    private reset;
}
