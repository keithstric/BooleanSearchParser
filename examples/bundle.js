(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanSearch = exports.DEFAULT_VALIDATION_RULES = exports.DEFAULT_RULES = void 0;
const Parser_1 = require("./Parser");
const Rule_1 = require("./Rule");
const Token_1 = require("./Token");
exports.DEFAULT_RULES = {
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
exports.DEFAULT_VALIDATION_RULES = {
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
        this._selectedRules = [];
        this._selectedValidationRules = [];
        this._srchString = '';
        this._tokens = [];
        this._styles = {
            error: 'error',
            operator: 'operator',
            possibleOperator: 'warning'
        };
        this.searchString = srchString ? srchString : '';
        if (config) {
            this.rules = config.rules || this.rules;
            this.validationRules = config.validationRules || this.validationRules;
            this._styles.possibleOperator = config.possibleOperatorStyleClass || 'warning';
            this._styles.error = config.errorStyleClass || 'error';
            this._styles.operator = config.operatorStyleClass || 'operator';
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
        // console.warn('If you want this rule to be used, be sure to add the rule name to the ruleNames array in the appropriate position');
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
        var _a;
        if (!((_a = this._errors) === null || _a === void 0 ? void 0 : _a.length)) {
            if (this._tokens.length) { // Dont want to initiate parsing of tokens
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
        var _a;
        if (!this._html && ((_a = this.tokens) === null || _a === void 0 ? void 0 : _a.length)) {
            try {
                const { tokens, maxLength, searchString } = this;
                const searchStringLen = searchString.length;
                const isTooLong = searchStringLen > maxLength;
                const htmlArr = tokens.map((token, idx, arr) => {
                    token.styles = this.styles;
                    const { html, position, value } = token;
                    let returnHtml = html;
                    if (isTooLong) {
                        if (position.start <= maxLength && position.end >= maxLength) {
                            if (idx + 1 === tokens.length) {
                                returnHtml = `<span class="${this.styles.error}">${value}</span>`;
                            }
                            else {
                                returnHtml = `<span class="${this.styles.error}">${value}`;
                            }
                        }
                        else if (idx + 1 === tokens.length) {
                            returnHtml = `${value}</span>`;
                        }
                    }
                    return returnHtml;
                });
                this._html = htmlArr.join('');
            }
            catch (e) {
                console.error(e);
                this._html = this.searchString;
            }
        }
        return this._html;
    }
    get styles() {
        return this._styles;
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
        var _a, _b;
        if (!((_a = this._possibleOperators) === null || _a === void 0 ? void 0 : _a.length)) {
            if ((_b = this._tokens) === null || _b === void 0 ? void 0 : _b.length) {
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
        return Object.keys(this.rules);
    }
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {Rules}
     */
    get rules() {
        if (!this._rules) {
            this._rules = exports.DEFAULT_RULES;
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
        var _a;
        if (!((_a = this._selectedRules) === null || _a === void 0 ? void 0 : _a.length)) {
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
        var _a;
        if (!((_a = this._selectedValidationRules) === null || _a === void 0 ? void 0 : _a.length)) {
            this._selectedValidationRules = this.validationRuleNames
                .filter((name) => name in this.validationRules)
                .map((name) => this.validationRules[name]);
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
        var _a;
        if ((!((_a = this._tokens) === null || _a === void 0 ? void 0 : _a.length)) && this.searchString) {
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
    get tree() {
        return this.parser.tree;
    }
    /**
     * Array of the rule names we want to use when matching tokens
     * @type {string[]}
     */
    get validationRuleNames() {
        return Object.keys(this.validationRules);
    }
    /**
     * Objet of rules with a name. The key should match a value in the ruleNames array
     * @type {ValidationRules}
     */
    get validationRules() {
        if (!this._validationRules) {
            this._validationRules = exports.DEFAULT_VALIDATION_RULES;
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

},{"./Parser":2,"./Rule":3,"./Token":4}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const Token_1 = require("./Token");
/**
 * The parser will parse the search string and create matches from the rules and then tokens.
 * This class also puts words that were split by possible/actual operators back toghether again.
 * Ensures text between quotes is made into a single term token. All tokens and matches created
 * along the way are stored as properties, mainly for troubleshooting purposes.
 * @class {Parser}
 */
class Parser {
    constructor(searchString, selectedRules, selectedValidationRules) {
        this._finalTokens = [];
        this._initialMatches = [];
        this._initialTokens = [];
        this._searchString = '';
        this._tree = [];
        this._validatedTokens = [];
        this._wholeTokens = [];
        this._searchString = searchString;
        this._selectedRules = selectedRules || [];
        this._validationRules = selectedValidationRules || [];
    }
    /**
     * The string we're going to parse
     * @type {string}
     */
    get searchString() {
        return this._searchString;
    }
    set searchString(searchString) {
        this.reset();
        this._searchString = searchString;
    }
    /**
     * The tokens with errors and all manipulation done. 4th pass
     * @type {Token[]}
     */
    get validatedTokens() {
        var _a, _b;
        if (!this._validatedTokens || !this._validatedTokens.length) {
            if ((_a = this.validationRules) === null || _a === void 0 ? void 0 : _a.length) {
                if ((_b = this.finalTokens) === null || _b === void 0 ? void 0 : _b.length) {
                    this._validatedTokens = this.validateTokens(this.finalTokens, this.validationRules);
                }
            }
            else {
                throw new Error('You must provide validation rules in order to validate the tokens');
            }
        }
        return this._validatedTokens;
    }
    /**
     * Tokens that have had split words put back togther and words between quotes
     * combined. 3rd pass
     * @type {Token[]}
     */
    get finalTokens() {
        var _a, _b;
        if (!((_a = this._finalTokens) === null || _a === void 0 ? void 0 : _a.length)) {
            if ((_b = this.wholeTokens) === null || _b === void 0 ? void 0 : _b.length) {
                this._finalTokens = this.createTermsFromQuotes(this.wholeTokens);
            }
        }
        return this._finalTokens;
    }
    /**
     * The tokens with split words combined. 2nd pass
     */
    get wholeTokens() {
        var _a, _b;
        if (!((_a = this._wholeTokens) === null || _a === void 0 ? void 0 : _a.length)) {
            if ((_b = this.initialTokens) === null || _b === void 0 ? void 0 : _b.length) {
                this._wholeTokens = this.createTermsFromSplits(this.initialTokens);
            }
        }
        return this._wholeTokens;
    }
    /**
     * The tokens taken from the matches. 1st pass
     * @type {Token[]}
     */
    get initialTokens() {
        var _a, _b;
        if (!((_a = this._initialTokens) === null || _a === void 0 ? void 0 : _a.length)) {
            if ((_b = this.initialMatches) === null || _b === void 0 ? void 0 : _b.length) {
                this._initialTokens = this.matchesToTokens(this.initialMatches);
            }
        }
        return this._initialTokens;
    }
    /**
     * The initial matches gathered from the searchString
     * @type {Match[]}
     */
    get initialMatches() {
        var _a, _b;
        if (!((_a = this._initialMatches) === null || _a === void 0 ? void 0 : _a.length)) {
            if (this.searchString && ((_b = this.selectedRules) === null || _b === void 0 ? void 0 : _b.length)) {
                const initMatches = this.getInitialMatches(this.searchString, this.selectedRules);
                this._initialMatches = this.getMatchPhrases(initMatches);
            }
            else {
                throw new Error('You must provide a search string and selected rules');
            }
        }
        return this._initialMatches;
    }
    /**
     * The selected rules we will use when creating matches and setting token types
     * @type {Rule[]}
     */
    get selectedRules() {
        return this._selectedRules;
    }
    /**
     * The rules we use for validating tokens
     * @type {ValidationRule[]}
     */
    get validationRules() {
        return this._validationRules;
    }
    /**
     * The tokens structured as a tree instead of a flat array
     * @type {Token[]}
     */
    get tree() {
        var _a;
        if (!((_a = this._tree) === null || _a === void 0 ? void 0 : _a.length)) {
            if (this.validatedTokens && this.validatedTokens.length) {
                this._tree = this.createTree(this.validatedTokens);
            }
        }
        return this._tree;
    }
    /**
     * Parse the search string and create matches based on the provided rules
     * @param searchString {string}
     * @param selectedRules {Rule[]}
     * @returns {Token[]}
     */
    getInitialMatches(searchString, selectedRules) {
        // We can't make tokens yet because not all matches will be exactly a token
        // For example, termAND will match the AND test
        let matches = [];
        if (searchString && selectedRules) {
            const searchStr = searchString;
            let subStr = '';
            for (let currentIdx = 0; currentIdx < searchStr.length; currentIdx++) {
                subStr += searchStr.charAt(currentIdx);
                for (const rule of selectedRules) {
                    let matchStart = rule.test(subStr);
                    if (matchStart !== -1) {
                        matches.push({
                            subStr,
                            currentIdx,
                            matchStart,
                            type: rule.type ? rule.type : Token_1.TokenType.TERM,
                            operation: rule.operation || Token_1.TokenOperations.NONE,
                            rule: rule
                        });
                        subStr = '';
                        break;
                    }
                }
            }
            if (subStr !== '') {
                // We've iterated to the end of the search string but we have some
                // unmatched string remaining, which can only be a term
                matches.push({
                    subStr,
                    currentIdx: searchStr.length,
                    matchStart: -1,
                    type: Token_1.TokenType.TERM,
                    operation: Token_1.TokenOperations.NONE,
                    rule: undefined
                });
            }
        }
        // console.log('parser.parseSearchString, matches=', matches);
        return matches;
    }
    /**
     * Get the phrases between operators and put in the operator token phrase property
     * @param matches {Match[]}
     * @returns {Match[]}
     */
    getMatchPhrases(matches) {
        let parsedMatches = [];
        let phraseStack = [];
        if (matches && matches.length > 0) {
            matches.forEach((match, idx, arr) => {
                if (match.type !== Token_1.TokenType.POSSIBLE && match.type !== Token_1.TokenType.OPERATOR) {
                    phraseStack.push(match);
                }
                else {
                    let phraseArr = [];
                    phraseArr.push(match.subStr);
                    while (phraseStack.length > 0) {
                        let lastIdx = phraseStack.length - 1;
                        let lastPhraseMatch = phraseStack[lastIdx];
                        if (lastPhraseMatch.type !== Token_1.TokenType.POSSIBLE && lastPhraseMatch.type !== Token_1.TokenType.OPERATOR) {
                            phraseArr.push(lastPhraseMatch.subStr);
                            phraseStack.pop();
                        }
                        else {
                            break;
                        }
                    }
                    match.phrase = phraseArr.reverse().join('');
                }
                parsedMatches.push(match);
            });
        }
        // console.log('parser.buildPhrases, parsedMatches=', parsedMatches);
        return parsedMatches;
    }
    /**
     * Convert matches to tokens
     * @param matches {Match[]}
     * @returns {Token[]}
     */
    matchesToTokens(matches) {
        let tokens = [];
        if (matches && matches.length) {
            matches.forEach((match, idx, arr) => {
                const { subStr, matchStart, currentIdx, type, operation, phrase, rule } = match;
                if (matchStart >= 0) {
                    let nonTerm = subStr.slice(matchStart);
                    const pos = currentIdx - nonTerm.length;
                    if (matchStart > 0) { // match found in middle or end of subStr
                        let term = subStr.slice(0, matchStart);
                        let newToken = new Token_1.Token(term, Token_1.TokenType.TERM, undefined, pos);
                        newToken = this.checkTokenType(newToken);
                        newToken.phrase = phrase || '';
                        newToken.rule = rule;
                        tokens.push(newToken);
                    }
                    let otherToken = new Token_1.Token(nonTerm, type, operation, currentIdx);
                    otherToken.rule = rule;
                    otherToken.phrase = phrase || '';
                    tokens.push(otherToken);
                }
                else {
                    const pos = currentIdx - 1;
                    const newToken = new Token_1.Token(subStr, Token_1.TokenType.TERM, undefined, pos);
                    newToken.rule = rule;
                    newToken.phrase = phrase || '';
                    tokens.push(newToken);
                }
            });
        }
        return tokens;
    }
    /**
     * When a match is found and it's part of a word (i.e. operator, forklift, ect.) multiple
     * tokens are created. This takes those multiple tokens and makes them one token
     * @param tokens {Token[]}
     * @returns {Token[]}
     */
    createTermsFromSplits(tokens) {
        let newTokens = [];
        if (tokens && tokens.length) {
            let hangingTokens = [];
            tokens.forEach((token, idx, arr) => {
                const nextToken = arr[idx + 1];
                if (hangingTokens.length) {
                    // Got pieces of a word hanging out
                    if (this.isTermOrOperator(token) && (nextToken && this.isTermOrOperator(nextToken))) {
                        // Got more pieces of the word after this
                        hangingTokens.push(token);
                    }
                    else {
                        // Reached end of word, next token is not a word or operator, combine our hanging tokens into a single token
                        const tempVal = hangingTokens.map(token => token.value).join('') + token.value;
                        const newEnd = token.position.end;
                        const newStart = newEnd - (tempVal.length - 1);
                        const newToken = this.createNewToken(tempVal, Token_1.TokenType.TERM, newStart, newEnd);
                        newTokens.push(newToken);
                        hangingTokens = [];
                    }
                }
                else {
                    // No hanging tokens (i.e. pieces of a word)
                    if (!this.isTermOrOperator(token)) {
                        // current token not a word or operator, push it
                        newTokens.push(token);
                    }
                    else {
                        // current token is a word or operator
                        if (!nextToken || !this.isTermOrOperator(nextToken)) {
                            // next token isn't a word or operator, just push it
                            newTokens.push(token);
                        }
                        else if (nextToken && this.isTermOrOperator(nextToken)) {
                            // next token is a word or operator, current token is a piece of a word, stash it in hangingTokens
                            hangingTokens.push(token);
                        }
                        else {
                            // we should never get here
                            console.log('BooleanSearch.parser, createTermsFromSplits, current token=', token);
                            newTokens.push(token);
                        }
                    }
                }
            });
        }
        // console.log('parser.createTermsFromSplits, newTokens=', newTokens);
        return newTokens;
    }
    /**
     * Create a new token
     * @param value {string}
     * @param type {TokenType}
     * @param start {number}
     * @param end {number}
     * @returns {Token}
     */
    createNewToken(value, type, start, end) {
        const newToken = new Token_1.Token(value, type, undefined);
        const newTokenStart = start;
        const newTokenEnd = newTokenStart + (value.length - 1);
        newToken.position = { start: newTokenStart, end: newTokenEnd };
        return newToken;
    }
    /**
     * Get the text between quotes and convert it to a term token
     * @param tokens {Token[]}
     * @returns {Token[]}
     */
    createTermsFromQuotes(tokens) {
        let newTokens = [];
        if (tokens && tokens.length) {
            const quotes = tokens.filter(token => token.type === Token_1.TokenType.QUOTE);
            if (quotes === null || quotes === void 0 ? void 0 : quotes.length) {
                let currentValue = '';
                let unclosedQuoteToken = null;
                tokens.forEach((token, idx, arr) => {
                    if (unclosedQuoteToken === null) { // no opening quote yet
                        if (token.type === Token_1.TokenType.QUOTE) { // opening quote
                            unclosedQuoteToken = token;
                            token.operation = Token_1.TokenOperations.OPEN;
                            token.isSibling = true;
                            token.type === Token_1.TokenType.QUOTE;
                        }
                        newTokens.push(token);
                    }
                    else { // we have an opening quote somewhere
                        if (token.type === Token_1.TokenType.QUOTE) { // closing quote
                            const newToken = new Token_1.Token(currentValue, Token_1.TokenType.TERM, undefined);
                            newToken.isInsideQuotes = true;
                            newTokens.push(newToken);
                            currentValue = '';
                            unclosedQuoteToken = null;
                            token.operation = Token_1.TokenOperations.CLOSE;
                            token.isSibling = true;
                            token.type = Token_1.TokenType.QUOTE;
                            newTokens.push(token);
                        }
                        else { // not to the closing quote yet, just keep adding to the currentValue
                            if (!this.isTermOrOperator(token) && token.type !== Token_1.TokenType.WHITE_SPACE) {
                                newTokens.push(token);
                            }
                            else {
                                currentValue += token.value;
                            }
                        }
                    }
                });
                if (unclosedQuoteToken !== null) {
                    // We return the tokens because otherwise we'll loose all of the tokens after this unclosedQuoteToken
                    return tokens;
                }
            }
        }
        if (!newTokens.length) {
            newTokens = tokens;
        }
        return newTokens;
    }
    /**
     * Validate the tokens to ensure no unallowed characters, or malformed text (i.e. opening paren with no closing paren, etc)
     * @param tokens {Token[]}
     * @param selectedValidationRules {ValidationRule[]}
     * @returns {Token[]}
     */
    validateTokens(tokens, selectedValidationRules) {
        if (tokens && tokens.length) {
            tokens.forEach((token, idx, arr) => {
                selectedValidationRules.forEach((rule) => {
                    // Loop through validation rules and ensure each token passes each rule
                    let match = rule.test(token.value);
                    if (match !== -1) {
                        if (!token.isInsideQuotes) {
                            const msg = `Invalid character at position ${token.position.start} &#39;${rule.character}&#39;: `;
                            token.errors.push(new Error(msg));
                        }
                    }
                });
                if (token.type === Token_1.TokenType.GROUPING && token.value === '(' && idx > 2) {
                    // Ensure an operator precedes a grouping
                    const prevToken = this.getPrecedingOperatorToken(tokens, idx);
                    if (prevToken && (!prevToken.token || (prevToken && prevToken.distance > 2))) {
                        const value = prevToken.token ? prevToken.token.value : token.value;
                        const msg = `An operator should precede a grouping at position ${token.position.start} &#39;${value}&#39;: `;
                        token.errors.push(new Error(msg));
                    }
                }
                if (token.type === Token_1.TokenType.OPERATOR) {
                    // Ensure no back to back operators
                    const nextToken = arr[idx + 1];
                    const nextToken2 = arr[idx + 2];
                    if ((nextToken && nextToken.type === Token_1.TokenType.OPERATOR) ||
                        (nextToken2 && nextToken2.type === Token_1.TokenType.OPERATOR)) {
                        const msg = `Cannot have operators back to back at position ${token.position.start} &#39;${token.value} ${nextToken.value}&#39;: `;
                        token.errors.push(new Error(msg));
                    }
                }
            });
            const unclosedTypes = [
                { type: Token_1.TokenType.GROUPING, msgNamePart: 'paren' },
                { type: Token_1.TokenType.QUOTE, msgNamePart: 'quote' }
            ];
            unclosedTypes.forEach((tokenType) => {
                const unclosedGroupToken = this.getUnclosedGroupItem(tokens, tokenType.type);
                if (unclosedGroupToken) {
                    const unclosedId = unclosedGroupToken.id;
                    const filteredTokens = tokens.filter(srcToken => srcToken.id === unclosedId);
                    if (filteredTokens && filteredTokens.length) {
                        const msg = `Unmatched ${tokenType.msgNamePart} at position ${filteredTokens[0].position.start} &#39;${filteredTokens[0].value}&#39;: `;
                        filteredTokens[0].errors.push(new Error(msg));
                    }
                }
            });
            const { WHITE_SPACE, POSSIBLE, OPERATOR } = Token_1.TokenType;
            const firstToken = tokens[0].type;
            const secondToken = tokens.length >= 2 ? tokens[1].type : null;
            if ((firstToken === OPERATOR || firstToken === POSSIBLE) ||
                (firstToken === WHITE_SPACE && (secondToken && secondToken === OPERATOR || secondToken === POSSIBLE))) {
                const msg = `A search must not begin with an operator at position 0 &#39;${tokens[0].value}&#39;: `;
                tokens[0].errors.push(new Error(msg));
            }
            const lastIdx = tokens.length - 1;
            const lastToken = tokens[lastIdx].type;
            const nextLastToken = tokens.length >= 2 ? tokens[lastIdx - 1].type : null;
            if ((lastToken === OPERATOR || lastToken === POSSIBLE) ||
                (lastToken === WHITE_SPACE &&
                    (nextLastToken && nextLastToken === POSSIBLE || nextLastToken === OPERATOR))) {
                const msg = `A search must not end with an operator at position ${tokens[lastIdx].position.start} &#39;${tokens[lastIdx].value}&#39;: `;
                tokens[lastIdx].errors.push(new Error(msg));
            }
        }
        // console.log('parser.validateTokens, tokens=', tokens);
        return tokens;
    }
    /**
     * Take the array of tokens and build a tree structure
     * @param tokens {Token[]}
     */
    createTree(tokens) {
        const tree = [];
        if (tokens && tokens.length) {
            const { OPEN, CLOSE } = Token_1.TokenOperations;
            const queTokens = Array.from(tokens);
            const inProcParents = []; // Populate for nested groups
            const getKids = (parent) => {
                var _a;
                let kidToken = queTokens.shift();
                while (kidToken) {
                    const { operation } = kidToken;
                    if (this.isGrouping(kidToken) && operation === OPEN) {
                        kidToken.isChild = true;
                        kidToken.isSibling = true;
                        parent.children.push(kidToken);
                        inProcParents.unshift(kidToken);
                        getKids(kidToken);
                        kidToken = queTokens.shift();
                    }
                    else if (this.isGrouping(kidToken) && operation === CLOSE) {
                        // In a nested grouping, don't want the closing token to be included as a child
                        // of the currently processing parent. It should be a child of the previous
                        // parent if it exists.
                        kidToken.isSibling = true;
                        const prevParent = inProcParents.shift();
                        if (prevParent && inProcParents[0] && ((_a = inProcParents[0]) === null || _a === void 0 ? void 0 : _a.id) !== prevParent.id) {
                            kidToken.isChild = true;
                            inProcParents[0].children.push(kidToken);
                        }
                        else {
                            queTokens.unshift(kidToken);
                        }
                        break;
                    }
                    else {
                        kidToken.isChild = true;
                        parent.children.push(kidToken);
                        kidToken = queTokens.shift();
                    }
                }
            };
            let token = queTokens.shift();
            while (token) {
                const { operation } = token;
                if (this.isGrouping(token) && operation === OPEN) {
                    token.isSibling = true;
                    inProcParents.unshift(token);
                    getKids(token);
                }
                tree.push(token);
                token = queTokens.shift();
            }
        }
        return tree;
    }
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
    checkTokenType(token) {
        if (token) {
            const typesInStr = [];
            const rulesInStr = [];
            for (const rule of this.selectedRules) {
                const matchStart = rule.test(token.value);
                if (matchStart !== -1) {
                    typesInStr.push(rule.type);
                    rulesInStr.push(rule);
                }
            }
            if (typesInStr.length > 1) {
                // console.log('parser.checkTokenType')
                // do nothing
            }
            else if (typesInStr.length === 1) {
                token.type = typesInStr[0] || Token_1.TokenType.TERM;
                token.rule = rulesInStr[0];
            }
            else {
                token.type = Token_1.TokenType.TERM;
                token.rule = undefined;
            }
        }
        return token;
    }
    /**
     * Get the first previous OPERATOR from the token at the startIdx index
     * @param tokens {Token[]}
     * @param startIdx {number} The token index in the tokens array
     */
    getPrecedingOperatorToken(tokens, startIdx) {
        let returnToken = null;
        let returnObj = null;
        if ((tokens === null || tokens === void 0 ? void 0 : tokens.length) && (tokens.length - 1) >= startIdx) {
            returnToken = tokens[startIdx];
            let position = startIdx;
            let count = 0;
            while (position > -1 && returnToken && (returnToken.type !== Token_1.TokenType.OPERATOR && returnToken.type !== Token_1.TokenType.POSSIBLE)) {
                position--;
                returnToken = tokens[position];
                count++;
            }
            returnObj = { token: returnToken, distance: count };
        }
        return returnObj;
    }
    /**
     * Ensure there are no unclosed group tokens
     * @param tokens {Token[]}
     * @param tokenType {TokenType} The group token type to check for
     * @returns {Token}
     */
    getUnclosedGroupItem(tokens, tokenType) {
        let unclosedGroupToken = null;
        if (tokens && tokens.length) {
            const typeTokens = tokens.filter(token => token.type === tokenType);
            if (typeTokens && typeTokens.length) {
                tokens.forEach((token, idx, arr) => {
                    const { type } = token;
                    if (unclosedGroupToken === null) {
                        if (type === tokenType) {
                            unclosedGroupToken = token;
                        }
                    }
                    else {
                        if (type === tokenType) {
                            unclosedGroupToken = null;
                        }
                    }
                });
            }
        }
        return unclosedGroupToken;
    }
    /**
     * Returns true if the token is a Paren or Quote
     * @param token {Token}
     */
    isGrouping(token) {
        if (token) {
            const { type } = token;
            const { QUOTE, GROUPING } = Token_1.TokenType;
            return (type === QUOTE || type === GROUPING);
        }
        return false;
    }
    /**
     * Returns true if token is a TERM, POSSIBLE or OPERATOR
     * @param token {Token}
     * @returns {boolean}
     */
    isTermOrOperator(token) {
        if (token) {
            const { type } = token;
            const { TERM, POSSIBLE, OPERATOR } = Token_1.TokenType;
            return type === TERM || type === POSSIBLE || type === OPERATOR;
        }
        return false;
    }
    /**
     * Parse the search string and build out all the properties
     */
    parse() {
        if (this.searchString && this.selectedRules && this.validationRules) {
            return this.validatedTokens;
        }
        else {
            throw new Error('You must provide the search string, selected rules and validation rules to proceed');
        }
    }
    /**
     * Reset all the arrays of this class
     */
    reset() {
        this._finalTokens = [];
        this._initialMatches = [];
        this._initialTokens = [];
        this._tree = [];
        this._validatedTokens = [];
        this._wholeTokens = [];
    }
}
exports.Parser = Parser;

},{"./Token":4}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationRule = exports.EscapeableRule = exports.Rule = void 0;
const Token_1 = require("./Token");
/**
 * Top level class for a rule. Rules define a regular expression pattern to look for
 * within a {@link Token#value}
 * @class {Rule}
 */
class Rule {
    constructor(pattern, operation, type = Token_1.TokenType.OPERATOR) {
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
    test(str) {
        if (this.pattern) {
            return str.search(this.pattern);
        }
        throw new Error('No Pattern defined');
    }
}
exports.Rule = Rule;
/**
 * Checks if the pattern is escaped
 * @class {EscapableRule}
 * @extends {Rule}
 */
class EscapeableRule extends Rule {
    constructor(name, operation, type = Token_1.TokenType.OPERATOR) {
        super(name, operation, type);
    }
    test(str) {
        let result = super.test(str);
        if (result === -1) {
            return result;
        }
        if (str.charAt(result - 1) === '\\') {
            return -1;
        }
        return result;
    }
}
exports.EscapeableRule = EscapeableRule;
/**
 * Rule for validating tokens
 * @class {ValidationRule}
 * @extends {Rule}
 */
class ValidationRule extends Rule {
    constructor(pattern, character) {
        super(pattern, Token_1.TokenOperations.ERROR);
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
exports.ValidationRule = ValidationRule;

},{"./Token":4}],4:[function(require,module,exports){
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
        this._isSibling = false;
        this._isInsideQuotes = false;
        this._phrase = '';
        this._position = { start: -1, end: -1 };
        this._type = TokenType.TERM;
        this._styleClasses = {
            error: 'error',
            operator: 'operator',
            possibleOperator: 'warning'
        };
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
        let span = '';
        const { errors, rule, _html, type, value, operation } = this;
        const styleClass = errors.length
            ? this.styles.error
            : type === TokenType.POSSIBLE
                ? this.styles.possibleOperator
                : type === TokenType.OPERATOR
                    ? this.styles.operator
                    : '';
        const titleStr = type === TokenType.POSSIBLE
            ? `Possible operator. Operators should be capitalized (i.e ${value.toUpperCase()}).`
            : (errors === null || errors === void 0 ? void 0 : errors.length) ? errors.map((err, idx) => err.message).join('&#10;')
                : '';
        if (!_html && rule && value) {
            switch (type) {
                case TokenType.TERM:
                    span = `<span class="term">${value}</span>`;
                    break;
                case TokenType.GROUPING:
                    const groupingChildHtml = this.errors.length
                        ? `<span class="${styleClass}" title="${titleStr}">${value}</span>`
                        : `${value}`;
                    if (operation === TokenOperations.OPEN) {
                        span = `<div class="grouping">${groupingChildHtml}`;
                    }
                    else if (operation === TokenOperations.CLOSE) {
                        span = `${groupingChildHtml}</div>`;
                    }
                    break;
                case TokenType.QUOTE:
                    const quoteChildHtml = this.errors.length
                        ? `<span class="${styleClass}" title="${titleStr}">${value}</span>`
                        : `${value}`;
                    if (operation === TokenOperations.OPEN) {
                        span = `<div class="grouping">${quoteChildHtml}`;
                    }
                    else if (operation === TokenOperations.CLOSE) {
                        span = `${quoteChildHtml}</div>`;
                    }
                    break;
                case TokenType.OPERATOR:
                    span = `<span class="${styleClass}" title="${titleStr}">${value}</span>`;
                    break;
                case TokenType.POSSIBLE:
                    span = `<span class="${styleClass}" title="${titleStr}">${value}</span>`;
                    break;
            }
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
exports.Token = Token;

},{}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./BooleanSearch"), exports);
__exportStar(require("./Parser"), exports);
__exportStar(require("./Rule"), exports);
__exportStar(require("./Token"), exports);

},{"./BooleanSearch":1,"./Parser":2,"./Rule":3,"./Token":4}],6:[function(require,module,exports){
const BSP = require('boolean-search-parser');


const defaultSearchField = document.querySelector('#default-field');
const defaultOutput = document.querySelector('#default-output-container');
const defaultButton = document.querySelector('#default-submit');

const customSearchField = document.querySelector('#custom-field');
const customOutput = document.querySelector('#custom-output-container');
const customButton = document.querySelector('#custom-submit');

defaultButton.addEventListener('click', defaultOnSubmit);
customButton.addEventListener('click', customOnSubmit);

function defaultOnSubmit() {
	const searchStr = defaultSearchField.value;
	// default configuration
	const bs = new BSP.BooleanSearch(searchStr);
	defaultOutput.innerHTML = bs.html;
	console.log('Default BooleanSearch instance=', bs);
}

function customOnSubmit() {
	const searchStr = customSearchField.value;
	const rules = {...BSP.DEFAULT_RULES};
	const validationRules = {
		...BSP.DEFAULT_VALIDATION_RULES,
		number: new BSP.ValidationRule(/[0-9]+/g, '#')
	};
	const customConfig = {
		rules,
		validationRules,
		operatorStyleClass: 'success'
	};
	// custom configuration
	const bs = new BSP.BooleanSearch(searchStr, customConfig);
	customOutput.innerHTML = bs.html;
	console.log('Custom BooleanSearch instance=', bs);
}

},{"boolean-search-parser":5}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9kaXN0L0Jvb2xlYW5TZWFyY2guanMiLCIuLi9kaXN0L1BhcnNlci5qcyIsIi4uL2Rpc3QvUnVsZS5qcyIsIi4uL2Rpc3QvVG9rZW4uanMiLCIuLi9kaXN0L2luZGV4LmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxb0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Cb29sZWFuU2VhcmNoID0gZXhwb3J0cy5ERUZBVUxUX1ZBTElEQVRJT05fUlVMRVMgPSBleHBvcnRzLkRFRkFVTFRfUlVMRVMgPSB2b2lkIDA7XG5jb25zdCBQYXJzZXJfMSA9IHJlcXVpcmUoXCIuL1BhcnNlclwiKTtcbmNvbnN0IFJ1bGVfMSA9IHJlcXVpcmUoXCIuL1J1bGVcIik7XG5jb25zdCBUb2tlbl8xID0gcmVxdWlyZShcIi4vVG9rZW5cIik7XG5leHBvcnRzLkRFRkFVTFRfUlVMRVMgPSB7XG4gICAgYW5kOiBuZXcgUnVsZV8xLlJ1bGUoL2FuZC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5BTkQsIFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSxcbiAgICBvcjogbmV3IFJ1bGVfMS5SdWxlKC9vci9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUiwgVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpLFxuICAgIG5vdDogbmV3IFJ1bGVfMS5SdWxlKC9ub3QvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ULCBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSksXG4gICAgQU5EOiBuZXcgUnVsZV8xLlJ1bGUoL0FORC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5BTkQpLFxuICAgIHBsdXM6IG5ldyBSdWxlXzEuUnVsZSgvXFwrL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkFORCksXG4gICAgT1I6IG5ldyBSdWxlXzEuUnVsZSgvT1IvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuT1IpLFxuICAgIHRpbGRlOiBuZXcgUnVsZV8xLlJ1bGUoL34vZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuT1IpLFxuICAgIE5PVDogbmV3IFJ1bGVfMS5SdWxlKC9OT1QvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9UKSxcbiAgICBtaW51czogbmV3IFJ1bGVfMS5SdWxlKC8tL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PVCksXG4gICAgb3BlblBhcmVuOiBuZXcgUnVsZV8xLlJ1bGUoL1xcKC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUEVOLCBUb2tlbl8xLlRva2VuVHlwZS5HUk9VUElORyksXG4gICAgY2xvc2VQYXJlbjogbmV3IFJ1bGVfMS5SdWxlKC9cXCkvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQ0xPU0UsIFRva2VuXzEuVG9rZW5UeXBlLkdST1VQSU5HKSxcbiAgICBxdW90ZTogbmV3IFJ1bGVfMS5Fc2NhcGVhYmxlUnVsZSgvXCIvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSwgVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpLFxuICAgIHNwYWNlOiBuZXcgUnVsZV8xLlJ1bGUoL1xccy9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5XSElURV9TUEFDRSksXG4gICAgb3BlbkFuZ2xlOiBuZXcgUnVsZV8xLlJ1bGUoL1xcPC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5BU0NJSSksXG4gICAgY2xvc2VBbmdsZTogbmV3IFJ1bGVfMS5SdWxlKC9cXD4vZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSwgVG9rZW5fMS5Ub2tlblR5cGUuQVNDSUkpXG59O1xuZXhwb3J0cy5ERUZBVUxUX1ZBTElEQVRJT05fUlVMRVMgPSB7XG4gICAgb3BlbkFuZ2xlOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXDwvZywgJzwnKSxcbiAgICBjbG9zZUFuZ2xlOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXD4vZywgJz4nKSxcbiAgICBvcGVuQ3VybHk6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcey9nLCAneycpLFxuICAgIGNsb3NlQ3VybHk6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcfS9nLCAnfScpLFxuICAgIG9wZW5TcXVhcmU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcWy9nLCAnWycpLFxuICAgIGNsb3NlU3F1YXJlOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXF0vZywgJ10nKSxcbiAgICBiYWNrU2xhc2g6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcXFwvZywgJ1xcXFwnKSxcbiAgICBmb3J3YXJkU2xhc2g6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcLy9nLCAnLycpLFxuICAgIGNvbW1hOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC8sL2csICcsJyksXG4gICAgcGVyaW9kOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXC4vZywgJy4nKVxufTtcbi8qKlxuICogVGhlIGNsYXNzZXMgYW5kIG1ldGhvZHMgaW4gdGhpcyBwYWNrYWdlIHdlcmUgYmFzZWQgb2ZmIG9mIHRoZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2ZyZWRlcmlja2YvYnFwanN9IGxpYnJhcnkuXG4gKiBUaGUgQm9vbGVhblNlYXJjaCBjbGFzcyBpcyB0aGUgZW50cnkgcG9pbnQgdG8gdGhlIHBhcnNlci4gVGhlIGZvbGxvd2luZ1xuICogcHJvcGVydGllcyB3aWxsIHBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGF1dG9tYXRpY2FsbHk6XG4gKiB7QGxpbmsgQm9vbGVhblNlYXJjaCN0b2tlbnN9XG4gKiB7QGxpbmsgQm9vbGVhblNlYXJjaCNodG1sfVxuICogQGNsYXNzIHtCb29sZWFuU2VhcmNofVxuICovXG5jbGFzcyBCb29sZWFuU2VhcmNoIHtcbiAgICBjb25zdHJ1Y3RvcihzcmNoU3RyaW5nLCBjb25maWcpIHtcbiAgICAgICAgdGhpcy5fZXJyb3JzID0gW107XG4gICAgICAgIHRoaXMuX2h0bWwgPSAnJztcbiAgICAgICAgdGhpcy5faXNNYWxmb3JtZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fbWF4TGVuZ3RoID0gNTExO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IFtdO1xuICAgICAgICB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyA9IFtdO1xuICAgICAgICB0aGlzLl9zcmNoU3RyaW5nID0gJyc7XG4gICAgICAgIHRoaXMuX3Rva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9zdHlsZXMgPSB7XG4gICAgICAgICAgICBlcnJvcjogJ2Vycm9yJyxcbiAgICAgICAgICAgIG9wZXJhdG9yOiAnb3BlcmF0b3InLFxuICAgICAgICAgICAgcG9zc2libGVPcGVyYXRvcjogJ3dhcm5pbmcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2VhcmNoU3RyaW5nID0gc3JjaFN0cmluZyA/IHNyY2hTdHJpbmcgOiAnJztcbiAgICAgICAgaWYgKGNvbmZpZykge1xuICAgICAgICAgICAgdGhpcy5ydWxlcyA9IGNvbmZpZy5ydWxlcyB8fCB0aGlzLnJ1bGVzO1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uUnVsZXMgPSBjb25maWcudmFsaWRhdGlvblJ1bGVzIHx8IHRoaXMudmFsaWRhdGlvblJ1bGVzO1xuICAgICAgICAgICAgdGhpcy5fc3R5bGVzLnBvc3NpYmxlT3BlcmF0b3IgPSBjb25maWcucG9zc2libGVPcGVyYXRvclN0eWxlQ2xhc3MgfHwgJ3dhcm5pbmcnO1xuICAgICAgICAgICAgdGhpcy5fc3R5bGVzLmVycm9yID0gY29uZmlnLmVycm9yU3R5bGVDbGFzcyB8fCAnZXJyb3InO1xuICAgICAgICAgICAgdGhpcy5fc3R5bGVzLm9wZXJhdG9yID0gY29uZmlnLm9wZXJhdG9yU3R5bGVDbGFzcyB8fCAnb3BlcmF0b3InO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCBhIHJ1bGVcbiAgICAgKiBAcGFyYW0gcnVsZU5hbWUge3N0cmluZ31cbiAgICAgKiBAcGFyYW0gcnVsZSB7UnVsZX1cbiAgICAgKi9cbiAgICBhZGRSdWxlKHJ1bGVOYW1lLCBydWxlKSB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCB0aGlzLnJ1bGVzKSwgeyBbcnVsZU5hbWVdOiBydWxlIH0pO1xuICAgICAgICB0aGlzLnJ1bGVzID0gcnVsZXM7XG4gICAgICAgIC8vIGNvbnNvbGUud2FybignSWYgeW91IHdhbnQgdGhpcyBydWxlIHRvIGJlIHVzZWQsIGJlIHN1cmUgdG8gYWRkIHRoZSBydWxlIG5hbWUgdG8gdGhlIHJ1bGVOYW1lcyBhcnJheSBpbiB0aGUgYXBwcm9wcmlhdGUgcG9zaXRpb24nKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRml4IHRoZSBwb3NzaWJsZSBvcGVyYXRvcnMgYW5kIHVwZGF0ZSB0aGUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEBwYXJhbSByZXNldFNlYXJjaCB7Ym9vbGVhbn0gLSBzZXQgdHJ1ZSB0byByZXNldCBzZWFyY2ggc3RyaW5nLCB0b2tlbnMgYW5kIGh0bWxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZpeE9wZXJhdG9ycyhyZXNldFNlYXJjaFN0cmluZyA9IGZhbHNlKSB7XG4gICAgICAgIGxldCByZXR1cm5WYWwgPSB0aGlzLnNlYXJjaFN0cmluZztcbiAgICAgICAgaWYgKHRoaXMudG9rZW5zICYmIHRoaXMudG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuVmFsID0gJyc7XG4gICAgICAgICAgICB0aGlzLnRva2Vucy5mb3JFYWNoKCh0b2tlbikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSkge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi52YWx1ZSA9IHRva2VuLnZhbHVlLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUjtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uaHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm5WYWwgKz0gdG9rZW4udmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChyZXNldFNlYXJjaFN0cmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQocmV0dXJuVmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRva2VucyA9IHRoaXMucGFyc2VyLnBhcnNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVyblZhbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgZXJyb3JzXG4gICAgICogQHR5cGUge0Vycm9yW119XG4gICAgICovXG4gICAgZ2V0IGVycm9ycygpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9lcnJvcnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdG9rZW5zLmxlbmd0aCkgeyAvLyBEb250IHdhbnQgdG8gaW5pdGlhdGUgcGFyc2luZyBvZiB0b2tlbnNcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvclRva2VucyA9IHRoaXMuX3Rva2Vucy5maWx0ZXIodG9rZW4gPT4gdG9rZW4uZXJyb3JzICYmIHRva2VuLmVycm9ycy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIGxldCBlcnJvcnMgPSB0aGlzLl9lcnJvcnMgfHwgW107XG4gICAgICAgICAgICAgICAgZXJyb3JUb2tlbnMuZm9yRWFjaCgodG9rZW4pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLmVycm9ycyAmJiB0b2tlbi5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KHRva2VuLmVycm9ycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvcnMgPSBlcnJvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9ycztcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBodG1sIGZvciB0aGUgZW50aXJlIHNlYXJjaCBzdHJpbmdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBodG1sKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghdGhpcy5faHRtbCAmJiAoKF9hID0gdGhpcy50b2tlbnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgdG9rZW5zLCBtYXhMZW5ndGgsIHNlYXJjaFN0cmluZyB9ID0gdGhpcztcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hTdHJpbmdMZW4gPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzVG9vTG9uZyA9IHNlYXJjaFN0cmluZ0xlbiA+IG1heExlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBodG1sQXJyID0gdG9rZW5zLm1hcCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLnN0eWxlcyA9IHRoaXMuc3R5bGVzO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGh0bWwsIHBvc2l0aW9uLCB2YWx1ZSB9ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXR1cm5IdG1sID0gaHRtbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVG9vTG9uZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uLnN0YXJ0IDw9IG1heExlbmd0aCAmJiBwb3NpdGlvbi5lbmQgPj0gbWF4TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkeCArIDEgPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuSHRtbCA9IGA8c3BhbiBjbGFzcz1cIiR7dGhpcy5zdHlsZXMuZXJyb3J9XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybkh0bWwgPSBgPHNwYW4gY2xhc3M9XCIke3RoaXMuc3R5bGVzLmVycm9yfVwiPiR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChpZHggKyAxID09PSB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuSHRtbCA9IGAke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR1cm5IdG1sO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2h0bWwgPSBodG1sQXJyLmpvaW4oJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2h0bWwgPSB0aGlzLnNlYXJjaFN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5faHRtbDtcbiAgICB9XG4gICAgZ2V0IHN0eWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0eWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVHJ1ZSBpZiB0aGVyZSBhcmUgZXJyb3JzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0IGlzTWFsZm9ybWVkKCkge1xuICAgICAgICBpZiAodGhpcy5lcnJvcnMgJiYgdGhpcy5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9pc01hbGZvcm1lZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzTWFsZm9ybWVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgbWF4IGxlbmd0aCB0aGUgc2VhcmNoIHN0cmluZyBpcyBhbGxvd2VkIHRvIGJlXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXQgbWF4TGVuZ3RoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWF4TGVuZ3RoO1xuICAgIH1cbiAgICBzZXQgbWF4TGVuZ3RoKG1heExlbmd0aCkge1xuICAgICAgICB0aGlzLl9tYXhMZW5ndGggPSBtYXhMZW5ndGg7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBhbiBhcnJheSBvZiB0aGUgb3BlcmF0b3IgdG9rZW5zXG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IG9wZXJhdG9ycygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9vcGVyYXRvcnMgfHwgIXRoaXMuX29wZXJhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl90b2tlbnMgJiYgdGhpcy5fdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHRoaXMudG9rZW5zLmZpbHRlcigodG9rZW4pID0+IHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgcGFyc2VyIHdoaWNoIHdpbGwgcG9wdWxhdGUgYWxsIHRoZSB2YXJpb3VzIFRva2VuIGFycmF5c1xuICAgICAqIEB0eXBlIHtQYXJzZXJ9XG4gICAgICovXG4gICAgZ2V0IHBhcnNlcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9wYXJzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlciA9IG5ldyBQYXJzZXJfMS5QYXJzZXIodGhpcy5zZWFyY2hTdHJpbmcsIHRoaXMuc2VsZWN0ZWRSdWxlcywgdGhpcy5zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhcnNlcjtcbiAgICB9XG4gICAgc2V0IHBhcnNlcihwYXJzZXIpIHtcbiAgICAgICAgdGhpcy5fcGFyc2VyID0gcGFyc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgYW4gYXJyYXkgb2YgdGhlIHBvc3NpYmxlIG9wZXJhdG9yc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCBwb3NzaWJsZU9wZXJhdG9ycygpIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5fcG9zc2libGVPcGVyYXRvcnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAoKF9iID0gdGhpcy5fdG9rZW5zKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgPSB0aGlzLnRva2Vucy5maWx0ZXIoKHRva2VuKSA9PiB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiB0aGUgcnVsZSBuYW1lcyB3ZSB3YW50IHRvIHVzZSB3aGVuIG1hdGNoaW5nIHRva2Vuc1xuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBnZXQgcnVsZU5hbWVzKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5ydWxlcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE9iamV0IG9mIHJ1bGVzIHdpdGggYSBuYW1lLiBUaGUga2V5IHNob3VsZCBtYXRjaCBhIHZhbHVlIGluIHRoZSBydWxlTmFtZXMgYXJyYXlcbiAgICAgKiBAdHlwZSB7UnVsZXN9XG4gICAgICovXG4gICAgZ2V0IHJ1bGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3J1bGVzKSB7XG4gICAgICAgICAgICB0aGlzLl9ydWxlcyA9IGV4cG9ydHMuREVGQVVMVF9SVUxFUztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcnVsZXM7XG4gICAgfVxuICAgIHNldCBydWxlcyhydWxlcykge1xuICAgICAgICB0aGlzLl9ydWxlcyA9IHJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIHN0cmluZyB0byBwYXJzZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHNlYXJjaFN0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NyY2hTdHJpbmc7XG4gICAgfVxuICAgIHNldCBzZWFyY2hTdHJpbmcoc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3NyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmcucmVwbGFjZSgvXFxuL2csICcnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlbGVjdGVkIHJ1bGVzIGJhc2VkIG9mZiBvZiB0aGUgdmFsdWVzIHByb3ZpZGVkIGluIHRoZSBydWxlTmFtZXNcbiAgICAgKiBAdHlwZSB7UnVsZVtdfVxuICAgICAqL1xuICAgIGdldCBzZWxlY3RlZFJ1bGVzKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX3NlbGVjdGVkUnVsZXMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RlZFJ1bGVzID0gdGhpcy5ydWxlTmFtZXMuZmlsdGVyKChuYW1lKSA9PiBuYW1lIGluIHRoaXMucnVsZXMpLm1hcCgobmFtZSkgPT4gdGhpcy5ydWxlc1tuYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIHNldCBzZWxlY3RlZFJ1bGVzKHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IHNlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBzZWxlY3RlZCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9mZiBvZiB0aGUgdmFsdWVzIHByb3ZpZGVkIGluIHRoZSB2YWxpZGF0aW9uUnVsZU5hbWVzXG4gICAgICogQHR5cGUge1ZhbGlkYXRpb25SdWxlW119XG4gICAgICovXG4gICAgZ2V0IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMgPSB0aGlzLnZhbGlkYXRpb25SdWxlTmFtZXNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChuYW1lKSA9PiBuYW1lIGluIHRoaXMudmFsaWRhdGlvblJ1bGVzKVxuICAgICAgICAgICAgICAgIC5tYXAoKG5hbWUpID0+IHRoaXMudmFsaWRhdGlvblJ1bGVzW25hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIHNldCBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcyhzZWxlY3RlZFZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyA9IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgYXJyYXkgb2YgdG9rZW5zIGZvdW5kIGluIHRoZSBzZWFyY2ggc3RyaW5nXG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IHRva2VucygpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoKCEoKF9hID0gdGhpcy5fdG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkgJiYgdGhpcy5zZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX3Rva2VucyA9IHRoaXMucGFyc2VyLnBhcnNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMuc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1lvdSBtdXN0IHByb3ZpZGUgYSBzZWFyY2ggc3RyaW5nIHRvIHBhcnNlIGZvciB0b2tlbnMnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdG9rZW5zO1xuICAgIH1cbiAgICBzZXQgdG9rZW5zKHRva2Vucykge1xuICAgICAgICB0aGlzLl90b2tlbnMgPSB0b2tlbnM7XG4gICAgfVxuICAgIGdldCB0cmVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZXIudHJlZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgdGhlIHJ1bGUgbmFtZXMgd2Ugd2FudCB0byB1c2Ugd2hlbiBtYXRjaGluZyB0b2tlbnNcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICovXG4gICAgZ2V0IHZhbGlkYXRpb25SdWxlTmFtZXMoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnZhbGlkYXRpb25SdWxlcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE9iamV0IG9mIHJ1bGVzIHdpdGggYSBuYW1lLiBUaGUga2V5IHNob3VsZCBtYXRjaCBhIHZhbHVlIGluIHRoZSBydWxlTmFtZXMgYXJyYXlcbiAgICAgKiBAdHlwZSB7VmFsaWRhdGlvblJ1bGVzfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0aW9uUnVsZXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSBleHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICBzZXQgdmFsaWRhdGlvblJ1bGVzKHZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSB2YWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIHJlc2V0KHNlYXJjaFN0cmluZykge1xuICAgICAgICB0aGlzLnNlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZyB8fCAnJztcbiAgICAgICAgdGhpcy50b2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gW107XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLnBhcnNlciA9IG5ldyBQYXJzZXJfMS5QYXJzZXIodGhpcy5zZWFyY2hTdHJpbmcsIHRoaXMuc2VsZWN0ZWRSdWxlcywgdGhpcy5zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyk7XG4gICAgfVxufVxuZXhwb3J0cy5Cb29sZWFuU2VhcmNoID0gQm9vbGVhblNlYXJjaDtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5QYXJzZXIgPSB2b2lkIDA7XG5jb25zdCBUb2tlbl8xID0gcmVxdWlyZShcIi4vVG9rZW5cIik7XG4vKipcbiAqIFRoZSBwYXJzZXIgd2lsbCBwYXJzZSB0aGUgc2VhcmNoIHN0cmluZyBhbmQgY3JlYXRlIG1hdGNoZXMgZnJvbSB0aGUgcnVsZXMgYW5kIHRoZW4gdG9rZW5zLlxuICogVGhpcyBjbGFzcyBhbHNvIHB1dHMgd29yZHMgdGhhdCB3ZXJlIHNwbGl0IGJ5IHBvc3NpYmxlL2FjdHVhbCBvcGVyYXRvcnMgYmFjayB0b2doZXRoZXIgYWdhaW4uXG4gKiBFbnN1cmVzIHRleHQgYmV0d2VlbiBxdW90ZXMgaXMgbWFkZSBpbnRvIGEgc2luZ2xlIHRlcm0gdG9rZW4uIEFsbCB0b2tlbnMgYW5kIG1hdGNoZXMgY3JlYXRlZFxuICogYWxvbmcgdGhlIHdheSBhcmUgc3RvcmVkIGFzIHByb3BlcnRpZXMsIG1haW5seSBmb3IgdHJvdWJsZXNob290aW5nIHB1cnBvc2VzLlxuICogQGNsYXNzIHtQYXJzZXJ9XG4gKi9cbmNsYXNzIFBhcnNlciB7XG4gICAgY29uc3RydWN0b3Ioc2VhcmNoU3RyaW5nLCBzZWxlY3RlZFJ1bGVzLCBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9ICcnO1xuICAgICAgICB0aGlzLl90cmVlID0gW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRlZFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl93aG9sZVRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9zZWFyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmc7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkUnVsZXMgPSBzZWxlY3RlZFJ1bGVzIHx8IFtdO1xuICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHN0cmluZyB3ZSdyZSBnb2luZyB0byBwYXJzZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHNlYXJjaFN0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlYXJjaFN0cmluZztcbiAgICB9XG4gICAgc2V0IHNlYXJjaFN0cmluZyhzZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB0aGlzLl9zZWFyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgd2l0aCBlcnJvcnMgYW5kIGFsbCBtYW5pcHVsYXRpb24gZG9uZS4gNHRoIHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgdmFsaWRhdGVkVG9rZW5zKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoIXRoaXMuX3ZhbGlkYXRlZFRva2VucyB8fCAhdGhpcy5fdmFsaWRhdGVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKChfYSA9IHRoaXMudmFsaWRhdGlvblJ1bGVzKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMuZmluYWxUb2tlbnMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGVkVG9rZW5zID0gdGhpcy52YWxpZGF0ZVRva2Vucyh0aGlzLmZpbmFsVG9rZW5zLCB0aGlzLnZhbGlkYXRpb25SdWxlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwcm92aWRlIHZhbGlkYXRpb24gcnVsZXMgaW4gb3JkZXIgdG8gdmFsaWRhdGUgdGhlIHRva2VucycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl92YWxpZGF0ZWRUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRva2VucyB0aGF0IGhhdmUgaGFkIHNwbGl0IHdvcmRzIHB1dCBiYWNrIHRvZ3RoZXIgYW5kIHdvcmRzIGJldHdlZW4gcXVvdGVzXG4gICAgICogY29tYmluZWQuIDNyZCBwYXNzXG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IGZpbmFsVG9rZW5zKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9maW5hbFRva2VucykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICgoX2IgPSB0aGlzLndob2xlVG9rZW5zKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZmluYWxUb2tlbnMgPSB0aGlzLmNyZWF0ZVRlcm1zRnJvbVF1b3Rlcyh0aGlzLndob2xlVG9rZW5zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZmluYWxUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgd2l0aCBzcGxpdCB3b3JkcyBjb21iaW5lZC4gMm5kIHBhc3NcbiAgICAgKi9cbiAgICBnZXQgd2hvbGVUb2tlbnMoKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX3dob2xlVG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMuaW5pdGlhbFRva2VucykgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dob2xlVG9rZW5zID0gdGhpcy5jcmVhdGVUZXJtc0Zyb21TcGxpdHModGhpcy5pbml0aWFsVG9rZW5zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fd2hvbGVUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgdGFrZW4gZnJvbSB0aGUgbWF0Y2hlcy4gMXN0IHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgaW5pdGlhbFRva2VucygpIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5faW5pdGlhbFRva2VucykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICgoX2IgPSB0aGlzLmluaXRpYWxNYXRjaGVzKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faW5pdGlhbFRva2VucyA9IHRoaXMubWF0Y2hlc1RvVG9rZW5zKHRoaXMuaW5pdGlhbE1hdGNoZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9pbml0aWFsVG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgaW5pdGlhbCBtYXRjaGVzIGdhdGhlcmVkIGZyb20gdGhlIHNlYXJjaFN0cmluZ1xuICAgICAqIEB0eXBlIHtNYXRjaFtdfVxuICAgICAqL1xuICAgIGdldCBpbml0aWFsTWF0Y2hlcygpIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5faW5pdGlhbE1hdGNoZXMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWFyY2hTdHJpbmcgJiYgKChfYiA9IHRoaXMuc2VsZWN0ZWRSdWxlcykgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmxlbmd0aCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbml0TWF0Y2hlcyA9IHRoaXMuZ2V0SW5pdGlhbE1hdGNoZXModGhpcy5zZWFyY2hTdHJpbmcsIHRoaXMuc2VsZWN0ZWRSdWxlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5faW5pdGlhbE1hdGNoZXMgPSB0aGlzLmdldE1hdGNoUGhyYXNlcyhpbml0TWF0Y2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgYSBzZWFyY2ggc3RyaW5nIGFuZCBzZWxlY3RlZCBydWxlcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9pbml0aWFsTWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlbGVjdGVkIHJ1bGVzIHdlIHdpbGwgdXNlIHdoZW4gY3JlYXRpbmcgbWF0Y2hlcyBhbmQgc2V0dGluZyB0b2tlbiB0eXBlc1xuICAgICAqIEB0eXBlIHtSdWxlW119XG4gICAgICovXG4gICAgZ2V0IHNlbGVjdGVkUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgcnVsZXMgd2UgdXNlIGZvciB2YWxpZGF0aW5nIHRva2Vuc1xuICAgICAqIEB0eXBlIHtWYWxpZGF0aW9uUnVsZVtdfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0aW9uUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgc3RydWN0dXJlZCBhcyBhIHRyZWUgaW5zdGVhZCBvZiBhIGZsYXQgYXJyYXlcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgdHJlZSgpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl90cmVlKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudmFsaWRhdGVkVG9rZW5zICYmIHRoaXMudmFsaWRhdGVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RyZWUgPSB0aGlzLmNyZWF0ZVRyZWUodGhpcy52YWxpZGF0ZWRUb2tlbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXJzZSB0aGUgc2VhcmNoIHN0cmluZyBhbmQgY3JlYXRlIG1hdGNoZXMgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHJ1bGVzXG4gICAgICogQHBhcmFtIHNlYXJjaFN0cmluZyB7c3RyaW5nfVxuICAgICAqIEBwYXJhbSBzZWxlY3RlZFJ1bGVzIHtSdWxlW119XG4gICAgICogQHJldHVybnMge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0SW5pdGlhbE1hdGNoZXMoc2VhcmNoU3RyaW5nLCBzZWxlY3RlZFJ1bGVzKSB7XG4gICAgICAgIC8vIFdlIGNhbid0IG1ha2UgdG9rZW5zIHlldCBiZWNhdXNlIG5vdCBhbGwgbWF0Y2hlcyB3aWxsIGJlIGV4YWN0bHkgYSB0b2tlblxuICAgICAgICAvLyBGb3IgZXhhbXBsZSwgdGVybUFORCB3aWxsIG1hdGNoIHRoZSBBTkQgdGVzdFxuICAgICAgICBsZXQgbWF0Y2hlcyA9IFtdO1xuICAgICAgICBpZiAoc2VhcmNoU3RyaW5nICYmIHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFN0ciA9IHNlYXJjaFN0cmluZztcbiAgICAgICAgICAgIGxldCBzdWJTdHIgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGN1cnJlbnRJZHggPSAwOyBjdXJyZW50SWR4IDwgc2VhcmNoU3RyLmxlbmd0aDsgY3VycmVudElkeCsrKSB7XG4gICAgICAgICAgICAgICAgc3ViU3RyICs9IHNlYXJjaFN0ci5jaGFyQXQoY3VycmVudElkeCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBydWxlIG9mIHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoU3RhcnQgPSBydWxlLnRlc3Qoc3ViU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoU3RhcnQgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YlN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50SWR4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogcnVsZS50eXBlID8gcnVsZS50eXBlIDogVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IHJ1bGUub3BlcmF0aW9uIHx8IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVsZTogcnVsZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJTdHIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN1YlN0ciAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSd2ZSBpdGVyYXRlZCB0byB0aGUgZW5kIG9mIHRoZSBzZWFyY2ggc3RyaW5nIGJ1dCB3ZSBoYXZlIHNvbWVcbiAgICAgICAgICAgICAgICAvLyB1bm1hdGNoZWQgc3RyaW5nIHJlbWFpbmluZywgd2hpY2ggY2FuIG9ubHkgYmUgYSB0ZXJtXG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3ViU3RyLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SWR4OiBzZWFyY2hTdHIubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaFN0YXJ0OiAtMSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSxcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uOiBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLFxuICAgICAgICAgICAgICAgICAgICBydWxlOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLnBhcnNlU2VhcmNoU3RyaW5nLCBtYXRjaGVzPScsIG1hdGNoZXMpO1xuICAgICAgICByZXR1cm4gbWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBwaHJhc2VzIGJldHdlZW4gb3BlcmF0b3JzIGFuZCBwdXQgaW4gdGhlIG9wZXJhdG9yIHRva2VuIHBocmFzZSBwcm9wZXJ0eVxuICAgICAqIEBwYXJhbSBtYXRjaGVzIHtNYXRjaFtdfVxuICAgICAqIEByZXR1cm5zIHtNYXRjaFtdfVxuICAgICAqL1xuICAgIGdldE1hdGNoUGhyYXNlcyhtYXRjaGVzKSB7XG4gICAgICAgIGxldCBwYXJzZWRNYXRjaGVzID0gW107XG4gICAgICAgIGxldCBwaHJhc2VTdGFjayA9IFtdO1xuICAgICAgICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hdGNoZXMuZm9yRWFjaCgobWF0Y2gsIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFICYmIG1hdGNoLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgICAgICAgICAgICAgIHBocmFzZVN0YWNrLnB1c2gobWF0Y2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBocmFzZUFyciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBwaHJhc2VBcnIucHVzaChtYXRjaC5zdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGhyYXNlU3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RJZHggPSBwaHJhc2VTdGFjay5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3RQaHJhc2VNYXRjaCA9IHBocmFzZVN0YWNrW2xhc3RJZHhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RQaHJhc2VNYXRjaC50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSAmJiBsYXN0UGhyYXNlTWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaHJhc2VBcnIucHVzaChsYXN0UGhyYXNlTWF0Y2guc3ViU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaHJhc2VTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoLnBocmFzZSA9IHBocmFzZUFyci5yZXZlcnNlKCkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcnNlZE1hdGNoZXMucHVzaChtYXRjaCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLmJ1aWxkUGhyYXNlcywgcGFyc2VkTWF0Y2hlcz0nLCBwYXJzZWRNYXRjaGVzKTtcbiAgICAgICAgcmV0dXJuIHBhcnNlZE1hdGNoZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgbWF0Y2hlcyB0byB0b2tlbnNcbiAgICAgKiBAcGFyYW0gbWF0Y2hlcyB7TWF0Y2hbXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBtYXRjaGVzVG9Ub2tlbnMobWF0Y2hlcykge1xuICAgICAgICBsZXQgdG9rZW5zID0gW107XG4gICAgICAgIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBtYXRjaGVzLmZvckVhY2goKG1hdGNoLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3ViU3RyLCBtYXRjaFN0YXJ0LCBjdXJyZW50SWR4LCB0eXBlLCBvcGVyYXRpb24sIHBocmFzZSwgcnVsZSB9ID0gbWF0Y2g7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoU3RhcnQgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbm9uVGVybSA9IHN1YlN0ci5zbGljZShtYXRjaFN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gY3VycmVudElkeCAtIG5vblRlcm0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCA+IDApIHsgLy8gbWF0Y2ggZm91bmQgaW4gbWlkZGxlIG9yIGVuZCBvZiBzdWJTdHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXJtID0gc3ViU3RyLnNsaWNlKDAsIG1hdGNoU3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Rva2VuID0gbmV3IFRva2VuXzEuVG9rZW4odGVybSwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSwgdW5kZWZpbmVkLCBwb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4gPSB0aGlzLmNoZWNrVG9rZW5UeXBlKG5ld1Rva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLnBocmFzZSA9IHBocmFzZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLnJ1bGUgPSBydWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBvdGhlclRva2VuID0gbmV3IFRva2VuXzEuVG9rZW4obm9uVGVybSwgdHlwZSwgb3BlcmF0aW9uLCBjdXJyZW50SWR4KTtcbiAgICAgICAgICAgICAgICAgICAgb3RoZXJUb2tlbi5ydWxlID0gcnVsZTtcbiAgICAgICAgICAgICAgICAgICAgb3RoZXJUb2tlbi5waHJhc2UgPSBwaHJhc2UgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKG90aGVyVG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gY3VycmVudElkeCAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Rva2VuID0gbmV3IFRva2VuXzEuVG9rZW4oc3ViU3RyLCBUb2tlbl8xLlRva2VuVHlwZS5URVJNLCB1bmRlZmluZWQsIHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLnJ1bGUgPSBydWxlO1xuICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbi5waHJhc2UgPSBwaHJhc2UgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKG5ld1Rva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXaGVuIGEgbWF0Y2ggaXMgZm91bmQgYW5kIGl0J3MgcGFydCBvZiBhIHdvcmQgKGkuZS4gb3BlcmF0b3IsIGZvcmtsaWZ0LCBlY3QuKSBtdWx0aXBsZVxuICAgICAqIHRva2VucyBhcmUgY3JlYXRlZC4gVGhpcyB0YWtlcyB0aG9zZSBtdWx0aXBsZSB0b2tlbnMgYW5kIG1ha2VzIHRoZW0gb25lIHRva2VuXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBjcmVhdGVUZXJtc0Zyb21TcGxpdHModG9rZW5zKSB7XG4gICAgICAgIGxldCBuZXdUb2tlbnMgPSBbXTtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsZXQgaGFuZ2luZ1Rva2VucyA9IFtdO1xuICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRUb2tlbiA9IGFycltpZHggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoaGFuZ2luZ1Rva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR290IHBpZWNlcyBvZiBhIHdvcmQgaGFuZ2luZyBvdXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNUZXJtT3JPcGVyYXRvcih0b2tlbikgJiYgKG5leHRUb2tlbiAmJiB0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvdCBtb3JlIHBpZWNlcyBvZiB0aGUgd29yZCBhZnRlciB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5naW5nVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVhY2hlZCBlbmQgb2Ygd29yZCwgbmV4dCB0b2tlbiBpcyBub3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBjb21iaW5lIG91ciBoYW5naW5nIHRva2VucyBpbnRvIGEgc2luZ2xlIHRva2VuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wVmFsID0gaGFuZ2luZ1Rva2Vucy5tYXAodG9rZW4gPT4gdG9rZW4udmFsdWUpLmpvaW4oJycpICsgdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdFbmQgPSB0b2tlbi5wb3NpdGlvbi5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGFydCA9IG5ld0VuZCAtICh0ZW1wVmFsLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VG9rZW4gPSB0aGlzLmNyZWF0ZU5ld1Rva2VuKHRlbXBWYWwsIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIG5ld1N0YXJ0LCBuZXdFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZ2luZ1Rva2VucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBObyBoYW5naW5nIHRva2VucyAoaS5lLiBwaWVjZXMgb2YgYSB3b3JkKVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNUZXJtT3JPcGVyYXRvcih0b2tlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgdG9rZW4gbm90IGEgd29yZCBvciBvcGVyYXRvciwgcHVzaCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudCB0b2tlbiBpcyBhIHdvcmQgb3Igb3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbmV4dFRva2VuIHx8ICF0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgdG9rZW4gaXNuJ3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBqdXN0IHB1c2ggaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChuZXh0VG9rZW4gJiYgdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKG5leHRUb2tlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IHRva2VuIGlzIGEgd29yZCBvciBvcGVyYXRvciwgY3VycmVudCB0b2tlbiBpcyBhIHBpZWNlIG9mIGEgd29yZCwgc3Rhc2ggaXQgaW4gaGFuZ2luZ1Rva2Vuc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmdpbmdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBzaG91bGQgbmV2ZXIgZ2V0IGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQm9vbGVhblNlYXJjaC5wYXJzZXIsIGNyZWF0ZVRlcm1zRnJvbVNwbGl0cywgY3VycmVudCB0b2tlbj0nLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3BhcnNlci5jcmVhdGVUZXJtc0Zyb21TcGxpdHMsIG5ld1Rva2Vucz0nLCBuZXdUb2tlbnMpO1xuICAgICAgICByZXR1cm4gbmV3VG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgdG9rZW5cbiAgICAgKiBAcGFyYW0gdmFsdWUge3N0cmluZ31cbiAgICAgKiBAcGFyYW0gdHlwZSB7VG9rZW5UeXBlfVxuICAgICAqIEBwYXJhbSBzdGFydCB7bnVtYmVyfVxuICAgICAqIEBwYXJhbSBlbmQge251bWJlcn1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW59XG4gICAgICovXG4gICAgY3JlYXRlTmV3VG9rZW4odmFsdWUsIHR5cGUsIHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbih2YWx1ZSwgdHlwZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgY29uc3QgbmV3VG9rZW5TdGFydCA9IHN0YXJ0O1xuICAgICAgICBjb25zdCBuZXdUb2tlbkVuZCA9IG5ld1Rva2VuU3RhcnQgKyAodmFsdWUubGVuZ3RoIC0gMSk7XG4gICAgICAgIG5ld1Rva2VuLnBvc2l0aW9uID0geyBzdGFydDogbmV3VG9rZW5TdGFydCwgZW5kOiBuZXdUb2tlbkVuZCB9O1xuICAgICAgICByZXR1cm4gbmV3VG9rZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdGV4dCBiZXR3ZWVuIHF1b3RlcyBhbmQgY29udmVydCBpdCB0byBhIHRlcm0gdG9rZW5cbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRlcm1zRnJvbVF1b3Rlcyh0b2tlbnMpIHtcbiAgICAgICAgbGV0IG5ld1Rva2VucyA9IFtdO1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHF1b3RlcyA9IHRva2Vucy5maWx0ZXIodG9rZW4gPT4gdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpO1xuICAgICAgICAgICAgaWYgKHF1b3RlcyA9PT0gbnVsbCB8fCBxdW90ZXMgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHF1b3Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgbGV0IHVuY2xvc2VkUXVvdGVUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRRdW90ZVRva2VuID09PSBudWxsKSB7IC8vIG5vIG9wZW5pbmcgcXVvdGUgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpIHsgLy8gb3BlbmluZyBxdW90ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuY2xvc2VkUXVvdGVUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLm9wZXJhdGlvbiA9IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9QRU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uaXNTaWJsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHsgLy8gd2UgaGF2ZSBhbiBvcGVuaW5nIHF1b3RlIHNvbWV3aGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFKSB7IC8vIGNsb3NpbmcgcXVvdGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKGN1cnJlbnRWYWx1ZSwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbi5pc0luc2lkZVF1b3RlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuY2xvc2VkUXVvdGVUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4ub3BlcmF0aW9uID0gVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQ0xPU0U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uaXNTaWJsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7IC8vIG5vdCB0byB0aGUgY2xvc2luZyBxdW90ZSB5ZXQsIGp1c3Qga2VlcCBhZGRpbmcgdG8gdGhlIGN1cnJlbnRWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSAmJiB0b2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5XSElURV9TUEFDRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgKz0gdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHVuY2xvc2VkUXVvdGVUb2tlbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSByZXR1cm4gdGhlIHRva2VucyBiZWNhdXNlIG90aGVyd2lzZSB3ZSdsbCBsb29zZSBhbGwgb2YgdGhlIHRva2VucyBhZnRlciB0aGlzIHVuY2xvc2VkUXVvdGVUb2tlblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIW5ld1Rva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5ld1Rva2VucyA9IHRva2VucztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3VG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSB0aGUgdG9rZW5zIHRvIGVuc3VyZSBubyB1bmFsbG93ZWQgY2hhcmFjdGVycywgb3IgbWFsZm9ybWVkIHRleHQgKGkuZS4gb3BlbmluZyBwYXJlbiB3aXRoIG5vIGNsb3NpbmcgcGFyZW4sIGV0YylcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEBwYXJhbSBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcyB7VmFsaWRhdGlvblJ1bGVbXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVRva2Vucyh0b2tlbnMsIHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgIGlmICh0b2tlbnMgJiYgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzLmZvckVhY2goKHJ1bGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTG9vcCB0aHJvdWdoIHZhbGlkYXRpb24gcnVsZXMgYW5kIGVuc3VyZSBlYWNoIHRva2VuIHBhc3NlcyBlYWNoIHJ1bGVcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoID0gcnVsZS50ZXN0KHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0b2tlbi5pc0luc2lkZVF1b3Rlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBJbnZhbGlkIGNoYXJhY3RlciBhdCBwb3NpdGlvbiAke3Rva2VuLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7cnVsZS5jaGFyYWN0ZXJ9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLkdST1VQSU5HICYmIHRva2VuLnZhbHVlID09PSAnKCcgJiYgaWR4ID4gMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYW4gb3BlcmF0b3IgcHJlY2VkZXMgYSBncm91cGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2VG9rZW4gPSB0aGlzLmdldFByZWNlZGluZ09wZXJhdG9yVG9rZW4odG9rZW5zLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJldlRva2VuICYmICghcHJldlRva2VuLnRva2VuIHx8IChwcmV2VG9rZW4gJiYgcHJldlRva2VuLmRpc3RhbmNlID4gMikpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHByZXZUb2tlbi50b2tlbiA/IHByZXZUb2tlbi50b2tlbi52YWx1ZSA6IHRva2VuLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEFuIG9wZXJhdG9yIHNob3VsZCBwcmVjZWRlIGEgZ3JvdXBpbmcgYXQgcG9zaXRpb24gJHt0b2tlbi5wb3NpdGlvbi5zdGFydH0gJiMzOTske3ZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgbm8gYmFjayB0byBiYWNrIG9wZXJhdG9yc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0VG9rZW4gPSBhcnJbaWR4ICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRUb2tlbjIgPSBhcnJbaWR4ICsgMl07XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV4dFRva2VuICYmIG5leHRUb2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0VG9rZW4yICYmIG5leHRUb2tlbjIudHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgQ2Fubm90IGhhdmUgb3BlcmF0b3JzIGJhY2sgdG8gYmFjayBhdCBwb3NpdGlvbiAke3Rva2VuLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7dG9rZW4udmFsdWV9ICR7bmV4dFRva2VuLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB1bmNsb3NlZFR5cGVzID0gW1xuICAgICAgICAgICAgICAgIHsgdHlwZTogVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcsIG1zZ05hbWVQYXJ0OiAncGFyZW4nIH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSwgbXNnTmFtZVBhcnQ6ICdxdW90ZScgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIHVuY2xvc2VkVHlwZXMuZm9yRWFjaCgodG9rZW5UeXBlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5jbG9zZWRHcm91cFRva2VuID0gdGhpcy5nZXRVbmNsb3NlZEdyb3VwSXRlbSh0b2tlbnMsIHRva2VuVHlwZS50eXBlKTtcbiAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRHcm91cFRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVuY2xvc2VkSWQgPSB1bmNsb3NlZEdyb3VwVG9rZW4uaWQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlcmVkVG9rZW5zID0gdG9rZW5zLmZpbHRlcihzcmNUb2tlbiA9PiBzcmNUb2tlbi5pZCA9PT0gdW5jbG9zZWRJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXJlZFRva2VucyAmJiBmaWx0ZXJlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBVbm1hdGNoZWQgJHt0b2tlblR5cGUubXNnTmFtZVBhcnR9IGF0IHBvc2l0aW9uICR7ZmlsdGVyZWRUb2tlbnNbMF0ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHtmaWx0ZXJlZFRva2Vuc1swXS52YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkVG9rZW5zWzBdLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgeyBXSElURV9TUEFDRSwgUE9TU0lCTEUsIE9QRVJBVE9SIH0gPSBUb2tlbl8xLlRva2VuVHlwZTtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0VG9rZW4gPSB0b2tlbnNbMF0udHlwZTtcbiAgICAgICAgICAgIGNvbnN0IHNlY29uZFRva2VuID0gdG9rZW5zLmxlbmd0aCA+PSAyID8gdG9rZW5zWzFdLnR5cGUgOiBudWxsO1xuICAgICAgICAgICAgaWYgKChmaXJzdFRva2VuID09PSBPUEVSQVRPUiB8fCBmaXJzdFRva2VuID09PSBQT1NTSUJMRSkgfHxcbiAgICAgICAgICAgICAgICAoZmlyc3RUb2tlbiA9PT0gV0hJVEVfU1BBQ0UgJiYgKHNlY29uZFRva2VuICYmIHNlY29uZFRva2VuID09PSBPUEVSQVRPUiB8fCBzZWNvbmRUb2tlbiA9PT0gUE9TU0lCTEUpKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBBIHNlYXJjaCBtdXN0IG5vdCBiZWdpbiB3aXRoIGFuIG9wZXJhdG9yIGF0IHBvc2l0aW9uIDAgJiMzOTske3Rva2Vuc1swXS52YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICB0b2tlbnNbMF0uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbGFzdElkeCA9IHRva2Vucy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgY29uc3QgbGFzdFRva2VuID0gdG9rZW5zW2xhc3RJZHhdLnR5cGU7XG4gICAgICAgICAgICBjb25zdCBuZXh0TGFzdFRva2VuID0gdG9rZW5zLmxlbmd0aCA+PSAyID8gdG9rZW5zW2xhc3RJZHggLSAxXS50eXBlIDogbnVsbDtcbiAgICAgICAgICAgIGlmICgobGFzdFRva2VuID09PSBPUEVSQVRPUiB8fCBsYXN0VG9rZW4gPT09IFBPU1NJQkxFKSB8fFxuICAgICAgICAgICAgICAgIChsYXN0VG9rZW4gPT09IFdISVRFX1NQQUNFICYmXG4gICAgICAgICAgICAgICAgICAgIChuZXh0TGFzdFRva2VuICYmIG5leHRMYXN0VG9rZW4gPT09IFBPU1NJQkxFIHx8IG5leHRMYXN0VG9rZW4gPT09IE9QRVJBVE9SKSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgQSBzZWFyY2ggbXVzdCBub3QgZW5kIHdpdGggYW4gb3BlcmF0b3IgYXQgcG9zaXRpb24gJHt0b2tlbnNbbGFzdElkeF0ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHt0b2tlbnNbbGFzdElkeF0udmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgdG9rZW5zW2xhc3RJZHhdLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLnZhbGlkYXRlVG9rZW5zLCB0b2tlbnM9JywgdG9rZW5zKTtcbiAgICAgICAgcmV0dXJuIHRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGFrZSB0aGUgYXJyYXkgb2YgdG9rZW5zIGFuZCBidWlsZCBhIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBjcmVhdGVUcmVlKHRva2Vucykge1xuICAgICAgICBjb25zdCB0cmVlID0gW107XG4gICAgICAgIGlmICh0b2tlbnMgJiYgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgeyBPUEVOLCBDTE9TRSB9ID0gVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBxdWVUb2tlbnMgPSBBcnJheS5mcm9tKHRva2Vucyk7XG4gICAgICAgICAgICBjb25zdCBpblByb2NQYXJlbnRzID0gW107IC8vIFBvcHVsYXRlIGZvciBuZXN0ZWQgZ3JvdXBzXG4gICAgICAgICAgICBjb25zdCBnZXRLaWRzID0gKHBhcmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBfYTtcbiAgICAgICAgICAgICAgICBsZXQga2lkVG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoa2lkVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBvcGVyYXRpb24gfSA9IGtpZFRva2VuO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VwaW5nKGtpZFRva2VuKSAmJiBvcGVyYXRpb24gPT09IE9QRU4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4uaXNTaWJsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluUHJvY1BhcmVudHMudW5zaGlmdChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRLaWRzKGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5pc0dyb3VwaW5nKGtpZFRva2VuKSAmJiBvcGVyYXRpb24gPT09IENMT1NFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBhIG5lc3RlZCBncm91cGluZywgZG9uJ3Qgd2FudCB0aGUgY2xvc2luZyB0b2tlbiB0byBiZSBpbmNsdWRlZCBhcyBhIGNoaWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvZiB0aGUgY3VycmVudGx5IHByb2Nlc3NpbmcgcGFyZW50LiBJdCBzaG91bGQgYmUgYSBjaGlsZCBvZiB0aGUgcHJldmlvdXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhcmVudCBpZiBpdCBleGlzdHMuXG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc1NpYmxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldlBhcmVudCA9IGluUHJvY1BhcmVudHMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2UGFyZW50ICYmIGluUHJvY1BhcmVudHNbMF0gJiYgKChfYSA9IGluUHJvY1BhcmVudHNbMF0pID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5pZCkgIT09IHByZXZQYXJlbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc0NoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpblByb2NQYXJlbnRzWzBdLmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlVG9rZW5zLnVuc2hpZnQoa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc0NoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbGV0IHRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICB3aGlsZSAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNHcm91cGluZyh0b2tlbikgJiYgb3BlcmF0aW9uID09PSBPUEVOKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmlzU2libGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluUHJvY1BhcmVudHMudW5zaGlmdCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIGdldEtpZHModG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cmVlLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIHRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRyZWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB3ZSd2ZSBnb3QgdGhlIHJpZ2h0IHRva2VuIHR5cGUgYWZ0ZXIgbWFuaXB1bGF0aW5nIHRoZSBtYXRjaC4gRm9yIGV4YW1wbGU6XG4gICAgICogdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhpcyBtYXRjaCBhcnJheSB3aWxsIGhhdmUgYSB0b2tlbiB0eXBlIG9mIFBPU1NJQkxFOlxuICAgICAqIFtmb3IsIGtsaWZ0XVxuICAgICAqIGFmdGVyIGEgdG9rZW4gaXMgY3JlYXRlZCwgd2UnbGwgZW5kIHVwIHdpdGg6XG4gICAgICogW2YsIG9yLCBrbGlmdF1cbiAgICAgKiB0aGUgZmlzdCBlbGVtZW50IHdpbGwgc3RpbGwgaGF2ZSBhIHRva2VuIHR5cGUgb2YgUE9TU0lCTEUgYXMgd2lsbCB0aGUgc2Vjb25kIGVsZW1lbnRcbiAgICAgKiB3ZSBuZWVkIHRvIGVuc3VyZSB0aGF0IHRoZSBmaXJzdCBlbGVtZW50J3MgdG9rZW4gdHlwZSBnZXRzIHNldCB0byBURVJNIHNvIHRoYXQgd2UgbWF5XG4gICAgICogcHV0IHRoaXMgc3BsaXQgd29yZCBiYWNrIHRvZ2V0aGVyIGxhdGVyIGluIHRoZSBwcm9jZXNzXG4gICAgICogQHBhcmFtIHRva2VuIHtUb2tlbn1cbiAgICAgKi9cbiAgICBjaGVja1Rva2VuVHlwZSh0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGVzSW5TdHIgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVzSW5TdHIgPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcnVsZSBvZiB0aGlzLnNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaFN0YXJ0ID0gcnVsZS50ZXN0KHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZXNJblN0ci5wdXNoKHJ1bGUudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzSW5TdHIucHVzaChydWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZXNJblN0ci5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3BhcnNlci5jaGVja1Rva2VuVHlwZScpXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZXNJblN0ci5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gdHlwZXNJblN0clswXSB8fCBUb2tlbl8xLlRva2VuVHlwZS5URVJNO1xuICAgICAgICAgICAgICAgIHRva2VuLnJ1bGUgPSBydWxlc0luU3RyWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9rZW4udHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLlRFUk07XG4gICAgICAgICAgICAgICAgdG9rZW4ucnVsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgZmlyc3QgcHJldmlvdXMgT1BFUkFUT1IgZnJvbSB0aGUgdG9rZW4gYXQgdGhlIHN0YXJ0SWR4IGluZGV4XG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcGFyYW0gc3RhcnRJZHgge251bWJlcn0gVGhlIHRva2VuIGluZGV4IGluIHRoZSB0b2tlbnMgYXJyYXlcbiAgICAgKi9cbiAgICBnZXRQcmVjZWRpbmdPcGVyYXRvclRva2VuKHRva2Vucywgc3RhcnRJZHgpIHtcbiAgICAgICAgbGV0IHJldHVyblRva2VuID0gbnVsbDtcbiAgICAgICAgbGV0IHJldHVybk9iaiA9IG51bGw7XG4gICAgICAgIGlmICgodG9rZW5zID09PSBudWxsIHx8IHRva2VucyA9PT0gdm9pZCAwID8gdm9pZCAwIDogdG9rZW5zLmxlbmd0aCkgJiYgKHRva2Vucy5sZW5ndGggLSAxKSA+PSBzdGFydElkeCkge1xuICAgICAgICAgICAgcmV0dXJuVG9rZW4gPSB0b2tlbnNbc3RhcnRJZHhdO1xuICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gc3RhcnRJZHg7XG4gICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgd2hpbGUgKHBvc2l0aW9uID4gLTEgJiYgcmV0dXJuVG9rZW4gJiYgKHJldHVyblRva2VuLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SICYmIHJldHVyblRva2VuLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSkge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uLS07XG4gICAgICAgICAgICAgICAgcmV0dXJuVG9rZW4gPSB0b2tlbnNbcG9zaXRpb25dO1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm5PYmogPSB7IHRva2VuOiByZXR1cm5Ub2tlbiwgZGlzdGFuY2U6IGNvdW50IH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHVybk9iajtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZXJlIGFyZSBubyB1bmNsb3NlZCBncm91cCB0b2tlbnNcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEBwYXJhbSB0b2tlblR5cGUge1Rva2VuVHlwZX0gVGhlIGdyb3VwIHRva2VuIHR5cGUgdG8gY2hlY2sgZm9yXG4gICAgICogQHJldHVybnMge1Rva2VufVxuICAgICAqL1xuICAgIGdldFVuY2xvc2VkR3JvdXBJdGVtKHRva2VucywgdG9rZW5UeXBlKSB7XG4gICAgICAgIGxldCB1bmNsb3NlZEdyb3VwVG9rZW4gPSBudWxsO1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGVUb2tlbnMgPSB0b2tlbnMuZmlsdGVyKHRva2VuID0+IHRva2VuLnR5cGUgPT09IHRva2VuVHlwZSk7XG4gICAgICAgICAgICBpZiAodHlwZVRva2VucyAmJiB0eXBlVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRva2Vucy5mb3JFYWNoKCh0b2tlbiwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB0eXBlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuY2xvc2VkR3JvdXBUb2tlbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IHRva2VuVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuY2xvc2VkR3JvdXBUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IHRva2VuVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuY2xvc2VkR3JvdXBUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5jbG9zZWRHcm91cFRva2VuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIHRva2VuIGlzIGEgUGFyZW4gb3IgUXVvdGVcbiAgICAgKiBAcGFyYW0gdG9rZW4ge1Rva2VufVxuICAgICAqL1xuICAgIGlzR3JvdXBpbmcodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGUgfSA9IHRva2VuO1xuICAgICAgICAgICAgY29uc3QgeyBRVU9URSwgR1JPVVBJTkcgfSA9IFRva2VuXzEuVG9rZW5UeXBlO1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlID09PSBRVU9URSB8fCB0eXBlID09PSBHUk9VUElORyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdG9rZW4gaXMgYSBURVJNLCBQT1NTSUJMRSBvciBPUEVSQVRPUlxuICAgICAqIEBwYXJhbSB0b2tlbiB7VG9rZW59XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNUZXJtT3JPcGVyYXRvcih0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gdG9rZW47XG4gICAgICAgICAgICBjb25zdCB7IFRFUk0sIFBPU1NJQkxFLCBPUEVSQVRPUiB9ID0gVG9rZW5fMS5Ub2tlblR5cGU7XG4gICAgICAgICAgICByZXR1cm4gdHlwZSA9PT0gVEVSTSB8fCB0eXBlID09PSBQT1NTSUJMRSB8fCB0eXBlID09PSBPUEVSQVRPUjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGFuZCBidWlsZCBvdXQgYWxsIHRoZSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgcGFyc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLnNlYXJjaFN0cmluZyAmJiB0aGlzLnNlbGVjdGVkUnVsZXMgJiYgdGhpcy52YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlZFRva2VucztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcHJvdmlkZSB0aGUgc2VhcmNoIHN0cmluZywgc2VsZWN0ZWQgcnVsZXMgYW5kIHZhbGlkYXRpb24gcnVsZXMgdG8gcHJvY2VlZCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlc2V0IGFsbCB0aGUgYXJyYXlzIG9mIHRoaXMgY2xhc3NcbiAgICAgKi9cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy5fZmluYWxUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5faW5pdGlhbE1hdGNoZXMgPSBbXTtcbiAgICAgICAgdGhpcy5faW5pdGlhbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl90cmVlID0gW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRlZFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl93aG9sZVRva2VucyA9IFtdO1xuICAgIH1cbn1cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlZhbGlkYXRpb25SdWxlID0gZXhwb3J0cy5Fc2NhcGVhYmxlUnVsZSA9IGV4cG9ydHMuUnVsZSA9IHZvaWQgMDtcbmNvbnN0IFRva2VuXzEgPSByZXF1aXJlKFwiLi9Ub2tlblwiKTtcbi8qKlxuICogVG9wIGxldmVsIGNsYXNzIGZvciBhIHJ1bGUuIFJ1bGVzIGRlZmluZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuIHRvIGxvb2sgZm9yXG4gKiB3aXRoaW4gYSB7QGxpbmsgVG9rZW4jdmFsdWV9XG4gKiBAY2xhc3Mge1J1bGV9XG4gKi9cbmNsYXNzIFJ1bGUge1xuICAgIGNvbnN0cnVjdG9yKHBhdHRlcm4sIG9wZXJhdGlvbiwgdHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgIHRoaXMuX3BhdHRlcm4gPSBwYXR0ZXJuO1xuICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuXG4gICAgICogQHR5cGUge1JlZ0V4cH1cbiAgICAgKi9cbiAgICBnZXQgcGF0dGVybigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9wYXR0ZXJuKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFBhdHRlcm4gZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXR0ZXJuO1xuICAgIH1cbiAgICBzZXQgcGF0dGVybihwYXR0ZXJuKSB7XG4gICAgICAgIHRoaXMuX3BhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgb3BlcmF0aW9uIHRva2VucyB0aGF0IG1hdGNoIHRoaXMgcnVsZSBwZXJmb3JtXG4gICAgICogQHR5cGUge1Rva2VuT3BlcmF0aW9uc31cbiAgICAgKi9cbiAgICBnZXQgb3BlcmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0aW9uO1xuICAgIH1cbiAgICBzZXQgb3BlcmF0aW9uKG9wZXJhdGlvbikge1xuICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbiB0eXBlIGZvciB0b2tlbnMgbWF0Y2hpbmcgdGhpcyBydWxlXG4gICAgICogQHR5cGUge1Rva2VuVHlwZX1cbiAgICAgKi9cbiAgICBnZXQgdHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3R5cGU7XG4gICAgfVxuICAgIHNldCB0eXBlKHR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRlc3QgaWYgdGhlIHBhc3NlZCBpbiBzdHIgbWF0Y2hlcyB0aGUgcGF0dGVybiBvZiB0aGlzIHJ1bGVcbiAgICAgKiBAcGFyYW0gc3RyIHtzdHJpbmd9XG4gICAgICovXG4gICAgdGVzdChzdHIpIHtcbiAgICAgICAgaWYgKHRoaXMucGF0dGVybikge1xuICAgICAgICAgICAgcmV0dXJuIHN0ci5zZWFyY2godGhpcy5wYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFBhdHRlcm4gZGVmaW5lZCcpO1xuICAgIH1cbn1cbmV4cG9ydHMuUnVsZSA9IFJ1bGU7XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcGF0dGVybiBpcyBlc2NhcGVkXG4gKiBAY2xhc3Mge0VzY2FwYWJsZVJ1bGV9XG4gKiBAZXh0ZW5kcyB7UnVsZX1cbiAqL1xuY2xhc3MgRXNjYXBlYWJsZVJ1bGUgZXh0ZW5kcyBSdWxlIHtcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBvcGVyYXRpb24sIHR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICBzdXBlcihuYW1lLCBvcGVyYXRpb24sIHR5cGUpO1xuICAgIH1cbiAgICB0ZXN0KHN0cikge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc3VwZXIudGVzdChzdHIpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyLmNoYXJBdChyZXN1bHQgLSAxKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLkVzY2FwZWFibGVSdWxlID0gRXNjYXBlYWJsZVJ1bGU7XG4vKipcbiAqIFJ1bGUgZm9yIHZhbGlkYXRpbmcgdG9rZW5zXG4gKiBAY2xhc3Mge1ZhbGlkYXRpb25SdWxlfVxuICogQGV4dGVuZHMge1J1bGV9XG4gKi9cbmNsYXNzIFZhbGlkYXRpb25SdWxlIGV4dGVuZHMgUnVsZSB7XG4gICAgY29uc3RydWN0b3IocGF0dGVybiwgY2hhcmFjdGVyKSB7XG4gICAgICAgIHN1cGVyKHBhdHRlcm4sIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkVSUk9SKTtcbiAgICAgICAgdGhpcy5fY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY2hhcmFjdGVyIHRoYXQgd2lsbCBiZSByZXBvcnRlZCBhcyBhbiBlcnJvciBtZXNzYWdlIGluc2lkZSB0aGUgdG9rZW5cbiAgICAgKiB3aXRoIHRoZSBlcnJvclxuICAgICAqL1xuICAgIGdldCBjaGFyYWN0ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGFyYWN0ZXI7XG4gICAgfVxuICAgIHNldCBjaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG4gICAgICAgIHRoaXMuX2NoYXJhY3RlciA9IGNoYXJhY3RlcjtcbiAgICB9XG59XG5leHBvcnRzLlZhbGlkYXRpb25SdWxlID0gVmFsaWRhdGlvblJ1bGU7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuVG9rZW4gPSBleHBvcnRzLlRva2VuT3BlcmF0aW9ucyA9IGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgPSBleHBvcnRzLlRva2VuVHlwZSA9IHZvaWQgMDtcbi8qKlxuICogVGhlIHR5cGUgb2YgdmFsdWUgZm9yIHRoaXMgdG9rZW5cbiAqL1xudmFyIFRva2VuVHlwZTtcbihmdW5jdGlvbiAoVG9rZW5UeXBlKSB7XG4gICAgLyoqXG4gICAgICogVXN1YWxseSBhIHdvcmQgb3IgbGV0dGVyIHRoYXQgaXMgbm90IG9uZSBvZiB0aGUgb3RoZXIgdG9rZW4gdHlwZXNcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJURVJNXCJdID0gXCJ0ZXJtXCI7XG4gICAgLyoqXG4gICAgICogQW4gYWN0dWFsIG9wZXJhdG9yIChBTkQsIE9SLCBOT1QsICssIH4sIC0pXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiT1BFUkFUT1JcIl0gPSBcIm9wZXJhdG9yXCI7XG4gICAgLyoqXG4gICAgICogQSBwb3NzaWJsZSBvcGVyYXRvciAoYW5kLCBvciwgbm90KVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlBPU1NJQkxFXCJdID0gXCJwb3NzaWJsZVwiO1xuICAgIC8qKlxuICAgICAqIFdoaXRlc3BhY2Ugb2Ygc29tZSBraW5kLCB1c3VhbGx5IGEgc3BhY2VcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJXSElURV9TUEFDRVwiXSA9IFwid2hpdGVzcGFjZVwiO1xuICAgIC8qKlxuICAgICAqIFVzdWFsbHkgYSBwYXJlbiBvZiBzb21lIHNvcnRcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJHUk9VUElOR1wiXSA9IFwiZ3JvdXBpbmdcIjtcbiAgICAvKipcbiAgICAgKiBBIHF1b3RlIChcIilcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJRVU9URVwiXSA9IFwicXVvdGVcIjtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgdGhpcyBpcyBqdXN0IGFuZ2xlIGJyYWNrZXRzICg8ID4pLiBUaGVzZSBuZWVkIHRoZWlyIG93blxuICAgICAqIHNwZWNpYWwgdHlwZSB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gdHJlYXRpbmcgdGhlbSBhbmQgdGhlaXIgdGV4dFxuICAgICAqIGFzIGh0bWwgdGFnc1xuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIkFTQ0lJXCJdID0gXCJhc2NpaVwiO1xufSkoVG9rZW5UeXBlID0gZXhwb3J0cy5Ub2tlblR5cGUgfHwgKGV4cG9ydHMuVG9rZW5UeXBlID0ge30pKTtcbi8qKlxuICogVGhlIGFjdHVhbCBvcGVyYXRvcnMuIFRoaXMgaXMgdXNlZCB0byBkZWZpbmUgd2hhdCBhIHBvc3NpYmxlIG9yIHN5bWJvbCBhY3R1YWxseSBpc1xuICovXG52YXIgVG9rZW5PcGVyYXRvcnM7XG4oZnVuY3Rpb24gKFRva2VuT3BlcmF0b3JzKSB7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJBTkRcIl0gPSBcIkFORFwiO1xuICAgIFRva2VuT3BlcmF0b3JzW1wiT1JcIl0gPSBcIk9SXCI7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJOT1RcIl0gPSBcIk5PVFwiO1xufSkoVG9rZW5PcGVyYXRvcnMgPSBleHBvcnRzLlRva2VuT3BlcmF0b3JzIHx8IChleHBvcnRzLlRva2VuT3BlcmF0b3JzID0ge30pKTtcbi8qKlxuICogUG9zc2libGUsIEFjdHVhbCBhbmQgU3ltYm9sIE9wZXJhdG9ycyBnZXQgdGhlaXIgcmVzcGVjdGl2ZSBBTkQvT1IvTk9ULiBRdW90ZXMgYW5kIHBhcmVuc1xuICogZ2V0IHRoZWlyIHJlc3BlY3RpdmUgT1BFTi9DTE9TRS4gVGVybXMgYXJlIE5PTkUgYW5kIGVycm9ycyBhcmUgRVJST1IuXG4gKi9cbnZhciBUb2tlbk9wZXJhdGlvbnM7XG4oZnVuY3Rpb24gKFRva2VuT3BlcmF0aW9ucykge1xuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlL0FjdHVhbC9TeW1ib2wgQU5EIG9wZXJhdG9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiQU5EXCJdID0gXCJBTkRcIjtcbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZS9BY3R1YWwvU3ltYm9sIE9SIG9wZXJhdG9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiT1JcIl0gPSBcIk9SXCI7XG4gICAgLyoqXG4gICAgICogUG9zc2libGUvQWN0dWFsL1N5bWJvbCBOT1Qgb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJOT1RcIl0gPSBcIk5PVFwiO1xuICAgIC8qKlxuICAgICAqIE9wZW5pbmcgUGFyZW4gb3IgUXVvdGVcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJPUEVOXCJdID0gXCJvcGVuXCI7XG4gICAgLyoqXG4gICAgICogQ2xvc2luZyBQYXJlbiBvciBRdW90ZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIkNMT1NFXCJdID0gXCJjbG9zZVwiO1xuICAgIC8qKlxuICAgICAqIFRlcm0gb3IgV2hpdGVzcGFjZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk5PTkVcIl0gPSBcIm5vbmVcIjtcbiAgICAvKipcbiAgICAgKiBFcnJvclxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIkVSUk9SXCJdID0gXCJlcnJvclwiO1xufSkoVG9rZW5PcGVyYXRpb25zID0gZXhwb3J0cy5Ub2tlbk9wZXJhdGlvbnMgfHwgKGV4cG9ydHMuVG9rZW5PcGVyYXRpb25zID0ge30pKTtcbi8qKlxuICogQSB0b2tlbiBkZWZpbmVzIGEgcGllY2Ugb2YgdGV4dCBmb3VuZCBpbiB0aGUgc2VhcmNoIHN0cmluZy4gVGhpcyBjYW4gYmUgc2luZ2xlIHdvcmRzIGFuZCBjaGFyYWN0ZXJzXG4gKiBidXQgYWxzbyBtdWx0aXBsZSB3b3JkcyAoaS5lLiB0aGUgdGV4dCBiZXR3ZWVuIHF1b3RlcylcbiAqIEBjbGFzcyB7VG9rZW59XG4gKi9cbmNsYXNzIFRva2VuIHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgVG9rZW4gYW5kIGFzc2lnbiBhIHJhbmRvbSBJRCBzdHJpbmdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZSwgdHlwZSwgb3BlcmF0aW9uID0gVG9rZW5PcGVyYXRpb25zLk5PTkUsIHBvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9odG1sID0gJyc7XG4gICAgICAgIHRoaXMuX2lkID0gJyc7XG4gICAgICAgIHRoaXMuX2lzQ2hpbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNTaWJsaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzSW5zaWRlUXVvdGVzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3BocmFzZSA9ICcnO1xuICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHsgc3RhcnQ6IC0xLCBlbmQ6IC0xIH07XG4gICAgICAgIHRoaXMuX3R5cGUgPSBUb2tlblR5cGUuVEVSTTtcbiAgICAgICAgdGhpcy5fc3R5bGVDbGFzc2VzID0ge1xuICAgICAgICAgICAgZXJyb3I6ICdlcnJvcicsXG4gICAgICAgICAgICBvcGVyYXRvcjogJ29wZXJhdG9yJyxcbiAgICAgICAgICAgIHBvc3NpYmxlT3BlcmF0b3I6ICd3YXJuaW5nJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICAgICAgaWYgKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fb3BlcmF0aW9uID0gb3BlcmF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwb3NpdGlvbiAhPT0gbnVsbCAmJiBwb3NpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBzdGFydFBvcyA9IHRoaXMuY2FsY1N0YXJ0KHBvc2l0aW9uLCBsZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgZW5kUG9zID0gdGhpcy5jYWxjRW5kKHN0YXJ0UG9zLCBsZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gPSB7IHN0YXJ0OiBzdGFydFBvcywgZW5kOiBlbmRQb3MgfTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRoZSBzdGFydGluZyBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiB7bnVtYmVyfSBUaGUgY3VycmVudCBpbmRleCBmcm9tIHRoZSBpbml0aWFsTWF0Y2hlcyBnZXR0ZXIgaW4gdGhlIHBhcnNlclxuICAgICAqIEBwYXJhbSBsZW5ndGgge251bWJlcn0gVGhlIGxlbmd0aCBvZiB0aGUgdGV4dFxuICAgICAqL1xuICAgIGNhbGNTdGFydChwb3NpdGlvbiwgbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbiAtIChsZW5ndGggLSAxKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRoZSBlbmQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gcG9zaXRpb24ge251bWJlcn0gVXN1YWxseSB0aGUgc3RhcnRpbmcgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gbGVuZ3RoIHtudW1iZXJ9IHRoZSBsZW5ndGggb2YgdGhlIHRleHRcbiAgICAgKi9cbiAgICBjYWxjRW5kKHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uICsgKGxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY2hpbGQgdG9rZW5zLiBVc3VhbGx5IHRleHQgYmV0d2VlbiBxdW90ZXMgb3IgcGFyZW5zXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuICAgIHNldCBjaGlsZHJlbihjaGlsZHJlbikge1xuICAgICAgICB0aGlzLl9jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBlcnJvcnMgZm9yIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7RXJyb3JbXX1cbiAgICAgKi9cbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3JzO1xuICAgIH1cbiAgICBzZXQgZXJyb3JzKGVycm9ycykge1xuICAgICAgICB0aGlzLl9lcnJvcnMgPSBlcnJvcnM7XG4gICAgfVxuICAgIGdldCBzdHlsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdHlsZUNsYXNzZXM7XG4gICAgfVxuICAgIHNldCBzdHlsZXMoc3R5bGVDbGFzc2VzKSB7XG4gICAgICAgIHRoaXMuX3N0eWxlQ2xhc3NlcyA9IHN0eWxlQ2xhc3NlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIGh0bWwgZm9yIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBodG1sKCkge1xuICAgICAgICBsZXQgc3BhbiA9ICcnO1xuICAgICAgICBjb25zdCB7IGVycm9ycywgcnVsZSwgX2h0bWwsIHR5cGUsIHZhbHVlLCBvcGVyYXRpb24gfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHN0eWxlQ2xhc3MgPSBlcnJvcnMubGVuZ3RoXG4gICAgICAgICAgICA/IHRoaXMuc3R5bGVzLmVycm9yXG4gICAgICAgICAgICA6IHR5cGUgPT09IFRva2VuVHlwZS5QT1NTSUJMRVxuICAgICAgICAgICAgICAgID8gdGhpcy5zdHlsZXMucG9zc2libGVPcGVyYXRvclxuICAgICAgICAgICAgICAgIDogdHlwZSA9PT0gVG9rZW5UeXBlLk9QRVJBVE9SXG4gICAgICAgICAgICAgICAgICAgID8gdGhpcy5zdHlsZXMub3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgY29uc3QgdGl0bGVTdHIgPSB0eXBlID09PSBUb2tlblR5cGUuUE9TU0lCTEVcbiAgICAgICAgICAgID8gYFBvc3NpYmxlIG9wZXJhdG9yLiBPcGVyYXRvcnMgc2hvdWxkIGJlIGNhcGl0YWxpemVkIChpLmUgJHt2YWx1ZS50b1VwcGVyQ2FzZSgpfSkuYFxuICAgICAgICAgICAgOiAoZXJyb3JzID09PSBudWxsIHx8IGVycm9ycyA9PT0gdm9pZCAwID8gdm9pZCAwIDogZXJyb3JzLmxlbmd0aCkgPyBlcnJvcnMubWFwKChlcnIsIGlkeCkgPT4gZXJyLm1lc3NhZ2UpLmpvaW4oJyYjMTA7JylcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICBpZiAoIV9odG1sICYmIHJ1bGUgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLlRFUk06XG4gICAgICAgICAgICAgICAgICAgIHNwYW4gPSBgPHNwYW4gY2xhc3M9XCJ0ZXJtXCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuR1JPVVBJTkc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwaW5nQ2hpbGRIdG1sID0gdGhpcy5lcnJvcnMubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGA8c3BhbiBjbGFzcz1cIiR7c3R5bGVDbGFzc31cIiB0aXRsZT1cIiR7dGl0bGVTdHJ9XCI+JHt2YWx1ZX08L3NwYW4+YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBgJHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3BlcmF0aW9uID09PSBUb2tlbk9wZXJhdGlvbnMuT1BFTikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BhbiA9IGA8ZGl2IGNsYXNzPVwiZ3JvdXBpbmdcIj4ke2dyb3VwaW5nQ2hpbGRIdG1sfWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uID09PSBUb2tlbk9wZXJhdGlvbnMuQ0xPU0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gPSBgJHtncm91cGluZ0NoaWxkSHRtbH08L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgVG9rZW5UeXBlLlFVT1RFOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBxdW90ZUNoaWxkSHRtbCA9IHRoaXMuZXJyb3JzLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgPHNwYW4gY2xhc3M9XCIke3N0eWxlQ2xhc3N9XCIgdGl0bGU9XCIke3RpdGxlU3RyfVwiPiR7dmFsdWV9PC9zcGFuPmBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYCR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gVG9rZW5PcGVyYXRpb25zLk9QRU4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gPSBgPGRpdiBjbGFzcz1cImdyb3VwaW5nXCI+JHtxdW90ZUNoaWxkSHRtbH1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gVG9rZW5PcGVyYXRpb25zLkNMT1NFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFuID0gYCR7cXVvdGVDaGlsZEh0bWx9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFRva2VuVHlwZS5PUEVSQVRPUjpcbiAgICAgICAgICAgICAgICAgICAgc3BhbiA9IGA8c3BhbiBjbGFzcz1cIiR7c3R5bGVDbGFzc31cIiB0aXRsZT1cIiR7dGl0bGVTdHJ9XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBUb2tlblR5cGUuUE9TU0lCTEU6XG4gICAgICAgICAgICAgICAgICAgIHNwYW4gPSBgPHNwYW4gY2xhc3M9XCIke3N0eWxlQ2xhc3N9XCIgdGl0bGU9XCIke3RpdGxlU3RyfVwiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5faHRtbCA9IHJ1bGUucGF0dGVybiA/IHZhbHVlLnJlcGxhY2UocnVsZS5wYXR0ZXJuLCBzcGFuKSA6IHRoaXMudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIV9odG1sICYmIHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9odG1sID0gdGhpcy52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5faHRtbDtcbiAgICB9XG4gICAgc2V0IGh0bWwoaHRtbCkge1xuICAgICAgICB0aGlzLl9odG1sID0gaHRtbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIElEIGZvciB0aGlzIHRva2VuIChUaGlzIElEIGlzIG5vdCBwZXJzaXN0ZWQgYXMgY2hhbmdlcyBhcmUgbWFkZSlcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBpZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cbiAgICBnZXQgaXNDaGlsZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzQ2hpbGQ7XG4gICAgfVxuICAgIHNldCBpc0NoaWxkKGlzQ2hpbGQpIHtcbiAgICAgICAgdGhpcy5faXNDaGlsZCA9IGlzQ2hpbGQ7XG4gICAgfVxuICAgIGdldCBpc1NpYmxpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1NpYmxpbmc7XG4gICAgfVxuICAgIHNldCBpc1NpYmxpbmcoaXNTaWJsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzU2libGluZyA9IGlzU2libGluZztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVHJ1ZSBpZiB0aGlzIHRva2VuIGlzIGluc2lkZSBxdW90ZXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXQgaXNJbnNpZGVRdW90ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc0luc2lkZVF1b3RlcztcbiAgICB9XG4gICAgc2V0IGlzSW5zaWRlUXVvdGVzKGlzSW5zaWRlUXVvdGVzKSB7XG4gICAgICAgIHRoaXMuX2lzSW5zaWRlUXVvdGVzID0gaXNJbnNpZGVRdW90ZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBib29sZWFuIG9wZXJhdGlvbiB0aGlzIHRva2VuIGlzIGZvclxuICAgICAqIEB0eXBlIHtUb2tlbk9wZXJhdGlvbnN9XG4gICAgICovXG4gICAgZ2V0IG9wZXJhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdGlvbjtcbiAgICB9XG4gICAgc2V0IG9wZXJhdGlvbihvcGVyYXRpb24pIHtcbiAgICAgICAgdGhpcy5fb3BlcmF0aW9uID0gb3BlcmF0aW9uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJZiB0aGlzIHRva2VuIGlzIGEgVG9rZW5UeXBlLk9QRVJBVE9SIG9yIFRva2VuVHlwZS5QT1NTSUJMRSB0aGUgcGhyYXNlIGxlYWRpbmcgdXAgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHBocmFzZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BocmFzZTtcbiAgICB9XG4gICAgc2V0IHBocmFzZShwaHJhc2UpIHtcbiAgICAgICAgdGhpcy5fcGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgcG9zaXRpb24gdGhpcyB0b2tlbiBpcyBhdCBpbiB0aGUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEB0eXBlIHtQb3NpdGlvbn1cbiAgICAgKi9cbiAgICBnZXQgcG9zaXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbiAgICB9XG4gICAgc2V0IHBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gcG9zaXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBydWxlIHRoYXQgY3JlYXRlZCB0aGlzIHRva2VuXG4gICAgICogQHR5cGUge1J1bGV9XG4gICAgICovXG4gICAgZ2V0IHJ1bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ydWxlO1xuICAgIH1cbiAgICBzZXQgcnVsZShydWxlKSB7XG4gICAgICAgIHRoaXMuX3J1bGUgPSBydWxlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgdG9rZW4gdHlwZVxuICAgICAqIEB0eXBlIHtUb2tlblR5cGV9XG4gICAgICovXG4gICAgZ2V0IHR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90eXBlO1xuICAgIH1cbiAgICBzZXQgdHlwZSh0eXBlKSB7XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc3RyaW5nIHZhbHVlIG9mIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCB2YWx1ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xuICAgIH1cbiAgICBzZXQgdmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICB9XG59XG5leHBvcnRzLlRva2VuID0gVG9rZW47XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19leHBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2V4cG9ydFN0YXIpIHx8IGZ1bmN0aW9uKG0sIGV4cG9ydHMpIHtcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgX19jcmVhdGVCaW5kaW5nKGV4cG9ydHMsIG0sIHApO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9Cb29sZWFuU2VhcmNoXCIpLCBleHBvcnRzKTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9QYXJzZXJcIiksIGV4cG9ydHMpO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL1J1bGVcIiksIGV4cG9ydHMpO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL1Rva2VuXCIpLCBleHBvcnRzKTtcbiIsImNvbnN0IEJTUCA9IHJlcXVpcmUoJ2Jvb2xlYW4tc2VhcmNoLXBhcnNlcicpO1xuXG5cbmNvbnN0IGRlZmF1bHRTZWFyY2hGaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWZhdWx0LWZpZWxkJyk7XG5jb25zdCBkZWZhdWx0T3V0cHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RlZmF1bHQtb3V0cHV0LWNvbnRhaW5lcicpO1xuY29uc3QgZGVmYXVsdEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWZhdWx0LXN1Ym1pdCcpO1xuXG5jb25zdCBjdXN0b21TZWFyY2hGaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXN0b20tZmllbGQnKTtcbmNvbnN0IGN1c3RvbU91dHB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXN0b20tb3V0cHV0LWNvbnRhaW5lcicpO1xuY29uc3QgY3VzdG9tQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2N1c3RvbS1zdWJtaXQnKTtcblxuZGVmYXVsdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGRlZmF1bHRPblN1Ym1pdCk7XG5jdXN0b21CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjdXN0b21PblN1Ym1pdCk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRPblN1Ym1pdCgpIHtcblx0Y29uc3Qgc2VhcmNoU3RyID0gZGVmYXVsdFNlYXJjaEZpZWxkLnZhbHVlO1xuXHQvLyBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cblx0Y29uc3QgYnMgPSBuZXcgQlNQLkJvb2xlYW5TZWFyY2goc2VhcmNoU3RyKTtcblx0ZGVmYXVsdE91dHB1dC5pbm5lckhUTUwgPSBicy5odG1sO1xuXHRjb25zb2xlLmxvZygnRGVmYXVsdCBCb29sZWFuU2VhcmNoIGluc3RhbmNlPScsIGJzKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tT25TdWJtaXQoKSB7XG5cdGNvbnN0IHNlYXJjaFN0ciA9IGN1c3RvbVNlYXJjaEZpZWxkLnZhbHVlO1xuXHRjb25zdCBydWxlcyA9IHsuLi5CU1AuREVGQVVMVF9SVUxFU307XG5cdGNvbnN0IHZhbGlkYXRpb25SdWxlcyA9IHtcblx0XHQuLi5CU1AuREVGQVVMVF9WQUxJREFUSU9OX1JVTEVTLFxuXHRcdG51bWJlcjogbmV3IEJTUC5WYWxpZGF0aW9uUnVsZSgvWzAtOV0rL2csICcjJylcblx0fTtcblx0Y29uc3QgY3VzdG9tQ29uZmlnID0ge1xuXHRcdHJ1bGVzLFxuXHRcdHZhbGlkYXRpb25SdWxlcyxcblx0XHRvcGVyYXRvclN0eWxlQ2xhc3M6ICdzdWNjZXNzJ1xuXHR9O1xuXHQvLyBjdXN0b20gY29uZmlndXJhdGlvblxuXHRjb25zdCBicyA9IG5ldyBCU1AuQm9vbGVhblNlYXJjaChzZWFyY2hTdHIsIGN1c3RvbUNvbmZpZyk7XG5cdGN1c3RvbU91dHB1dC5pbm5lckhUTUwgPSBicy5odG1sO1xuXHRjb25zb2xlLmxvZygnQ3VzdG9tIEJvb2xlYW5TZWFyY2ggaW5zdGFuY2U9JywgYnMpO1xufVxuIl19
