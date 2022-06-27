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
        if (!this._html && this.tokens && this.tokens.length) {
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
        let span = null;
        let styleClass = null;
        const { errors, rule, _html, type, value } = this;
        if (errors === null || errors === void 0 ? void 0 : errors.length) {
            styleClass = this.styles.error;
            const errorStr = errors.map((err, idx) => err.message).join('&#10;');
            span = `<span class="${styleClass}" title="${errorStr}">${value}</span>`;
            this._html = value.replace(value, span);
        }
        else if (!_html && rule && value) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9kaXN0L0Jvb2xlYW5TZWFyY2guanMiLCIuLi9kaXN0L1BhcnNlci5qcyIsIi4uL2Rpc3QvUnVsZS5qcyIsIi4uL2Rpc3QvVG9rZW4uanMiLCIuLi9kaXN0L2luZGV4LmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMW9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLkJvb2xlYW5TZWFyY2ggPSBleHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUyA9IGV4cG9ydHMuREVGQVVMVF9SVUxFUyA9IHZvaWQgMDtcbmNvbnN0IFBhcnNlcl8xID0gcmVxdWlyZShcIi4vUGFyc2VyXCIpO1xuY29uc3QgUnVsZV8xID0gcmVxdWlyZShcIi4vUnVsZVwiKTtcbmNvbnN0IFRva2VuXzEgPSByZXF1aXJlKFwiLi9Ub2tlblwiKTtcbmV4cG9ydHMuREVGQVVMVF9SVUxFUyA9IHtcbiAgICBhbmQ6IG5ldyBSdWxlXzEuUnVsZSgvYW5kL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkFORCwgVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpLFxuICAgIG9yOiBuZXcgUnVsZV8xLlJ1bGUoL29yL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9SLCBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSksXG4gICAgbm90OiBuZXcgUnVsZV8xLlJ1bGUoL25vdC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT1QsIFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSxcbiAgICBBTkQ6IG5ldyBSdWxlXzEuUnVsZSgvQU5EL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkFORCksXG4gICAgcGx1czogbmV3IFJ1bGVfMS5SdWxlKC9cXCsvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQU5EKSxcbiAgICBPUjogbmV3IFJ1bGVfMS5SdWxlKC9PUi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUiksXG4gICAgdGlsZGU6IG5ldyBSdWxlXzEuUnVsZSgvfi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUiksXG4gICAgTk9UOiBuZXcgUnVsZV8xLlJ1bGUoL05PVC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT1QpLFxuICAgIG1pbnVzOiBuZXcgUnVsZV8xLlJ1bGUoLy0vZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9UKSxcbiAgICBvcGVuUGFyZW46IG5ldyBSdWxlXzEuUnVsZSgvXFwoL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9QRU4sIFRva2VuXzEuVG9rZW5UeXBlLkdST1VQSU5HKSxcbiAgICBjbG9zZVBhcmVuOiBuZXcgUnVsZV8xLlJ1bGUoL1xcKS9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5DTE9TRSwgVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcpLFxuICAgIHF1b3RlOiBuZXcgUnVsZV8xLkVzY2FwZWFibGVSdWxlKC9cIi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSksXG4gICAgc3BhY2U6IG5ldyBSdWxlXzEuUnVsZSgvXFxzL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLldISVRFX1NQQUNFKSxcbiAgICBvcGVuQW5nbGU6IG5ldyBSdWxlXzEuUnVsZSgvXFw8L2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLkFTQ0lJKSxcbiAgICBjbG9zZUFuZ2xlOiBuZXcgUnVsZV8xLlJ1bGUoL1xcPi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5BU0NJSSlcbn07XG5leHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUyA9IHtcbiAgICBvcGVuQW5nbGU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcPC9nLCAnPCcpLFxuICAgIGNsb3NlQW5nbGU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcPi9nLCAnPicpLFxuICAgIG9wZW5DdXJseTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFx7L2csICd7JyksXG4gICAgY2xvc2VDdXJseTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFx9L2csICd9JyksXG4gICAgb3BlblNxdWFyZTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFxbL2csICdbJyksXG4gICAgY2xvc2VTcXVhcmU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcXS9nLCAnXScpLFxuICAgIGJhY2tTbGFzaDogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFxcXC9nLCAnXFxcXCcpLFxuICAgIGZvcndhcmRTbGFzaDogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFwvL2csICcvJyksXG4gICAgY29tbWE6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoLywvZywgJywnKSxcbiAgICBwZXJpb2Q6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcLi9nLCAnLicpXG59O1xuLyoqXG4gKiBUaGUgY2xhc3NlcyBhbmQgbWV0aG9kcyBpbiB0aGlzIHBhY2thZ2Ugd2VyZSBiYXNlZCBvZmYgb2YgdGhlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vZnJlZGVyaWNrZi9icXBqc30gbGlicmFyeS5cbiAqIFRoZSBCb29sZWFuU2VhcmNoIGNsYXNzIGlzIHRoZSBlbnRyeSBwb2ludCB0byB0aGUgcGFyc2VyLiBUaGUgZm9sbG93aW5nXG4gKiBwcm9wZXJ0aWVzIHdpbGwgcGFyc2UgdGhlIHNlYXJjaCBzdHJpbmcgYXV0b21hdGljYWxseTpcbiAqIHtAbGluayBCb29sZWFuU2VhcmNoI3Rva2Vuc31cbiAqIHtAbGluayBCb29sZWFuU2VhcmNoI2h0bWx9XG4gKiBAY2xhc3Mge0Jvb2xlYW5TZWFyY2h9XG4gKi9cbmNsYXNzIEJvb2xlYW5TZWFyY2gge1xuICAgIGNvbnN0cnVjdG9yKHNyY2hTdHJpbmcsIGNvbmZpZykge1xuICAgICAgICB0aGlzLl9lcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5faHRtbCA9ICcnO1xuICAgICAgICB0aGlzLl9pc01hbGZvcm1lZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9tYXhMZW5ndGggPSA1MTE7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9zZWxlY3RlZFJ1bGVzID0gW107XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzID0gW107XG4gICAgICAgIHRoaXMuX3NyY2hTdHJpbmcgPSAnJztcbiAgICAgICAgdGhpcy5fdG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3N0eWxlcyA9IHtcbiAgICAgICAgICAgIGVycm9yOiAnZXJyb3InLFxuICAgICAgICAgICAgb3BlcmF0b3I6ICdvcGVyYXRvcicsXG4gICAgICAgICAgICBwb3NzaWJsZU9wZXJhdG9yOiAnd2FybmluZydcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZWFyY2hTdHJpbmcgPSBzcmNoU3RyaW5nID8gc3JjaFN0cmluZyA6ICcnO1xuICAgICAgICBpZiAoY29uZmlnKSB7XG4gICAgICAgICAgICB0aGlzLnJ1bGVzID0gY29uZmlnLnJ1bGVzIHx8IHRoaXMucnVsZXM7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRpb25SdWxlcyA9IGNvbmZpZy52YWxpZGF0aW9uUnVsZXMgfHwgdGhpcy52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMucG9zc2libGVPcGVyYXRvciA9IGNvbmZpZy5wb3NzaWJsZU9wZXJhdG9yU3R5bGVDbGFzcyB8fCAnd2FybmluZyc7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMuZXJyb3IgPSBjb25maWcuZXJyb3JTdHlsZUNsYXNzIHx8ICdlcnJvcic7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMub3BlcmF0b3IgPSBjb25maWcub3BlcmF0b3JTdHlsZUNsYXNzIHx8ICdvcGVyYXRvcic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkIGEgcnVsZVxuICAgICAqIEBwYXJhbSBydWxlTmFtZSB7c3RyaW5nfVxuICAgICAqIEBwYXJhbSBydWxlIHtSdWxlfVxuICAgICAqL1xuICAgIGFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpIHtcbiAgICAgICAgY29uc3QgcnVsZXMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHRoaXMucnVsZXMpLCB7IFtydWxlTmFtZV06IHJ1bGUgfSk7XG4gICAgICAgIHRoaXMucnVsZXMgPSBydWxlcztcbiAgICAgICAgLy8gY29uc29sZS53YXJuKCdJZiB5b3Ugd2FudCB0aGlzIHJ1bGUgdG8gYmUgdXNlZCwgYmUgc3VyZSB0byBhZGQgdGhlIHJ1bGUgbmFtZSB0byB0aGUgcnVsZU5hbWVzIGFycmF5IGluIHRoZSBhcHByb3ByaWF0ZSBwb3NpdGlvbicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXggdGhlIHBvc3NpYmxlIG9wZXJhdG9ycyBhbmQgdXBkYXRlIHRoZSBzZWFyY2ggc3RyaW5nXG4gICAgICogQHBhcmFtIHJlc2V0U2VhcmNoIHtib29sZWFufSAtIHNldCB0cnVlIHRvIHJlc2V0IHNlYXJjaCBzdHJpbmcsIHRva2VucyBhbmQgaHRtbFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZml4T3BlcmF0b3JzKHJlc2V0U2VhcmNoU3RyaW5nID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHJldHVyblZhbCA9IHRoaXMuc2VhcmNoU3RyaW5nO1xuICAgICAgICBpZiAodGhpcy50b2tlbnMgJiYgdGhpcy50b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm5WYWwgPSAnJztcbiAgICAgICAgICAgIHRoaXMudG9rZW5zLmZvckVhY2goKHRva2VuKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLnZhbHVlID0gdG9rZW4udmFsdWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4udHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5odG1sID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVyblZhbCArPSB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHJlc2V0U2VhcmNoU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldChyZXR1cm5WYWwpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zID0gdGhpcy5wYXJzZXIucGFyc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuVmFsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBlcnJvcnNcbiAgICAgKiBAdHlwZSB7RXJyb3JbXX1cbiAgICAgKi9cbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX2Vycm9ycykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl90b2tlbnMubGVuZ3RoKSB7IC8vIERvbnQgd2FudCB0byBpbml0aWF0ZSBwYXJzaW5nIG9mIHRva2Vuc1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yVG9rZW5zID0gdGhpcy5fdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi5lcnJvcnMgJiYgdG9rZW4uZXJyb3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgbGV0IGVycm9ycyA9IHRoaXMuX2Vycm9ycyB8fCBbXTtcbiAgICAgICAgICAgICAgICBlcnJvclRva2Vucy5mb3JFYWNoKCh0b2tlbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4uZXJyb3JzICYmIHRva2VuLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQodG9rZW4uZXJyb3JzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2Vycm9ycyA9IGVycm9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3JzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGh0bWwgZm9yIHRoZSBlbnRpcmUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IGh0bWwoKSB7XG4gICAgICAgIGlmICghdGhpcy5faHRtbCAmJiB0aGlzLnRva2VucyAmJiB0aGlzLnRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyB0b2tlbnMsIG1heExlbmd0aCwgc2VhcmNoU3RyaW5nIH0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFN0cmluZ0xlbiA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNUb29Mb25nID0gc2VhcmNoU3RyaW5nTGVuID4gbWF4TGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnN0IGh0bWxBcnIgPSB0b2tlbnMubWFwKCh0b2tlbiwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uc3R5bGVzID0gdGhpcy5zdHlsZXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaHRtbCwgcG9zaXRpb24sIHZhbHVlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJldHVybkh0bWwgPSBodG1sO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUb29Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24uc3RhcnQgPD0gbWF4TGVuZ3RoICYmIHBvc2l0aW9uLmVuZCA+PSBtYXhMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5IdG1sID0gYDxzcGFuIGNsYXNzPVwiJHt0aGlzLnN0eWxlcy5lcnJvcn1cIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuSHRtbCA9IGA8c3BhbiBjbGFzcz1cIiR7dGhpcy5zdHlsZXMuZXJyb3J9XCI+JHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlkeCArIDEgPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5IdG1sID0gYCR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHVybkh0bWw7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faHRtbCA9IGh0bWxBcnIuam9pbignJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faHRtbCA9IHRoaXMuc2VhcmNoU3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9odG1sO1xuICAgIH1cbiAgICBnZXQgc3R5bGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3R5bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUcnVlIGlmIHRoZXJlIGFyZSBlcnJvcnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXQgaXNNYWxmb3JtZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmVycm9ycyAmJiB0aGlzLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzTWFsZm9ybWVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5faXNNYWxmb3JtZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBtYXggbGVuZ3RoIHRoZSBzZWFyY2ggc3RyaW5nIGlzIGFsbG93ZWQgdG8gYmVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldCBtYXhMZW5ndGgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXhMZW5ndGg7XG4gICAgfVxuICAgIHNldCBtYXhMZW5ndGgobWF4TGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX21heExlbmd0aCA9IG1heExlbmd0aDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGFuIGFycmF5IG9mIHRoZSBvcGVyYXRvciB0b2tlbnNcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgb3BlcmF0b3JzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX29wZXJhdG9ycyB8fCAhdGhpcy5fb3BlcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Rva2VucyAmJiB0aGlzLl90b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gdGhpcy50b2tlbnMuZmlsdGVyKCh0b2tlbikgPT4gdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRvcnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJzZXIgd2hpY2ggd2lsbCBwb3B1bGF0ZSBhbGwgdGhlIHZhcmlvdXMgVG9rZW4gYXJyYXlzXG4gICAgICogQHR5cGUge1BhcnNlcn1cbiAgICAgKi9cbiAgICBnZXQgcGFyc2VyKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3BhcnNlcikge1xuICAgICAgICAgICAgdGhpcy5fcGFyc2VyID0gbmV3IFBhcnNlcl8xLlBhcnNlcih0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzLCB0aGlzLnNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFyc2VyO1xuICAgIH1cbiAgICBzZXQgcGFyc2VyKHBhcnNlcikge1xuICAgICAgICB0aGlzLl9wYXJzZXIgPSBwYXJzZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBhbiBhcnJheSBvZiB0aGUgcG9zc2libGUgb3BlcmF0b3JzXG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IHBvc3NpYmxlT3BlcmF0b3JzKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICgoX2IgPSB0aGlzLl90b2tlbnMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycyA9IHRoaXMudG9rZW5zLmZpbHRlcigodG9rZW4pID0+IHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcG9zc2libGVPcGVyYXRvcnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHRoZSBydWxlIG5hbWVzIHdlIHdhbnQgdG8gdXNlIHdoZW4gbWF0Y2hpbmcgdG9rZW5zXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqL1xuICAgIGdldCBydWxlTmFtZXMoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnJ1bGVzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT2JqZXQgb2YgcnVsZXMgd2l0aCBhIG5hbWUuIFRoZSBrZXkgc2hvdWxkIG1hdGNoIGEgdmFsdWUgaW4gdGhlIHJ1bGVOYW1lcyBhcnJheVxuICAgICAqIEB0eXBlIHtSdWxlc31cbiAgICAgKi9cbiAgICBnZXQgcnVsZXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fcnVsZXMpIHtcbiAgICAgICAgICAgIHRoaXMuX3J1bGVzID0gZXhwb3J0cy5ERUZBVUxUX1JVTEVTO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9ydWxlcztcbiAgICB9XG4gICAgc2V0IHJ1bGVzKHJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX3J1bGVzID0gcnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBzZWFyY2ggc3RyaW5nIHRvIHBhcnNlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgc2VhcmNoU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3JjaFN0cmluZztcbiAgICB9XG4gICAgc2V0IHNlYXJjaFN0cmluZyhzZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc3JjaFN0cmluZyA9IHNlYXJjaFN0cmluZy5yZXBsYWNlKC9cXG4vZywgJycpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VsZWN0ZWQgcnVsZXMgYmFzZWQgb2ZmIG9mIHRoZSB2YWx1ZXMgcHJvdmlkZWQgaW4gdGhlIHJ1bGVOYW1lc1xuICAgICAqIEB0eXBlIHtSdWxlW119XG4gICAgICovXG4gICAgZ2V0IHNlbGVjdGVkUnVsZXMoKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5fc2VsZWN0ZWRSdWxlcykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdGVkUnVsZXMgPSB0aGlzLnJ1bGVOYW1lcy5maWx0ZXIoKG5hbWUpID0+IG5hbWUgaW4gdGhpcy5ydWxlcykubWFwKChuYW1lKSA9PiB0aGlzLnJ1bGVzW25hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc2VsZWN0ZWRSdWxlcztcbiAgICB9XG4gICAgc2V0IHNlbGVjdGVkUnVsZXMoc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICB0aGlzLl9zZWxlY3RlZFJ1bGVzID0gc2VsZWN0ZWRSdWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlbGVjdGVkIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb2ZmIG9mIHRoZSB2YWx1ZXMgcHJvdmlkZWQgaW4gdGhlIHZhbGlkYXRpb25SdWxlTmFtZXNcbiAgICAgKiBAdHlwZSB7VmFsaWRhdGlvblJ1bGVbXX1cbiAgICAgKi9cbiAgICBnZXQgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMoKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyA9IHRoaXMudmFsaWRhdGlvblJ1bGVOYW1lc1xuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG5hbWUpID0+IG5hbWUgaW4gdGhpcy52YWxpZGF0aW9uUnVsZXMpXG4gICAgICAgICAgICAgICAgLm1hcCgobmFtZSkgPT4gdGhpcy52YWxpZGF0aW9uUnVsZXNbbmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgc2V0IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzID0gc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBhcnJheSBvZiB0b2tlbnMgZm91bmQgaW4gdGhlIHNlYXJjaCBzdHJpbmdcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgdG9rZW5zKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICgoISgoX2EgPSB0aGlzLl90b2tlbnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSAmJiB0aGlzLnNlYXJjaFN0cmluZykge1xuICAgICAgICAgICAgdGhpcy5fdG9rZW5zID0gdGhpcy5wYXJzZXIucGFyc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghdGhpcy5zZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignWW91IG11c3QgcHJvdmlkZSBhIHNlYXJjaCBzdHJpbmcgdG8gcGFyc2UgZm9yIHRva2VucycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl90b2tlbnM7XG4gICAgfVxuICAgIHNldCB0b2tlbnModG9rZW5zKSB7XG4gICAgICAgIHRoaXMuX3Rva2VucyA9IHRva2VucztcbiAgICB9XG4gICAgZ2V0IHRyZWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlci50cmVlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiB0aGUgcnVsZSBuYW1lcyB3ZSB3YW50IHRvIHVzZSB3aGVuIG1hdGNoaW5nIHRva2Vuc1xuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBnZXQgdmFsaWRhdGlvblJ1bGVOYW1lcygpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMudmFsaWRhdGlvblJ1bGVzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT2JqZXQgb2YgcnVsZXMgd2l0aCBhIG5hbWUuIFRoZSBrZXkgc2hvdWxkIG1hdGNoIGEgdmFsdWUgaW4gdGhlIHJ1bGVOYW1lcyBhcnJheVxuICAgICAqIEB0eXBlIHtWYWxpZGF0aW9uUnVsZXN9XG4gICAgICovXG4gICAgZ2V0IHZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl92YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZhbGlkYXRpb25SdWxlcyA9IGV4cG9ydHMuREVGQVVMVF9WQUxJREFUSU9OX1JVTEVTO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl92YWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIHNldCB2YWxpZGF0aW9uUnVsZXModmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRpb25SdWxlcyA9IHZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgcmVzZXQoc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoU3RyaW5nID0gc2VhcmNoU3RyaW5nIHx8ICcnO1xuICAgICAgICB0aGlzLnRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fZXJyb3JzID0gW107XG4gICAgICAgIHRoaXMucGFyc2VyID0gbmV3IFBhcnNlcl8xLlBhcnNlcih0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzLCB0aGlzLnNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKTtcbiAgICB9XG59XG5leHBvcnRzLkJvb2xlYW5TZWFyY2ggPSBCb29sZWFuU2VhcmNoO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlBhcnNlciA9IHZvaWQgMDtcbmNvbnN0IFRva2VuXzEgPSByZXF1aXJlKFwiLi9Ub2tlblwiKTtcbi8qKlxuICogVGhlIHBhcnNlciB3aWxsIHBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGFuZCBjcmVhdGUgbWF0Y2hlcyBmcm9tIHRoZSBydWxlcyBhbmQgdGhlbiB0b2tlbnMuXG4gKiBUaGlzIGNsYXNzIGFsc28gcHV0cyB3b3JkcyB0aGF0IHdlcmUgc3BsaXQgYnkgcG9zc2libGUvYWN0dWFsIG9wZXJhdG9ycyBiYWNrIHRvZ2hldGhlciBhZ2Fpbi5cbiAqIEVuc3VyZXMgdGV4dCBiZXR3ZWVuIHF1b3RlcyBpcyBtYWRlIGludG8gYSBzaW5nbGUgdGVybSB0b2tlbi4gQWxsIHRva2VucyBhbmQgbWF0Y2hlcyBjcmVhdGVkXG4gKiBhbG9uZyB0aGUgd2F5IGFyZSBzdG9yZWQgYXMgcHJvcGVydGllcywgbWFpbmx5IGZvciB0cm91Ymxlc2hvb3RpbmcgcHVycG9zZXMuXG4gKiBAY2xhc3Mge1BhcnNlcn1cbiAqL1xuY2xhc3MgUGFyc2VyIHtcbiAgICBjb25zdHJ1Y3RvcihzZWFyY2hTdHJpbmcsIHNlbGVjdGVkUnVsZXMsIHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX2ZpbmFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxNYXRjaGVzID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fc2VhcmNoU3RyaW5nID0gJyc7XG4gICAgICAgIHRoaXMuX3RyZWUgPSBbXTtcbiAgICAgICAgdGhpcy5fdmFsaWRhdGVkVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3dob2xlVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZztcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IHNlbGVjdGVkUnVsZXMgfHwgW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRpb25SdWxlcyA9IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzIHx8IFtdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc3RyaW5nIHdlJ3JlIGdvaW5nIHRvIHBhcnNlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgc2VhcmNoU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VhcmNoU3RyaW5nO1xuICAgIH1cbiAgICBzZXQgc2VhcmNoU3RyaW5nKHNlYXJjaFN0cmluZykge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB3aXRoIGVycm9ycyBhbmQgYWxsIG1hbmlwdWxhdGlvbiBkb25lLiA0dGggcGFzc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0ZWRUb2tlbnMoKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIGlmICghdGhpcy5fdmFsaWRhdGVkVG9rZW5zIHx8ICF0aGlzLl92YWxpZGF0ZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoKF9hID0gdGhpcy52YWxpZGF0aW9uUnVsZXMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoKF9iID0gdGhpcy5maW5hbFRva2VucykgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl92YWxpZGF0ZWRUb2tlbnMgPSB0aGlzLnZhbGlkYXRlVG9rZW5zKHRoaXMuZmluYWxUb2tlbnMsIHRoaXMudmFsaWRhdGlvblJ1bGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgdmFsaWRhdGlvbiBydWxlcyBpbiBvcmRlciB0byB2YWxpZGF0ZSB0aGUgdG9rZW5zJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRlZFRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVG9rZW5zIHRoYXQgaGF2ZSBoYWQgc3BsaXQgd29yZHMgcHV0IGJhY2sgdG9ndGhlciBhbmQgd29yZHMgYmV0d2VlbiBxdW90ZXNcbiAgICAgKiBjb21iaW5lZC4gM3JkIHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgZmluYWxUb2tlbnMoKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX2ZpbmFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMud2hvbGVUb2tlbnMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IHRoaXMuY3JlYXRlVGVybXNGcm9tUXVvdGVzKHRoaXMud2hvbGVUb2tlbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9maW5hbFRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB3aXRoIHNwbGl0IHdvcmRzIGNvbWJpbmVkLiAybmQgcGFzc1xuICAgICAqL1xuICAgIGdldCB3aG9sZVRva2VucygpIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5fd2hvbGVUb2tlbnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAoKF9iID0gdGhpcy5pbml0aWFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2hvbGVUb2tlbnMgPSB0aGlzLmNyZWF0ZVRlcm1zRnJvbVNwbGl0cyh0aGlzLmluaXRpYWxUb2tlbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl93aG9sZVRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB0YWtlbiBmcm9tIHRoZSBtYXRjaGVzLiAxc3QgcGFzc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCBpbml0aWFsVG9rZW5zKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9pbml0aWFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMuaW5pdGlhbE1hdGNoZXMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gdGhpcy5tYXRjaGVzVG9Ub2tlbnModGhpcy5pbml0aWFsTWF0Y2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBpbml0aWFsIG1hdGNoZXMgZ2F0aGVyZWQgZnJvbSB0aGUgc2VhcmNoU3RyaW5nXG4gICAgICogQHR5cGUge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0IGluaXRpYWxNYXRjaGVzKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9pbml0aWFsTWF0Y2hlcykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlYXJjaFN0cmluZyAmJiAoKF9iID0gdGhpcy5zZWxlY3RlZFJ1bGVzKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluaXRNYXRjaGVzID0gdGhpcy5nZXRJbml0aWFsTWF0Y2hlcyh0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IHRoaXMuZ2V0TWF0Y2hQaHJhc2VzKGluaXRNYXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcHJvdmlkZSBhIHNlYXJjaCBzdHJpbmcgYW5kIHNlbGVjdGVkIHJ1bGVzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxNYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VsZWN0ZWQgcnVsZXMgd2Ugd2lsbCB1c2Ugd2hlbiBjcmVhdGluZyBtYXRjaGVzIGFuZCBzZXR0aW5nIHRva2VuIHR5cGVzXG4gICAgICogQHR5cGUge1J1bGVbXX1cbiAgICAgKi9cbiAgICBnZXQgc2VsZWN0ZWRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBydWxlcyB3ZSB1c2UgZm9yIHZhbGlkYXRpbmcgdG9rZW5zXG4gICAgICogQHR5cGUge1ZhbGlkYXRpb25SdWxlW119XG4gICAgICovXG4gICAgZ2V0IHZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyBzdHJ1Y3R1cmVkIGFzIGEgdHJlZSBpbnN0ZWFkIG9mIGEgZmxhdCBhcnJheVxuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCB0cmVlKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX3RyZWUpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy52YWxpZGF0ZWRUb2tlbnMgJiYgdGhpcy52YWxpZGF0ZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJlZSA9IHRoaXMuY3JlYXRlVHJlZSh0aGlzLnZhbGlkYXRlZFRva2Vucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyZWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGFuZCBjcmVhdGUgbWF0Y2hlcyBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgcnVsZXNcbiAgICAgKiBAcGFyYW0gc2VhcmNoU3RyaW5nIHtzdHJpbmd9XG4gICAgICogQHBhcmFtIHNlbGVjdGVkUnVsZXMge1J1bGVbXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXRJbml0aWFsTWF0Y2hlcyhzZWFyY2hTdHJpbmcsIHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgLy8gV2UgY2FuJ3QgbWFrZSB0b2tlbnMgeWV0IGJlY2F1c2Ugbm90IGFsbCBtYXRjaGVzIHdpbGwgYmUgZXhhY3RseSBhIHRva2VuXG4gICAgICAgIC8vIEZvciBleGFtcGxlLCB0ZXJtQU5EIHdpbGwgbWF0Y2ggdGhlIEFORCB0ZXN0XG4gICAgICAgIGxldCBtYXRjaGVzID0gW107XG4gICAgICAgIGlmIChzZWFyY2hTdHJpbmcgJiYgc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoU3RyID0gc2VhcmNoU3RyaW5nO1xuICAgICAgICAgICAgbGV0IHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgY3VycmVudElkeCA9IDA7IGN1cnJlbnRJZHggPCBzZWFyY2hTdHIubGVuZ3RoOyBjdXJyZW50SWR4KyspIHtcbiAgICAgICAgICAgICAgICBzdWJTdHIgKz0gc2VhcmNoU3RyLmNoYXJBdChjdXJyZW50SWR4KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJ1bGUgb2Ygc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2hTdGFydCA9IHJ1bGUudGVzdChzdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViU3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBydWxlLnR5cGUgPyBydWxlLnR5cGUgOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogcnVsZS5vcGVyYXRpb24gfHwgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydWxlOiBydWxlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ViU3RyICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdlJ3ZlIGl0ZXJhdGVkIHRvIHRoZSBlbmQgb2YgdGhlIHNlYXJjaCBzdHJpbmcgYnV0IHdlIGhhdmUgc29tZVxuICAgICAgICAgICAgICAgIC8vIHVubWF0Y2hlZCBzdHJpbmcgcmVtYWluaW5nLCB3aGljaCBjYW4gb25seSBiZSBhIHRlcm1cbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdWJTdHIsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHg6IHNlYXJjaFN0ci5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoU3RhcnQ6IC0xLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIucGFyc2VTZWFyY2hTdHJpbmcsIG1hdGNoZXM9JywgbWF0Y2hlcyk7XG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHBocmFzZXMgYmV0d2VlbiBvcGVyYXRvcnMgYW5kIHB1dCBpbiB0aGUgb3BlcmF0b3IgdG9rZW4gcGhyYXNlIHByb3BlcnR5XG4gICAgICogQHBhcmFtIG1hdGNoZXMge01hdGNoW119XG4gICAgICogQHJldHVybnMge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0TWF0Y2hQaHJhc2VzKG1hdGNoZXMpIHtcbiAgICAgICAgbGV0IHBhcnNlZE1hdGNoZXMgPSBbXTtcbiAgICAgICAgbGV0IHBocmFzZVN0YWNrID0gW107XG4gICAgICAgIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKChtYXRjaCwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUgJiYgbWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGhyYXNlU3RhY2sucHVzaChtYXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGhyYXNlQXJyID0gW107XG4gICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKG1hdGNoLnN1YlN0cik7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwaHJhc2VTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdElkeCA9IHBocmFzZVN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFBocmFzZU1hdGNoID0gcGhyYXNlU3RhY2tbbGFzdElkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFBocmFzZU1hdGNoLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFICYmIGxhc3RQaHJhc2VNYXRjaC50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKGxhc3RQaHJhc2VNYXRjaC5zdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZVN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2gucGhyYXNlID0gcGhyYXNlQXJyLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyc2VkTWF0Y2hlcy5wdXNoKG1hdGNoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIuYnVpbGRQaHJhc2VzLCBwYXJzZWRNYXRjaGVzPScsIHBhcnNlZE1hdGNoZXMpO1xuICAgICAgICByZXR1cm4gcGFyc2VkTWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29udmVydCBtYXRjaGVzIHRvIHRva2Vuc1xuICAgICAqIEBwYXJhbSBtYXRjaGVzIHtNYXRjaFtdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIG1hdGNoZXNUb1Rva2VucyhtYXRjaGVzKSB7XG4gICAgICAgIGxldCB0b2tlbnMgPSBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG1hdGNoZXMuZm9yRWFjaCgobWF0Y2gsIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdWJTdHIsIG1hdGNoU3RhcnQsIGN1cnJlbnRJZHgsIHR5cGUsIG9wZXJhdGlvbiwgcGhyYXNlLCBydWxlIH0gPSBtYXRjaDtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBub25UZXJtID0gc3ViU3RyLnNsaWNlKG1hdGNoU3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBjdXJyZW50SWR4IC0gbm9uVGVybS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0ID4gMCkgeyAvLyBtYXRjaCBmb3VuZCBpbiBtaWRkbGUgb3IgZW5kIG9mIHN1YlN0clxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlcm0gPSBzdWJTdHIuc2xpY2UoMCwgbWF0Y2hTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbih0ZXJtLCBUb2tlbl8xLlRva2VuVHlwZS5URVJNLCB1bmRlZmluZWQsIHBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbiA9IHRoaXMuY2hlY2tUb2tlblR5cGUobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucGhyYXNlID0gcGhyYXNlIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucnVsZSA9IHJ1bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IG90aGVyVG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbihub25UZXJtLCB0eXBlLCBvcGVyYXRpb24sIGN1cnJlbnRJZHgpO1xuICAgICAgICAgICAgICAgICAgICBvdGhlclRva2VuLnJ1bGUgPSBydWxlO1xuICAgICAgICAgICAgICAgICAgICBvdGhlclRva2VuLnBocmFzZSA9IHBocmFzZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gob3RoZXJUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBjdXJyZW50SWR4IC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbihzdWJTdHIsIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIHVuZGVmaW5lZCwgcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucnVsZSA9IHJ1bGU7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLnBocmFzZSA9IHBocmFzZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdoZW4gYSBtYXRjaCBpcyBmb3VuZCBhbmQgaXQncyBwYXJ0IG9mIGEgd29yZCAoaS5lLiBvcGVyYXRvciwgZm9ya2xpZnQsIGVjdC4pIG11bHRpcGxlXG4gICAgICogdG9rZW5zIGFyZSBjcmVhdGVkLiBUaGlzIHRha2VzIHRob3NlIG11bHRpcGxlIHRva2VucyBhbmQgbWFrZXMgdGhlbSBvbmUgdG9rZW5cbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRlcm1zRnJvbVNwbGl0cyh0b2tlbnMpIHtcbiAgICAgICAgbGV0IG5ld1Rva2VucyA9IFtdO1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxldCBoYW5naW5nVG9rZW5zID0gW107XG4gICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dFRva2VuID0gYXJyW2lkeCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChoYW5naW5nVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHb3QgcGllY2VzIG9mIGEgd29yZCBoYW5naW5nIG91dFxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSAmJiAobmV4dFRva2VuICYmIHRoaXMuaXNUZXJtT3JPcGVyYXRvcihuZXh0VG9rZW4pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR290IG1vcmUgcGllY2VzIG9mIHRoZSB3b3JkIGFmdGVyIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmdpbmdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWFjaGVkIGVuZCBvZiB3b3JkLCBuZXh0IHRva2VuIGlzIG5vdCBhIHdvcmQgb3Igb3BlcmF0b3IsIGNvbWJpbmUgb3VyIGhhbmdpbmcgdG9rZW5zIGludG8gYSBzaW5nbGUgdG9rZW5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBWYWwgPSBoYW5naW5nVG9rZW5zLm1hcCh0b2tlbiA9PiB0b2tlbi52YWx1ZSkuam9pbignJykgKyB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0VuZCA9IHRva2VuLnBvc2l0aW9uLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXJ0ID0gbmV3RW5kIC0gKHRlbXBWYWwubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdUb2tlbiA9IHRoaXMuY3JlYXRlTmV3VG9rZW4odGVtcFZhbCwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSwgbmV3U3RhcnQsIG5ld0VuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5naW5nVG9rZW5zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIGhhbmdpbmcgdG9rZW5zIChpLmUuIHBpZWNlcyBvZiBhIHdvcmQpXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudCB0b2tlbiBub3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBwdXNoIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IHRva2VuIGlzIGEgd29yZCBvciBvcGVyYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXh0VG9rZW4gfHwgIXRoaXMuaXNUZXJtT3JPcGVyYXRvcihuZXh0VG9rZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCB0b2tlbiBpc24ndCBhIHdvcmQgb3Igb3BlcmF0b3IsIGp1c3QgcHVzaCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5leHRUb2tlbiAmJiB0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgdG9rZW4gaXMgYSB3b3JkIG9yIG9wZXJhdG9yLCBjdXJyZW50IHRva2VuIGlzIGEgcGllY2Ugb2YgYSB3b3JkLCBzdGFzaCBpdCBpbiBoYW5naW5nVG9rZW5zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZ2luZ1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIHNob3VsZCBuZXZlciBnZXQgaGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCb29sZWFuU2VhcmNoLnBhcnNlciwgY3JlYXRlVGVybXNGcm9tU3BsaXRzLCBjdXJyZW50IHRva2VuPScsIHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLmNyZWF0ZVRlcm1zRnJvbVNwbGl0cywgbmV3VG9rZW5zPScsIG5ld1Rva2Vucyk7XG4gICAgICAgIHJldHVybiBuZXdUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyB0b2tlblxuICAgICAqIEBwYXJhbSB2YWx1ZSB7c3RyaW5nfVxuICAgICAqIEBwYXJhbSB0eXBlIHtUb2tlblR5cGV9XG4gICAgICogQHBhcmFtIHN0YXJ0IHtudW1iZXJ9XG4gICAgICogQHBhcmFtIGVuZCB7bnVtYmVyfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbn1cbiAgICAgKi9cbiAgICBjcmVhdGVOZXdUb2tlbih2YWx1ZSwgdHlwZSwgc3RhcnQsIGVuZCkge1xuICAgICAgICBjb25zdCBuZXdUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKHZhbHVlLCB0eXBlLCB1bmRlZmluZWQpO1xuICAgICAgICBjb25zdCBuZXdUb2tlblN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IG5ld1Rva2VuRW5kID0gbmV3VG9rZW5TdGFydCArICh2YWx1ZS5sZW5ndGggLSAxKTtcbiAgICAgICAgbmV3VG9rZW4ucG9zaXRpb24gPSB7IHN0YXJ0OiBuZXdUb2tlblN0YXJ0LCBlbmQ6IG5ld1Rva2VuRW5kIH07XG4gICAgICAgIHJldHVybiBuZXdUb2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB0ZXh0IGJldHdlZW4gcXVvdGVzIGFuZCBjb252ZXJ0IGl0IHRvIGEgdGVybSB0b2tlblxuICAgICAqIEBwYXJhbSB0b2tlbnMge1Rva2VuW119XG4gICAgICogQHJldHVybnMge1Rva2VuW119XG4gICAgICovXG4gICAgY3JlYXRlVGVybXNGcm9tUXVvdGVzKHRva2Vucykge1xuICAgICAgICBsZXQgbmV3VG9rZW5zID0gW107XG4gICAgICAgIGlmICh0b2tlbnMgJiYgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgcXVvdGVzID0gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSk7XG4gICAgICAgICAgICBpZiAocXVvdGVzID09PSBudWxsIHx8IHF1b3RlcyA9PT0gdm9pZCAwID8gdm9pZCAwIDogcXVvdGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxldCBjdXJyZW50VmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICBsZXQgdW5jbG9zZWRRdW90ZVRva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmNsb3NlZFF1b3RlVG9rZW4gPT09IG51bGwpIHsgLy8gbm8gb3BlbmluZyBxdW90ZSB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSkgeyAvLyBvcGVuaW5nIHF1b3RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jbG9zZWRRdW90ZVRva2VuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4ub3BlcmF0aW9uID0gVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuT1BFTjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5pc1NpYmxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgeyAvLyB3ZSBoYXZlIGFuIG9wZW5pbmcgcXVvdGUgc29tZXdoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpIHsgLy8gY2xvc2luZyBxdW90ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Rva2VuID0gbmV3IFRva2VuXzEuVG9rZW4oY3VycmVudFZhbHVlLCBUb2tlbl8xLlRva2VuVHlwZS5URVJNLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLmlzSW5zaWRlUXVvdGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jbG9zZWRRdW90ZVRva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5vcGVyYXRpb24gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5DTE9TRTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5pc1NpYmxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHsgLy8gbm90IHRvIHRoZSBjbG9zaW5nIHF1b3RlIHlldCwganVzdCBrZWVwIGFkZGluZyB0byB0aGUgY3VycmVudFZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzVGVybU9yT3BlcmF0b3IodG9rZW4pICYmIHRva2VuLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLldISVRFX1NQQUNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSArPSB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRRdW90ZVRva2VuICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIHJldHVybiB0aGUgdG9rZW5zIGJlY2F1c2Ugb3RoZXJ3aXNlIHdlJ2xsIGxvb3NlIGFsbCBvZiB0aGUgdG9rZW5zIGFmdGVyIHRoaXMgdW5jbG9zZWRRdW90ZVRva2VuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3VG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3VG9rZW5zID0gdG9rZW5zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHRoZSB0b2tlbnMgdG8gZW5zdXJlIG5vIHVuYWxsb3dlZCBjaGFyYWN0ZXJzLCBvciBtYWxmb3JtZWQgdGV4dCAoaS5lLiBvcGVuaW5nIHBhcmVuIHdpdGggbm8gY2xvc2luZyBwYXJlbiwgZXRjKVxuICAgICAqIEBwYXJhbSB0b2tlbnMge1Rva2VuW119XG4gICAgICogQHBhcmFtIHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzIHtWYWxpZGF0aW9uUnVsZVtdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIHZhbGlkYXRlVG9rZW5zKHRva2Vucywgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMuZm9yRWFjaCgocnVsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBMb29wIHRocm91Z2ggdmFsaWRhdGlvbiBydWxlcyBhbmQgZW5zdXJlIGVhY2ggdG9rZW4gcGFzc2VzIGVhY2ggcnVsZVxuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2ggPSBydWxlLnRlc3QodG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRva2VuLmlzSW5zaWRlUXVvdGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEludmFsaWQgY2hhcmFjdGVyIGF0IHBvc2l0aW9uICR7dG9rZW4ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHtydWxlLmNoYXJhY3Rlcn0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcgJiYgdG9rZW4udmFsdWUgPT09ICcoJyAmJiBpZHggPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBhbiBvcGVyYXRvciBwcmVjZWRlcyBhIGdyb3VwaW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZUb2tlbiA9IHRoaXMuZ2V0UHJlY2VkaW5nT3BlcmF0b3JUb2tlbih0b2tlbnMsIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2VG9rZW4gJiYgKCFwcmV2VG9rZW4udG9rZW4gfHwgKHByZXZUb2tlbiAmJiBwcmV2VG9rZW4uZGlzdGFuY2UgPiAyKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJldlRva2VuLnRva2VuID8gcHJldlRva2VuLnRva2VuLnZhbHVlIDogdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgQW4gb3BlcmF0b3Igc2hvdWxkIHByZWNlZGUgYSBncm91cGluZyBhdCBwb3NpdGlvbiAke3Rva2VuLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7dmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBubyBiYWNrIHRvIGJhY2sgb3BlcmF0b3JzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRUb2tlbiA9IGFycltpZHggKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFRva2VuMiA9IGFycltpZHggKyAyXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXh0VG9rZW4gJiYgbmV4dFRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5leHRUb2tlbjIgJiYgbmV4dFRva2VuMi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBDYW5ub3QgaGF2ZSBvcGVyYXRvcnMgYmFjayB0byBiYWNrIGF0IHBvc2l0aW9uICR7dG9rZW4ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHt0b2tlbi52YWx1ZX0gJHtuZXh0VG9rZW4udmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHVuY2xvc2VkVHlwZXMgPSBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5HUk9VUElORywgbXNnTmFtZVBhcnQ6ICdwYXJlbicgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFLCBtc2dOYW1lUGFydDogJ3F1b3RlJyB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdW5jbG9zZWRUeXBlcy5mb3JFYWNoKCh0b2tlblR5cGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmNsb3NlZEdyb3VwVG9rZW4gPSB0aGlzLmdldFVuY2xvc2VkR3JvdXBJdGVtKHRva2VucywgdG9rZW5UeXBlLnR5cGUpO1xuICAgICAgICAgICAgICAgIGlmICh1bmNsb3NlZEdyb3VwVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5jbG9zZWRJZCA9IHVuY2xvc2VkR3JvdXBUb2tlbi5pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsdGVyZWRUb2tlbnMgPSB0b2tlbnMuZmlsdGVyKHNyY1Rva2VuID0+IHNyY1Rva2VuLmlkID09PSB1bmNsb3NlZElkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcmVkVG9rZW5zICYmIGZpbHRlcmVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYFVubWF0Y2hlZCAke3Rva2VuVHlwZS5tc2dOYW1lUGFydH0gYXQgcG9zaXRpb24gJHtmaWx0ZXJlZFRva2Vuc1swXS5wb3NpdGlvbi5zdGFydH0gJiMzOTske2ZpbHRlcmVkVG9rZW5zWzBdLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRUb2tlbnNbMF0uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB7IFdISVRFX1NQQUNFLCBQT1NTSUJMRSwgT1BFUkFUT1IgfSA9IFRva2VuXzEuVG9rZW5UeXBlO1xuICAgICAgICAgICAgY29uc3QgZmlyc3RUb2tlbiA9IHRva2Vuc1swXS50eXBlO1xuICAgICAgICAgICAgY29uc3Qgc2Vjb25kVG9rZW4gPSB0b2tlbnMubGVuZ3RoID49IDIgPyB0b2tlbnNbMV0udHlwZSA6IG51bGw7XG4gICAgICAgICAgICBpZiAoKGZpcnN0VG9rZW4gPT09IE9QRVJBVE9SIHx8IGZpcnN0VG9rZW4gPT09IFBPU1NJQkxFKSB8fFxuICAgICAgICAgICAgICAgIChmaXJzdFRva2VuID09PSBXSElURV9TUEFDRSAmJiAoc2Vjb25kVG9rZW4gJiYgc2Vjb25kVG9rZW4gPT09IE9QRVJBVE9SIHx8IHNlY29uZFRva2VuID09PSBQT1NTSUJMRSkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEEgc2VhcmNoIG11c3Qgbm90IGJlZ2luIHdpdGggYW4gb3BlcmF0b3IgYXQgcG9zaXRpb24gMCAmIzM5OyR7dG9rZW5zWzBdLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgIHRva2Vuc1swXS5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsYXN0SWR4ID0gdG9rZW5zLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBjb25zdCBsYXN0VG9rZW4gPSB0b2tlbnNbbGFzdElkeF0udHlwZTtcbiAgICAgICAgICAgIGNvbnN0IG5leHRMYXN0VG9rZW4gPSB0b2tlbnMubGVuZ3RoID49IDIgPyB0b2tlbnNbbGFzdElkeCAtIDFdLnR5cGUgOiBudWxsO1xuICAgICAgICAgICAgaWYgKChsYXN0VG9rZW4gPT09IE9QRVJBVE9SIHx8IGxhc3RUb2tlbiA9PT0gUE9TU0lCTEUpIHx8XG4gICAgICAgICAgICAgICAgKGxhc3RUb2tlbiA9PT0gV0hJVEVfU1BBQ0UgJiZcbiAgICAgICAgICAgICAgICAgICAgKG5leHRMYXN0VG9rZW4gJiYgbmV4dExhc3RUb2tlbiA9PT0gUE9TU0lCTEUgfHwgbmV4dExhc3RUb2tlbiA9PT0gT1BFUkFUT1IpKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBBIHNlYXJjaCBtdXN0IG5vdCBlbmQgd2l0aCBhbiBvcGVyYXRvciBhdCBwb3NpdGlvbiAke3Rva2Vuc1tsYXN0SWR4XS5wb3NpdGlvbi5zdGFydH0gJiMzOTske3Rva2Vuc1tsYXN0SWR4XS52YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICB0b2tlbnNbbGFzdElkeF0uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIudmFsaWRhdGVUb2tlbnMsIHRva2Vucz0nLCB0b2tlbnMpO1xuICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUYWtlIHRoZSBhcnJheSBvZiB0b2tlbnMgYW5kIGJ1aWxkIGEgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRyZWUodG9rZW5zKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSBbXTtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCB7IE9QRU4sIENMT1NFIH0gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IHF1ZVRva2VucyA9IEFycmF5LmZyb20odG9rZW5zKTtcbiAgICAgICAgICAgIGNvbnN0IGluUHJvY1BhcmVudHMgPSBbXTsgLy8gUG9wdWxhdGUgZm9yIG5lc3RlZCBncm91cHNcbiAgICAgICAgICAgIGNvbnN0IGdldEtpZHMgPSAocGFyZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIF9hO1xuICAgICAgICAgICAgICAgIGxldCBraWRUb2tlbiA9IHF1ZVRva2Vucy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChraWRUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0ga2lkVG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdXBpbmcoa2lkVG9rZW4pICYmIG9wZXJhdGlvbiA9PT0gT1BFTikge1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4uaXNDaGlsZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc1NpYmxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5Qcm9jUGFyZW50cy51bnNoaWZ0KGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldEtpZHMoa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzR3JvdXBpbmcoa2lkVG9rZW4pICYmIG9wZXJhdGlvbiA9PT0gQ0xPU0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluIGEgbmVzdGVkIGdyb3VwaW5nLCBkb24ndCB3YW50IHRoZSBjbG9zaW5nIHRva2VuIHRvIGJlIGluY2x1ZGVkIGFzIGEgY2hpbGRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIHRoZSBjdXJyZW50bHkgcHJvY2Vzc2luZyBwYXJlbnQuIEl0IHNob3VsZCBiZSBhIGNoaWxkIG9mIHRoZSBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGFyZW50IGlmIGl0IGV4aXN0cy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzU2libGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2UGFyZW50ID0gaW5Qcm9jUGFyZW50cy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZQYXJlbnQgJiYgaW5Qcm9jUGFyZW50c1swXSAmJiAoKF9hID0gaW5Qcm9jUGFyZW50c1swXSkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmlkKSAhPT0gcHJldlBhcmVudC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluUHJvY1BhcmVudHNbMF0uY2hpbGRyZW4ucHVzaChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVUb2tlbnMudW5zaGlmdChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsZXQgdG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIHdoaWxlICh0b2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgb3BlcmF0aW9uIH0gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VwaW5nKHRva2VuKSAmJiBvcGVyYXRpb24gPT09IE9QRU4pIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uaXNTaWJsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5Qcm9jUGFyZW50cy51bnNoaWZ0KHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgZ2V0S2lkcyh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyZWUucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJlZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHdlJ3ZlIGdvdCB0aGUgcmlnaHQgdG9rZW4gdHlwZSBhZnRlciBtYW5pcHVsYXRpbmcgdGhlIG1hdGNoLiBGb3IgZXhhbXBsZTpcbiAgICAgKiB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGlzIG1hdGNoIGFycmF5IHdpbGwgaGF2ZSBhIHRva2VuIHR5cGUgb2YgUE9TU0lCTEU6XG4gICAgICogW2Zvciwga2xpZnRdXG4gICAgICogYWZ0ZXIgYSB0b2tlbiBpcyBjcmVhdGVkLCB3ZSdsbCBlbmQgdXAgd2l0aDpcbiAgICAgKiBbZiwgb3IsIGtsaWZ0XVxuICAgICAqIHRoZSBmaXN0IGVsZW1lbnQgd2lsbCBzdGlsbCBoYXZlIGEgdG9rZW4gdHlwZSBvZiBQT1NTSUJMRSBhcyB3aWxsIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAqIHdlIG5lZWQgdG8gZW5zdXJlIHRoYXQgdGhlIGZpcnN0IGVsZW1lbnQncyB0b2tlbiB0eXBlIGdldHMgc2V0IHRvIFRFUk0gc28gdGhhdCB3ZSBtYXlcbiAgICAgKiBwdXQgdGhpcyBzcGxpdCB3b3JkIGJhY2sgdG9nZXRoZXIgbGF0ZXIgaW4gdGhlIHByb2Nlc3NcbiAgICAgKiBAcGFyYW0gdG9rZW4ge1Rva2VufVxuICAgICAqL1xuICAgIGNoZWNrVG9rZW5UeXBlKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgdHlwZXNJblN0ciA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcnVsZXNJblN0ciA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBydWxlIG9mIHRoaXMuc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoU3RhcnQgPSBydWxlLnRlc3QodG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlc0luU3RyLnB1c2gocnVsZS50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgcnVsZXNJblN0ci5wdXNoKHJ1bGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlc0luU3RyLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLmNoZWNrVG9rZW5UeXBlJylcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlc0luU3RyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSB0eXBlc0luU3RyWzBdIHx8IFRva2VuXzEuVG9rZW5UeXBlLlRFUk07XG4gICAgICAgICAgICAgICAgdG9rZW4ucnVsZSA9IHJ1bGVzSW5TdHJbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuVEVSTTtcbiAgICAgICAgICAgICAgICB0b2tlbi5ydWxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBmaXJzdCBwcmV2aW91cyBPUEVSQVRPUiBmcm9tIHRoZSB0b2tlbiBhdCB0aGUgc3RhcnRJZHggaW5kZXhcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEBwYXJhbSBzdGFydElkeCB7bnVtYmVyfSBUaGUgdG9rZW4gaW5kZXggaW4gdGhlIHRva2VucyBhcnJheVxuICAgICAqL1xuICAgIGdldFByZWNlZGluZ09wZXJhdG9yVG9rZW4odG9rZW5zLCBzdGFydElkeCkge1xuICAgICAgICBsZXQgcmV0dXJuVG9rZW4gPSBudWxsO1xuICAgICAgICBsZXQgcmV0dXJuT2JqID0gbnVsbDtcbiAgICAgICAgaWYgKCh0b2tlbnMgPT09IG51bGwgfHwgdG9rZW5zID09PSB2b2lkIDAgPyB2b2lkIDAgOiB0b2tlbnMubGVuZ3RoKSAmJiAodG9rZW5zLmxlbmd0aCAtIDEpID49IHN0YXJ0SWR4KSB7XG4gICAgICAgICAgICByZXR1cm5Ub2tlbiA9IHRva2Vuc1tzdGFydElkeF07XG4gICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBzdGFydElkeDtcbiAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICB3aGlsZSAocG9zaXRpb24gPiAtMSAmJiByZXR1cm5Ub2tlbiAmJiAocmV0dXJuVG9rZW4udHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IgJiYgcmV0dXJuVG9rZW4udHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24tLTtcbiAgICAgICAgICAgICAgICByZXR1cm5Ub2tlbiA9IHRva2Vuc1twb3NpdGlvbl07XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybk9iaiA9IHsgdG9rZW46IHJldHVyblRva2VuLCBkaXN0YW5jZTogY291bnQgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuT2JqO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlcmUgYXJlIG5vIHVuY2xvc2VkIGdyb3VwIHRva2Vuc1xuICAgICAqIEBwYXJhbSB0b2tlbnMge1Rva2VuW119XG4gICAgICogQHBhcmFtIHRva2VuVHlwZSB7VG9rZW5UeXBlfSBUaGUgZ3JvdXAgdG9rZW4gdHlwZSB0byBjaGVjayBmb3JcbiAgICAgKiBAcmV0dXJucyB7VG9rZW59XG4gICAgICovXG4gICAgZ2V0VW5jbG9zZWRHcm91cEl0ZW0odG9rZW5zLCB0b2tlblR5cGUpIHtcbiAgICAgICAgbGV0IHVuY2xvc2VkR3JvdXBUb2tlbiA9IG51bGw7XG4gICAgICAgIGlmICh0b2tlbnMgJiYgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgdHlwZVRva2VucyA9IHRva2Vucy5maWx0ZXIodG9rZW4gPT4gdG9rZW4udHlwZSA9PT0gdG9rZW5UeXBlKTtcbiAgICAgICAgICAgIGlmICh0eXBlVG9rZW5zICYmIHR5cGVUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUgfSA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRHcm91cFRva2VuID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gdG9rZW5UeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jbG9zZWRHcm91cFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gdG9rZW5UeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jbG9zZWRHcm91cFRva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmNsb3NlZEdyb3VwVG9rZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgdG9rZW4gaXMgYSBQYXJlbiBvciBRdW90ZVxuICAgICAqIEBwYXJhbSB0b2tlbiB7VG9rZW59XG4gICAgICovXG4gICAgaXNHcm91cGluZyh0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gdG9rZW47XG4gICAgICAgICAgICBjb25zdCB7IFFVT1RFLCBHUk9VUElORyB9ID0gVG9rZW5fMS5Ub2tlblR5cGU7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGUgPT09IFFVT1RFIHx8IHR5cGUgPT09IEdST1VQSU5HKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0b2tlbiBpcyBhIFRFUk0sIFBPU1NJQkxFIG9yIE9QRVJBVE9SXG4gICAgICogQHBhcmFtIHRva2VuIHtUb2tlbn1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgeyB0eXBlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgIGNvbnN0IHsgVEVSTSwgUE9TU0lCTEUsIE9QRVJBVE9SIH0gPSBUb2tlbl8xLlRva2VuVHlwZTtcbiAgICAgICAgICAgIHJldHVybiB0eXBlID09PSBURVJNIHx8IHR5cGUgPT09IFBPU1NJQkxFIHx8IHR5cGUgPT09IE9QRVJBVE9SO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGFyc2UgdGhlIHNlYXJjaCBzdHJpbmcgYW5kIGJ1aWxkIG91dCBhbGwgdGhlIHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICBwYXJzZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoU3RyaW5nICYmIHRoaXMuc2VsZWN0ZWRSdWxlcyAmJiB0aGlzLnZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVkVG9rZW5zO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwcm92aWRlIHRoZSBzZWFyY2ggc3RyaW5nLCBzZWxlY3RlZCBydWxlcyBhbmQgdmFsaWRhdGlvbiBydWxlcyB0byBwcm9jZWVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIHRoZSBhcnJheXMgb2YgdGhpcyBjbGFzc1xuICAgICAqL1xuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3RyZWUgPSBbXTtcbiAgICAgICAgdGhpcy5fdmFsaWRhdGVkVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3dob2xlVG9rZW5zID0gW107XG4gICAgfVxufVxuZXhwb3J0cy5QYXJzZXIgPSBQYXJzZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuVmFsaWRhdGlvblJ1bGUgPSBleHBvcnRzLkVzY2FwZWFibGVSdWxlID0gZXhwb3J0cy5SdWxlID0gdm9pZCAwO1xuY29uc3QgVG9rZW5fMSA9IHJlcXVpcmUoXCIuL1Rva2VuXCIpO1xuLyoqXG4gKiBUb3AgbGV2ZWwgY2xhc3MgZm9yIGEgcnVsZS4gUnVsZXMgZGVmaW5lIGEgcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm4gdG8gbG9vayBmb3JcbiAqIHdpdGhpbiBhIHtAbGluayBUb2tlbiN2YWx1ZX1cbiAqIEBjbGFzcyB7UnVsZX1cbiAqL1xuY2xhc3MgUnVsZSB7XG4gICAgY29uc3RydWN0b3IocGF0dGVybiwgb3BlcmF0aW9uLCB0eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgdGhpcy5fcGF0dGVybiA9IHBhdHRlcm47XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbiA9IG9wZXJhdGlvbjtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEEgcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm5cbiAgICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgICAqL1xuICAgIGdldCBwYXR0ZXJuKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3BhdHRlcm4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUGF0dGVybiBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdHRlcm47XG4gICAgfVxuICAgIHNldCBwYXR0ZXJuKHBhdHRlcm4pIHtcbiAgICAgICAgdGhpcy5fcGF0dGVybiA9IHBhdHRlcm47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBvcGVyYXRpb24gdG9rZW5zIHRoYXQgbWF0Y2ggdGhpcyBydWxlIHBlcmZvcm1cbiAgICAgKiBAdHlwZSB7VG9rZW5PcGVyYXRpb25zfVxuICAgICAqL1xuICAgIGdldCBvcGVyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRpb247XG4gICAgfVxuICAgIHNldCBvcGVyYXRpb24ob3BlcmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbiA9IG9wZXJhdGlvbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VuIHR5cGUgZm9yIHRva2VucyBtYXRjaGluZyB0aGlzIHJ1bGVcbiAgICAgKiBAdHlwZSB7VG9rZW5UeXBlfVxuICAgICAqL1xuICAgIGdldCB0eXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHlwZTtcbiAgICB9XG4gICAgc2V0IHR5cGUodHlwZSkge1xuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGVzdCBpZiB0aGUgcGFzc2VkIGluIHN0ciBtYXRjaGVzIHRoZSBwYXR0ZXJuIG9mIHRoaXMgcnVsZVxuICAgICAqIEBwYXJhbSBzdHIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0ZXN0KHN0cikge1xuICAgICAgICBpZiAodGhpcy5wYXR0ZXJuKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnNlYXJjaCh0aGlzLnBhdHRlcm4pO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUGF0dGVybiBkZWZpbmVkJyk7XG4gICAgfVxufVxuZXhwb3J0cy5SdWxlID0gUnVsZTtcbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBwYXR0ZXJuIGlzIGVzY2FwZWRcbiAqIEBjbGFzcyB7RXNjYXBhYmxlUnVsZX1cbiAqIEBleHRlbmRzIHtSdWxlfVxuICovXG5jbGFzcyBFc2NhcGVhYmxlUnVsZSBleHRlbmRzIFJ1bGUge1xuICAgIGNvbnN0cnVjdG9yKG5hbWUsIG9wZXJhdGlvbiwgdHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIG9wZXJhdGlvbiwgdHlwZSk7XG4gICAgfVxuICAgIHRlc3Qoc3RyKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzdXBlci50ZXN0KHN0cik7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHIuY2hhckF0KHJlc3VsdCAtIDEpID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuRXNjYXBlYWJsZVJ1bGUgPSBFc2NhcGVhYmxlUnVsZTtcbi8qKlxuICogUnVsZSBmb3IgdmFsaWRhdGluZyB0b2tlbnNcbiAqIEBjbGFzcyB7VmFsaWRhdGlvblJ1bGV9XG4gKiBAZXh0ZW5kcyB7UnVsZX1cbiAqL1xuY2xhc3MgVmFsaWRhdGlvblJ1bGUgZXh0ZW5kcyBSdWxlIHtcbiAgICBjb25zdHJ1Y3RvcihwYXR0ZXJuLCBjaGFyYWN0ZXIpIHtcbiAgICAgICAgc3VwZXIocGF0dGVybiwgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuRVJST1IpO1xuICAgICAgICB0aGlzLl9jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjaGFyYWN0ZXIgdGhhdCB3aWxsIGJlIHJlcG9ydGVkIGFzIGFuIGVycm9yIG1lc3NhZ2UgaW5zaWRlIHRoZSB0b2tlblxuICAgICAqIHdpdGggdGhlIGVycm9yXG4gICAgICovXG4gICAgZ2V0IGNoYXJhY3RlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoYXJhY3RlcjtcbiAgICB9XG4gICAgc2V0IGNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcbiAgICAgICAgdGhpcy5fY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuICAgIH1cbn1cbmV4cG9ydHMuVmFsaWRhdGlvblJ1bGUgPSBWYWxpZGF0aW9uUnVsZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Ub2tlbiA9IGV4cG9ydHMuVG9rZW5PcGVyYXRpb25zID0gZXhwb3J0cy5Ub2tlbk9wZXJhdG9ycyA9IGV4cG9ydHMuVG9rZW5UeXBlID0gdm9pZCAwO1xuLyoqXG4gKiBUaGUgdHlwZSBvZiB2YWx1ZSBmb3IgdGhpcyB0b2tlblxuICovXG52YXIgVG9rZW5UeXBlO1xuKGZ1bmN0aW9uIChUb2tlblR5cGUpIHtcbiAgICAvKipcbiAgICAgKiBVc3VhbGx5IGEgd29yZCBvciBsZXR0ZXIgdGhhdCBpcyBub3Qgb25lIG9mIHRoZSBvdGhlciB0b2tlbiB0eXBlc1xuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlRFUk1cIl0gPSBcInRlcm1cIjtcbiAgICAvKipcbiAgICAgKiBBbiBhY3R1YWwgb3BlcmF0b3IgKEFORCwgT1IsIE5PVCwgKywgfiwgLSlcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJPUEVSQVRPUlwiXSA9IFwib3BlcmF0b3JcIjtcbiAgICAvKipcbiAgICAgKiBBIHBvc3NpYmxlIG9wZXJhdG9yIChhbmQsIG9yLCBub3QpXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiUE9TU0lCTEVcIl0gPSBcInBvc3NpYmxlXCI7XG4gICAgLyoqXG4gICAgICogV2hpdGVzcGFjZSBvZiBzb21lIGtpbmQsIHVzdWFsbHkgYSBzcGFjZVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIldISVRFX1NQQUNFXCJdID0gXCJ3aGl0ZXNwYWNlXCI7XG4gICAgLyoqXG4gICAgICogVXN1YWxseSBhIHBhcmVuIG9mIHNvbWUgc29ydFxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIkdST1VQSU5HXCJdID0gXCJncm91cGluZ1wiO1xuICAgIC8qKlxuICAgICAqIEEgcXVvdGUgKFwiKVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlFVT1RFXCJdID0gXCJxdW90ZVwiO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSB0aGlzIGlzIGp1c3QgYW5nbGUgYnJhY2tldHMgKDwgPikuIFRoZXNlIG5lZWQgdGhlaXIgb3duXG4gICAgICogc3BlY2lhbCB0eXBlIHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSB0cmVhdGluZyB0aGVtIGFuZCB0aGVpciB0ZXh0XG4gICAgICogYXMgaHRtbCB0YWdzXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiQVNDSUlcIl0gPSBcImFzY2lpXCI7XG59KShUb2tlblR5cGUgPSBleHBvcnRzLlRva2VuVHlwZSB8fCAoZXhwb3J0cy5Ub2tlblR5cGUgPSB7fSkpO1xuLyoqXG4gKiBUaGUgYWN0dWFsIG9wZXJhdG9ycy4gVGhpcyBpcyB1c2VkIHRvIGRlZmluZSB3aGF0IGEgcG9zc2libGUgb3Igc3ltYm9sIGFjdHVhbGx5IGlzXG4gKi9cbnZhciBUb2tlbk9wZXJhdG9ycztcbihmdW5jdGlvbiAoVG9rZW5PcGVyYXRvcnMpIHtcbiAgICBUb2tlbk9wZXJhdG9yc1tcIkFORFwiXSA9IFwiQU5EXCI7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJPUlwiXSA9IFwiT1JcIjtcbiAgICBUb2tlbk9wZXJhdG9yc1tcIk5PVFwiXSA9IFwiTk9UXCI7XG59KShUb2tlbk9wZXJhdG9ycyA9IGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgfHwgKGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgPSB7fSkpO1xuLyoqXG4gKiBQb3NzaWJsZSwgQWN0dWFsIGFuZCBTeW1ib2wgT3BlcmF0b3JzIGdldCB0aGVpciByZXNwZWN0aXZlIEFORC9PUi9OT1QuIFF1b3RlcyBhbmQgcGFyZW5zXG4gKiBnZXQgdGhlaXIgcmVzcGVjdGl2ZSBPUEVOL0NMT1NFLiBUZXJtcyBhcmUgTk9ORSBhbmQgZXJyb3JzIGFyZSBFUlJPUi5cbiAqL1xudmFyIFRva2VuT3BlcmF0aW9ucztcbihmdW5jdGlvbiAoVG9rZW5PcGVyYXRpb25zKSB7XG4gICAgLyoqXG4gICAgICogUG9zc2libGUvQWN0dWFsL1N5bWJvbCBBTkQgb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJBTkRcIl0gPSBcIkFORFwiO1xuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlL0FjdHVhbC9TeW1ib2wgT1Igb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJPUlwiXSA9IFwiT1JcIjtcbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZS9BY3R1YWwvU3ltYm9sIE5PVCBvcGVyYXRvclxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk5PVFwiXSA9IFwiTk9UXCI7XG4gICAgLyoqXG4gICAgICogT3BlbmluZyBQYXJlbiBvciBRdW90ZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk9QRU5cIl0gPSBcIm9wZW5cIjtcbiAgICAvKipcbiAgICAgKiBDbG9zaW5nIFBhcmVuIG9yIFF1b3RlXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiQ0xPU0VcIl0gPSBcImNsb3NlXCI7XG4gICAgLyoqXG4gICAgICogVGVybSBvciBXaGl0ZXNwYWNlXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiTk9ORVwiXSA9IFwibm9uZVwiO1xuICAgIC8qKlxuICAgICAqIEVycm9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiRVJST1JcIl0gPSBcImVycm9yXCI7XG59KShUb2tlbk9wZXJhdGlvbnMgPSBleHBvcnRzLlRva2VuT3BlcmF0aW9ucyB8fCAoZXhwb3J0cy5Ub2tlbk9wZXJhdGlvbnMgPSB7fSkpO1xuLyoqXG4gKiBBIHRva2VuIGRlZmluZXMgYSBwaWVjZSBvZiB0ZXh0IGZvdW5kIGluIHRoZSBzZWFyY2ggc3RyaW5nLiBUaGlzIGNhbiBiZSBzaW5nbGUgd29yZHMgYW5kIGNoYXJhY3RlcnNcbiAqIGJ1dCBhbHNvIG11bHRpcGxlIHdvcmRzIChpLmUuIHRoZSB0ZXh0IGJldHdlZW4gcXVvdGVzKVxuICogQGNsYXNzIHtUb2tlbn1cbiAqL1xuY2xhc3MgVG9rZW4ge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBUb2tlbiBhbmQgYXNzaWduIGEgcmFuZG9tIElEIHN0cmluZ1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlLCB0eXBlLCBvcGVyYXRpb24gPSBUb2tlbk9wZXJhdGlvbnMuTk9ORSwgcG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5fZXJyb3JzID0gW107XG4gICAgICAgIHRoaXMuX2h0bWwgPSAnJztcbiAgICAgICAgdGhpcy5faWQgPSAnJztcbiAgICAgICAgdGhpcy5faXNDaGlsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pc1NpYmxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNJbnNpZGVRdW90ZXMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fcGhyYXNlID0gJyc7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uID0geyBzdGFydDogLTEsIGVuZDogLTEgfTtcbiAgICAgICAgdGhpcy5fdHlwZSA9IFRva2VuVHlwZS5URVJNO1xuICAgICAgICB0aGlzLl9zdHlsZUNsYXNzZXMgPSB7XG4gICAgICAgICAgICBlcnJvcjogJ2Vycm9yJyxcbiAgICAgICAgICAgIG9wZXJhdG9yOiAnb3BlcmF0b3InLFxuICAgICAgICAgICAgcG9zc2libGVPcGVyYXRvcjogJ3dhcm5pbmcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgICAgICBpZiAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBvc2l0aW9uICE9PSBudWxsICYmIHBvc2l0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0UG9zID0gdGhpcy5jYWxjU3RhcnQocG9zaXRpb24sIGxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBlbmRQb3MgPSB0aGlzLmNhbGNFbmQoc3RhcnRQb3MsIGxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHsgc3RhcnQ6IHN0YXJ0UG9zLCBlbmQ6IGVuZFBvcyB9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGhlIHN0YXJ0aW5nIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHBvc2l0aW9uIHtudW1iZXJ9IFRoZSBjdXJyZW50IGluZGV4IGZyb20gdGhlIGluaXRpYWxNYXRjaGVzIGdldHRlciBpbiB0aGUgcGFyc2VyXG4gICAgICogQHBhcmFtIGxlbmd0aCB7bnVtYmVyfSBUaGUgbGVuZ3RoIG9mIHRoZSB0ZXh0XG4gICAgICovXG4gICAgY2FsY1N0YXJ0KHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uIC0gKGxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGhlIGVuZCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiB7bnVtYmVyfSBVc3VhbGx5IHRoZSBzdGFydGluZyBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBsZW5ndGgge251bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGUgdGV4dFxuICAgICAqL1xuICAgIGNhbGNFbmQocG9zaXRpb24sIGxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcG9zaXRpb24gKyAobGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjaGlsZCB0b2tlbnMuIFVzdWFsbHkgdGV4dCBiZXR3ZWVuIHF1b3RlcyBvciBwYXJlbnNcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbiAgICB9XG4gICAgc2V0IGNoaWxkcmVuKGNoaWxkcmVuKSB7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGVycm9ycyBmb3IgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtFcnJvcltdfVxuICAgICAqL1xuICAgIGdldCBlcnJvcnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvcnM7XG4gICAgfVxuICAgIHNldCBlcnJvcnMoZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IGVycm9ycztcbiAgICB9XG4gICAgZ2V0IHN0eWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0eWxlQ2xhc3NlcztcbiAgICB9XG4gICAgc2V0IHN0eWxlcyhzdHlsZUNsYXNzZXMpIHtcbiAgICAgICAgdGhpcy5fc3R5bGVDbGFzc2VzID0gc3R5bGVDbGFzc2VzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgaHRtbCBmb3IgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IGh0bWwoKSB7XG4gICAgICAgIGxldCBzcGFuID0gbnVsbDtcbiAgICAgICAgbGV0IHN0eWxlQ2xhc3MgPSBudWxsO1xuICAgICAgICBjb25zdCB7IGVycm9ycywgcnVsZSwgX2h0bWwsIHR5cGUsIHZhbHVlIH0gPSB0aGlzO1xuICAgICAgICBpZiAoZXJyb3JzID09PSBudWxsIHx8IGVycm9ycyA9PT0gdm9pZCAwID8gdm9pZCAwIDogZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgc3R5bGVDbGFzcyA9IHRoaXMuc3R5bGVzLmVycm9yO1xuICAgICAgICAgICAgY29uc3QgZXJyb3JTdHIgPSBlcnJvcnMubWFwKChlcnIsIGlkeCkgPT4gZXJyLm1lc3NhZ2UpLmpvaW4oJyYjMTA7Jyk7XG4gICAgICAgICAgICBzcGFuID0gYDxzcGFuIGNsYXNzPVwiJHtzdHlsZUNsYXNzfVwiIHRpdGxlPVwiJHtlcnJvclN0cn1cIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgdGhpcy5faHRtbCA9IHZhbHVlLnJlcGxhY2UodmFsdWUsIHNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFfaHRtbCAmJiBydWxlICYmIHZhbHVlKSB7XG4gICAgICAgICAgICBzdHlsZUNsYXNzID0gdHlwZSA9PT0gVG9rZW5UeXBlLlBPU1NJQkxFXG4gICAgICAgICAgICAgICAgPyB0aGlzLnN0eWxlcy5wb3NzaWJsZU9wZXJhdG9yXG4gICAgICAgICAgICAgICAgOiB0eXBlID09PSBUb2tlblR5cGUuT1BFUkFUT1JcbiAgICAgICAgICAgICAgICAgICAgPyB0aGlzLnN0eWxlcy5vcGVyYXRvclxuICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgdGl0bGVTdHIgPSB0eXBlID09PSBUb2tlblR5cGUuUE9TU0lCTEUgPyBgUG9zc2libGUgb3BlcmF0b3IuIE9wZXJhdG9ycyBzaG91bGQgYmUgY2FwaXRhbGl6ZWQgKGkuZSAke3ZhbHVlLnRvVXBwZXJDYXNlKCl9KS5gIDogJyc7XG4gICAgICAgICAgICBzcGFuID0gdHlwZSAhPT0gVG9rZW5UeXBlLlBPU1NJQkxFICYmIHR5cGUgIT09IFRva2VuVHlwZS5PUEVSQVRPUlxuICAgICAgICAgICAgICAgID8gdmFsdWVcbiAgICAgICAgICAgICAgICA6IGA8c3BhbiBjbGFzcz1cIiR7c3R5bGVDbGFzc31cIiB0aXRsZT1cIiR7dGl0bGVTdHJ9XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgIHRoaXMuX2h0bWwgPSBydWxlLnBhdHRlcm4gPyB2YWx1ZS5yZXBsYWNlKHJ1bGUucGF0dGVybiwgc3BhbikgOiB0aGlzLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFfaHRtbCAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5faHRtbCA9IHRoaXMudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2h0bWw7XG4gICAgfVxuICAgIHNldCBodG1sKGh0bWwpIHtcbiAgICAgICAgdGhpcy5faHRtbCA9IGh0bWw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBJRCBmb3IgdGhpcyB0b2tlbiAoVGhpcyBJRCBpcyBub3QgcGVyc2lzdGVkIGFzIGNoYW5nZXMgYXJlIG1hZGUpXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgaWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pZDtcbiAgICB9XG4gICAgZ2V0IGlzQ2hpbGQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc0NoaWxkO1xuICAgIH1cbiAgICBzZXQgaXNDaGlsZChpc0NoaWxkKSB7XG4gICAgICAgIHRoaXMuX2lzQ2hpbGQgPSBpc0NoaWxkO1xuICAgIH1cbiAgICBnZXQgaXNTaWJsaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNTaWJsaW5nO1xuICAgIH1cbiAgICBzZXQgaXNTaWJsaW5nKGlzU2libGluZykge1xuICAgICAgICB0aGlzLl9pc1NpYmxpbmcgPSBpc1NpYmxpbmc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRydWUgaWYgdGhpcyB0b2tlbiBpcyBpbnNpZGUgcXVvdGVzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0IGlzSW5zaWRlUXVvdGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNJbnNpZGVRdW90ZXM7XG4gICAgfVxuICAgIHNldCBpc0luc2lkZVF1b3Rlcyhpc0luc2lkZVF1b3Rlcykge1xuICAgICAgICB0aGlzLl9pc0luc2lkZVF1b3RlcyA9IGlzSW5zaWRlUXVvdGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgYm9vbGVhbiBvcGVyYXRpb24gdGhpcyB0b2tlbiBpcyBmb3JcbiAgICAgKiBAdHlwZSB7VG9rZW5PcGVyYXRpb25zfVxuICAgICAqL1xuICAgIGdldCBvcGVyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRpb247XG4gICAgfVxuICAgIHNldCBvcGVyYXRpb24ob3BlcmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbiA9IG9wZXJhdGlvbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSWYgdGhpcyB0b2tlbiBpcyBhIFRva2VuVHlwZS5PUEVSQVRPUiBvciBUb2tlblR5cGUuUE9TU0lCTEUgdGhlIHBocmFzZSBsZWFkaW5nIHVwIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBwaHJhc2UoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9waHJhc2U7XG4gICAgfVxuICAgIHNldCBwaHJhc2UocGhyYXNlKSB7XG4gICAgICAgIHRoaXMuX3BocmFzZSA9IHBocmFzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHBvc2l0aW9uIHRoaXMgdG9rZW4gaXMgYXQgaW4gdGhlIHNlYXJjaCBzdHJpbmdcbiAgICAgKiBAdHlwZSB7UG9zaXRpb259XG4gICAgICovXG4gICAgZ2V0IHBvc2l0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zaXRpb247XG4gICAgfVxuICAgIHNldCBwb3NpdGlvbihwb3NpdGlvbikge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgcnVsZSB0aGF0IGNyZWF0ZWQgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtSdWxlfVxuICAgICAqL1xuICAgIGdldCBydWxlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcnVsZTtcbiAgICB9XG4gICAgc2V0IHJ1bGUocnVsZSkge1xuICAgICAgICB0aGlzLl9ydWxlID0gcnVsZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VuIHR5cGVcbiAgICAgKiBAdHlwZSB7VG9rZW5UeXBlfVxuICAgICAqL1xuICAgIGdldCB0eXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHlwZTtcbiAgICB9XG4gICAgc2V0IHR5cGUodHlwZSkge1xuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHN0cmluZyB2YWx1ZSBvZiB0aGlzIHRva2VuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgdmFsdWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICB9XG4gICAgc2V0IHZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgfVxufVxuZXhwb3J0cy5Ub2tlbiA9IFRva2VuO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fZXhwb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19leHBvcnRTdGFyKSB8fCBmdW5jdGlvbihtLCBleHBvcnRzKSB7XG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIF9fY3JlYXRlQmluZGluZyhleHBvcnRzLCBtLCBwKTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5fX2V4cG9ydFN0YXIocmVxdWlyZShcIi4vQm9vbGVhblNlYXJjaFwiKSwgZXhwb3J0cyk7XG5fX2V4cG9ydFN0YXIocmVxdWlyZShcIi4vUGFyc2VyXCIpLCBleHBvcnRzKTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9SdWxlXCIpLCBleHBvcnRzKTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9Ub2tlblwiKSwgZXhwb3J0cyk7XG4iLCJjb25zdCBCU1AgPSByZXF1aXJlKCdib29sZWFuLXNlYXJjaC1wYXJzZXInKTtcblxuXG5jb25zdCBkZWZhdWx0U2VhcmNoRmllbGQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZGVmYXVsdC1maWVsZCcpO1xuY29uc3QgZGVmYXVsdE91dHB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWZhdWx0LW91dHB1dC1jb250YWluZXInKTtcbmNvbnN0IGRlZmF1bHRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZGVmYXVsdC1zdWJtaXQnKTtcblxuY29uc3QgY3VzdG9tU2VhcmNoRmllbGQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3VzdG9tLWZpZWxkJyk7XG5jb25zdCBjdXN0b21PdXRwdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3VzdG9tLW91dHB1dC1jb250YWluZXInKTtcbmNvbnN0IGN1c3RvbUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXN0b20tc3VibWl0Jyk7XG5cbmRlZmF1bHRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBkZWZhdWx0T25TdWJtaXQpO1xuY3VzdG9tQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY3VzdG9tT25TdWJtaXQpO1xuXG5mdW5jdGlvbiBkZWZhdWx0T25TdWJtaXQoKSB7XG5cdGNvbnN0IHNlYXJjaFN0ciA9IGRlZmF1bHRTZWFyY2hGaWVsZC52YWx1ZTtcblx0Ly8gZGVmYXVsdCBjb25maWd1cmF0aW9uXG5cdGNvbnN0IGJzID0gbmV3IEJTUC5Cb29sZWFuU2VhcmNoKHNlYXJjaFN0cik7XG5cdGRlZmF1bHRPdXRwdXQuaW5uZXJIVE1MID0gYnMuaHRtbDtcblx0Y29uc29sZS5sb2coJ0RlZmF1bHQgQm9vbGVhblNlYXJjaCBpbnN0YW5jZT0nLCBicyk7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbU9uU3VibWl0KCkge1xuXHRjb25zdCBzZWFyY2hTdHIgPSBjdXN0b21TZWFyY2hGaWVsZC52YWx1ZTtcblx0Y29uc3QgcnVsZXMgPSB7Li4uQlNQLkRFRkFVTFRfUlVMRVN9O1xuXHRjb25zdCB2YWxpZGF0aW9uUnVsZXMgPSB7XG5cdFx0Li4uQlNQLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUyxcblx0XHRudW1iZXI6IG5ldyBCU1AuVmFsaWRhdGlvblJ1bGUoL1swLTldKy9nLCAnIycpXG5cdH07XG5cdGNvbnN0IGN1c3RvbUNvbmZpZyA9IHtcblx0XHRydWxlcyxcblx0XHR2YWxpZGF0aW9uUnVsZXMsXG5cdFx0b3BlcmF0b3JTdHlsZUNsYXNzOiAnc3VjY2Vzcydcblx0fTtcblx0Ly8gY3VzdG9tIGNvbmZpZ3VyYXRpb25cblx0Y29uc3QgYnMgPSBuZXcgQlNQLkJvb2xlYW5TZWFyY2goc2VhcmNoU3RyLCBjdXN0b21Db25maWcpO1xuXHRjdXN0b21PdXRwdXQuaW5uZXJIVE1MID0gYnMuaHRtbDtcblx0Y29uc29sZS5sb2coJ0N1c3RvbSBCb29sZWFuU2VhcmNoIGluc3RhbmNlPScsIGJzKTtcbn1cbiJdfQ==
