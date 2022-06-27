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
        this._matches = [];
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
            if (quotes && quotes.length) {
                let currentValue = '';
                let unclosedQuoteToken = null;
                tokens.forEach((token, idx, arr) => {
                    if (unclosedQuoteToken === null) { // no opening quote yet
                        if (token.type === Token_1.TokenType.QUOTE) { // opening quote
                            unclosedQuoteToken = token;
                            token.operation = Token_1.TokenOperations.OPEN;
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
                            token.type = Token_1.TokenType.QUOTE;
                            token.operation = Token_1.TokenOperations.CLOSE;
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
        if (tokens && tokens.length && (tokens.length - 1) >= startIdx) {
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
        this._matches = [];
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
        if (errors && errors.length) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9kaXN0L0Jvb2xlYW5TZWFyY2guanMiLCIuLi9kaXN0L1BhcnNlci5qcyIsIi4uL2Rpc3QvUnVsZS5qcyIsIi4uL2Rpc3QvVG9rZW4uanMiLCIuLi9kaXN0L2luZGV4LmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxb0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuQm9vbGVhblNlYXJjaCA9IGV4cG9ydHMuREVGQVVMVF9WQUxJREFUSU9OX1JVTEVTID0gZXhwb3J0cy5ERUZBVUxUX1JVTEVTID0gdm9pZCAwO1xuY29uc3QgUGFyc2VyXzEgPSByZXF1aXJlKFwiLi9QYXJzZXJcIik7XG5jb25zdCBSdWxlXzEgPSByZXF1aXJlKFwiLi9SdWxlXCIpO1xuY29uc3QgVG9rZW5fMSA9IHJlcXVpcmUoXCIuL1Rva2VuXCIpO1xuZXhwb3J0cy5ERUZBVUxUX1JVTEVTID0ge1xuICAgIGFuZDogbmV3IFJ1bGVfMS5SdWxlKC9hbmQvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQU5ELCBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSksXG4gICAgb3I6IG5ldyBSdWxlXzEuUnVsZSgvb3IvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuT1IsIFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSxcbiAgICBub3Q6IG5ldyBSdWxlXzEuUnVsZSgvbm90L2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PVCwgVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpLFxuICAgIEFORDogbmV3IFJ1bGVfMS5SdWxlKC9BTkQvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQU5EKSxcbiAgICBwbHVzOiBuZXcgUnVsZV8xLlJ1bGUoL1xcKy9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5BTkQpLFxuICAgIE9SOiBuZXcgUnVsZV8xLlJ1bGUoL09SL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9SKSxcbiAgICB0aWxkZTogbmV3IFJ1bGVfMS5SdWxlKC9+L2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9SKSxcbiAgICBOT1Q6IG5ldyBSdWxlXzEuUnVsZSgvTk9UL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PVCksXG4gICAgbWludXM6IG5ldyBSdWxlXzEuUnVsZSgvLS9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT1QpLFxuICAgIG9wZW5QYXJlbjogbmV3IFJ1bGVfMS5SdWxlKC9cXCgvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuT1BFTiwgVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcpLFxuICAgIGNsb3NlUGFyZW46IG5ldyBSdWxlXzEuUnVsZSgvXFwpL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkNMT1NFLCBUb2tlbl8xLlRva2VuVHlwZS5HUk9VUElORyksXG4gICAgcXVvdGU6IG5ldyBSdWxlXzEuRXNjYXBlYWJsZVJ1bGUoL1wiL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFKSxcbiAgICBzcGFjZTogbmV3IFJ1bGVfMS5SdWxlKC9cXHMvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSwgVG9rZW5fMS5Ub2tlblR5cGUuV0hJVEVfU1BBQ0UpLFxuICAgIG9wZW5BbmdsZTogbmV3IFJ1bGVfMS5SdWxlKC9cXDwvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSwgVG9rZW5fMS5Ub2tlblR5cGUuQVNDSUkpLFxuICAgIGNsb3NlQW5nbGU6IG5ldyBSdWxlXzEuUnVsZSgvXFw+L2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLkFTQ0lJKVxufTtcbmV4cG9ydHMuREVGQVVMVF9WQUxJREFUSU9OX1JVTEVTID0ge1xuICAgIG9wZW5BbmdsZTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFw8L2csICc8JyksXG4gICAgY2xvc2VBbmdsZTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFw+L2csICc+JyksXG4gICAgb3BlbkN1cmx5OiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXHsvZywgJ3snKSxcbiAgICBjbG9zZUN1cmx5OiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXH0vZywgJ30nKSxcbiAgICBvcGVuU3F1YXJlOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXFsvZywgJ1snKSxcbiAgICBjbG9zZVNxdWFyZTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFxdL2csICddJyksXG4gICAgYmFja1NsYXNoOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXFxcL2csICdcXFxcJyksXG4gICAgZm9yd2FyZFNsYXNoOiBuZXcgUnVsZV8xLlZhbGlkYXRpb25SdWxlKC9cXC8vZywgJy8nKSxcbiAgICBjb21tYTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvLC9nLCAnLCcpLFxuICAgIHBlcmlvZDogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFwuL2csICcuJylcbn07XG4vKipcbiAqIFRoZSBjbGFzc2VzIGFuZCBtZXRob2RzIGluIHRoaXMgcGFja2FnZSB3ZXJlIGJhc2VkIG9mZiBvZiB0aGUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmVkZXJpY2tmL2JxcGpzfSBsaWJyYXJ5LlxuICogVGhlIEJvb2xlYW5TZWFyY2ggY2xhc3MgaXMgdGhlIGVudHJ5IHBvaW50IHRvIHRoZSBwYXJzZXIuIFRoZSBmb2xsb3dpbmdcbiAqIHByb3BlcnRpZXMgd2lsbCBwYXJzZSB0aGUgc2VhcmNoIHN0cmluZyBhdXRvbWF0aWNhbGx5OlxuICoge0BsaW5rIEJvb2xlYW5TZWFyY2gjdG9rZW5zfVxuICoge0BsaW5rIEJvb2xlYW5TZWFyY2gjaHRtbH1cbiAqIEBjbGFzcyB7Qm9vbGVhblNlYXJjaH1cbiAqL1xuY2xhc3MgQm9vbGVhblNlYXJjaCB7XG4gICAgY29uc3RydWN0b3Ioc3JjaFN0cmluZywgY29uZmlnKSB7XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9odG1sID0gJyc7XG4gICAgICAgIHRoaXMuX2lzTWFsZm9ybWVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX21heExlbmd0aCA9IDUxMTtcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gW107XG4gICAgICAgIHRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzID0gW107XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkUnVsZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fc3JjaFN0cmluZyA9ICcnO1xuICAgICAgICB0aGlzLl90b2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fc3R5bGVzID0ge1xuICAgICAgICAgICAgZXJyb3I6ICdlcnJvcicsXG4gICAgICAgICAgICBvcGVyYXRvcjogJ29wZXJhdG9yJyxcbiAgICAgICAgICAgIHBvc3NpYmxlT3BlcmF0b3I6ICd3YXJuaW5nJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNlYXJjaFN0cmluZyA9IHNyY2hTdHJpbmcgPyBzcmNoU3RyaW5nIDogJyc7XG4gICAgICAgIGlmIChjb25maWcpIHtcbiAgICAgICAgICAgIHRoaXMucnVsZXMgPSBjb25maWcucnVsZXMgfHwgdGhpcy5ydWxlcztcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGlvblJ1bGVzID0gY29uZmlnLnZhbGlkYXRpb25SdWxlcyB8fCB0aGlzLnZhbGlkYXRpb25SdWxlcztcbiAgICAgICAgICAgIHRoaXMuX3N0eWxlcy5wb3NzaWJsZU9wZXJhdG9yID0gY29uZmlnLnBvc3NpYmxlT3BlcmF0b3JTdHlsZUNsYXNzIHx8ICd3YXJuaW5nJztcbiAgICAgICAgICAgIHRoaXMuX3N0eWxlcy5lcnJvciA9IGNvbmZpZy5lcnJvclN0eWxlQ2xhc3MgfHwgJ2Vycm9yJztcbiAgICAgICAgICAgIHRoaXMuX3N0eWxlcy5vcGVyYXRvciA9IGNvbmZpZy5vcGVyYXRvclN0eWxlQ2xhc3MgfHwgJ29wZXJhdG9yJztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGQgYSBydWxlXG4gICAgICogQHBhcmFtIHJ1bGVOYW1lIHtzdHJpbmd9XG4gICAgICogQHBhcmFtIHJ1bGUge1J1bGV9XG4gICAgICovXG4gICAgYWRkUnVsZShydWxlTmFtZSwgcnVsZSkge1xuICAgICAgICBjb25zdCBydWxlcyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5ydWxlcyksIHsgW3J1bGVOYW1lXTogcnVsZSB9KTtcbiAgICAgICAgdGhpcy5ydWxlcyA9IHJ1bGVzO1xuICAgICAgICAvLyBjb25zb2xlLndhcm4oJ0lmIHlvdSB3YW50IHRoaXMgcnVsZSB0byBiZSB1c2VkLCBiZSBzdXJlIHRvIGFkZCB0aGUgcnVsZSBuYW1lIHRvIHRoZSBydWxlTmFtZXMgYXJyYXkgaW4gdGhlIGFwcHJvcHJpYXRlIHBvc2l0aW9uJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpeCB0aGUgcG9zc2libGUgb3BlcmF0b3JzIGFuZCB1cGRhdGUgdGhlIHNlYXJjaCBzdHJpbmdcbiAgICAgKiBAcGFyYW0gcmVzZXRTZWFyY2gge2Jvb2xlYW59IC0gc2V0IHRydWUgdG8gcmVzZXQgc2VhcmNoIHN0cmluZywgdG9rZW5zIGFuZCBodG1sXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBmaXhPcGVyYXRvcnMocmVzZXRTZWFyY2hTdHJpbmcgPSBmYWxzZSkge1xuICAgICAgICBsZXQgcmV0dXJuVmFsID0gdGhpcy5zZWFyY2hTdHJpbmc7XG4gICAgICAgIGlmICh0aGlzLnRva2VucyAmJiB0aGlzLnRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVyblZhbCA9ICcnO1xuICAgICAgICAgICAgdGhpcy50b2tlbnMuZm9yRWFjaCgodG9rZW4pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4udmFsdWUgPSB0b2tlbi52YWx1ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1I7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmh0bWwgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuVmFsICs9IHRva2VuLnZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzZXRTZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KHJldHVyblZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMgPSB0aGlzLnBhcnNlci5wYXJzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5WYWw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGVycm9yc1xuICAgICAqIEB0eXBlIHtFcnJvcltdfVxuICAgICAqL1xuICAgIGdldCBlcnJvcnMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZXJyb3JzIHx8ICF0aGlzLl9lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdG9rZW5zICYmIHRoaXMuX3Rva2Vucy5sZW5ndGgpIHsgLy8gRG9udCB3YW50IHRvIGluaXRpYXRlIHBhcnNpbmcgb2YgdG9rZW5zXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JUb2tlbnMgPSB0aGlzLl90b2tlbnMuZmlsdGVyKHRva2VuID0+IHRva2VuLmVycm9ycyAmJiB0b2tlbi5lcnJvcnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3JzID0gdGhpcy5fZXJyb3JzIHx8IFtdO1xuICAgICAgICAgICAgICAgIGVycm9yVG9rZW5zLmZvckVhY2goKHRva2VuKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbi5lcnJvcnMgJiYgdG9rZW4uZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdCh0b2tlbi5lcnJvcnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyb3JzID0gZXJyb3JzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvcnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgaHRtbCBmb3IgdGhlIGVudGlyZSBzZWFyY2ggc3RyaW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgaHRtbCgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9odG1sICYmIHRoaXMudG9rZW5zICYmIHRoaXMudG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHRva2VucywgbWF4TGVuZ3RoLCBzZWFyY2hTdHJpbmcgfSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoU3RyaW5nTGVuID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1Rvb0xvbmcgPSBzZWFyY2hTdHJpbmdMZW4gPiBtYXhMZW5ndGg7XG4gICAgICAgICAgICAgICAgY29uc3QgaHRtbEFyciA9IHRva2Vucy5tYXAoKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5zdHlsZXMgPSB0aGlzLnN0eWxlcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBodG1sLCBwb3NpdGlvbiwgdmFsdWUgfSA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmV0dXJuSHRtbCA9IGh0bWw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Rvb0xvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbi5zdGFydCA8PSBtYXhMZW5ndGggJiYgcG9zaXRpb24uZW5kID49IG1heExlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHggKyAxID09PSB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybkh0bWwgPSBgPHNwYW4gY2xhc3M9XCIke3RoaXMuc3R5bGVzLmVycm9yfVwiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5IdG1sID0gYDxzcGFuIGNsYXNzPVwiJHt0aGlzLnN0eWxlcy5lcnJvcn1cIj4ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoaWR4ICsgMSA9PT0gdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybkh0bWwgPSBgJHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dXJuSHRtbDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9odG1sID0gaHRtbEFyci5qb2luKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9odG1sID0gdGhpcy5zZWFyY2hTdHJpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2h0bWw7XG4gICAgfVxuICAgIGdldCBzdHlsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdHlsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRydWUgaWYgdGhlcmUgYXJlIGVycm9yc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldCBpc01hbGZvcm1lZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZXJyb3JzICYmIHRoaXMuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5faXNNYWxmb3JtZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9pc01hbGZvcm1lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIG1heCBsZW5ndGggdGhlIHNlYXJjaCBzdHJpbmcgaXMgYWxsb3dlZCB0byBiZVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0IG1heExlbmd0aCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21heExlbmd0aDtcbiAgICB9XG4gICAgc2V0IG1heExlbmd0aChtYXhMZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fbWF4TGVuZ3RoID0gbWF4TGVuZ3RoO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgYW4gYXJyYXkgb2YgdGhlIG9wZXJhdG9yIHRva2Vuc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCBvcGVyYXRvcnMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fb3BlcmF0b3JzIHx8ICF0aGlzLl9vcGVyYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdG9rZW5zICYmIHRoaXMuX3Rva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB0aGlzLnRva2Vucy5maWx0ZXIoKHRva2VuKSA9PiB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHBhcnNlciB3aGljaCB3aWxsIHBvcHVsYXRlIGFsbCB0aGUgdmFyaW91cyBUb2tlbiBhcnJheXNcbiAgICAgKiBAdHlwZSB7UGFyc2VyfVxuICAgICAqL1xuICAgIGdldCBwYXJzZXIoKSB7XG4gICAgICAgIGlmICghdGhpcy5fcGFyc2VyKSB7XG4gICAgICAgICAgICB0aGlzLl9wYXJzZXIgPSBuZXcgUGFyc2VyXzEuUGFyc2VyKHRoaXMuc2VhcmNoU3RyaW5nLCB0aGlzLnNlbGVjdGVkUnVsZXMsIHRoaXMuc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJzZXI7XG4gICAgfVxuICAgIHNldCBwYXJzZXIocGFyc2VyKSB7XG4gICAgICAgIHRoaXMuX3BhcnNlciA9IHBhcnNlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGFuIGFycmF5IG9mIHRoZSBwb3NzaWJsZSBvcGVyYXRvcnNcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgcG9zc2libGVPcGVyYXRvcnMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgfHwgIXRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Rva2VucyAmJiB0aGlzLl90b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgPSB0aGlzLnRva2Vucy5maWx0ZXIoKHRva2VuKSA9PiB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiB0aGUgcnVsZSBuYW1lcyB3ZSB3YW50IHRvIHVzZSB3aGVuIG1hdGNoaW5nIHRva2Vuc1xuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBnZXQgcnVsZU5hbWVzKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5ydWxlcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE9iamV0IG9mIHJ1bGVzIHdpdGggYSBuYW1lLiBUaGUga2V5IHNob3VsZCBtYXRjaCBhIHZhbHVlIGluIHRoZSBydWxlTmFtZXMgYXJyYXlcbiAgICAgKiBAdHlwZSB7UnVsZXN9XG4gICAgICovXG4gICAgZ2V0IHJ1bGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3J1bGVzKSB7XG4gICAgICAgICAgICB0aGlzLl9ydWxlcyA9IGV4cG9ydHMuREVGQVVMVF9SVUxFUztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcnVsZXM7XG4gICAgfVxuICAgIHNldCBydWxlcyhydWxlcykge1xuICAgICAgICB0aGlzLl9ydWxlcyA9IHJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VhcmNoIHN0cmluZyB0byBwYXJzZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHNlYXJjaFN0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NyY2hTdHJpbmc7XG4gICAgfVxuICAgIHNldCBzZWFyY2hTdHJpbmcoc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3NyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmcucmVwbGFjZSgvXFxuL2csICcnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlbGVjdGVkIHJ1bGVzIGJhc2VkIG9mZiBvZiB0aGUgdmFsdWVzIHByb3ZpZGVkIGluIHRoZSBydWxlTmFtZXNcbiAgICAgKiBAdHlwZSB7UnVsZVtdfVxuICAgICAqL1xuICAgIGdldCBzZWxlY3RlZFJ1bGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3NlbGVjdGVkUnVsZXMgfHwgIXRoaXMuX3NlbGVjdGVkUnVsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RlZFJ1bGVzID0gdGhpcy5ydWxlTmFtZXMuZmlsdGVyKChuYW1lKSA9PiBuYW1lIGluIHRoaXMucnVsZXMpLm1hcCgobmFtZSkgPT4gdGhpcy5ydWxlc1tuYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIHNldCBzZWxlY3RlZFJ1bGVzKHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IHNlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBzZWxlY3RlZCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9mZiBvZiB0aGUgdmFsdWVzIHByb3ZpZGVkIGluIHRoZSB2YWxpZGF0aW9uUnVsZU5hbWVzXG4gICAgICogQHR5cGUge1ZhbGlkYXRpb25SdWxlW119XG4gICAgICovXG4gICAgZ2V0IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzIHx8ICF0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzID0gdGhpcy52YWxpZGF0aW9uUnVsZU5hbWVzXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobmFtZSkgPT4gbmFtZSBpbiB0aGlzLnZhbGlkYXRpb25SdWxlcylcbiAgICAgICAgICAgICAgICAubWFwKChuYW1lKSA9PiB0aGlzLnZhbGlkYXRpb25SdWxlc1tuYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICBzZXQgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMoc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMgPSBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIGFycmF5IG9mIHRva2VucyBmb3VuZCBpbiB0aGUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCB0b2tlbnMoKSB7XG4gICAgICAgIGlmICgoIXRoaXMuX3Rva2VucyB8fCAhdGhpcy5fdG9rZW5zLmxlbmd0aCkgJiYgdGhpcy5zZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX3Rva2VucyA9IHRoaXMucGFyc2VyLnBhcnNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXRoaXMuc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1lvdSBtdXN0IHByb3ZpZGUgYSBzZWFyY2ggc3RyaW5nIHRvIHBhcnNlIGZvciB0b2tlbnMnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdG9rZW5zO1xuICAgIH1cbiAgICBzZXQgdG9rZW5zKHRva2Vucykge1xuICAgICAgICB0aGlzLl90b2tlbnMgPSB0b2tlbnM7XG4gICAgfVxuICAgIGdldCB0cmVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZXIudHJlZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgdGhlIHJ1bGUgbmFtZXMgd2Ugd2FudCB0byB1c2Ugd2hlbiBtYXRjaGluZyB0b2tlbnNcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICovXG4gICAgZ2V0IHZhbGlkYXRpb25SdWxlTmFtZXMoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnZhbGlkYXRpb25SdWxlcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIE9iamV0IG9mIHJ1bGVzIHdpdGggYSBuYW1lLiBUaGUga2V5IHNob3VsZCBtYXRjaCBhIHZhbHVlIGluIHRoZSBydWxlTmFtZXMgYXJyYXlcbiAgICAgKiBAdHlwZSB7VmFsaWRhdGlvblJ1bGVzfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0aW9uUnVsZXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSBleHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICBzZXQgdmFsaWRhdGlvblJ1bGVzKHZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSB2YWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIHJlc2V0KHNlYXJjaFN0cmluZykge1xuICAgICAgICB0aGlzLnNlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZyB8fCAnJztcbiAgICAgICAgdGhpcy50b2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fcG9zc2libGVPcGVyYXRvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gW107XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLnBhcnNlciA9IG5ldyBQYXJzZXJfMS5QYXJzZXIodGhpcy5zZWFyY2hTdHJpbmcsIHRoaXMuc2VsZWN0ZWRSdWxlcywgdGhpcy5zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyk7XG4gICAgfVxufVxuZXhwb3J0cy5Cb29sZWFuU2VhcmNoID0gQm9vbGVhblNlYXJjaDtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5QYXJzZXIgPSB2b2lkIDA7XG5jb25zdCBUb2tlbl8xID0gcmVxdWlyZShcIi4vVG9rZW5cIik7XG4vKipcbiAqIFRoZSBwYXJzZXIgd2lsbCBwYXJzZSB0aGUgc2VhcmNoIHN0cmluZyBhbmQgY3JlYXRlIG1hdGNoZXMgZnJvbSB0aGUgcnVsZXMgYW5kIHRoZW4gdG9rZW5zLlxuICogVGhpcyBjbGFzcyBhbHNvIHB1dHMgd29yZHMgdGhhdCB3ZXJlIHNwbGl0IGJ5IHBvc3NpYmxlL2FjdHVhbCBvcGVyYXRvcnMgYmFjayB0b2doZXRoZXIgYWdhaW4uXG4gKiBFbnN1cmVzIHRleHQgYmV0d2VlbiBxdW90ZXMgaXMgbWFkZSBpbnRvIGEgc2luZ2xlIHRlcm0gdG9rZW4uIEFsbCB0b2tlbnMgYW5kIG1hdGNoZXMgY3JlYXRlZFxuICogYWxvbmcgdGhlIHdheSBhcmUgc3RvcmVkIGFzIHByb3BlcnRpZXMsIG1haW5seSBmb3IgdHJvdWJsZXNob290aW5nIHB1cnBvc2VzLlxuICogQGNsYXNzIHtQYXJzZXJ9XG4gKi9cbmNsYXNzIFBhcnNlciB7XG4gICAgY29uc3RydWN0b3Ioc2VhcmNoU3RyaW5nLCBzZWxlY3RlZFJ1bGVzLCBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX21hdGNoZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fc2VhcmNoU3RyaW5nID0gJyc7XG4gICAgICAgIHRoaXMuX3RyZWUgPSBbXTtcbiAgICAgICAgdGhpcy5fdmFsaWRhdGVkVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3dob2xlVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZztcbiAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IHNlbGVjdGVkUnVsZXMgfHwgW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRpb25SdWxlcyA9IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzIHx8IFtdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc3RyaW5nIHdlJ3JlIGdvaW5nIHRvIHBhcnNlXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgc2VhcmNoU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VhcmNoU3RyaW5nO1xuICAgIH1cbiAgICBzZXQgc2VhcmNoU3RyaW5nKHNlYXJjaFN0cmluZykge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9IHNlYXJjaFN0cmluZztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB3aXRoIGVycm9ycyBhbmQgYWxsIG1hbmlwdWxhdGlvbiBkb25lLiA0dGggcGFzc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0ZWRUb2tlbnMoKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIGlmICghdGhpcy5fdmFsaWRhdGVkVG9rZW5zIHx8ICF0aGlzLl92YWxpZGF0ZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoKF9hID0gdGhpcy52YWxpZGF0aW9uUnVsZXMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoKF9iID0gdGhpcy5maW5hbFRva2VucykgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl92YWxpZGF0ZWRUb2tlbnMgPSB0aGlzLnZhbGlkYXRlVG9rZW5zKHRoaXMuZmluYWxUb2tlbnMsIHRoaXMudmFsaWRhdGlvblJ1bGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgdmFsaWRhdGlvbiBydWxlcyBpbiBvcmRlciB0byB2YWxpZGF0ZSB0aGUgdG9rZW5zJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRlZFRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVG9rZW5zIHRoYXQgaGF2ZSBoYWQgc3BsaXQgd29yZHMgcHV0IGJhY2sgdG9ndGhlciBhbmQgd29yZHMgYmV0d2VlbiBxdW90ZXNcbiAgICAgKiBjb21iaW5lZC4gM3JkIHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgZmluYWxUb2tlbnMoKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX2ZpbmFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMud2hvbGVUb2tlbnMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IHRoaXMuY3JlYXRlVGVybXNGcm9tUXVvdGVzKHRoaXMud2hvbGVUb2tlbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9maW5hbFRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB3aXRoIHNwbGl0IHdvcmRzIGNvbWJpbmVkLiAybmQgcGFzc1xuICAgICAqL1xuICAgIGdldCB3aG9sZVRva2VucygpIHtcbiAgICAgICAgdmFyIF9hLCBfYjtcbiAgICAgICAgaWYgKCEoKF9hID0gdGhpcy5fd2hvbGVUb2tlbnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAoKF9iID0gdGhpcy5pbml0aWFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fd2hvbGVUb2tlbnMgPSB0aGlzLmNyZWF0ZVRlcm1zRnJvbVNwbGl0cyh0aGlzLmluaXRpYWxUb2tlbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl93aG9sZVRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyB0YWtlbiBmcm9tIHRoZSBtYXRjaGVzLiAxc3QgcGFzc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCBpbml0aWFsVG9rZW5zKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9pbml0aWFsVG9rZW5zKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubGVuZ3RoKSkge1xuICAgICAgICAgICAgaWYgKChfYiA9IHRoaXMuaW5pdGlhbE1hdGNoZXMpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gdGhpcy5tYXRjaGVzVG9Ub2tlbnModGhpcy5pbml0aWFsTWF0Y2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBpbml0aWFsIG1hdGNoZXMgZ2F0aGVyZWQgZnJvbSB0aGUgc2VhcmNoU3RyaW5nXG4gICAgICogQHR5cGUge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0IGluaXRpYWxNYXRjaGVzKCkge1xuICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICBpZiAoISgoX2EgPSB0aGlzLl9pbml0aWFsTWF0Y2hlcykgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlYXJjaFN0cmluZyAmJiAoKF9iID0gdGhpcy5zZWxlY3RlZFJ1bGVzKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2IubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluaXRNYXRjaGVzID0gdGhpcy5nZXRJbml0aWFsTWF0Y2hlcyh0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IHRoaXMuZ2V0TWF0Y2hQaHJhc2VzKGluaXRNYXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcHJvdmlkZSBhIHNlYXJjaCBzdHJpbmcgYW5kIHNlbGVjdGVkIHJ1bGVzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxNYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VsZWN0ZWQgcnVsZXMgd2Ugd2lsbCB1c2Ugd2hlbiBjcmVhdGluZyBtYXRjaGVzIGFuZCBzZXR0aW5nIHRva2VuIHR5cGVzXG4gICAgICogQHR5cGUge1J1bGVbXX1cbiAgICAgKi9cbiAgICBnZXQgc2VsZWN0ZWRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBydWxlcyB3ZSB1c2UgZm9yIHZhbGlkYXRpbmcgdG9rZW5zXG4gICAgICogQHR5cGUge1ZhbGlkYXRpb25SdWxlW119XG4gICAgICovXG4gICAgZ2V0IHZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VucyBzdHJ1Y3R1cmVkIGFzIGEgdHJlZSBpbnN0ZWFkIG9mIGEgZmxhdCBhcnJheVxuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCB0cmVlKCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmICghKChfYSA9IHRoaXMuX3RyZWUpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5sZW5ndGgpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy52YWxpZGF0ZWRUb2tlbnMgJiYgdGhpcy52YWxpZGF0ZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdHJlZSA9IHRoaXMuY3JlYXRlVHJlZSh0aGlzLnZhbGlkYXRlZFRva2Vucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyZWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGFuZCBjcmVhdGUgbWF0Y2hlcyBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgcnVsZXNcbiAgICAgKiBAcGFyYW0gc2VhcmNoU3RyaW5nIHtzdHJpbmd9XG4gICAgICogQHBhcmFtIHNlbGVjdGVkUnVsZXMge1J1bGVbXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXRJbml0aWFsTWF0Y2hlcyhzZWFyY2hTdHJpbmcsIHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgLy8gV2UgY2FuJ3QgbWFrZSB0b2tlbnMgeWV0IGJlY2F1c2Ugbm90IGFsbCBtYXRjaGVzIHdpbGwgYmUgZXhhY3RseSBhIHRva2VuXG4gICAgICAgIC8vIEZvciBleGFtcGxlLCB0ZXJtQU5EIHdpbGwgbWF0Y2ggdGhlIEFORCB0ZXN0XG4gICAgICAgIGxldCBtYXRjaGVzID0gW107XG4gICAgICAgIGlmIChzZWFyY2hTdHJpbmcgJiYgc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoU3RyID0gc2VhcmNoU3RyaW5nO1xuICAgICAgICAgICAgbGV0IHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgY3VycmVudElkeCA9IDA7IGN1cnJlbnRJZHggPCBzZWFyY2hTdHIubGVuZ3RoOyBjdXJyZW50SWR4KyspIHtcbiAgICAgICAgICAgICAgICBzdWJTdHIgKz0gc2VhcmNoU3RyLmNoYXJBdChjdXJyZW50SWR4KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJ1bGUgb2Ygc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2hTdGFydCA9IHJ1bGUudGVzdChzdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViU3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBydWxlLnR5cGUgPyBydWxlLnR5cGUgOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogcnVsZS5vcGVyYXRpb24gfHwgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydWxlOiBydWxlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ViU3RyICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdlJ3ZlIGl0ZXJhdGVkIHRvIHRoZSBlbmQgb2YgdGhlIHNlYXJjaCBzdHJpbmcgYnV0IHdlIGhhdmUgc29tZVxuICAgICAgICAgICAgICAgIC8vIHVubWF0Y2hlZCBzdHJpbmcgcmVtYWluaW5nLCB3aGljaCBjYW4gb25seSBiZSBhIHRlcm1cbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdWJTdHIsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHg6IHNlYXJjaFN0ci5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoU3RhcnQ6IC0xLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIucGFyc2VTZWFyY2hTdHJpbmcsIG1hdGNoZXM9JywgbWF0Y2hlcyk7XG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHBocmFzZXMgYmV0d2VlbiBvcGVyYXRvcnMgYW5kIHB1dCBpbiB0aGUgb3BlcmF0b3IgdG9rZW4gcGhyYXNlIHByb3BlcnR5XG4gICAgICogQHBhcmFtIG1hdGNoZXMge01hdGNoW119XG4gICAgICogQHJldHVybnMge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0TWF0Y2hQaHJhc2VzKG1hdGNoZXMpIHtcbiAgICAgICAgbGV0IHBhcnNlZE1hdGNoZXMgPSBbXTtcbiAgICAgICAgbGV0IHBocmFzZVN0YWNrID0gW107XG4gICAgICAgIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKChtYXRjaCwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUgJiYgbWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGhyYXNlU3RhY2sucHVzaChtYXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGhyYXNlQXJyID0gW107XG4gICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKG1hdGNoLnN1YlN0cik7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwaHJhc2VTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdElkeCA9IHBocmFzZVN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFBocmFzZU1hdGNoID0gcGhyYXNlU3RhY2tbbGFzdElkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFBocmFzZU1hdGNoLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFICYmIGxhc3RQaHJhc2VNYXRjaC50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKGxhc3RQaHJhc2VNYXRjaC5zdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZVN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2gucGhyYXNlID0gcGhyYXNlQXJyLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyc2VkTWF0Y2hlcy5wdXNoKG1hdGNoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIuYnVpbGRQaHJhc2VzLCBwYXJzZWRNYXRjaGVzPScsIHBhcnNlZE1hdGNoZXMpO1xuICAgICAgICByZXR1cm4gcGFyc2VkTWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29udmVydCBtYXRjaGVzIHRvIHRva2Vuc1xuICAgICAqIEBwYXJhbSBtYXRjaGVzIHtNYXRjaFtdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIG1hdGNoZXNUb1Rva2VucyhtYXRjaGVzKSB7XG4gICAgICAgIGxldCB0b2tlbnMgPSBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG1hdGNoZXMuZm9yRWFjaCgobWF0Y2gsIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdWJTdHIsIG1hdGNoU3RhcnQsIGN1cnJlbnRJZHgsIHR5cGUsIG9wZXJhdGlvbiwgcGhyYXNlLCBydWxlIH0gPSBtYXRjaDtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBub25UZXJtID0gc3ViU3RyLnNsaWNlKG1hdGNoU3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBjdXJyZW50SWR4IC0gbm9uVGVybS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0ID4gMCkgeyAvLyBtYXRjaCBmb3VuZCBpbiBtaWRkbGUgb3IgZW5kIG9mIHN1YlN0clxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlcm0gPSBzdWJTdHIuc2xpY2UoMCwgbWF0Y2hTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbih0ZXJtLCBUb2tlbl8xLlRva2VuVHlwZS5URVJNLCB1bmRlZmluZWQsIHBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbiA9IHRoaXMuY2hlY2tUb2tlblR5cGUobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucGhyYXNlID0gcGhyYXNlIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucnVsZSA9IHJ1bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IG90aGVyVG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbihub25UZXJtLCB0eXBlLCBvcGVyYXRpb24sIGN1cnJlbnRJZHgpO1xuICAgICAgICAgICAgICAgICAgICBvdGhlclRva2VuLnJ1bGUgPSBydWxlO1xuICAgICAgICAgICAgICAgICAgICBvdGhlclRva2VuLnBocmFzZSA9IHBocmFzZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gob3RoZXJUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBjdXJyZW50SWR4IC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbihzdWJTdHIsIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIHVuZGVmaW5lZCwgcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucnVsZSA9IHJ1bGU7XG4gICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLnBocmFzZSA9IHBocmFzZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdoZW4gYSBtYXRjaCBpcyBmb3VuZCBhbmQgaXQncyBwYXJ0IG9mIGEgd29yZCAoaS5lLiBvcGVyYXRvciwgZm9ya2xpZnQsIGVjdC4pIG11bHRpcGxlXG4gICAgICogdG9rZW5zIGFyZSBjcmVhdGVkLiBUaGlzIHRha2VzIHRob3NlIG11bHRpcGxlIHRva2VucyBhbmQgbWFrZXMgdGhlbSBvbmUgdG9rZW5cbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRlcm1zRnJvbVNwbGl0cyh0b2tlbnMpIHtcbiAgICAgICAgbGV0IG5ld1Rva2VucyA9IFtdO1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxldCBoYW5naW5nVG9rZW5zID0gW107XG4gICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dFRva2VuID0gYXJyW2lkeCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChoYW5naW5nVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHb3QgcGllY2VzIG9mIGEgd29yZCBoYW5naW5nIG91dFxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSAmJiAobmV4dFRva2VuICYmIHRoaXMuaXNUZXJtT3JPcGVyYXRvcihuZXh0VG9rZW4pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR290IG1vcmUgcGllY2VzIG9mIHRoZSB3b3JkIGFmdGVyIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmdpbmdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWFjaGVkIGVuZCBvZiB3b3JkLCBuZXh0IHRva2VuIGlzIG5vdCBhIHdvcmQgb3Igb3BlcmF0b3IsIGNvbWJpbmUgb3VyIGhhbmdpbmcgdG9rZW5zIGludG8gYSBzaW5nbGUgdG9rZW5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBWYWwgPSBoYW5naW5nVG9rZW5zLm1hcCh0b2tlbiA9PiB0b2tlbi52YWx1ZSkuam9pbignJykgKyB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0VuZCA9IHRva2VuLnBvc2l0aW9uLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXJ0ID0gbmV3RW5kIC0gKHRlbXBWYWwubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdUb2tlbiA9IHRoaXMuY3JlYXRlTmV3VG9rZW4odGVtcFZhbCwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSwgbmV3U3RhcnQsIG5ld0VuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5naW5nVG9rZW5zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIGhhbmdpbmcgdG9rZW5zIChpLmUuIHBpZWNlcyBvZiBhIHdvcmQpXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudCB0b2tlbiBub3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBwdXNoIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IHRva2VuIGlzIGEgd29yZCBvciBvcGVyYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXh0VG9rZW4gfHwgIXRoaXMuaXNUZXJtT3JPcGVyYXRvcihuZXh0VG9rZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCB0b2tlbiBpc24ndCBhIHdvcmQgb3Igb3BlcmF0b3IsIGp1c3QgcHVzaCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5leHRUb2tlbiAmJiB0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgdG9rZW4gaXMgYSB3b3JkIG9yIG9wZXJhdG9yLCBjdXJyZW50IHRva2VuIGlzIGEgcGllY2Ugb2YgYSB3b3JkLCBzdGFzaCBpdCBpbiBoYW5naW5nVG9rZW5zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZ2luZ1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIHNob3VsZCBuZXZlciBnZXQgaGVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCb29sZWFuU2VhcmNoLnBhcnNlciwgY3JlYXRlVGVybXNGcm9tU3BsaXRzLCBjdXJyZW50IHRva2VuPScsIHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLmNyZWF0ZVRlcm1zRnJvbVNwbGl0cywgbmV3VG9rZW5zPScsIG5ld1Rva2Vucyk7XG4gICAgICAgIHJldHVybiBuZXdUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyB0b2tlblxuICAgICAqIEBwYXJhbSB2YWx1ZSB7c3RyaW5nfVxuICAgICAqIEBwYXJhbSB0eXBlIHtUb2tlblR5cGV9XG4gICAgICogQHBhcmFtIHN0YXJ0IHtudW1iZXJ9XG4gICAgICogQHBhcmFtIGVuZCB7bnVtYmVyfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbn1cbiAgICAgKi9cbiAgICBjcmVhdGVOZXdUb2tlbih2YWx1ZSwgdHlwZSwgc3RhcnQsIGVuZCkge1xuICAgICAgICBjb25zdCBuZXdUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKHZhbHVlLCB0eXBlLCB1bmRlZmluZWQpO1xuICAgICAgICBjb25zdCBuZXdUb2tlblN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIGNvbnN0IG5ld1Rva2VuRW5kID0gbmV3VG9rZW5TdGFydCArICh2YWx1ZS5sZW5ndGggLSAxKTtcbiAgICAgICAgbmV3VG9rZW4ucG9zaXRpb24gPSB7IHN0YXJ0OiBuZXdUb2tlblN0YXJ0LCBlbmQ6IG5ld1Rva2VuRW5kIH07XG4gICAgICAgIHJldHVybiBuZXdUb2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB0ZXh0IGJldHdlZW4gcXVvdGVzIGFuZCBjb252ZXJ0IGl0IHRvIGEgdGVybSB0b2tlblxuICAgICAqIEBwYXJhbSB0b2tlbnMge1Rva2VuW119XG4gICAgICogQHJldHVybnMge1Rva2VuW119XG4gICAgICovXG4gICAgY3JlYXRlVGVybXNGcm9tUXVvdGVzKHRva2Vucykge1xuICAgICAgICBsZXQgbmV3VG9rZW5zID0gW107XG4gICAgICAgIGlmICh0b2tlbnMgJiYgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgcXVvdGVzID0gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSk7XG4gICAgICAgICAgICBpZiAocXVvdGVzICYmIHF1b3Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgbGV0IHVuY2xvc2VkUXVvdGVUb2tlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRRdW90ZVRva2VuID09PSBudWxsKSB7IC8vIG5vIG9wZW5pbmcgcXVvdGUgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpIHsgLy8gb3BlbmluZyBxdW90ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuY2xvc2VkUXVvdGVUb2tlbiA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLm9wZXJhdGlvbiA9IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9QRU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7IC8vIHdlIGhhdmUgYW4gb3BlbmluZyBxdW90ZSBzb21ld2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSkgeyAvLyBjbG9zaW5nIHF1b3RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbihjdXJyZW50VmFsdWUsIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4uaXNJbnNpZGVRdW90ZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKG5ld1Rva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZFF1b3RlVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5RVU9URTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5vcGVyYXRpb24gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5DTE9TRTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHsgLy8gbm90IHRvIHRoZSBjbG9zaW5nIHF1b3RlIHlldCwganVzdCBrZWVwIGFkZGluZyB0byB0aGUgY3VycmVudFZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzVGVybU9yT3BlcmF0b3IodG9rZW4pICYmIHRva2VuLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLldISVRFX1NQQUNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSArPSB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodW5jbG9zZWRRdW90ZVRva2VuICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIHJldHVybiB0aGUgdG9rZW5zIGJlY2F1c2Ugb3RoZXJ3aXNlIHdlJ2xsIGxvb3NlIGFsbCBvZiB0aGUgdG9rZW5zIGFmdGVyIHRoaXMgdW5jbG9zZWRRdW90ZVRva2VuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3VG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3VG9rZW5zID0gdG9rZW5zO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHRoZSB0b2tlbnMgdG8gZW5zdXJlIG5vIHVuYWxsb3dlZCBjaGFyYWN0ZXJzLCBvciBtYWxmb3JtZWQgdGV4dCAoaS5lLiBvcGVuaW5nIHBhcmVuIHdpdGggbm8gY2xvc2luZyBwYXJlbiwgZXRjKVxuICAgICAqIEBwYXJhbSB0b2tlbnMge1Rva2VuW119XG4gICAgICogQHBhcmFtIHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzIHtWYWxpZGF0aW9uUnVsZVtdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIHZhbGlkYXRlVG9rZW5zKHRva2Vucywgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMuZm9yRWFjaCgocnVsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBMb29wIHRocm91Z2ggdmFsaWRhdGlvbiBydWxlcyBhbmQgZW5zdXJlIGVhY2ggdG9rZW4gcGFzc2VzIGVhY2ggcnVsZVxuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2ggPSBydWxlLnRlc3QodG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRva2VuLmlzSW5zaWRlUXVvdGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEludmFsaWQgY2hhcmFjdGVyIGF0IHBvc2l0aW9uICR7dG9rZW4ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHtydWxlLmNoYXJhY3Rlcn0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcgJiYgdG9rZW4udmFsdWUgPT09ICcoJyAmJiBpZHggPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBhbiBvcGVyYXRvciBwcmVjZWRlcyBhIGdyb3VwaW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZUb2tlbiA9IHRoaXMuZ2V0UHJlY2VkaW5nT3BlcmF0b3JUb2tlbih0b2tlbnMsIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2VG9rZW4gJiYgKCFwcmV2VG9rZW4udG9rZW4gfHwgKHByZXZUb2tlbiAmJiBwcmV2VG9rZW4uZGlzdGFuY2UgPiAyKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJldlRva2VuLnRva2VuID8gcHJldlRva2VuLnRva2VuLnZhbHVlIDogdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgQW4gb3BlcmF0b3Igc2hvdWxkIHByZWNlZGUgYSBncm91cGluZyBhdCBwb3NpdGlvbiAke3Rva2VuLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7dmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBubyBiYWNrIHRvIGJhY2sgb3BlcmF0b3JzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRUb2tlbiA9IGFycltpZHggKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFRva2VuMiA9IGFycltpZHggKyAyXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXh0VG9rZW4gJiYgbmV4dFRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5leHRUb2tlbjIgJiYgbmV4dFRva2VuMi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBDYW5ub3QgaGF2ZSBvcGVyYXRvcnMgYmFjayB0byBiYWNrIGF0IHBvc2l0aW9uICR7dG9rZW4ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHt0b2tlbi52YWx1ZX0gJHtuZXh0VG9rZW4udmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHVuY2xvc2VkVHlwZXMgPSBbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5HUk9VUElORywgbXNnTmFtZVBhcnQ6ICdwYXJlbicgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFLCBtc2dOYW1lUGFydDogJ3F1b3RlJyB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgdW5jbG9zZWRUeXBlcy5mb3JFYWNoKCh0b2tlblR5cGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmNsb3NlZEdyb3VwVG9rZW4gPSB0aGlzLmdldFVuY2xvc2VkR3JvdXBJdGVtKHRva2VucywgdG9rZW5UeXBlLnR5cGUpO1xuICAgICAgICAgICAgICAgIGlmICh1bmNsb3NlZEdyb3VwVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5jbG9zZWRJZCA9IHVuY2xvc2VkR3JvdXBUb2tlbi5pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsdGVyZWRUb2tlbnMgPSB0b2tlbnMuZmlsdGVyKHNyY1Rva2VuID0+IHNyY1Rva2VuLmlkID09PSB1bmNsb3NlZElkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcmVkVG9rZW5zICYmIGZpbHRlcmVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYFVubWF0Y2hlZCAke3Rva2VuVHlwZS5tc2dOYW1lUGFydH0gYXQgcG9zaXRpb24gJHtmaWx0ZXJlZFRva2Vuc1swXS5wb3NpdGlvbi5zdGFydH0gJiMzOTske2ZpbHRlcmVkVG9rZW5zWzBdLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRUb2tlbnNbMF0uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB7IFdISVRFX1NQQUNFLCBQT1NTSUJMRSwgT1BFUkFUT1IgfSA9IFRva2VuXzEuVG9rZW5UeXBlO1xuICAgICAgICAgICAgY29uc3QgZmlyc3RUb2tlbiA9IHRva2Vuc1swXS50eXBlO1xuICAgICAgICAgICAgY29uc3Qgc2Vjb25kVG9rZW4gPSB0b2tlbnMubGVuZ3RoID49IDIgPyB0b2tlbnNbMV0udHlwZSA6IG51bGw7XG4gICAgICAgICAgICBpZiAoKGZpcnN0VG9rZW4gPT09IE9QRVJBVE9SIHx8IGZpcnN0VG9rZW4gPT09IFBPU1NJQkxFKSB8fFxuICAgICAgICAgICAgICAgIChmaXJzdFRva2VuID09PSBXSElURV9TUEFDRSAmJiAoc2Vjb25kVG9rZW4gJiYgc2Vjb25kVG9rZW4gPT09IE9QRVJBVE9SIHx8IHNlY29uZFRva2VuID09PSBQT1NTSUJMRSkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEEgc2VhcmNoIG11c3Qgbm90IGJlZ2luIHdpdGggYW4gb3BlcmF0b3IgYXQgcG9zaXRpb24gMCAmIzM5OyR7dG9rZW5zWzBdLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgIHRva2Vuc1swXS5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsYXN0SWR4ID0gdG9rZW5zLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICBjb25zdCBsYXN0VG9rZW4gPSB0b2tlbnNbbGFzdElkeF0udHlwZTtcbiAgICAgICAgICAgIGNvbnN0IG5leHRMYXN0VG9rZW4gPSB0b2tlbnMubGVuZ3RoID49IDIgPyB0b2tlbnNbbGFzdElkeCAtIDFdLnR5cGUgOiBudWxsO1xuICAgICAgICAgICAgaWYgKChsYXN0VG9rZW4gPT09IE9QRVJBVE9SIHx8IGxhc3RUb2tlbiA9PT0gUE9TU0lCTEUpIHx8XG4gICAgICAgICAgICAgICAgKGxhc3RUb2tlbiA9PT0gV0hJVEVfU1BBQ0UgJiZcbiAgICAgICAgICAgICAgICAgICAgKG5leHRMYXN0VG9rZW4gJiYgbmV4dExhc3RUb2tlbiA9PT0gUE9TU0lCTEUgfHwgbmV4dExhc3RUb2tlbiA9PT0gT1BFUkFUT1IpKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBBIHNlYXJjaCBtdXN0IG5vdCBlbmQgd2l0aCBhbiBvcGVyYXRvciBhdCBwb3NpdGlvbiAke3Rva2Vuc1tsYXN0SWR4XS5wb3NpdGlvbi5zdGFydH0gJiMzOTske3Rva2Vuc1tsYXN0SWR4XS52YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICB0b2tlbnNbbGFzdElkeF0uZXJyb3JzLnB1c2gobmV3IEVycm9yKG1zZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIudmFsaWRhdGVUb2tlbnMsIHRva2Vucz0nLCB0b2tlbnMpO1xuICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUYWtlIHRoZSBhcnJheSBvZiB0b2tlbnMgYW5kIGJ1aWxkIGEgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRyZWUodG9rZW5zKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSBbXTtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCB7IE9QRU4sIENMT1NFIH0gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IHF1ZVRva2VucyA9IEFycmF5LmZyb20odG9rZW5zKTtcbiAgICAgICAgICAgIGNvbnN0IGluUHJvY1BhcmVudHMgPSBbXTsgLy8gUG9wdWxhdGUgZm9yIG5lc3RlZCBncm91cHNcbiAgICAgICAgICAgIGNvbnN0IGdldEtpZHMgPSAocGFyZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIF9hO1xuICAgICAgICAgICAgICAgIGxldCBraWRUb2tlbiA9IHF1ZVRva2Vucy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChraWRUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0ga2lkVG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdXBpbmcoa2lkVG9rZW4pICYmIG9wZXJhdGlvbiA9PT0gT1BFTikge1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4uaXNDaGlsZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc1NpYmxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5Qcm9jUGFyZW50cy51bnNoaWZ0KGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldEtpZHMoa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzR3JvdXBpbmcoa2lkVG9rZW4pICYmIG9wZXJhdGlvbiA9PT0gQ0xPU0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluIGEgbmVzdGVkIGdyb3VwaW5nLCBkb24ndCB3YW50IHRoZSBjbG9zaW5nIHRva2VuIHRvIGJlIGluY2x1ZGVkIGFzIGEgY2hpbGRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9mIHRoZSBjdXJyZW50bHkgcHJvY2Vzc2luZyBwYXJlbnQuIEl0IHNob3VsZCBiZSBhIGNoaWxkIG9mIHRoZSBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGFyZW50IGlmIGl0IGV4aXN0cy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzU2libGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2UGFyZW50ID0gaW5Qcm9jUGFyZW50cy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZQYXJlbnQgJiYgaW5Qcm9jUGFyZW50c1swXSAmJiAoKF9hID0gaW5Qcm9jUGFyZW50c1swXSkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmlkKSAhPT0gcHJldlBhcmVudC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluUHJvY1BhcmVudHNbMF0uY2hpbGRyZW4ucHVzaChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVUb2tlbnMudW5zaGlmdChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuLmlzQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsZXQgdG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIHdoaWxlICh0b2tlbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgb3BlcmF0aW9uIH0gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VwaW5nKHRva2VuKSAmJiBvcGVyYXRpb24gPT09IE9QRU4pIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uaXNTaWJsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5Qcm9jUGFyZW50cy51bnNoaWZ0KHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgZ2V0S2lkcyh0b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRyZWUucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBxdWVUb2tlbnMuc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJlZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHdlJ3ZlIGdvdCB0aGUgcmlnaHQgdG9rZW4gdHlwZSBhZnRlciBtYW5pcHVsYXRpbmcgdGhlIG1hdGNoLiBGb3IgZXhhbXBsZTpcbiAgICAgKiB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGlzIG1hdGNoIGFycmF5IHdpbGwgaGF2ZSBhIHRva2VuIHR5cGUgb2YgUE9TU0lCTEU6XG4gICAgICogW2Zvciwga2xpZnRdXG4gICAgICogYWZ0ZXIgYSB0b2tlbiBpcyBjcmVhdGVkLCB3ZSdsbCBlbmQgdXAgd2l0aDpcbiAgICAgKiBbZiwgb3IsIGtsaWZ0XVxuICAgICAqIHRoZSBmaXN0IGVsZW1lbnQgd2lsbCBzdGlsbCBoYXZlIGEgdG9rZW4gdHlwZSBvZiBQT1NTSUJMRSBhcyB3aWxsIHRoZSBzZWNvbmQgZWxlbWVudFxuICAgICAqIHdlIG5lZWQgdG8gZW5zdXJlIHRoYXQgdGhlIGZpcnN0IGVsZW1lbnQncyB0b2tlbiB0eXBlIGdldHMgc2V0IHRvIFRFUk0gc28gdGhhdCB3ZSBtYXlcbiAgICAgKiBwdXQgdGhpcyBzcGxpdCB3b3JkIGJhY2sgdG9nZXRoZXIgbGF0ZXIgaW4gdGhlIHByb2Nlc3NcbiAgICAgKiBAcGFyYW0gdG9rZW4ge1Rva2VufVxuICAgICAqL1xuICAgIGNoZWNrVG9rZW5UeXBlKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgdHlwZXNJblN0ciA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcnVsZXNJblN0ciA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBydWxlIG9mIHRoaXMuc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoU3RhcnQgPSBydWxlLnRlc3QodG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlc0luU3RyLnB1c2gocnVsZS50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgcnVsZXNJblN0ci5wdXNoKHJ1bGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlc0luU3RyLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygncGFyc2VyLmNoZWNrVG9rZW5UeXBlJylcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlc0luU3RyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSB0eXBlc0luU3RyWzBdIHx8IFRva2VuXzEuVG9rZW5UeXBlLlRFUk07XG4gICAgICAgICAgICAgICAgdG9rZW4ucnVsZSA9IHJ1bGVzSW5TdHJbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuVEVSTTtcbiAgICAgICAgICAgICAgICB0b2tlbi5ydWxlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBmaXJzdCBwcmV2aW91cyBPUEVSQVRPUiBmcm9tIHRoZSB0b2tlbiBhdCB0aGUgc3RhcnRJZHggaW5kZXhcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEBwYXJhbSBzdGFydElkeCB7bnVtYmVyfSBUaGUgdG9rZW4gaW5kZXggaW4gdGhlIHRva2VucyBhcnJheVxuICAgICAqL1xuICAgIGdldFByZWNlZGluZ09wZXJhdG9yVG9rZW4odG9rZW5zLCBzdGFydElkeCkge1xuICAgICAgICBsZXQgcmV0dXJuVG9rZW4gPSBudWxsO1xuICAgICAgICBsZXQgcmV0dXJuT2JqID0gbnVsbDtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoICYmICh0b2tlbnMubGVuZ3RoIC0gMSkgPj0gc3RhcnRJZHgpIHtcbiAgICAgICAgICAgIHJldHVyblRva2VuID0gdG9rZW5zW3N0YXJ0SWR4XTtcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHN0YXJ0SWR4O1xuICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgIHdoaWxlIChwb3NpdGlvbiA+IC0xICYmIHJldHVyblRva2VuICYmIChyZXR1cm5Ub2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUiAmJiByZXR1cm5Ub2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSkpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbi0tO1xuICAgICAgICAgICAgICAgIHJldHVyblRva2VuID0gdG9rZW5zW3Bvc2l0aW9uXTtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuT2JqID0geyB0b2tlbjogcmV0dXJuVG9rZW4sIGRpc3RhbmNlOiBjb3VudCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5PYmo7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGVyZSBhcmUgbm8gdW5jbG9zZWQgZ3JvdXAgdG9rZW5zXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcGFyYW0gdG9rZW5UeXBlIHtUb2tlblR5cGV9IFRoZSBncm91cCB0b2tlbiB0eXBlIHRvIGNoZWNrIGZvclxuICAgICAqIEByZXR1cm5zIHtUb2tlbn1cbiAgICAgKi9cbiAgICBnZXRVbmNsb3NlZEdyb3VwSXRlbSh0b2tlbnMsIHRva2VuVHlwZSkge1xuICAgICAgICBsZXQgdW5jbG9zZWRHcm91cFRva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlVG9rZW5zID0gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi50eXBlID09PSB0b2tlblR5cGUpO1xuICAgICAgICAgICAgaWYgKHR5cGVUb2tlbnMgJiYgdHlwZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmNsb3NlZEdyb3VwVG9rZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSB0b2tlblR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZEdyb3VwVG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSB0b2tlblR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZEdyb3VwVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuY2xvc2VkR3JvdXBUb2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSB0b2tlbiBpcyBhIFBhcmVuIG9yIFF1b3RlXG4gICAgICogQHBhcmFtIHRva2VuIHtUb2tlbn1cbiAgICAgKi9cbiAgICBpc0dyb3VwaW5nKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgeyB0eXBlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgIGNvbnN0IHsgUVVPVEUsIEdST1VQSU5HIH0gPSBUb2tlbl8xLlRva2VuVHlwZTtcbiAgICAgICAgICAgIHJldHVybiAodHlwZSA9PT0gUVVPVEUgfHwgdHlwZSA9PT0gR1JPVVBJTkcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRva2VuIGlzIGEgVEVSTSwgUE9TU0lCTEUgb3IgT1BFUkFUT1JcbiAgICAgKiBAcGFyYW0gdG9rZW4ge1Rva2VufVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzVGVybU9yT3BlcmF0b3IodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGUgfSA9IHRva2VuO1xuICAgICAgICAgICAgY29uc3QgeyBURVJNLCBQT1NTSUJMRSwgT1BFUkFUT1IgfSA9IFRva2VuXzEuVG9rZW5UeXBlO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGUgPT09IFRFUk0gfHwgdHlwZSA9PT0gUE9TU0lCTEUgfHwgdHlwZSA9PT0gT1BFUkFUT1I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXJzZSB0aGUgc2VhcmNoIHN0cmluZyBhbmQgYnVpbGQgb3V0IGFsbCB0aGUgcHJvcGVydGllc1xuICAgICAqL1xuICAgIHBhcnNlKCkge1xuICAgICAgICBpZiAodGhpcy5zZWFyY2hTdHJpbmcgJiYgdGhpcy5zZWxlY3RlZFJ1bGVzICYmIHRoaXMudmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZWRUb2tlbnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgdGhlIHNlYXJjaCBzdHJpbmcsIHNlbGVjdGVkIHJ1bGVzIGFuZCB2YWxpZGF0aW9uIHJ1bGVzIHRvIHByb2NlZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgdGhlIGFycmF5cyBvZiB0aGlzIGNsYXNzXG4gICAgICovXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuX2ZpbmFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxNYXRjaGVzID0gW107XG4gICAgICAgIHRoaXMuX2luaXRpYWxUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fbWF0Y2hlcyA9IFtdO1xuICAgICAgICB0aGlzLl90cmVlID0gW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRlZFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl93aG9sZVRva2VucyA9IFtdO1xuICAgIH1cbn1cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlZhbGlkYXRpb25SdWxlID0gZXhwb3J0cy5Fc2NhcGVhYmxlUnVsZSA9IGV4cG9ydHMuUnVsZSA9IHZvaWQgMDtcbmNvbnN0IFRva2VuXzEgPSByZXF1aXJlKFwiLi9Ub2tlblwiKTtcbi8qKlxuICogVG9wIGxldmVsIGNsYXNzIGZvciBhIHJ1bGUuIFJ1bGVzIGRlZmluZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuIHRvIGxvb2sgZm9yXG4gKiB3aXRoaW4gYSB7QGxpbmsgVG9rZW4jdmFsdWV9XG4gKiBAY2xhc3Mge1J1bGV9XG4gKi9cbmNsYXNzIFJ1bGUge1xuICAgIGNvbnN0cnVjdG9yKHBhdHRlcm4sIG9wZXJhdGlvbiwgdHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgIHRoaXMuX3BhdHRlcm4gPSBwYXR0ZXJuO1xuICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBIHJlZ3VsYXIgZXhwcmVzc2lvbiBwYXR0ZXJuXG4gICAgICogQHR5cGUge1JlZ0V4cH1cbiAgICAgKi9cbiAgICBnZXQgcGF0dGVybigpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9wYXR0ZXJuKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFBhdHRlcm4gZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXR0ZXJuO1xuICAgIH1cbiAgICBzZXQgcGF0dGVybihwYXR0ZXJuKSB7XG4gICAgICAgIHRoaXMuX3BhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgb3BlcmF0aW9uIHRva2VucyB0aGF0IG1hdGNoIHRoaXMgcnVsZSBwZXJmb3JtXG4gICAgICogQHR5cGUge1Rva2VuT3BlcmF0aW9uc31cbiAgICAgKi9cbiAgICBnZXQgb3BlcmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0aW9uO1xuICAgIH1cbiAgICBzZXQgb3BlcmF0aW9uKG9wZXJhdGlvbikge1xuICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbiB0eXBlIGZvciB0b2tlbnMgbWF0Y2hpbmcgdGhpcyBydWxlXG4gICAgICogQHR5cGUge1Rva2VuVHlwZX1cbiAgICAgKi9cbiAgICBnZXQgdHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3R5cGU7XG4gICAgfVxuICAgIHNldCB0eXBlKHR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRlc3QgaWYgdGhlIHBhc3NlZCBpbiBzdHIgbWF0Y2hlcyB0aGUgcGF0dGVybiBvZiB0aGlzIHJ1bGVcbiAgICAgKiBAcGFyYW0gc3RyIHtzdHJpbmd9XG4gICAgICovXG4gICAgdGVzdChzdHIpIHtcbiAgICAgICAgaWYgKHRoaXMucGF0dGVybikge1xuICAgICAgICAgICAgcmV0dXJuIHN0ci5zZWFyY2godGhpcy5wYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFBhdHRlcm4gZGVmaW5lZCcpO1xuICAgIH1cbn1cbmV4cG9ydHMuUnVsZSA9IFJ1bGU7XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcGF0dGVybiBpcyBlc2NhcGVkXG4gKiBAY2xhc3Mge0VzY2FwYWJsZVJ1bGV9XG4gKiBAZXh0ZW5kcyB7UnVsZX1cbiAqL1xuY2xhc3MgRXNjYXBlYWJsZVJ1bGUgZXh0ZW5kcyBSdWxlIHtcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBvcGVyYXRpb24sIHR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICBzdXBlcihuYW1lLCBvcGVyYXRpb24sIHR5cGUpO1xuICAgIH1cbiAgICB0ZXN0KHN0cikge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc3VwZXIudGVzdChzdHIpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyLmNoYXJBdChyZXN1bHQgLSAxKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5leHBvcnRzLkVzY2FwZWFibGVSdWxlID0gRXNjYXBlYWJsZVJ1bGU7XG4vKipcbiAqIFJ1bGUgZm9yIHZhbGlkYXRpbmcgdG9rZW5zXG4gKiBAY2xhc3Mge1ZhbGlkYXRpb25SdWxlfVxuICogQGV4dGVuZHMge1J1bGV9XG4gKi9cbmNsYXNzIFZhbGlkYXRpb25SdWxlIGV4dGVuZHMgUnVsZSB7XG4gICAgY29uc3RydWN0b3IocGF0dGVybiwgY2hhcmFjdGVyKSB7XG4gICAgICAgIHN1cGVyKHBhdHRlcm4sIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkVSUk9SKTtcbiAgICAgICAgdGhpcy5fY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY2hhcmFjdGVyIHRoYXQgd2lsbCBiZSByZXBvcnRlZCBhcyBhbiBlcnJvciBtZXNzYWdlIGluc2lkZSB0aGUgdG9rZW5cbiAgICAgKiB3aXRoIHRoZSBlcnJvclxuICAgICAqL1xuICAgIGdldCBjaGFyYWN0ZXIoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGFyYWN0ZXI7XG4gICAgfVxuICAgIHNldCBjaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG4gICAgICAgIHRoaXMuX2NoYXJhY3RlciA9IGNoYXJhY3RlcjtcbiAgICB9XG59XG5leHBvcnRzLlZhbGlkYXRpb25SdWxlID0gVmFsaWRhdGlvblJ1bGU7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuVG9rZW4gPSBleHBvcnRzLlRva2VuT3BlcmF0aW9ucyA9IGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgPSBleHBvcnRzLlRva2VuVHlwZSA9IHZvaWQgMDtcbi8qKlxuICogVGhlIHR5cGUgb2YgdmFsdWUgZm9yIHRoaXMgdG9rZW5cbiAqL1xudmFyIFRva2VuVHlwZTtcbihmdW5jdGlvbiAoVG9rZW5UeXBlKSB7XG4gICAgLyoqXG4gICAgICogVXN1YWxseSBhIHdvcmQgb3IgbGV0dGVyIHRoYXQgaXMgbm90IG9uZSBvZiB0aGUgb3RoZXIgdG9rZW4gdHlwZXNcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJURVJNXCJdID0gXCJ0ZXJtXCI7XG4gICAgLyoqXG4gICAgICogQW4gYWN0dWFsIG9wZXJhdG9yIChBTkQsIE9SLCBOT1QsICssIH4sIC0pXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiT1BFUkFUT1JcIl0gPSBcIm9wZXJhdG9yXCI7XG4gICAgLyoqXG4gICAgICogQSBwb3NzaWJsZSBvcGVyYXRvciAoYW5kLCBvciwgbm90KVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlBPU1NJQkxFXCJdID0gXCJwb3NzaWJsZVwiO1xuICAgIC8qKlxuICAgICAqIFdoaXRlc3BhY2Ugb2Ygc29tZSBraW5kLCB1c3VhbGx5IGEgc3BhY2VcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJXSElURV9TUEFDRVwiXSA9IFwid2hpdGVzcGFjZVwiO1xuICAgIC8qKlxuICAgICAqIFVzdWFsbHkgYSBwYXJlbiBvZiBzb21lIHNvcnRcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJHUk9VUElOR1wiXSA9IFwiZ3JvdXBpbmdcIjtcbiAgICAvKipcbiAgICAgKiBBIHF1b3RlIChcIilcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJRVU9URVwiXSA9IFwicXVvdGVcIjtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgdGhpcyBpcyBqdXN0IGFuZ2xlIGJyYWNrZXRzICg8ID4pLiBUaGVzZSBuZWVkIHRoZWlyIG93blxuICAgICAqIHNwZWNpYWwgdHlwZSB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gdHJlYXRpbmcgdGhlbSBhbmQgdGhlaXIgdGV4dFxuICAgICAqIGFzIGh0bWwgdGFnc1xuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIkFTQ0lJXCJdID0gXCJhc2NpaVwiO1xufSkoVG9rZW5UeXBlID0gZXhwb3J0cy5Ub2tlblR5cGUgfHwgKGV4cG9ydHMuVG9rZW5UeXBlID0ge30pKTtcbi8qKlxuICogVGhlIGFjdHVhbCBvcGVyYXRvcnMuIFRoaXMgaXMgdXNlZCB0byBkZWZpbmUgd2hhdCBhIHBvc3NpYmxlIG9yIHN5bWJvbCBhY3R1YWxseSBpc1xuICovXG52YXIgVG9rZW5PcGVyYXRvcnM7XG4oZnVuY3Rpb24gKFRva2VuT3BlcmF0b3JzKSB7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJBTkRcIl0gPSBcIkFORFwiO1xuICAgIFRva2VuT3BlcmF0b3JzW1wiT1JcIl0gPSBcIk9SXCI7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJOT1RcIl0gPSBcIk5PVFwiO1xufSkoVG9rZW5PcGVyYXRvcnMgPSBleHBvcnRzLlRva2VuT3BlcmF0b3JzIHx8IChleHBvcnRzLlRva2VuT3BlcmF0b3JzID0ge30pKTtcbi8qKlxuICogUG9zc2libGUsIEFjdHVhbCBhbmQgU3ltYm9sIE9wZXJhdG9ycyBnZXQgdGhlaXIgcmVzcGVjdGl2ZSBBTkQvT1IvTk9ULiBRdW90ZXMgYW5kIHBhcmVuc1xuICogZ2V0IHRoZWlyIHJlc3BlY3RpdmUgT1BFTi9DTE9TRS4gVGVybXMgYXJlIE5PTkUgYW5kIGVycm9ycyBhcmUgRVJST1IuXG4gKi9cbnZhciBUb2tlbk9wZXJhdGlvbnM7XG4oZnVuY3Rpb24gKFRva2VuT3BlcmF0aW9ucykge1xuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlL0FjdHVhbC9TeW1ib2wgQU5EIG9wZXJhdG9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiQU5EXCJdID0gXCJBTkRcIjtcbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZS9BY3R1YWwvU3ltYm9sIE9SIG9wZXJhdG9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiT1JcIl0gPSBcIk9SXCI7XG4gICAgLyoqXG4gICAgICogUG9zc2libGUvQWN0dWFsL1N5bWJvbCBOT1Qgb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJOT1RcIl0gPSBcIk5PVFwiO1xuICAgIC8qKlxuICAgICAqIE9wZW5pbmcgUGFyZW4gb3IgUXVvdGVcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJPUEVOXCJdID0gXCJvcGVuXCI7XG4gICAgLyoqXG4gICAgICogQ2xvc2luZyBQYXJlbiBvciBRdW90ZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIkNMT1NFXCJdID0gXCJjbG9zZVwiO1xuICAgIC8qKlxuICAgICAqIFRlcm0gb3IgV2hpdGVzcGFjZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk5PTkVcIl0gPSBcIm5vbmVcIjtcbiAgICAvKipcbiAgICAgKiBFcnJvclxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIkVSUk9SXCJdID0gXCJlcnJvclwiO1xufSkoVG9rZW5PcGVyYXRpb25zID0gZXhwb3J0cy5Ub2tlbk9wZXJhdGlvbnMgfHwgKGV4cG9ydHMuVG9rZW5PcGVyYXRpb25zID0ge30pKTtcbi8qKlxuICogQSB0b2tlbiBkZWZpbmVzIGEgcGllY2Ugb2YgdGV4dCBmb3VuZCBpbiB0aGUgc2VhcmNoIHN0cmluZy4gVGhpcyBjYW4gYmUgc2luZ2xlIHdvcmRzIGFuZCBjaGFyYWN0ZXJzXG4gKiBidXQgYWxzbyBtdWx0aXBsZSB3b3JkcyAoaS5lLiB0aGUgdGV4dCBiZXR3ZWVuIHF1b3RlcylcbiAqIEBjbGFzcyB7VG9rZW59XG4gKi9cbmNsYXNzIFRva2VuIHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgVG9rZW4gYW5kIGFzc2lnbiBhIHJhbmRvbSBJRCBzdHJpbmdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZSwgdHlwZSwgb3BlcmF0aW9uID0gVG9rZW5PcGVyYXRpb25zLk5PTkUsIHBvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9odG1sID0gJyc7XG4gICAgICAgIHRoaXMuX2lkID0gJyc7XG4gICAgICAgIHRoaXMuX2lzQ2hpbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNTaWJsaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzSW5zaWRlUXVvdGVzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3BocmFzZSA9ICcnO1xuICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHsgc3RhcnQ6IC0xLCBlbmQ6IC0xIH07XG4gICAgICAgIHRoaXMuX3R5cGUgPSBUb2tlblR5cGUuVEVSTTtcbiAgICAgICAgdGhpcy5fc3R5bGVDbGFzc2VzID0ge1xuICAgICAgICAgICAgZXJyb3I6ICdlcnJvcicsXG4gICAgICAgICAgICBvcGVyYXRvcjogJ29wZXJhdG9yJyxcbiAgICAgICAgICAgIHBvc3NpYmxlT3BlcmF0b3I6ICd3YXJuaW5nJ1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICAgICAgaWYgKG9wZXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fb3BlcmF0aW9uID0gb3BlcmF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwb3NpdGlvbiAhPT0gbnVsbCAmJiBwb3NpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBzdGFydFBvcyA9IHRoaXMuY2FsY1N0YXJ0KHBvc2l0aW9uLCBsZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgZW5kUG9zID0gdGhpcy5jYWxjRW5kKHN0YXJ0UG9zLCBsZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5fcG9zaXRpb24gPSB7IHN0YXJ0OiBzdGFydFBvcywgZW5kOiBlbmRQb3MgfTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRoZSBzdGFydGluZyBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiB7bnVtYmVyfSBUaGUgY3VycmVudCBpbmRleCBmcm9tIHRoZSBpbml0aWFsTWF0Y2hlcyBnZXR0ZXIgaW4gdGhlIHBhcnNlclxuICAgICAqIEBwYXJhbSBsZW5ndGgge251bWJlcn0gVGhlIGxlbmd0aCBvZiB0aGUgdGV4dFxuICAgICAqL1xuICAgIGNhbGNTdGFydChwb3NpdGlvbiwgbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbiAtIChsZW5ndGggLSAxKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRoZSBlbmQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gcG9zaXRpb24ge251bWJlcn0gVXN1YWxseSB0aGUgc3RhcnRpbmcgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gbGVuZ3RoIHtudW1iZXJ9IHRoZSBsZW5ndGggb2YgdGhlIHRleHRcbiAgICAgKi9cbiAgICBjYWxjRW5kKHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uICsgKGxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgY2hpbGQgdG9rZW5zLiBVc3VhbGx5IHRleHQgYmV0d2VlbiBxdW90ZXMgb3IgcGFyZW5zXG4gICAgICovXG4gICAgZ2V0IGNoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW47XG4gICAgfVxuICAgIHNldCBjaGlsZHJlbihjaGlsZHJlbikge1xuICAgICAgICB0aGlzLl9jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBlcnJvcnMgZm9yIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7RXJyb3JbXX1cbiAgICAgKi9cbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3JzO1xuICAgIH1cbiAgICBzZXQgZXJyb3JzKGVycm9ycykge1xuICAgICAgICB0aGlzLl9lcnJvcnMgPSBlcnJvcnM7XG4gICAgfVxuICAgIGdldCBzdHlsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdHlsZUNsYXNzZXM7XG4gICAgfVxuICAgIHNldCBzdHlsZXMoc3R5bGVDbGFzc2VzKSB7XG4gICAgICAgIHRoaXMuX3N0eWxlQ2xhc3NlcyA9IHN0eWxlQ2xhc3NlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIGh0bWwgZm9yIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBodG1sKCkge1xuICAgICAgICBsZXQgc3BhbiA9IG51bGw7XG4gICAgICAgIGxldCBzdHlsZUNsYXNzID0gbnVsbDtcbiAgICAgICAgY29uc3QgeyBlcnJvcnMsIHJ1bGUsIF9odG1sLCB0eXBlLCB2YWx1ZSB9ID0gdGhpcztcbiAgICAgICAgaWYgKGVycm9ycyAmJiBlcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBzdHlsZUNsYXNzID0gdGhpcy5zdHlsZXMuZXJyb3I7XG4gICAgICAgICAgICBjb25zdCBlcnJvclN0ciA9IGVycm9ycy5tYXAoKGVyciwgaWR4KSA9PiBlcnIubWVzc2FnZSkuam9pbignJiMxMDsnKTtcbiAgICAgICAgICAgIHNwYW4gPSBgPHNwYW4gY2xhc3M9XCIke3N0eWxlQ2xhc3N9XCIgdGl0bGU9XCIke2Vycm9yU3RyfVwiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICB0aGlzLl9odG1sID0gdmFsdWUucmVwbGFjZSh2YWx1ZSwgc3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIV9odG1sICYmIHJ1bGUgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIHN0eWxlQ2xhc3MgPSB0eXBlID09PSBUb2tlblR5cGUuUE9TU0lCTEVcbiAgICAgICAgICAgICAgICA/IHRoaXMuc3R5bGVzLnBvc3NpYmxlT3BlcmF0b3JcbiAgICAgICAgICAgICAgICA6IHR5cGUgPT09IFRva2VuVHlwZS5PUEVSQVRPUlxuICAgICAgICAgICAgICAgICAgICA/IHRoaXMuc3R5bGVzLm9wZXJhdG9yXG4gICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCB0aXRsZVN0ciA9IHR5cGUgPT09IFRva2VuVHlwZS5QT1NTSUJMRSA/IGBQb3NzaWJsZSBvcGVyYXRvci4gT3BlcmF0b3JzIHNob3VsZCBiZSBjYXBpdGFsaXplZCAoaS5lICR7dmFsdWUudG9VcHBlckNhc2UoKX0pLmAgOiAnJztcbiAgICAgICAgICAgIHNwYW4gPSB0eXBlICE9PSBUb2tlblR5cGUuUE9TU0lCTEUgJiYgdHlwZSAhPT0gVG9rZW5UeXBlLk9QRVJBVE9SXG4gICAgICAgICAgICAgICAgPyB2YWx1ZVxuICAgICAgICAgICAgICAgIDogYDxzcGFuIGNsYXNzPVwiJHtzdHlsZUNsYXNzfVwiIHRpdGxlPVwiJHt0aXRsZVN0cn1cIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgdGhpcy5faHRtbCA9IHJ1bGUucGF0dGVybiA/IHZhbHVlLnJlcGxhY2UocnVsZS5wYXR0ZXJuLCBzcGFuKSA6IHRoaXMudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIV9odG1sICYmIHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9odG1sID0gdGhpcy52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5faHRtbDtcbiAgICB9XG4gICAgc2V0IGh0bWwoaHRtbCkge1xuICAgICAgICB0aGlzLl9odG1sID0gaHRtbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIElEIGZvciB0aGlzIHRva2VuIChUaGlzIElEIGlzIG5vdCBwZXJzaXN0ZWQgYXMgY2hhbmdlcyBhcmUgbWFkZSlcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBpZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lkO1xuICAgIH1cbiAgICBnZXQgaXNDaGlsZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzQ2hpbGQ7XG4gICAgfVxuICAgIHNldCBpc0NoaWxkKGlzQ2hpbGQpIHtcbiAgICAgICAgdGhpcy5faXNDaGlsZCA9IGlzQ2hpbGQ7XG4gICAgfVxuICAgIGdldCBpc1NpYmxpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1NpYmxpbmc7XG4gICAgfVxuICAgIHNldCBpc1NpYmxpbmcoaXNTaWJsaW5nKSB7XG4gICAgICAgIHRoaXMuX2lzU2libGluZyA9IGlzU2libGluZztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVHJ1ZSBpZiB0aGlzIHRva2VuIGlzIGluc2lkZSBxdW90ZXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXQgaXNJbnNpZGVRdW90ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc0luc2lkZVF1b3RlcztcbiAgICB9XG4gICAgc2V0IGlzSW5zaWRlUXVvdGVzKGlzSW5zaWRlUXVvdGVzKSB7XG4gICAgICAgIHRoaXMuX2lzSW5zaWRlUXVvdGVzID0gaXNJbnNpZGVRdW90ZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBib29sZWFuIG9wZXJhdGlvbiB0aGlzIHRva2VuIGlzIGZvclxuICAgICAqIEB0eXBlIHtUb2tlbk9wZXJhdGlvbnN9XG4gICAgICovXG4gICAgZ2V0IG9wZXJhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdGlvbjtcbiAgICB9XG4gICAgc2V0IG9wZXJhdGlvbihvcGVyYXRpb24pIHtcbiAgICAgICAgdGhpcy5fb3BlcmF0aW9uID0gb3BlcmF0aW9uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJZiB0aGlzIHRva2VuIGlzIGEgVG9rZW5UeXBlLk9QRVJBVE9SIG9yIFRva2VuVHlwZS5QT1NTSUJMRSB0aGUgcGhyYXNlIGxlYWRpbmcgdXAgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHBocmFzZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BocmFzZTtcbiAgICB9XG4gICAgc2V0IHBocmFzZShwaHJhc2UpIHtcbiAgICAgICAgdGhpcy5fcGhyYXNlID0gcGhyYXNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgcG9zaXRpb24gdGhpcyB0b2tlbiBpcyBhdCBpbiB0aGUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEB0eXBlIHtQb3NpdGlvbn1cbiAgICAgKi9cbiAgICBnZXQgcG9zaXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbiAgICB9XG4gICAgc2V0IHBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uID0gcG9zaXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBydWxlIHRoYXQgY3JlYXRlZCB0aGlzIHRva2VuXG4gICAgICogQHR5cGUge1J1bGV9XG4gICAgICovXG4gICAgZ2V0IHJ1bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ydWxlO1xuICAgIH1cbiAgICBzZXQgcnVsZShydWxlKSB7XG4gICAgICAgIHRoaXMuX3J1bGUgPSBydWxlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgdG9rZW4gdHlwZVxuICAgICAqIEB0eXBlIHtUb2tlblR5cGV9XG4gICAgICovXG4gICAgZ2V0IHR5cGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90eXBlO1xuICAgIH1cbiAgICBzZXQgdHlwZSh0eXBlKSB7XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc3RyaW5nIHZhbHVlIG9mIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCB2YWx1ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xuICAgIH1cbiAgICBzZXQgdmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICB9XG59XG5leHBvcnRzLlRva2VuID0gVG9rZW47XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19leHBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2V4cG9ydFN0YXIpIHx8IGZ1bmN0aW9uKG0sIGV4cG9ydHMpIHtcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgX19jcmVhdGVCaW5kaW5nKGV4cG9ydHMsIG0sIHApO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9Cb29sZWFuU2VhcmNoXCIpLCBleHBvcnRzKTtcbl9fZXhwb3J0U3RhcihyZXF1aXJlKFwiLi9QYXJzZXJcIiksIGV4cG9ydHMpO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL1J1bGVcIiksIGV4cG9ydHMpO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL1Rva2VuXCIpLCBleHBvcnRzKTtcbiIsImNvbnN0IEJTUCA9IHJlcXVpcmUoJ2Jvb2xlYW4tc2VhcmNoLXBhcnNlcicpO1xuXG5cbmNvbnN0IGRlZmF1bHRTZWFyY2hGaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWZhdWx0LWZpZWxkJyk7XG5jb25zdCBkZWZhdWx0T3V0cHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RlZmF1bHQtb3V0cHV0LWNvbnRhaW5lcicpO1xuY29uc3QgZGVmYXVsdEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkZWZhdWx0LXN1Ym1pdCcpO1xuXG5jb25zdCBjdXN0b21TZWFyY2hGaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXN0b20tZmllbGQnKTtcbmNvbnN0IGN1c3RvbU91dHB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXN0b20tb3V0cHV0LWNvbnRhaW5lcicpO1xuY29uc3QgY3VzdG9tQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2N1c3RvbS1zdWJtaXQnKTtcblxuZGVmYXVsdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGRlZmF1bHRPblN1Ym1pdCk7XG5jdXN0b21CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjdXN0b21PblN1Ym1pdCk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRPblN1Ym1pdCgpIHtcblx0Y29uc3Qgc2VhcmNoU3RyID0gZGVmYXVsdFNlYXJjaEZpZWxkLnZhbHVlO1xuXHQvLyBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cblx0Y29uc3QgYnMgPSBuZXcgQlNQLkJvb2xlYW5TZWFyY2goc2VhcmNoU3RyKTtcblx0ZGVmYXVsdE91dHB1dC5pbm5lckhUTUwgPSBicy5odG1sO1xuXHRjb25zb2xlLmxvZygnRGVmYXVsdCBCb29sZWFuU2VhcmNoIGluc3RhbmNlPScsIGJzKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tT25TdWJtaXQoKSB7XG5cdGNvbnN0IHNlYXJjaFN0ciA9IGN1c3RvbVNlYXJjaEZpZWxkLnZhbHVlO1xuXHRjb25zdCBydWxlcyA9IHsuLi5CU1AuREVGQVVMVF9SVUxFU307XG5cdGNvbnN0IHZhbGlkYXRpb25SdWxlcyA9IHtcblx0XHQuLi5CU1AuREVGQVVMVF9WQUxJREFUSU9OX1JVTEVTLFxuXHRcdG51bWJlcjogbmV3IEJTUC5WYWxpZGF0aW9uUnVsZSgvWzAtOV0rL2csICcjJylcblx0fTtcblx0Y29uc3QgY3VzdG9tQ29uZmlnID0ge1xuXHRcdHJ1bGVzLFxuXHRcdHZhbGlkYXRpb25SdWxlcyxcblx0XHRvcGVyYXRvclN0eWxlQ2xhc3M6ICdzdWNjZXNzJ1xuXHR9O1xuXHQvLyBjdXN0b20gY29uZmlndXJhdGlvblxuXHRjb25zdCBicyA9IG5ldyBCU1AuQm9vbGVhblNlYXJjaChzZWFyY2hTdHIsIGN1c3RvbUNvbmZpZyk7XG5cdGN1c3RvbU91dHB1dC5pbm5lckhUTUwgPSBicy5odG1sO1xuXHRjb25zb2xlLmxvZygnQ3VzdG9tIEJvb2xlYW5TZWFyY2ggaW5zdGFuY2U9JywgYnMpO1xufVxuIl19
