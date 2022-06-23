"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanSearch = void 0;
const Token_1 = require("./Token");
const Rule_1 = require("./Rule");
const Parser_1 = require("./Parser");
/**
 * The classes and methods in this package were based off of the {@link https://github.com/frederickf/bqpjs} library.
 * The BooleanSearch class is the entry point to the parser. The following
 * properties will parse the search string automatically:
 * {@link BooleanSearch#tokens}
 * {@link BooleanSearch#html}
 * @class {BooleanSearch}
 */
class BooleanSearch {
    constructor(srchString, config) {
        this._errors = [];
        this._html = '';
        this._isMalformed = false;
        this._maxLength = 511;
        this._operators = [];
        this._possibleOperators = [];
        this._ruleNames = [];
        this._selectedRules = [];
        this._selectedValidationRules = [];
        this._srchString = '';
        this._tokens = [];
        this._validationRuleNames = [];
        this.searchString = srchString ? srchString : '';
        if (config) {
            this.rules = config.rules || this.rules;
            this.ruleNames = config.ruleNames || this.ruleNames;
            this.validationRules = config.validationRules || this.validationRules;
            this.validationRuleNames = config.validationRuleNames || this.validationRuleNames;
        }
    }
    /**
     * Add a rule
     * @param ruleName {string}
     * @param rule {Rule}
     */
    addRule(ruleName, rule) {
        const rules = Object.assign(Object.assign({}, this.rules), { [ruleName]: rule });
        this.rules = rules;
        console.warn('If you want this rule to be used, be sure to add the rule name to the ruleNames array in the appropriate position');
    }
    /**
     * Fix the possible operators and update the search string
     * @param resetSearch {boolean} - set true to reset search string, tokens and html
     * @returns {string}
     */
    fixOperators(resetSearchString = false) {
        let returnVal = this.searchString;
        if (this.tokens && this.tokens.length) {
            returnVal = '';
            this.tokens.forEach((token) => {
                if (token.type === Token_1.TokenType.POSSIBLE) {
                    token.value = token.value.toUpperCase();
                    token.type = Token_1.TokenType.OPERATOR;
                    token.html = '';
                }
                returnVal += token.value;
            });
            if (resetSearchString) {
                this.reset(returnVal);
                this.tokens = this.parser.parse();
            }
        }
        return returnVal;
    }
    /**
     * Array of errors
     * @type {Error[]}
     */
    get errors() {
        if (!this._errors || !this._errors.length) {
            if (this._tokens && this._tokens.length) { // Dont want to initiate parsing of tokens
                const errorTokens = this._tokens.filter(token => token.errors && token.errors.length);
                let errors = this._errors || [];
                errorTokens.forEach((token) => {
                    if (token.errors && token.errors.length) {
                        errors = errors.concat(token.errors);
                    }
                });
                this._errors = errors;
            }
        }
        return this._errors;
    }
    /**
     * Get the html for the entire search string
     * @type {string}
     */
    get html() {
        if (!this._html && this.tokens && this.tokens.length) {
            try {
                const { tokens, maxLength, searchString } = this;
                const searchStringLen = searchString.length;
                const isTooLong = searchStringLen > maxLength;
                const htmlArr = tokens.map((token, idx, arr) => {
                    const { html, position, value } = token;
                    let returnHtml = html;
                    if (isTooLong) {
                        if (position.start <= maxLength && position.end >= maxLength) {
                            if (idx + 1 === tokens.length) {
                                returnHtml = `<span class="error">${value}</span>`;
                            }
                            else {
                                returnHtml = `<span class="error">${value}`;
                            }
                        }
                        else if (idx + 1 === tokens.length) {
                            returnHtml = `${value}</span>`;
                        }
                    }
                    return returnHtml;
                });
                let html = htmlArr.join('');
                this._html = html;
            }
            catch (e) {
                console.error(e);
                this._html = this.searchString;
            }
        }
        return this._html;
    }
    /**
     * True if there are errors
     * @type {boolean}
     */
    get isMalformed() {
        if (this.errors && this.errors.length) {
            this._isMalformed = true;
        }
        return this._isMalformed;
    }
    /**
     * The max length the search string is allowed to be
     * @type {number}
     */
    get maxLength() {
        return this._maxLength;
    }
    set maxLength(maxLength) {
        this._maxLength = maxLength;
    }
    /**
     * Get an array of the operator tokens
     * @type {Token[]}
     */
    get operators() {
        if (!this._operators || !this._operators.length) {
            if (this._tokens && this._tokens.length) {
                this._operators = this.tokens.filter((token) => token.type === Token_1.TokenType.OPERATOR);
            }
        }
        return this._operators;
    }
    /**
     * The parser which will populate all the various Token arrays
     * @type {Parser}
     */
    get parser() {
        if (!this._parser) {
            this._parser = new Parser_1.Parser(this.searchString, this.selectedRules, this.selectedValidationRules);
        }
        return this._parser;
    }
    set parser(parser) {
        this._parser = parser;
    }
    /**
     * Get an array of the possible operators
     * @type {Token[]}
     */
    get possibleOperators() {
        if (!this._possibleOperators || !this._possibleOperators.length) {
            if (this._tokens && this._tokens.length) {
                this._possibleOperators = this.tokens.filter((token) => token.type === Token_1.TokenType.POSSIBLE);
            }
        }
        return this._possibleOperators;
    }
    /**
     * Array of the rule names we want to use when matching tokens
     * @type {string[]}
     */
    get ruleNames() {
        if (!this._ruleNames || !this._ruleNames.length) {
            this._ruleNames = [
                'and',
                'or',
                'not',
                'AND',
                'plus',
                'OR',
                'tilde',
                'NOT',
                'minus',
                'openParen',
                'closeParen',
                'quote',
                'space',
                'openAngle',
                'closeAngle'
            ];
        }
        return this._ruleNames;
    }
    set ruleNames(ruleNames) {
        this._ruleNames = ruleNames || [];
    }
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {Rules}
     */
    get rules() {
        if (!this._rules) {
            this._rules = {
                and: new Rule_1.Rule(/and/g, Token_1.TokenOperations.AND, Token_1.TokenType.POSSIBLE),
                or: new Rule_1.Rule(/or/g, Token_1.TokenOperations.OR, Token_1.TokenType.POSSIBLE),
                not: new Rule_1.Rule(/not/g, Token_1.TokenOperations.NOT, Token_1.TokenType.POSSIBLE),
                AND: new Rule_1.Rule(/AND/g, Token_1.TokenOperations.AND),
                plus: new Rule_1.Rule(/\+/g, Token_1.TokenOperations.AND),
                OR: new Rule_1.Rule(/OR/g, Token_1.TokenOperations.OR),
                tilde: new Rule_1.Rule(/~/g, Token_1.TokenOperations.OR),
                NOT: new Rule_1.Rule(/NOT/g, Token_1.TokenOperations.NOT),
                minus: new Rule_1.Rule(/-/g, Token_1.TokenOperations.NOT),
                openParen: new Rule_1.Rule(/\(/g, Token_1.TokenOperations.OPEN, Token_1.TokenType.GROUPING),
                closeParen: new Rule_1.Rule(/\)/g, Token_1.TokenOperations.CLOSE, Token_1.TokenType.GROUPING),
                quote: new Rule_1.EscapeableRule(/"/g, Token_1.TokenOperations.NONE, Token_1.TokenType.QUOTE),
                space: new Rule_1.Rule(/\s/g, Token_1.TokenOperations.NONE, Token_1.TokenType.WHITE_SPACE),
                openAngle: new Rule_1.Rule(/\</g, Token_1.TokenOperations.NONE, Token_1.TokenType.ASCII),
                closeAngle: new Rule_1.Rule(/\>/g, Token_1.TokenOperations.NONE, Token_1.TokenType.ASCII)
            };
        }
        return this._rules;
    }
    set rules(rules) {
        this._rules = rules;
    }
    /**
     * The search string to parse
     * @type {string}
     */
    get searchString() {
        return this._srchString;
    }
    set searchString(searchString) {
        this._srchString = searchString.replace(/\n/g, '');
    }
    /**
     * The selected rules based off of the values provided in the ruleNames
     * @type {Rule[]}
     */
    get selectedRules() {
        if (!this._selectedRules || !this._selectedRules.length) {
            this._selectedRules = this.ruleNames.filter((name) => name in this.rules).map((name) => this.rules[name]);
        }
        return this._selectedRules;
    }
    set selectedRules(selectedRules) {
        this._selectedRules = selectedRules;
    }
    /**
     * The selected validation rules based off of the values provided in the validationRuleNames
     * @type {ValidationRule[]}
     */
    get selectedValidationRules() {
        if (!this._selectedValidationRules || !this._selectedValidationRules.length) {
            this._selectedValidationRules = this.validationRuleNames.filter((name) => name in this.validationRules).map((name) => this.validationRules[name]);
        }
        return this._selectedValidationRules;
    }
    set selectedValidationRules(selectedValidationRules) {
        this._selectedValidationRules = selectedValidationRules;
    }
    /**
     * The array of tokens found in the search string
     * @type {Token[]}
     */
    get tokens() {
        if ((!this._tokens || !this._tokens.length) && this.searchString) {
            this._tokens = this.parser.parse();
        }
        else if (!this.searchString) {
            console.warn('You must provide a search string to parse for tokens');
        }
        return this._tokens;
    }
    set tokens(tokens) {
        this._tokens = tokens;
    }
    /**
     * Array of the rule names we want to use when matching tokens
     * @type {string[]}
     */
    get validationRuleNames() {
        if (!this._validationRuleNames || !this._validationRuleNames.length) {
            this._validationRuleNames = [
                'openAngle',
                'closeAngle',
                'openCurly',
                'closeCurly',
                'openSquare',
                'closeSquare',
                'backslash',
                'forwardSlash',
                'comma',
                'period',
            ];
        }
        return this._validationRuleNames;
    }
    set validationRuleNames(validationRuleNames) {
        this._validationRuleNames = validationRuleNames || [];
    }
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {ValidationRules}
     */
    get validationRules() {
        if (!this._validationRules) {
            this._validationRules = {
                openAngle: new Rule_1.ValidationRule(/\</g, '<'),
                closeAngle: new Rule_1.ValidationRule(/\>/g, '>'),
                openCurly: new Rule_1.ValidationRule(/\{/g, '{'),
                closeCurly: new Rule_1.ValidationRule(/\}/g, '}'),
                openSquare: new Rule_1.ValidationRule(/\[/g, '['),
                closeSquare: new Rule_1.ValidationRule(/\]/g, ']'),
                backSlash: new Rule_1.ValidationRule(/\\/g, '\\'),
                forwardSlash: new Rule_1.ValidationRule(/\//g, '/'),
                comma: new Rule_1.ValidationRule(/,/g, ','),
                period: new Rule_1.ValidationRule(/\./g, '.')
            };
        }
        return this._validationRules;
    }
    set validationRules(validationRules) {
        this._validationRules = validationRules;
    }
    reset(searchString) {
        this.searchString = searchString || '';
        this.tokens = [];
        this._possibleOperators = [];
        this._operators = [];
        this._errors = [];
        this.parser = new Parser_1.Parser(this.searchString, this.selectedRules, this.selectedValidationRules);
    }
}
exports.BooleanSearch = BooleanSearch;
