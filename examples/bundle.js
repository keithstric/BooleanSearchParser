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
        if (!this._validatedTokens || !this._validatedTokens.length) {
            if (this.finalTokens && this.finalTokens.length && this.validationRules && this.validationRules.length) {
                this._validatedTokens = this.validateTokens(this.finalTokens, this.validationRules);
            }
            else if (!this.validationRules || !this.validationRules.length) {
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
        if (!this._finalTokens || !this._finalTokens.length) {
            if (this.wholeTokens && this.wholeTokens.length) {
                this._finalTokens = this.createTermsFromQuotes(this.wholeTokens);
            }
        }
        return this._finalTokens;
    }
    /**
     * The tokens with split words combined. 2nd pass
     */
    get wholeTokens() {
        if (!this._wholeTokens || !this._wholeTokens.length) {
            if (this.initialTokens && this.initialTokens.length) {
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
        if (!this._initialTokens || !this._initialTokens.length) {
            if (this.initialMatches && this.initialMatches.length) {
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
        if (!this._initialMatches || !this._initialMatches.length) {
            if (this.searchString && this.selectedRules && this.selectedRules.length) {
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
     * The matches with phrases added
     * @type {Match[]}
     * @deprecated
     */
    get matches() {
        if (!this._matches || !this._matches.length) {
            if (this.initialMatches && this.initialMatches.length) {
                this._matches = this.getMatchPhrases(this.initialMatches);
            }
        }
        return this._matches;
    }
    /**
     * The selected rules we will use when creating matches and setting token types
     * @type {Rule[]}
     */
    get selectedRules() {
        return this._selectedRules;
    }
    /**
     * The tokens structured as a tree instead of a flat array
     * @type {Token[]}
     */
    get tree() {
        if (!this._tree || !this._tree.length) {
            if (this.validatedTokens && this.validatedTokens.length) {
                this._tree = this.createTree(this.validatedTokens);
            }
        }
        return this._tree;
    }
    /**
     * The rules we use for validating tokens
     * @type {ValidationRule[]}
     */
    get validationRules() {
        return this._validationRules;
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
                        parent.children.push(kidToken);
                        inProcParents.unshift(kidToken);
                        getKids(kidToken);
                        kidToken = queTokens.shift();
                    }
                    else if (this.isGrouping(kidToken) && operation === CLOSE) {
                        // In a nested grouping, don't want the closing token to be included as a child
                        // of the currently processing parent. It should be a child of the previous
                        // parent if it exists.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9kaXN0L0Jvb2xlYW5TZWFyY2guanMiLCIuLi9kaXN0L1BhcnNlci5qcyIsIi4uL2Rpc3QvUnVsZS5qcyIsIi4uL2Rpc3QvVG9rZW4uanMiLCIuLi9kaXN0L2luZGV4LmpzIiwiYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNW9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLkJvb2xlYW5TZWFyY2ggPSBleHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUyA9IGV4cG9ydHMuREVGQVVMVF9SVUxFUyA9IHZvaWQgMDtcbmNvbnN0IFBhcnNlcl8xID0gcmVxdWlyZShcIi4vUGFyc2VyXCIpO1xuY29uc3QgUnVsZV8xID0gcmVxdWlyZShcIi4vUnVsZVwiKTtcbmNvbnN0IFRva2VuXzEgPSByZXF1aXJlKFwiLi9Ub2tlblwiKTtcbmV4cG9ydHMuREVGQVVMVF9SVUxFUyA9IHtcbiAgICBhbmQ6IG5ldyBSdWxlXzEuUnVsZSgvYW5kL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkFORCwgVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpLFxuICAgIG9yOiBuZXcgUnVsZV8xLlJ1bGUoL29yL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9SLCBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSksXG4gICAgbm90OiBuZXcgUnVsZV8xLlJ1bGUoL25vdC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT1QsIFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSxcbiAgICBBTkQ6IG5ldyBSdWxlXzEuUnVsZSgvQU5EL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLkFORCksXG4gICAgcGx1czogbmV3IFJ1bGVfMS5SdWxlKC9cXCsvZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQU5EKSxcbiAgICBPUjogbmV3IFJ1bGVfMS5SdWxlKC9PUi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUiksXG4gICAgdGlsZGU6IG5ldyBSdWxlXzEuUnVsZSgvfi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUiksXG4gICAgTk9UOiBuZXcgUnVsZV8xLlJ1bGUoL05PVC9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT1QpLFxuICAgIG1pbnVzOiBuZXcgUnVsZV8xLlJ1bGUoLy0vZywgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9UKSxcbiAgICBvcGVuUGFyZW46IG5ldyBSdWxlXzEuUnVsZSgvXFwoL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk9QRU4sIFRva2VuXzEuVG9rZW5UeXBlLkdST1VQSU5HKSxcbiAgICBjbG9zZVBhcmVuOiBuZXcgUnVsZV8xLlJ1bGUoL1xcKS9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5DTE9TRSwgVG9rZW5fMS5Ub2tlblR5cGUuR1JPVVBJTkcpLFxuICAgIHF1b3RlOiBuZXcgUnVsZV8xLkVzY2FwZWFibGVSdWxlKC9cIi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5RVU9URSksXG4gICAgc3BhY2U6IG5ldyBSdWxlXzEuUnVsZSgvXFxzL2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLldISVRFX1NQQUNFKSxcbiAgICBvcGVuQW5nbGU6IG5ldyBSdWxlXzEuUnVsZSgvXFw8L2csIFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsIFRva2VuXzEuVG9rZW5UeXBlLkFTQ0lJKSxcbiAgICBjbG9zZUFuZ2xlOiBuZXcgUnVsZV8xLlJ1bGUoL1xcPi9nLCBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5OT05FLCBUb2tlbl8xLlRva2VuVHlwZS5BU0NJSSlcbn07XG5leHBvcnRzLkRFRkFVTFRfVkFMSURBVElPTl9SVUxFUyA9IHtcbiAgICBvcGVuQW5nbGU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcPC9nLCAnPCcpLFxuICAgIGNsb3NlQW5nbGU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcPi9nLCAnPicpLFxuICAgIG9wZW5DdXJseTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFx7L2csICd7JyksXG4gICAgY2xvc2VDdXJseTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFx9L2csICd9JyksXG4gICAgb3BlblNxdWFyZTogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFxbL2csICdbJyksXG4gICAgY2xvc2VTcXVhcmU6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcXS9nLCAnXScpLFxuICAgIGJhY2tTbGFzaDogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFxcXC9nLCAnXFxcXCcpLFxuICAgIGZvcndhcmRTbGFzaDogbmV3IFJ1bGVfMS5WYWxpZGF0aW9uUnVsZSgvXFwvL2csICcvJyksXG4gICAgY29tbWE6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoLywvZywgJywnKSxcbiAgICBwZXJpb2Q6IG5ldyBSdWxlXzEuVmFsaWRhdGlvblJ1bGUoL1xcLi9nLCAnLicpXG59O1xuLyoqXG4gKiBUaGUgY2xhc3NlcyBhbmQgbWV0aG9kcyBpbiB0aGlzIHBhY2thZ2Ugd2VyZSBiYXNlZCBvZmYgb2YgdGhlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vZnJlZGVyaWNrZi9icXBqc30gbGlicmFyeS5cbiAqIFRoZSBCb29sZWFuU2VhcmNoIGNsYXNzIGlzIHRoZSBlbnRyeSBwb2ludCB0byB0aGUgcGFyc2VyLiBUaGUgZm9sbG93aW5nXG4gKiBwcm9wZXJ0aWVzIHdpbGwgcGFyc2UgdGhlIHNlYXJjaCBzdHJpbmcgYXV0b21hdGljYWxseTpcbiAqIHtAbGluayBCb29sZWFuU2VhcmNoI3Rva2Vuc31cbiAqIHtAbGluayBCb29sZWFuU2VhcmNoI2h0bWx9XG4gKiBAY2xhc3Mge0Jvb2xlYW5TZWFyY2h9XG4gKi9cbmNsYXNzIEJvb2xlYW5TZWFyY2gge1xuICAgIGNvbnN0cnVjdG9yKHNyY2hTdHJpbmcsIGNvbmZpZykge1xuICAgICAgICB0aGlzLl9lcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5faHRtbCA9ICcnO1xuICAgICAgICB0aGlzLl9pc01hbGZvcm1lZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9tYXhMZW5ndGggPSA1MTE7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9zZWxlY3RlZFJ1bGVzID0gW107XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzID0gW107XG4gICAgICAgIHRoaXMuX3NyY2hTdHJpbmcgPSAnJztcbiAgICAgICAgdGhpcy5fdG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3N0eWxlcyA9IHtcbiAgICAgICAgICAgIGVycm9yOiAnZXJyb3InLFxuICAgICAgICAgICAgb3BlcmF0b3I6ICdvcGVyYXRvcicsXG4gICAgICAgICAgICBwb3NzaWJsZU9wZXJhdG9yOiAnd2FybmluZydcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZWFyY2hTdHJpbmcgPSBzcmNoU3RyaW5nID8gc3JjaFN0cmluZyA6ICcnO1xuICAgICAgICBpZiAoY29uZmlnKSB7XG4gICAgICAgICAgICB0aGlzLnJ1bGVzID0gY29uZmlnLnJ1bGVzIHx8IHRoaXMucnVsZXM7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRpb25SdWxlcyA9IGNvbmZpZy52YWxpZGF0aW9uUnVsZXMgfHwgdGhpcy52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMucG9zc2libGVPcGVyYXRvciA9IGNvbmZpZy5wb3NzaWJsZU9wZXJhdG9yU3R5bGVDbGFzcyB8fCAnd2FybmluZyc7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMuZXJyb3IgPSBjb25maWcuZXJyb3JTdHlsZUNsYXNzIHx8ICdlcnJvcic7XG4gICAgICAgICAgICB0aGlzLl9zdHlsZXMub3BlcmF0b3IgPSBjb25maWcub3BlcmF0b3JTdHlsZUNsYXNzIHx8ICdvcGVyYXRvcic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkIGEgcnVsZVxuICAgICAqIEBwYXJhbSBydWxlTmFtZSB7c3RyaW5nfVxuICAgICAqIEBwYXJhbSBydWxlIHtSdWxlfVxuICAgICAqL1xuICAgIGFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpIHtcbiAgICAgICAgY29uc3QgcnVsZXMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHRoaXMucnVsZXMpLCB7IFtydWxlTmFtZV06IHJ1bGUgfSk7XG4gICAgICAgIHRoaXMucnVsZXMgPSBydWxlcztcbiAgICAgICAgLy8gY29uc29sZS53YXJuKCdJZiB5b3Ugd2FudCB0aGlzIHJ1bGUgdG8gYmUgdXNlZCwgYmUgc3VyZSB0byBhZGQgdGhlIHJ1bGUgbmFtZSB0byB0aGUgcnVsZU5hbWVzIGFycmF5IGluIHRoZSBhcHByb3ByaWF0ZSBwb3NpdGlvbicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXggdGhlIHBvc3NpYmxlIG9wZXJhdG9ycyBhbmQgdXBkYXRlIHRoZSBzZWFyY2ggc3RyaW5nXG4gICAgICogQHBhcmFtIHJlc2V0U2VhcmNoIHtib29sZWFufSAtIHNldCB0cnVlIHRvIHJlc2V0IHNlYXJjaCBzdHJpbmcsIHRva2VucyBhbmQgaHRtbFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZml4T3BlcmF0b3JzKHJlc2V0U2VhcmNoU3RyaW5nID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IHJldHVyblZhbCA9IHRoaXMuc2VhcmNoU3RyaW5nO1xuICAgICAgICBpZiAodGhpcy50b2tlbnMgJiYgdGhpcy50b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm5WYWwgPSAnJztcbiAgICAgICAgICAgIHRoaXMudG9rZW5zLmZvckVhY2goKHRva2VuKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuLnZhbHVlID0gdG9rZW4udmFsdWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4udHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbi5odG1sID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVyblZhbCArPSB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHJlc2V0U2VhcmNoU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldChyZXR1cm5WYWwpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5zID0gdGhpcy5wYXJzZXIucGFyc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuVmFsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBlcnJvcnNcbiAgICAgKiBAdHlwZSB7RXJyb3JbXX1cbiAgICAgKi9cbiAgICBnZXQgZXJyb3JzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2Vycm9ycyB8fCAhdGhpcy5fZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Rva2VucyAmJiB0aGlzLl90b2tlbnMubGVuZ3RoKSB7IC8vIERvbnQgd2FudCB0byBpbml0aWF0ZSBwYXJzaW5nIG9mIHRva2Vuc1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yVG9rZW5zID0gdGhpcy5fdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi5lcnJvcnMgJiYgdG9rZW4uZXJyb3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgbGV0IGVycm9ycyA9IHRoaXMuX2Vycm9ycyB8fCBbXTtcbiAgICAgICAgICAgICAgICBlcnJvclRva2Vucy5mb3JFYWNoKCh0b2tlbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4uZXJyb3JzICYmIHRva2VuLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycy5jb25jYXQodG9rZW4uZXJyb3JzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX2Vycm9ycyA9IGVycm9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZXJyb3JzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGh0bWwgZm9yIHRoZSBlbnRpcmUgc2VhcmNoIHN0cmluZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IGh0bWwoKSB7XG4gICAgICAgIGlmICghdGhpcy5faHRtbCAmJiB0aGlzLnRva2VucyAmJiB0aGlzLnRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyB0b2tlbnMsIG1heExlbmd0aCwgc2VhcmNoU3RyaW5nIH0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFN0cmluZ0xlbiA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNUb29Mb25nID0gc2VhcmNoU3RyaW5nTGVuID4gbWF4TGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnN0IGh0bWxBcnIgPSB0b2tlbnMubWFwKCh0b2tlbiwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uc3R5bGVzID0gdGhpcy5zdHlsZXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaHRtbCwgcG9zaXRpb24sIHZhbHVlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJldHVybkh0bWwgPSBodG1sO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUb29Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24uc3RhcnQgPD0gbWF4TGVuZ3RoICYmIHBvc2l0aW9uLmVuZCA+PSBtYXhMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICsgMSA9PT0gdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5IdG1sID0gYDxzcGFuIGNsYXNzPVwiJHt0aGlzLnN0eWxlcy5lcnJvcn1cIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuSHRtbCA9IGA8c3BhbiBjbGFzcz1cIiR7dGhpcy5zdHlsZXMuZXJyb3J9XCI+JHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlkeCArIDEgPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5IdG1sID0gYCR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHVybkh0bWw7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faHRtbCA9IGh0bWxBcnIuam9pbignJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faHRtbCA9IHRoaXMuc2VhcmNoU3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9odG1sO1xuICAgIH1cbiAgICBnZXQgc3R5bGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3R5bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUcnVlIGlmIHRoZXJlIGFyZSBlcnJvcnNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXQgaXNNYWxmb3JtZWQoKSB7XG4gICAgICAgIGlmICh0aGlzLmVycm9ycyAmJiB0aGlzLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2lzTWFsZm9ybWVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5faXNNYWxmb3JtZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBtYXggbGVuZ3RoIHRoZSBzZWFyY2ggc3RyaW5nIGlzIGFsbG93ZWQgdG8gYmVcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldCBtYXhMZW5ndGgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXhMZW5ndGg7XG4gICAgfVxuICAgIHNldCBtYXhMZW5ndGgobWF4TGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX21heExlbmd0aCA9IG1heExlbmd0aDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGFuIGFycmF5IG9mIHRoZSBvcGVyYXRvciB0b2tlbnNcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgb3BlcmF0b3JzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX29wZXJhdG9ycyB8fCAhdGhpcy5fb3BlcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3Rva2VucyAmJiB0aGlzLl90b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gdGhpcy50b2tlbnMuZmlsdGVyKCh0b2tlbikgPT4gdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRvcnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJzZXIgd2hpY2ggd2lsbCBwb3B1bGF0ZSBhbGwgdGhlIHZhcmlvdXMgVG9rZW4gYXJyYXlzXG4gICAgICogQHR5cGUge1BhcnNlcn1cbiAgICAgKi9cbiAgICBnZXQgcGFyc2VyKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3BhcnNlcikge1xuICAgICAgICAgICAgdGhpcy5fcGFyc2VyID0gbmV3IFBhcnNlcl8xLlBhcnNlcih0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzLCB0aGlzLnNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFyc2VyO1xuICAgIH1cbiAgICBzZXQgcGFyc2VyKHBhcnNlcikge1xuICAgICAgICB0aGlzLl9wYXJzZXIgPSBwYXJzZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBhbiBhcnJheSBvZiB0aGUgcG9zc2libGUgb3BlcmF0b3JzXG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IHBvc3NpYmxlT3BlcmF0b3JzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzIHx8ICF0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl90b2tlbnMgJiYgdGhpcy5fdG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzID0gdGhpcy50b2tlbnMuZmlsdGVyKCh0b2tlbikgPT4gdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NzaWJsZU9wZXJhdG9ycztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgdGhlIHJ1bGUgbmFtZXMgd2Ugd2FudCB0byB1c2Ugd2hlbiBtYXRjaGluZyB0b2tlbnNcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICovXG4gICAgZ2V0IHJ1bGVOYW1lcygpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucnVsZXMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBPYmpldCBvZiBydWxlcyB3aXRoIGEgbmFtZS4gVGhlIGtleSBzaG91bGQgbWF0Y2ggYSB2YWx1ZSBpbiB0aGUgcnVsZU5hbWVzIGFycmF5XG4gICAgICogQHR5cGUge1J1bGVzfVxuICAgICAqL1xuICAgIGdldCBydWxlcygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9ydWxlcykge1xuICAgICAgICAgICAgdGhpcy5fcnVsZXMgPSBleHBvcnRzLkRFRkFVTFRfUlVMRVM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3J1bGVzO1xuICAgIH1cbiAgICBzZXQgcnVsZXMocnVsZXMpIHtcbiAgICAgICAgdGhpcy5fcnVsZXMgPSBydWxlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlYXJjaCBzdHJpbmcgdG8gcGFyc2VcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldCBzZWFyY2hTdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zcmNoU3RyaW5nO1xuICAgIH1cbiAgICBzZXQgc2VhcmNoU3RyaW5nKHNlYXJjaFN0cmluZykge1xuICAgICAgICB0aGlzLl9zcmNoU3RyaW5nID0gc2VhcmNoU3RyaW5nLnJlcGxhY2UoL1xcbi9nLCAnJyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBzZWxlY3RlZCBydWxlcyBiYXNlZCBvZmYgb2YgdGhlIHZhbHVlcyBwcm92aWRlZCBpbiB0aGUgcnVsZU5hbWVzXG4gICAgICogQHR5cGUge1J1bGVbXX1cbiAgICAgKi9cbiAgICBnZXQgc2VsZWN0ZWRSdWxlcygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zZWxlY3RlZFJ1bGVzIHx8ICF0aGlzLl9zZWxlY3RlZFJ1bGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fc2VsZWN0ZWRSdWxlcyA9IHRoaXMucnVsZU5hbWVzLmZpbHRlcigobmFtZSkgPT4gbmFtZSBpbiB0aGlzLnJ1bGVzKS5tYXAoKG5hbWUpID0+IHRoaXMucnVsZXNbbmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFJ1bGVzO1xuICAgIH1cbiAgICBzZXQgc2VsZWN0ZWRSdWxlcyhzZWxlY3RlZFJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkUnVsZXMgPSBzZWxlY3RlZFJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgc2VsZWN0ZWQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvZmYgb2YgdGhlIHZhbHVlcyBwcm92aWRlZCBpbiB0aGUgdmFsaWRhdGlvblJ1bGVOYW1lc1xuICAgICAqIEB0eXBlIHtWYWxpZGF0aW9uUnVsZVtdfVxuICAgICAqL1xuICAgIGdldCBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyB8fCAhdGhpcy5fc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcyA9IHRoaXMudmFsaWRhdGlvblJ1bGVOYW1lc1xuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG5hbWUpID0+IG5hbWUgaW4gdGhpcy52YWxpZGF0aW9uUnVsZXMpXG4gICAgICAgICAgICAgICAgLm1hcCgobmFtZSkgPT4gdGhpcy52YWxpZGF0aW9uUnVsZXNbbmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgc2V0IHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKHNlbGVjdGVkVmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkVmFsaWRhdGlvblJ1bGVzID0gc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBhcnJheSBvZiB0b2tlbnMgZm91bmQgaW4gdGhlIHNlYXJjaCBzdHJpbmdcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgdG9rZW5zKCkge1xuICAgICAgICBpZiAoKCF0aGlzLl90b2tlbnMgfHwgIXRoaXMuX3Rva2Vucy5sZW5ndGgpICYmIHRoaXMuc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLl90b2tlbnMgPSB0aGlzLnBhcnNlci5wYXJzZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCF0aGlzLnNlYXJjaFN0cmluZykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdZb3UgbXVzdCBwcm92aWRlIGEgc2VhcmNoIHN0cmluZyB0byBwYXJzZSBmb3IgdG9rZW5zJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Rva2VucztcbiAgICB9XG4gICAgc2V0IHRva2Vucyh0b2tlbnMpIHtcbiAgICAgICAgdGhpcy5fdG9rZW5zID0gdG9rZW5zO1xuICAgIH1cbiAgICBnZXQgdHJlZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VyLnRyZWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHRoZSBydWxlIG5hbWVzIHdlIHdhbnQgdG8gdXNlIHdoZW4gbWF0Y2hpbmcgdG9rZW5zXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqL1xuICAgIGdldCB2YWxpZGF0aW9uUnVsZU5hbWVzKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy52YWxpZGF0aW9uUnVsZXMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBPYmpldCBvZiBydWxlcyB3aXRoIGEgbmFtZS4gVGhlIGtleSBzaG91bGQgbWF0Y2ggYSB2YWx1ZSBpbiB0aGUgcnVsZU5hbWVzIGFycmF5XG4gICAgICogQHR5cGUge1ZhbGlkYXRpb25SdWxlc31cbiAgICAgKi9cbiAgICBnZXQgdmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGlvblJ1bGVzID0gZXhwb3J0cy5ERUZBVUxUX1ZBTElEQVRJT05fUlVMRVM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbGlkYXRpb25SdWxlcztcbiAgICB9XG4gICAgc2V0IHZhbGlkYXRpb25SdWxlcyh2YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgdGhpcy5fdmFsaWRhdGlvblJ1bGVzID0gdmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICByZXNldChzZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5zZWFyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmcgfHwgJyc7XG4gICAgICAgIHRoaXMudG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX3Bvc3NpYmxlT3BlcmF0b3JzID0gW107XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IFtdO1xuICAgICAgICB0aGlzLl9lcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy5wYXJzZXIgPSBuZXcgUGFyc2VyXzEuUGFyc2VyKHRoaXMuc2VhcmNoU3RyaW5nLCB0aGlzLnNlbGVjdGVkUnVsZXMsIHRoaXMuc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpO1xuICAgIH1cbn1cbmV4cG9ydHMuQm9vbGVhblNlYXJjaCA9IEJvb2xlYW5TZWFyY2g7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuUGFyc2VyID0gdm9pZCAwO1xuY29uc3QgVG9rZW5fMSA9IHJlcXVpcmUoXCIuL1Rva2VuXCIpO1xuLyoqXG4gKiBUaGUgcGFyc2VyIHdpbGwgcGFyc2UgdGhlIHNlYXJjaCBzdHJpbmcgYW5kIGNyZWF0ZSBtYXRjaGVzIGZyb20gdGhlIHJ1bGVzIGFuZCB0aGVuIHRva2Vucy5cbiAqIFRoaXMgY2xhc3MgYWxzbyBwdXRzIHdvcmRzIHRoYXQgd2VyZSBzcGxpdCBieSBwb3NzaWJsZS9hY3R1YWwgb3BlcmF0b3JzIGJhY2sgdG9naGV0aGVyIGFnYWluLlxuICogRW5zdXJlcyB0ZXh0IGJldHdlZW4gcXVvdGVzIGlzIG1hZGUgaW50byBhIHNpbmdsZSB0ZXJtIHRva2VuLiBBbGwgdG9rZW5zIGFuZCBtYXRjaGVzIGNyZWF0ZWRcbiAqIGFsb25nIHRoZSB3YXkgYXJlIHN0b3JlZCBhcyBwcm9wZXJ0aWVzLCBtYWlubHkgZm9yIHRyb3VibGVzaG9vdGluZyBwdXJwb3Nlcy5cbiAqIEBjbGFzcyB7UGFyc2VyfVxuICovXG5jbGFzcyBQYXJzZXIge1xuICAgIGNvbnN0cnVjdG9yKHNlYXJjaFN0cmluZywgc2VsZWN0ZWRSdWxlcywgc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgdGhpcy5fZmluYWxUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5faW5pdGlhbE1hdGNoZXMgPSBbXTtcbiAgICAgICAgdGhpcy5faW5pdGlhbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9tYXRjaGVzID0gW107XG4gICAgICAgIHRoaXMuX3NlYXJjaFN0cmluZyA9ICcnO1xuICAgICAgICB0aGlzLl90cmVlID0gW107XG4gICAgICAgIHRoaXMuX3ZhbGlkYXRlZFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl93aG9sZVRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9zZWFyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmc7XG4gICAgICAgIHRoaXMuX3NlbGVjdGVkUnVsZXMgPSBzZWxlY3RlZFJ1bGVzIHx8IFtdO1xuICAgICAgICB0aGlzLl92YWxpZGF0aW9uUnVsZXMgPSBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHN0cmluZyB3ZSdyZSBnb2luZyB0byBwYXJzZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHNlYXJjaFN0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlYXJjaFN0cmluZztcbiAgICB9XG4gICAgc2V0IHNlYXJjaFN0cmluZyhzZWFyY2hTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB0aGlzLl9zZWFyY2hTdHJpbmcgPSBzZWFyY2hTdHJpbmc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgd2l0aCBlcnJvcnMgYW5kIGFsbCBtYW5pcHVsYXRpb24gZG9uZS4gNHRoIHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgdmFsaWRhdGVkVG9rZW5zKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3ZhbGlkYXRlZFRva2VucyB8fCAhdGhpcy5fdmFsaWRhdGVkVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZmluYWxUb2tlbnMgJiYgdGhpcy5maW5hbFRva2Vucy5sZW5ndGggJiYgdGhpcy52YWxpZGF0aW9uUnVsZXMgJiYgdGhpcy52YWxpZGF0aW9uUnVsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdmFsaWRhdGVkVG9rZW5zID0gdGhpcy52YWxpZGF0ZVRva2Vucyh0aGlzLmZpbmFsVG9rZW5zLCB0aGlzLnZhbGlkYXRpb25SdWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghdGhpcy52YWxpZGF0aW9uUnVsZXMgfHwgIXRoaXMudmFsaWRhdGlvblJ1bGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcHJvdmlkZSB2YWxpZGF0aW9uIHJ1bGVzIGluIG9yZGVyIHRvIHZhbGlkYXRlIHRoZSB0b2tlbnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGVkVG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUb2tlbnMgdGhhdCBoYXZlIGhhZCBzcGxpdCB3b3JkcyBwdXQgYmFjayB0b2d0aGVyIGFuZCB3b3JkcyBiZXR3ZWVuIHF1b3Rlc1xuICAgICAqIGNvbWJpbmVkLiAzcmQgcGFzc1xuICAgICAqIEB0eXBlIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGdldCBmaW5hbFRva2VucygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9maW5hbFRva2VucyB8fCAhdGhpcy5fZmluYWxUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy53aG9sZVRva2VucyAmJiB0aGlzLndob2xlVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2ZpbmFsVG9rZW5zID0gdGhpcy5jcmVhdGVUZXJtc0Zyb21RdW90ZXModGhpcy53aG9sZVRva2Vucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZpbmFsVG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgdG9rZW5zIHdpdGggc3BsaXQgd29yZHMgY29tYmluZWQuIDJuZCBwYXNzXG4gICAgICovXG4gICAgZ2V0IHdob2xlVG9rZW5zKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3dob2xlVG9rZW5zIHx8ICF0aGlzLl93aG9sZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRpYWxUb2tlbnMgJiYgdGhpcy5pbml0aWFsVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3dob2xlVG9rZW5zID0gdGhpcy5jcmVhdGVUZXJtc0Zyb21TcGxpdHModGhpcy5pbml0aWFsVG9rZW5zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fd2hvbGVUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbnMgdGFrZW4gZnJvbSB0aGUgbWF0Y2hlcy4gMXN0IHBhc3NcbiAgICAgKiBAdHlwZSB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXQgaW5pdGlhbFRva2VucygpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9pbml0aWFsVG9rZW5zIHx8ICF0aGlzLl9pbml0aWFsVG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdGlhbE1hdGNoZXMgJiYgdGhpcy5pbml0aWFsTWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gdGhpcy5tYXRjaGVzVG9Ub2tlbnModGhpcy5pbml0aWFsTWF0Y2hlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxUb2tlbnM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBpbml0aWFsIG1hdGNoZXMgZ2F0aGVyZWQgZnJvbSB0aGUgc2VhcmNoU3RyaW5nXG4gICAgICogQHR5cGUge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0IGluaXRpYWxNYXRjaGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2luaXRpYWxNYXRjaGVzIHx8ICF0aGlzLl9pbml0aWFsTWF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlYXJjaFN0cmluZyAmJiB0aGlzLnNlbGVjdGVkUnVsZXMgJiYgdGhpcy5zZWxlY3RlZFJ1bGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluaXRNYXRjaGVzID0gdGhpcy5nZXRJbml0aWFsTWF0Y2hlcyh0aGlzLnNlYXJjaFN0cmluZywgdGhpcy5zZWxlY3RlZFJ1bGVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IHRoaXMuZ2V0TWF0Y2hQaHJhc2VzKGluaXRNYXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcHJvdmlkZSBhIHNlYXJjaCBzdHJpbmcgYW5kIHNlbGVjdGVkIHJ1bGVzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2luaXRpYWxNYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgbWF0Y2hlcyB3aXRoIHBocmFzZXMgYWRkZWRcbiAgICAgKiBAdHlwZSB7TWF0Y2hbXX1cbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIGdldCBtYXRjaGVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX21hdGNoZXMgfHwgIXRoaXMuX21hdGNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pbml0aWFsTWF0Y2hlcyAmJiB0aGlzLmluaXRpYWxNYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX21hdGNoZXMgPSB0aGlzLmdldE1hdGNoUGhyYXNlcyh0aGlzLmluaXRpYWxNYXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHNlbGVjdGVkIHJ1bGVzIHdlIHdpbGwgdXNlIHdoZW4gY3JlYXRpbmcgbWF0Y2hlcyBhbmQgc2V0dGluZyB0b2tlbiB0eXBlc1xuICAgICAqIEB0eXBlIHtSdWxlW119XG4gICAgICovXG4gICAgZ2V0IHNlbGVjdGVkUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgdG9rZW5zIHN0cnVjdHVyZWQgYXMgYSB0cmVlIGluc3RlYWQgb2YgYSBmbGF0IGFycmF5XG4gICAgICogQHR5cGUge1Rva2VuW119XG4gICAgICovXG4gICAgZ2V0IHRyZWUoKSB7XG4gICAgICAgIGlmICghdGhpcy5fdHJlZSB8fCAhdGhpcy5fdHJlZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnZhbGlkYXRlZFRva2VucyAmJiB0aGlzLnZhbGlkYXRlZFRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90cmVlID0gdGhpcy5jcmVhdGVUcmVlKHRoaXMudmFsaWRhdGVkVG9rZW5zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdHJlZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHJ1bGVzIHdlIHVzZSBmb3IgdmFsaWRhdGluZyB0b2tlbnNcbiAgICAgKiBAdHlwZSB7VmFsaWRhdGlvblJ1bGVbXX1cbiAgICAgKi9cbiAgICBnZXQgdmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGlvblJ1bGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbnN1cmUgd2UndmUgZ290IHRoZSByaWdodCB0b2tlbiB0eXBlIGFmdGVyIG1hbmlwdWxhdGluZyB0aGUgbWF0Y2guIEZvciBleGFtcGxlOlxuICAgICAqIHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoaXMgbWF0Y2ggYXJyYXkgd2lsbCBoYXZlIGEgdG9rZW4gdHlwZSBvZiBQT1NTSUJMRTpcbiAgICAgKiBbZm9yLCBrbGlmdF1cbiAgICAgKiBhZnRlciBhIHRva2VuIGlzIGNyZWF0ZWQsIHdlJ2xsIGVuZCB1cCB3aXRoOlxuICAgICAqIFtmLCBvciwga2xpZnRdXG4gICAgICogdGhlIGZpc3QgZWxlbWVudCB3aWxsIHN0aWxsIGhhdmUgYSB0b2tlbiB0eXBlIG9mIFBPU1NJQkxFIGFzIHdpbGwgdGhlIHNlY29uZCBlbGVtZW50XG4gICAgICogd2UgbmVlZCB0byBlbnN1cmUgdGhhdCB0aGUgZmlyc3QgZWxlbWVudCdzIHRva2VuIHR5cGUgZ2V0cyBzZXQgdG8gVEVSTSBzbyB0aGF0IHdlIG1heVxuICAgICAqIHB1dCB0aGlzIHNwbGl0IHdvcmQgYmFjayB0b2dldGhlciBsYXRlciBpbiB0aGUgcHJvY2Vzc1xuICAgICAqIEBwYXJhbSB0b2tlbiB7VG9rZW59XG4gICAgICovXG4gICAgY2hlY2tUb2tlblR5cGUodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlc0luU3RyID0gW107XG4gICAgICAgICAgICBjb25zdCBydWxlc0luU3RyID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgdGhpcy5zZWxlY3RlZFJ1bGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hTdGFydCA9IHJ1bGUudGVzdCh0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoU3RhcnQgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVzSW5TdHIucHVzaChydWxlLnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBydWxlc0luU3RyLnB1c2gocnVsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVzSW5TdHIubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIuY2hlY2tUb2tlblR5cGUnKVxuICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVzSW5TdHIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4udHlwZSA9IHR5cGVzSW5TdHJbMF0gfHwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTTtcbiAgICAgICAgICAgICAgICB0b2tlbi5ydWxlID0gcnVsZXNJblN0clswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPSBUb2tlbl8xLlRva2VuVHlwZS5URVJNO1xuICAgICAgICAgICAgICAgIHRva2VuLnJ1bGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgdG9rZW5cbiAgICAgKiBAcGFyYW0gdmFsdWUge3N0cmluZ31cbiAgICAgKiBAcGFyYW0gdHlwZSB7VG9rZW5UeXBlfVxuICAgICAqIEBwYXJhbSBzdGFydCB7bnVtYmVyfVxuICAgICAqIEBwYXJhbSBlbmQge251bWJlcn1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW59XG4gICAgICovXG4gICAgY3JlYXRlTmV3VG9rZW4odmFsdWUsIHR5cGUsIHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBuZXcgVG9rZW5fMS5Ub2tlbih2YWx1ZSwgdHlwZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgY29uc3QgbmV3VG9rZW5TdGFydCA9IHN0YXJ0O1xuICAgICAgICBjb25zdCBuZXdUb2tlbkVuZCA9IG5ld1Rva2VuU3RhcnQgKyAodmFsdWUubGVuZ3RoIC0gMSk7XG4gICAgICAgIG5ld1Rva2VuLnBvc2l0aW9uID0geyBzdGFydDogbmV3VG9rZW5TdGFydCwgZW5kOiBuZXdUb2tlbkVuZCB9O1xuICAgICAgICByZXR1cm4gbmV3VG9rZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdGV4dCBiZXR3ZWVuIHF1b3RlcyBhbmQgY29udmVydCBpdCB0byBhIHRlcm0gdG9rZW5cbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEByZXR1cm5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRlcm1zRnJvbVF1b3Rlcyh0b2tlbnMpIHtcbiAgICAgICAgbGV0IG5ld1Rva2VucyA9IFtdO1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHF1b3RlcyA9IHRva2Vucy5maWx0ZXIodG9rZW4gPT4gdG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpO1xuICAgICAgICAgICAgaWYgKHF1b3RlcyAmJiBxdW90ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGxldCB1bmNsb3NlZFF1b3RlVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgICAgIHRva2Vucy5mb3JFYWNoKCh0b2tlbiwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuY2xvc2VkUXVvdGVUb2tlbiA9PT0gbnVsbCkgeyAvLyBubyBvcGVuaW5nIHF1b3RlIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFKSB7IC8vIG9wZW5pbmcgcXVvdGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZFF1b3RlVG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi5vcGVyYXRpb24gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucy5PUEVOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLlFVT1RFO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgeyAvLyB3ZSBoYXZlIGFuIG9wZW5pbmcgcXVvdGUgc29tZXdoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUpIHsgLy8gY2xvc2luZyBxdW90ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Rva2VuID0gbmV3IFRva2VuXzEuVG9rZW4oY3VycmVudFZhbHVlLCBUb2tlbl8xLlRva2VuVHlwZS5URVJNLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuLmlzSW5zaWRlUXVvdGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5jbG9zZWRRdW90ZVRva2VuID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbi50eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4ub3BlcmF0aW9uID0gVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuQ0xPU0U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7IC8vIG5vdCB0byB0aGUgY2xvc2luZyBxdW90ZSB5ZXQsIGp1c3Qga2VlcCBhZGRpbmcgdG8gdGhlIGN1cnJlbnRWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKHRva2VuKSAmJiB0b2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5XSElURV9TUEFDRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgKz0gdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHVuY2xvc2VkUXVvdGVUb2tlbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSByZXR1cm4gdGhlIHRva2VucyBiZWNhdXNlIG90aGVyd2lzZSB3ZSdsbCBsb29zZSBhbGwgb2YgdGhlIHRva2VucyBhZnRlciB0aGlzIHVuY2xvc2VkUXVvdGVUb2tlblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIW5ld1Rva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5ld1Rva2VucyA9IHRva2VucztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3VG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXaGVuIGEgbWF0Y2ggaXMgZm91bmQgYW5kIGl0J3MgcGFydCBvZiBhIHdvcmQgKGkuZS4gb3BlcmF0b3IsIGZvcmtsaWZ0LCBlY3QuKSBtdWx0aXBsZVxuICAgICAqIHRva2VucyBhcmUgY3JlYXRlZC4gVGhpcyB0YWtlcyB0aG9zZSBtdWx0aXBsZSB0b2tlbnMgYW5kIG1ha2VzIHRoZW0gb25lIHRva2VuXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBjcmVhdGVUZXJtc0Zyb21TcGxpdHModG9rZW5zKSB7XG4gICAgICAgIGxldCBuZXdUb2tlbnMgPSBbXTtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsZXQgaGFuZ2luZ1Rva2VucyA9IFtdO1xuICAgICAgICAgICAgdG9rZW5zLmZvckVhY2goKHRva2VuLCBpZHgsIGFycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRUb2tlbiA9IGFycltpZHggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoaGFuZ2luZ1Rva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR290IHBpZWNlcyBvZiBhIHdvcmQgaGFuZ2luZyBvdXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNUZXJtT3JPcGVyYXRvcih0b2tlbikgJiYgKG5leHRUb2tlbiAmJiB0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvdCBtb3JlIHBpZWNlcyBvZiB0aGUgd29yZCBhZnRlciB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5naW5nVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVhY2hlZCBlbmQgb2Ygd29yZCwgbmV4dCB0b2tlbiBpcyBub3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBjb21iaW5lIG91ciBoYW5naW5nIHRva2VucyBpbnRvIGEgc2luZ2xlIHRva2VuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wVmFsID0gaGFuZ2luZ1Rva2Vucy5tYXAodG9rZW4gPT4gdG9rZW4udmFsdWUpLmpvaW4oJycpICsgdG9rZW4udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdFbmQgPSB0b2tlbi5wb3NpdGlvbi5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGFydCA9IG5ld0VuZCAtICh0ZW1wVmFsLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VG9rZW4gPSB0aGlzLmNyZWF0ZU5ld1Rva2VuKHRlbXBWYWwsIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIG5ld1N0YXJ0LCBuZXdFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2gobmV3VG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZ2luZ1Rva2VucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBObyBoYW5naW5nIHRva2VucyAoaS5lLiBwaWVjZXMgb2YgYSB3b3JkKVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNUZXJtT3JPcGVyYXRvcih0b2tlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgdG9rZW4gbm90IGEgd29yZCBvciBvcGVyYXRvciwgcHVzaCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudCB0b2tlbiBpcyBhIHdvcmQgb3Igb3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbmV4dFRva2VuIHx8ICF0aGlzLmlzVGVybU9yT3BlcmF0b3IobmV4dFRva2VuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgdG9rZW4gaXNuJ3QgYSB3b3JkIG9yIG9wZXJhdG9yLCBqdXN0IHB1c2ggaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChuZXh0VG9rZW4gJiYgdGhpcy5pc1Rlcm1Pck9wZXJhdG9yKG5leHRUb2tlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IHRva2VuIGlzIGEgd29yZCBvciBvcGVyYXRvciwgY3VycmVudCB0b2tlbiBpcyBhIHBpZWNlIG9mIGEgd29yZCwgc3Rhc2ggaXQgaW4gaGFuZ2luZ1Rva2Vuc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmdpbmdUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBzaG91bGQgbmV2ZXIgZ2V0IGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQm9vbGVhblNlYXJjaC5wYXJzZXIsIGNyZWF0ZVRlcm1zRnJvbVNwbGl0cywgY3VycmVudCB0b2tlbj0nLCB0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3BhcnNlci5jcmVhdGVUZXJtc0Zyb21TcGxpdHMsIG5ld1Rva2Vucz0nLCBuZXdUb2tlbnMpO1xuICAgICAgICByZXR1cm4gbmV3VG9rZW5zO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUYWtlIHRoZSBhcnJheSBvZiB0b2tlbnMgYW5kIGJ1aWxkIGEgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqL1xuICAgIGNyZWF0ZVRyZWUodG9rZW5zKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSBbXTtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCB7IE9QRU4sIENMT1NFIH0gPSBUb2tlbl8xLlRva2VuT3BlcmF0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IHF1ZVRva2VucyA9IEFycmF5LmZyb20odG9rZW5zKTtcbiAgICAgICAgICAgIGNvbnN0IGluUHJvY1BhcmVudHMgPSBbXTsgLy8gUG9wdWxhdGUgZm9yIG5lc3RlZCBncm91cHNcbiAgICAgICAgICAgIGNvbnN0IGdldEtpZHMgPSAocGFyZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIF9hO1xuICAgICAgICAgICAgICAgIGxldCBraWRUb2tlbiA9IHF1ZVRva2Vucy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHdoaWxlIChraWRUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0ga2lkVG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdXBpbmcoa2lkVG9rZW4pICYmIG9wZXJhdGlvbiA9PT0gT1BFTikge1xuICAgICAgICAgICAgICAgICAgICAgICAga2lkVG9rZW4uaXNDaGlsZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpblByb2NQYXJlbnRzLnVuc2hpZnQoa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0S2lkcyhraWRUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbiA9IHF1ZVRva2Vucy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNHcm91cGluZyhraWRUb2tlbikgJiYgb3BlcmF0aW9uID09PSBDTE9TRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW4gYSBuZXN0ZWQgZ3JvdXBpbmcsIGRvbid0IHdhbnQgdGhlIGNsb3NpbmcgdG9rZW4gdG8gYmUgaW5jbHVkZWQgYXMgYSBjaGlsZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIGN1cnJlbnRseSBwcm9jZXNzaW5nIHBhcmVudC4gSXQgc2hvdWxkIGJlIGEgY2hpbGQgb2YgdGhlIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwYXJlbnQgaWYgaXQgZXhpc3RzLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldlBhcmVudCA9IGluUHJvY1BhcmVudHMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2UGFyZW50ICYmIGluUHJvY1BhcmVudHNbMF0gJiYgKChfYSA9IGluUHJvY1BhcmVudHNbMF0pID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5pZCkgIT09IHByZXZQYXJlbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc0NoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpblByb2NQYXJlbnRzWzBdLmNoaWxkcmVuLnB1c2goa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlVG9rZW5zLnVuc2hpZnQoa2lkVG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBraWRUb2tlbi5pc0NoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGtpZFRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpZFRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbGV0IHRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICB3aGlsZSAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNHcm91cGluZyh0b2tlbikgJiYgb3BlcmF0aW9uID09PSBPUEVOKSB7XG4gICAgICAgICAgICAgICAgICAgIGluUHJvY1BhcmVudHMudW5zaGlmdCh0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgIGdldEtpZHModG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cmVlLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIHRva2VuID0gcXVlVG9rZW5zLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRyZWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhcnNlIHRoZSBzZWFyY2ggc3RyaW5nIGFuZCBjcmVhdGUgbWF0Y2hlcyBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgcnVsZXNcbiAgICAgKiBAcGFyYW0gc2VhcmNoU3RyaW5nIHtzdHJpbmd9XG4gICAgICogQHBhcmFtIHNlbGVjdGVkUnVsZXMge1J1bGVbXX1cbiAgICAgKiBAcmV0dXJucyB7VG9rZW5bXX1cbiAgICAgKi9cbiAgICBnZXRJbml0aWFsTWF0Y2hlcyhzZWFyY2hTdHJpbmcsIHNlbGVjdGVkUnVsZXMpIHtcbiAgICAgICAgLy8gV2UgY2FuJ3QgbWFrZSB0b2tlbnMgeWV0IGJlY2F1c2Ugbm90IGFsbCBtYXRjaGVzIHdpbGwgYmUgZXhhY3RseSBhIHRva2VuXG4gICAgICAgIC8vIEZvciBleGFtcGxlLCB0ZXJtQU5EIHdpbGwgbWF0Y2ggdGhlIEFORCB0ZXN0XG4gICAgICAgIGxldCBtYXRjaGVzID0gW107XG4gICAgICAgIGlmIChzZWFyY2hTdHJpbmcgJiYgc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoU3RyID0gc2VhcmNoU3RyaW5nO1xuICAgICAgICAgICAgbGV0IHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgY3VycmVudElkeCA9IDA7IGN1cnJlbnRJZHggPCBzZWFyY2hTdHIubGVuZ3RoOyBjdXJyZW50SWR4KyspIHtcbiAgICAgICAgICAgICAgICBzdWJTdHIgKz0gc2VhcmNoU3RyLmNoYXJBdChjdXJyZW50SWR4KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJ1bGUgb2Ygc2VsZWN0ZWRSdWxlcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2hTdGFydCA9IHJ1bGUudGVzdChzdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hTdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViU3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBydWxlLnR5cGUgPyBydWxlLnR5cGUgOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogcnVsZS5vcGVyYXRpb24gfHwgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuTk9ORSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydWxlOiBydWxlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YlN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3ViU3RyICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFdlJ3ZlIGl0ZXJhdGVkIHRvIHRoZSBlbmQgb2YgdGhlIHNlYXJjaCBzdHJpbmcgYnV0IHdlIGhhdmUgc29tZVxuICAgICAgICAgICAgICAgIC8vIHVubWF0Y2hlZCBzdHJpbmcgcmVtYWluaW5nLCB3aGljaCBjYW4gb25seSBiZSBhIHRlcm1cbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdWJTdHIsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJZHg6IHNlYXJjaFN0ci5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoU3RhcnQ6IC0xLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbl8xLlRva2VuVHlwZS5URVJNLFxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IFRva2VuXzEuVG9rZW5PcGVyYXRpb25zLk5PTkUsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIucGFyc2VTZWFyY2hTdHJpbmcsIG1hdGNoZXM9JywgbWF0Y2hlcyk7XG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHBocmFzZXMgYmV0d2VlbiBvcGVyYXRvcnMgYW5kIHB1dCBpbiB0aGUgb3BlcmF0b3IgdG9rZW4gcGhyYXNlIHByb3BlcnR5XG4gICAgICogQHBhcmFtIG1hdGNoZXMge01hdGNoW119XG4gICAgICogQHJldHVybnMge01hdGNoW119XG4gICAgICovXG4gICAgZ2V0TWF0Y2hQaHJhc2VzKG1hdGNoZXMpIHtcbiAgICAgICAgbGV0IHBhcnNlZE1hdGNoZXMgPSBbXTtcbiAgICAgICAgbGV0IHBocmFzZVN0YWNrID0gW107XG4gICAgICAgIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKChtYXRjaCwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuUE9TU0lCTEUgJiYgbWF0Y2gudHlwZSAhPT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGhyYXNlU3RhY2sucHVzaChtYXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGhyYXNlQXJyID0gW107XG4gICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKG1hdGNoLnN1YlN0cik7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwaHJhc2VTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdElkeCA9IHBocmFzZVN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFBocmFzZU1hdGNoID0gcGhyYXNlU3RhY2tbbGFzdElkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdFBocmFzZU1hdGNoLnR5cGUgIT09IFRva2VuXzEuVG9rZW5UeXBlLlBPU1NJQkxFICYmIGxhc3RQaHJhc2VNYXRjaC50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZUFyci5wdXNoKGxhc3RQaHJhc2VNYXRjaC5zdWJTdHIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBocmFzZVN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2gucGhyYXNlID0gcGhyYXNlQXJyLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyc2VkTWF0Y2hlcy5wdXNoKG1hdGNoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXJzZXIuYnVpbGRQaHJhc2VzLCBwYXJzZWRNYXRjaGVzPScsIHBhcnNlZE1hdGNoZXMpO1xuICAgICAgICByZXR1cm4gcGFyc2VkTWF0Y2hlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBmaXJzdCBwcmV2aW91cyBPUEVSQVRPUiBmcm9tIHRoZSB0b2tlbiBhdCB0aGUgc3RhcnRJZHggaW5kZXhcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHtUb2tlbltdfVxuICAgICAqIEBwYXJhbSBzdGFydElkeCB7bnVtYmVyfSBUaGUgdG9rZW4gaW5kZXggaW4gdGhlIHRva2VucyBhcnJheVxuICAgICAqL1xuICAgIGdldFByZWNlZGluZ09wZXJhdG9yVG9rZW4odG9rZW5zLCBzdGFydElkeCkge1xuICAgICAgICBsZXQgcmV0dXJuVG9rZW4gPSBudWxsO1xuICAgICAgICBsZXQgcmV0dXJuT2JqID0gbnVsbDtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoICYmICh0b2tlbnMubGVuZ3RoIC0gMSkgPj0gc3RhcnRJZHgpIHtcbiAgICAgICAgICAgIHJldHVyblRva2VuID0gdG9rZW5zW3N0YXJ0SWR4XTtcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IHN0YXJ0SWR4O1xuICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgIHdoaWxlIChwb3NpdGlvbiA+IC0xICYmIHJldHVyblRva2VuICYmIChyZXR1cm5Ub2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5PUEVSQVRPUiAmJiByZXR1cm5Ub2tlbi50eXBlICE9PSBUb2tlbl8xLlRva2VuVHlwZS5QT1NTSUJMRSkpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbi0tO1xuICAgICAgICAgICAgICAgIHJldHVyblRva2VuID0gdG9rZW5zW3Bvc2l0aW9uXTtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuT2JqID0geyB0b2tlbjogcmV0dXJuVG9rZW4sIGRpc3RhbmNlOiBjb3VudCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR1cm5PYmo7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGVyZSBhcmUgbm8gdW5jbG9zZWQgZ3JvdXAgdG9rZW5zXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcGFyYW0gdG9rZW5UeXBlIHtUb2tlblR5cGV9IFRoZSBncm91cCB0b2tlbiB0eXBlIHRvIGNoZWNrIGZvclxuICAgICAqIEByZXR1cm5zIHtUb2tlbn1cbiAgICAgKi9cbiAgICBnZXRVbmNsb3NlZEdyb3VwSXRlbSh0b2tlbnMsIHRva2VuVHlwZSkge1xuICAgICAgICBsZXQgdW5jbG9zZWRHcm91cFRva2VuID0gbnVsbDtcbiAgICAgICAgaWYgKHRva2VucyAmJiB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlVG9rZW5zID0gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiB0b2tlbi50eXBlID09PSB0b2tlblR5cGUpO1xuICAgICAgICAgICAgaWYgKHR5cGVUb2tlbnMgJiYgdHlwZVRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4sIGlkeCwgYXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmNsb3NlZEdyb3VwVG9rZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSB0b2tlblR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZEdyb3VwVG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSB0b2tlblR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmNsb3NlZEdyb3VwVG9rZW4gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuY2xvc2VkR3JvdXBUb2tlbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSB0b2tlbiBpcyBhIFBhcmVuIG9yIFF1b3RlXG4gICAgICogQHBhcmFtIHRva2VuIHtUb2tlbn1cbiAgICAgKi9cbiAgICBpc0dyb3VwaW5nKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgY29uc3QgeyB0eXBlIH0gPSB0b2tlbjtcbiAgICAgICAgICAgIGNvbnN0IHsgUVVPVEUsIEdST1VQSU5HIH0gPSBUb2tlbl8xLlRva2VuVHlwZTtcbiAgICAgICAgICAgIHJldHVybiAodHlwZSA9PT0gUVVPVEUgfHwgdHlwZSA9PT0gR1JPVVBJTkcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRva2VuIGlzIGEgVEVSTSwgUE9TU0lCTEUgb3IgT1BFUkFUT1JcbiAgICAgKiBAcGFyYW0gdG9rZW4ge1Rva2VufVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzVGVybU9yT3BlcmF0b3IodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGUgfSA9IHRva2VuO1xuICAgICAgICAgICAgY29uc3QgeyBURVJNLCBQT1NTSUJMRSwgT1BFUkFUT1IgfSA9IFRva2VuXzEuVG9rZW5UeXBlO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGUgPT09IFRFUk0gfHwgdHlwZSA9PT0gUE9TU0lCTEUgfHwgdHlwZSA9PT0gT1BFUkFUT1I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IG1hdGNoZXMgdG8gdG9rZW5zXG4gICAgICogQHBhcmFtIG1hdGNoZXMge01hdGNoW119XG4gICAgICogQHJldHVybnMge1Rva2VuW119XG4gICAgICovXG4gICAgbWF0Y2hlc1RvVG9rZW5zKG1hdGNoZXMpIHtcbiAgICAgICAgbGV0IHRva2VucyA9IFtdO1xuICAgICAgICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgbWF0Y2hlcy5mb3JFYWNoKChtYXRjaCwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN1YlN0ciwgbWF0Y2hTdGFydCwgY3VycmVudElkeCwgdHlwZSwgb3BlcmF0aW9uLCBwaHJhc2UsIHJ1bGUgfSA9IG1hdGNoO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5vblRlcm0gPSBzdWJTdHIuc2xpY2UobWF0Y2hTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcyA9IGN1cnJlbnRJZHggLSBub25UZXJtLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoU3RhcnQgPiAwKSB7IC8vIG1hdGNoIGZvdW5kIGluIG1pZGRsZSBvciBlbmQgb2Ygc3ViU3RyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVybSA9IHN1YlN0ci5zbGljZSgwLCBtYXRjaFN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKHRlcm0sIFRva2VuXzEuVG9rZW5UeXBlLlRFUk0sIHVuZGVmaW5lZCwgcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rva2VuID0gdGhpcy5jaGVja1Rva2VuVHlwZShuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbi5waHJhc2UgPSBwaHJhc2UgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbi5ydWxlID0gcnVsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKG5ld1Rva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZXQgb3RoZXJUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKG5vblRlcm0sIHR5cGUsIG9wZXJhdGlvbiwgY3VycmVudElkeCk7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyVG9rZW4ucnVsZSA9IHJ1bGU7XG4gICAgICAgICAgICAgICAgICAgIG90aGVyVG9rZW4ucGhyYXNlID0gcGhyYXNlIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChvdGhlclRva2VuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcyA9IGN1cnJlbnRJZHggLSAxO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdUb2tlbiA9IG5ldyBUb2tlbl8xLlRva2VuKHN1YlN0ciwgVG9rZW5fMS5Ub2tlblR5cGUuVEVSTSwgdW5kZWZpbmVkLCBwb3MpO1xuICAgICAgICAgICAgICAgICAgICBuZXdUb2tlbi5ydWxlID0gcnVsZTtcbiAgICAgICAgICAgICAgICAgICAgbmV3VG9rZW4ucGhyYXNlID0gcGhyYXNlIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXdUb2tlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRva2VucztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGFyc2UgdGhlIHNlYXJjaCBzdHJpbmcgYW5kIGJ1aWxkIG91dCBhbGwgdGhlIHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICBwYXJzZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2VhcmNoU3RyaW5nICYmIHRoaXMuc2VsZWN0ZWRSdWxlcyAmJiB0aGlzLnZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVkVG9rZW5zO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwcm92aWRlIHRoZSBzZWFyY2ggc3RyaW5nLCBzZWxlY3RlZCBydWxlcyBhbmQgdmFsaWRhdGlvbiBydWxlcyB0byBwcm9jZWVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIHRoZSBhcnJheXMgb2YgdGhpcyBjbGFzc1xuICAgICAqL1xuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLl9maW5hbFRva2VucyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsTWF0Y2hlcyA9IFtdO1xuICAgICAgICB0aGlzLl9pbml0aWFsVG9rZW5zID0gW107XG4gICAgICAgIHRoaXMuX21hdGNoZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fdHJlZSA9IFtdO1xuICAgICAgICB0aGlzLl92YWxpZGF0ZWRUb2tlbnMgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hvbGVUb2tlbnMgPSBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgdGhlIHRva2VucyB0byBlbnN1cmUgbm8gdW5hbGxvd2VkIGNoYXJhY3RlcnMsIG9yIG1hbGZvcm1lZCB0ZXh0IChpLmUuIG9wZW5pbmcgcGFyZW4gd2l0aCBubyBjbG9zaW5nIHBhcmVuLCBldGMpXG4gICAgICogQHBhcmFtIHRva2VucyB7VG9rZW5bXX1cbiAgICAgKiBAcGFyYW0gc2VsZWN0ZWRWYWxpZGF0aW9uUnVsZXMge1ZhbGlkYXRpb25SdWxlW119XG4gICAgICogQHJldHVybnMge1Rva2VuW119XG4gICAgICovXG4gICAgdmFsaWRhdGVUb2tlbnModG9rZW5zLCBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICBpZiAodG9rZW5zICYmIHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2Vucy5mb3JFYWNoKCh0b2tlbiwgaWR4LCBhcnIpID0+IHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFZhbGlkYXRpb25SdWxlcy5mb3JFYWNoKChydWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExvb3AgdGhyb3VnaCB2YWxpZGF0aW9uIHJ1bGVzIGFuZCBlbnN1cmUgZWFjaCB0b2tlbiBwYXNzZXMgZWFjaCBydWxlXG4gICAgICAgICAgICAgICAgICAgIGxldCBtYXRjaCA9IHJ1bGUudGVzdCh0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdG9rZW4uaXNJbnNpZGVRdW90ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgSW52YWxpZCBjaGFyYWN0ZXIgYXQgcG9zaXRpb24gJHt0b2tlbi5wb3NpdGlvbi5zdGFydH0gJiMzOTske3J1bGUuY2hhcmFjdGVyfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbl8xLlRva2VuVHlwZS5HUk9VUElORyAmJiB0b2tlbi52YWx1ZSA9PT0gJygnICYmIGlkeCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIGFuIG9wZXJhdG9yIHByZWNlZGVzIGEgZ3JvdXBpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldlRva2VuID0gdGhpcy5nZXRQcmVjZWRpbmdPcGVyYXRvclRva2VuKHRva2VucywgaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZUb2tlbiAmJiAoIXByZXZUb2tlbi50b2tlbiB8fCAocHJldlRva2VuICYmIHByZXZUb2tlbi5kaXN0YW5jZSA+IDIpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwcmV2VG9rZW4udG9rZW4gPyBwcmV2VG9rZW4udG9rZW4udmFsdWUgOiB0b2tlbi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IGBBbiBvcGVyYXRvciBzaG91bGQgcHJlY2VkZSBhIGdyb3VwaW5nIGF0IHBvc2l0aW9uICR7dG9rZW4ucG9zaXRpb24uc3RhcnR9ICYjMzk7JHt2YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIG5vIGJhY2sgdG8gYmFjayBvcGVyYXRvcnNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFRva2VuID0gYXJyW2lkeCArIDFdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0VG9rZW4yID0gYXJyW2lkeCArIDJdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKG5leHRUb2tlbiAmJiBuZXh0VG9rZW4udHlwZSA9PT0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV4dFRva2VuMiAmJiBuZXh0VG9rZW4yLnR5cGUgPT09IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYENhbm5vdCBoYXZlIG9wZXJhdG9ycyBiYWNrIHRvIGJhY2sgYXQgcG9zaXRpb24gJHt0b2tlbi5wb3NpdGlvbi5zdGFydH0gJiMzOTske3Rva2VuLnZhbHVlfSAke25leHRUb2tlbi52YWx1ZX0mIzM5OzogYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgdW5jbG9zZWRUeXBlcyA9IFtcbiAgICAgICAgICAgICAgICB7IHR5cGU6IFRva2VuXzEuVG9rZW5UeXBlLkdST1VQSU5HLCBtc2dOYW1lUGFydDogJ3BhcmVuJyB9LFxuICAgICAgICAgICAgICAgIHsgdHlwZTogVG9rZW5fMS5Ub2tlblR5cGUuUVVPVEUsIG1zZ05hbWVQYXJ0OiAncXVvdGUnIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICB1bmNsb3NlZFR5cGVzLmZvckVhY2goKHRva2VuVHlwZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuY2xvc2VkR3JvdXBUb2tlbiA9IHRoaXMuZ2V0VW5jbG9zZWRHcm91cEl0ZW0odG9rZW5zLCB0b2tlblR5cGUudHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKHVuY2xvc2VkR3JvdXBUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1bmNsb3NlZElkID0gdW5jbG9zZWRHcm91cFRva2VuLmlkO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWx0ZXJlZFRva2VucyA9IHRva2Vucy5maWx0ZXIoc3JjVG9rZW4gPT4gc3JjVG9rZW4uaWQgPT09IHVuY2xvc2VkSWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyZWRUb2tlbnMgJiYgZmlsdGVyZWRUb2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgVW5tYXRjaGVkICR7dG9rZW5UeXBlLm1zZ05hbWVQYXJ0fSBhdCBwb3NpdGlvbiAke2ZpbHRlcmVkVG9rZW5zWzBdLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7ZmlsdGVyZWRUb2tlbnNbMF0udmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZFRva2Vuc1swXS5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHsgV0hJVEVfU1BBQ0UsIFBPU1NJQkxFLCBPUEVSQVRPUiB9ID0gVG9rZW5fMS5Ub2tlblR5cGU7XG4gICAgICAgICAgICBjb25zdCBmaXJzdFRva2VuID0gdG9rZW5zWzBdLnR5cGU7XG4gICAgICAgICAgICBjb25zdCBzZWNvbmRUb2tlbiA9IHRva2Vucy5sZW5ndGggPj0gMiA/IHRva2Vuc1sxXS50eXBlIDogbnVsbDtcbiAgICAgICAgICAgIGlmICgoZmlyc3RUb2tlbiA9PT0gT1BFUkFUT1IgfHwgZmlyc3RUb2tlbiA9PT0gUE9TU0lCTEUpIHx8XG4gICAgICAgICAgICAgICAgKGZpcnN0VG9rZW4gPT09IFdISVRFX1NQQUNFICYmIChzZWNvbmRUb2tlbiAmJiBzZWNvbmRUb2tlbiA9PT0gT1BFUkFUT1IgfHwgc2Vjb25kVG9rZW4gPT09IFBPU1NJQkxFKSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBgQSBzZWFyY2ggbXVzdCBub3QgYmVnaW4gd2l0aCBhbiBvcGVyYXRvciBhdCBwb3NpdGlvbiAwICYjMzk7JHt0b2tlbnNbMF0udmFsdWV9JiMzOTs6IGA7XG4gICAgICAgICAgICAgICAgdG9rZW5zWzBdLmVycm9ycy5wdXNoKG5ldyBFcnJvcihtc2cpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxhc3RJZHggPSB0b2tlbnMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IHRva2Vuc1tsYXN0SWR4XS50eXBlO1xuICAgICAgICAgICAgY29uc3QgbmV4dExhc3RUb2tlbiA9IHRva2Vucy5sZW5ndGggPj0gMiA/IHRva2Vuc1tsYXN0SWR4IC0gMV0udHlwZSA6IG51bGw7XG4gICAgICAgICAgICBpZiAoKGxhc3RUb2tlbiA9PT0gT1BFUkFUT1IgfHwgbGFzdFRva2VuID09PSBQT1NTSUJMRSkgfHxcbiAgICAgICAgICAgICAgICAobGFzdFRva2VuID09PSBXSElURV9TUEFDRSAmJlxuICAgICAgICAgICAgICAgICAgICAobmV4dExhc3RUb2tlbiAmJiBuZXh0TGFzdFRva2VuID09PSBQT1NTSUJMRSB8fCBuZXh0TGFzdFRva2VuID09PSBPUEVSQVRPUikpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYEEgc2VhcmNoIG11c3Qgbm90IGVuZCB3aXRoIGFuIG9wZXJhdG9yIGF0IHBvc2l0aW9uICR7dG9rZW5zW2xhc3RJZHhdLnBvc2l0aW9uLnN0YXJ0fSAmIzM5OyR7dG9rZW5zW2xhc3RJZHhdLnZhbHVlfSYjMzk7OiBgO1xuICAgICAgICAgICAgICAgIHRva2Vuc1tsYXN0SWR4XS5lcnJvcnMucHVzaChuZXcgRXJyb3IobXNnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3BhcnNlci52YWxpZGF0ZVRva2VucywgdG9rZW5zPScsIHRva2Vucyk7XG4gICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgfVxufVxuZXhwb3J0cy5QYXJzZXIgPSBQYXJzZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuVmFsaWRhdGlvblJ1bGUgPSBleHBvcnRzLkVzY2FwZWFibGVSdWxlID0gZXhwb3J0cy5SdWxlID0gdm9pZCAwO1xuY29uc3QgVG9rZW5fMSA9IHJlcXVpcmUoXCIuL1Rva2VuXCIpO1xuLyoqXG4gKiBUb3AgbGV2ZWwgY2xhc3MgZm9yIGEgcnVsZS4gUnVsZXMgZGVmaW5lIGEgcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm4gdG8gbG9vayBmb3JcbiAqIHdpdGhpbiBhIHtAbGluayBUb2tlbiN2YWx1ZX1cbiAqIEBjbGFzcyB7UnVsZX1cbiAqL1xuY2xhc3MgUnVsZSB7XG4gICAgY29uc3RydWN0b3IocGF0dGVybiwgb3BlcmF0aW9uLCB0eXBlID0gVG9rZW5fMS5Ub2tlblR5cGUuT1BFUkFUT1IpIHtcbiAgICAgICAgdGhpcy5fcGF0dGVybiA9IHBhdHRlcm47XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbiA9IG9wZXJhdGlvbjtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEEgcmVndWxhciBleHByZXNzaW9uIHBhdHRlcm5cbiAgICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgICAqL1xuICAgIGdldCBwYXR0ZXJuKCkge1xuICAgICAgICBpZiAoIXRoaXMuX3BhdHRlcm4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUGF0dGVybiBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdHRlcm47XG4gICAgfVxuICAgIHNldCBwYXR0ZXJuKHBhdHRlcm4pIHtcbiAgICAgICAgdGhpcy5fcGF0dGVybiA9IHBhdHRlcm47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBvcGVyYXRpb24gdG9rZW5zIHRoYXQgbWF0Y2ggdGhpcyBydWxlIHBlcmZvcm1cbiAgICAgKiBAdHlwZSB7VG9rZW5PcGVyYXRpb25zfVxuICAgICAqL1xuICAgIGdldCBvcGVyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRpb247XG4gICAgfVxuICAgIHNldCBvcGVyYXRpb24ob3BlcmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdGlvbiA9IG9wZXJhdGlvbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHRva2VuIHR5cGUgZm9yIHRva2VucyBtYXRjaGluZyB0aGlzIHJ1bGVcbiAgICAgKiBAdHlwZSB7VG9rZW5UeXBlfVxuICAgICAqL1xuICAgIGdldCB0eXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHlwZTtcbiAgICB9XG4gICAgc2V0IHR5cGUodHlwZSkge1xuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGVzdCBpZiB0aGUgcGFzc2VkIGluIHN0ciBtYXRjaGVzIHRoZSBwYXR0ZXJuIG9mIHRoaXMgcnVsZVxuICAgICAqIEBwYXJhbSBzdHIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0ZXN0KHN0cikge1xuICAgICAgICBpZiAodGhpcy5wYXR0ZXJuKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnNlYXJjaCh0aGlzLnBhdHRlcm4pO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gUGF0dGVybiBkZWZpbmVkJyk7XG4gICAgfVxufVxuZXhwb3J0cy5SdWxlID0gUnVsZTtcbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBwYXR0ZXJuIGlzIGVzY2FwZWRcbiAqIEBjbGFzcyB7RXNjYXBhYmxlUnVsZX1cbiAqIEBleHRlbmRzIHtSdWxlfVxuICovXG5jbGFzcyBFc2NhcGVhYmxlUnVsZSBleHRlbmRzIFJ1bGUge1xuICAgIGNvbnN0cnVjdG9yKG5hbWUsIG9wZXJhdGlvbiwgdHlwZSA9IFRva2VuXzEuVG9rZW5UeXBlLk9QRVJBVE9SKSB7XG4gICAgICAgIHN1cGVyKG5hbWUsIG9wZXJhdGlvbiwgdHlwZSk7XG4gICAgfVxuICAgIHRlc3Qoc3RyKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzdXBlci50ZXN0KHN0cik7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHIuY2hhckF0KHJlc3VsdCAtIDEpID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbn1cbmV4cG9ydHMuRXNjYXBlYWJsZVJ1bGUgPSBFc2NhcGVhYmxlUnVsZTtcbi8qKlxuICogUnVsZSBmb3IgdmFsaWRhdGluZyB0b2tlbnNcbiAqIEBjbGFzcyB7VmFsaWRhdGlvblJ1bGV9XG4gKiBAZXh0ZW5kcyB7UnVsZX1cbiAqL1xuY2xhc3MgVmFsaWRhdGlvblJ1bGUgZXh0ZW5kcyBSdWxlIHtcbiAgICBjb25zdHJ1Y3RvcihwYXR0ZXJuLCBjaGFyYWN0ZXIpIHtcbiAgICAgICAgc3VwZXIocGF0dGVybiwgVG9rZW5fMS5Ub2tlbk9wZXJhdGlvbnMuRVJST1IpO1xuICAgICAgICB0aGlzLl9jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjaGFyYWN0ZXIgdGhhdCB3aWxsIGJlIHJlcG9ydGVkIGFzIGFuIGVycm9yIG1lc3NhZ2UgaW5zaWRlIHRoZSB0b2tlblxuICAgICAqIHdpdGggdGhlIGVycm9yXG4gICAgICovXG4gICAgZ2V0IGNoYXJhY3RlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NoYXJhY3RlcjtcbiAgICB9XG4gICAgc2V0IGNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcbiAgICAgICAgdGhpcy5fY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xuICAgIH1cbn1cbmV4cG9ydHMuVmFsaWRhdGlvblJ1bGUgPSBWYWxpZGF0aW9uUnVsZTtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Ub2tlbiA9IGV4cG9ydHMuVG9rZW5PcGVyYXRpb25zID0gZXhwb3J0cy5Ub2tlbk9wZXJhdG9ycyA9IGV4cG9ydHMuVG9rZW5UeXBlID0gdm9pZCAwO1xuLyoqXG4gKiBUaGUgdHlwZSBvZiB2YWx1ZSBmb3IgdGhpcyB0b2tlblxuICovXG52YXIgVG9rZW5UeXBlO1xuKGZ1bmN0aW9uIChUb2tlblR5cGUpIHtcbiAgICAvKipcbiAgICAgKiBVc3VhbGx5IGEgd29yZCBvciBsZXR0ZXIgdGhhdCBpcyBub3Qgb25lIG9mIHRoZSBvdGhlciB0b2tlbiB0eXBlc1xuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlRFUk1cIl0gPSBcInRlcm1cIjtcbiAgICAvKipcbiAgICAgKiBBbiBhY3R1YWwgb3BlcmF0b3IgKEFORCwgT1IsIE5PVCwgKywgfiwgLSlcbiAgICAgKi9cbiAgICBUb2tlblR5cGVbXCJPUEVSQVRPUlwiXSA9IFwib3BlcmF0b3JcIjtcbiAgICAvKipcbiAgICAgKiBBIHBvc3NpYmxlIG9wZXJhdG9yIChhbmQsIG9yLCBub3QpXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiUE9TU0lCTEVcIl0gPSBcInBvc3NpYmxlXCI7XG4gICAgLyoqXG4gICAgICogV2hpdGVzcGFjZSBvZiBzb21lIGtpbmQsIHVzdWFsbHkgYSBzcGFjZVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIldISVRFX1NQQUNFXCJdID0gXCJ3aGl0ZXNwYWNlXCI7XG4gICAgLyoqXG4gICAgICogVXN1YWxseSBhIHBhcmVuIG9mIHNvbWUgc29ydFxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIkdST1VQSU5HXCJdID0gXCJncm91cGluZ1wiO1xuICAgIC8qKlxuICAgICAqIEEgcXVvdGUgKFwiKVxuICAgICAqL1xuICAgIFRva2VuVHlwZVtcIlFVT1RFXCJdID0gXCJxdW90ZVwiO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSB0aGlzIGlzIGp1c3QgYW5nbGUgYnJhY2tldHMgKDwgPikuIFRoZXNlIG5lZWQgdGhlaXIgb3duXG4gICAgICogc3BlY2lhbCB0eXBlIHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSB0cmVhdGluZyB0aGVtIGFuZCB0aGVpciB0ZXh0XG4gICAgICogYXMgaHRtbCB0YWdzXG4gICAgICovXG4gICAgVG9rZW5UeXBlW1wiQVNDSUlcIl0gPSBcImFzY2lpXCI7XG59KShUb2tlblR5cGUgPSBleHBvcnRzLlRva2VuVHlwZSB8fCAoZXhwb3J0cy5Ub2tlblR5cGUgPSB7fSkpO1xuLyoqXG4gKiBUaGUgYWN0dWFsIG9wZXJhdG9ycy4gVGhpcyBpcyB1c2VkIHRvIGRlZmluZSB3aGF0IGEgcG9zc2libGUgb3Igc3ltYm9sIGFjdHVhbGx5IGlzXG4gKi9cbnZhciBUb2tlbk9wZXJhdG9ycztcbihmdW5jdGlvbiAoVG9rZW5PcGVyYXRvcnMpIHtcbiAgICBUb2tlbk9wZXJhdG9yc1tcIkFORFwiXSA9IFwiQU5EXCI7XG4gICAgVG9rZW5PcGVyYXRvcnNbXCJPUlwiXSA9IFwiT1JcIjtcbiAgICBUb2tlbk9wZXJhdG9yc1tcIk5PVFwiXSA9IFwiTk9UXCI7XG59KShUb2tlbk9wZXJhdG9ycyA9IGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgfHwgKGV4cG9ydHMuVG9rZW5PcGVyYXRvcnMgPSB7fSkpO1xuLyoqXG4gKiBQb3NzaWJsZSwgQWN0dWFsIGFuZCBTeW1ib2wgT3BlcmF0b3JzIGdldCB0aGVpciByZXNwZWN0aXZlIEFORC9PUi9OT1QuIFF1b3RlcyBhbmQgcGFyZW5zXG4gKiBnZXQgdGhlaXIgcmVzcGVjdGl2ZSBPUEVOL0NMT1NFLiBUZXJtcyBhcmUgTk9ORSBhbmQgZXJyb3JzIGFyZSBFUlJPUi5cbiAqL1xudmFyIFRva2VuT3BlcmF0aW9ucztcbihmdW5jdGlvbiAoVG9rZW5PcGVyYXRpb25zKSB7XG4gICAgLyoqXG4gICAgICogUG9zc2libGUvQWN0dWFsL1N5bWJvbCBBTkQgb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJBTkRcIl0gPSBcIkFORFwiO1xuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlL0FjdHVhbC9TeW1ib2wgT1Igb3BlcmF0b3JcbiAgICAgKi9cbiAgICBUb2tlbk9wZXJhdGlvbnNbXCJPUlwiXSA9IFwiT1JcIjtcbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZS9BY3R1YWwvU3ltYm9sIE5PVCBvcGVyYXRvclxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk5PVFwiXSA9IFwiTk9UXCI7XG4gICAgLyoqXG4gICAgICogT3BlbmluZyBQYXJlbiBvciBRdW90ZVxuICAgICAqL1xuICAgIFRva2VuT3BlcmF0aW9uc1tcIk9QRU5cIl0gPSBcIm9wZW5cIjtcbiAgICAvKipcbiAgICAgKiBDbG9zaW5nIFBhcmVuIG9yIFF1b3RlXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiQ0xPU0VcIl0gPSBcImNsb3NlXCI7XG4gICAgLyoqXG4gICAgICogVGVybSBvciBXaGl0ZXNwYWNlXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiTk9ORVwiXSA9IFwibm9uZVwiO1xuICAgIC8qKlxuICAgICAqIEVycm9yXG4gICAgICovXG4gICAgVG9rZW5PcGVyYXRpb25zW1wiRVJST1JcIl0gPSBcImVycm9yXCI7XG59KShUb2tlbk9wZXJhdGlvbnMgPSBleHBvcnRzLlRva2VuT3BlcmF0aW9ucyB8fCAoZXhwb3J0cy5Ub2tlbk9wZXJhdGlvbnMgPSB7fSkpO1xuLyoqXG4gKiBBIHRva2VuIGRlZmluZXMgYSBwaWVjZSBvZiB0ZXh0IGZvdW5kIGluIHRoZSBzZWFyY2ggc3RyaW5nLiBUaGlzIGNhbiBiZSBzaW5nbGUgd29yZHMgYW5kIGNoYXJhY3RlcnNcbiAqIGJ1dCBhbHNvIG11bHRpcGxlIHdvcmRzIChpLmUuIHRoZSB0ZXh0IGJldHdlZW4gcXVvdGVzKVxuICogQGNsYXNzIHtUb2tlbn1cbiAqL1xuY2xhc3MgVG9rZW4ge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBUb2tlbiBhbmQgYXNzaWduIGEgcmFuZG9tIElEIHN0cmluZ1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHZhbHVlLCB0eXBlLCBvcGVyYXRpb24gPSBUb2tlbk9wZXJhdGlvbnMuTk9ORSwgcG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgdGhpcy5fZXJyb3JzID0gW107XG4gICAgICAgIHRoaXMuX2h0bWwgPSAnJztcbiAgICAgICAgdGhpcy5faWQgPSAnJztcbiAgICAgICAgdGhpcy5faXNDaGlsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pc1NpYmxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNJbnNpZGVRdW90ZXMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fcGhyYXNlID0gJyc7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uID0geyBzdGFydDogLTEsIGVuZDogLTEgfTtcbiAgICAgICAgdGhpcy5fdHlwZSA9IFRva2VuVHlwZS5URVJNO1xuICAgICAgICB0aGlzLl9zdHlsZUNsYXNzZXMgPSB7XG4gICAgICAgICAgICBlcnJvcjogJ2Vycm9yJyxcbiAgICAgICAgICAgIG9wZXJhdG9yOiAnb3BlcmF0b3InLFxuICAgICAgICAgICAgcG9zc2libGVPcGVyYXRvcjogJ3dhcm5pbmcnXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgICAgICBpZiAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBvc2l0aW9uICE9PSBudWxsICYmIHBvc2l0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0UG9zID0gdGhpcy5jYWxjU3RhcnQocG9zaXRpb24sIGxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBlbmRQb3MgPSB0aGlzLmNhbGNFbmQoc3RhcnRQb3MsIGxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvbiA9IHsgc3RhcnQ6IHN0YXJ0UG9zLCBlbmQ6IGVuZFBvcyB9O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGhlIHN0YXJ0aW5nIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHBvc2l0aW9uIHtudW1iZXJ9IFRoZSBjdXJyZW50IGluZGV4IGZyb20gdGhlIGluaXRpYWxNYXRjaGVzIGdldHRlciBpbiB0aGUgcGFyc2VyXG4gICAgICogQHBhcmFtIGxlbmd0aCB7bnVtYmVyfSBUaGUgbGVuZ3RoIG9mIHRoZSB0ZXh0XG4gICAgICovXG4gICAgY2FsY1N0YXJ0KHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uIC0gKGxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgdGhlIGVuZCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBwb3NpdGlvbiB7bnVtYmVyfSBVc3VhbGx5IHRoZSBzdGFydGluZyBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBsZW5ndGgge251bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGUgdGV4dFxuICAgICAqL1xuICAgIGNhbGNFbmQocG9zaXRpb24sIGxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcG9zaXRpb24gKyAobGVuZ3RoIC0gMSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjaGlsZCB0b2tlbnMuIFVzdWFsbHkgdGV4dCBiZXR3ZWVuIHF1b3RlcyBvciBwYXJlbnNcbiAgICAgKi9cbiAgICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbjtcbiAgICB9XG4gICAgc2V0IGNoaWxkcmVuKGNoaWxkcmVuKSB7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGVycm9ycyBmb3IgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtFcnJvcltdfVxuICAgICAqL1xuICAgIGdldCBlcnJvcnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lcnJvcnM7XG4gICAgfVxuICAgIHNldCBlcnJvcnMoZXJyb3JzKSB7XG4gICAgICAgIHRoaXMuX2Vycm9ycyA9IGVycm9ycztcbiAgICB9XG4gICAgZ2V0IHN0eWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0eWxlQ2xhc3NlcztcbiAgICB9XG4gICAgc2V0IHN0eWxlcyhzdHlsZUNsYXNzZXMpIHtcbiAgICAgICAgdGhpcy5fc3R5bGVDbGFzc2VzID0gc3R5bGVDbGFzc2VzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgaHRtbCBmb3IgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IGh0bWwoKSB7XG4gICAgICAgIGxldCBzcGFuID0gbnVsbDtcbiAgICAgICAgbGV0IHN0eWxlQ2xhc3MgPSBudWxsO1xuICAgICAgICBjb25zdCB7IGVycm9ycywgcnVsZSwgX2h0bWwsIHR5cGUsIHZhbHVlIH0gPSB0aGlzO1xuICAgICAgICBpZiAoZXJyb3JzICYmIGVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHN0eWxlQ2xhc3MgPSB0aGlzLnN0eWxlcy5lcnJvcjtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yU3RyID0gZXJyb3JzLm1hcCgoZXJyLCBpZHgpID0+IGVyci5tZXNzYWdlKS5qb2luKCcmIzEwOycpO1xuICAgICAgICAgICAgc3BhbiA9IGA8c3BhbiBjbGFzcz1cIiR7c3R5bGVDbGFzc31cIiB0aXRsZT1cIiR7ZXJyb3JTdHJ9XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgIHRoaXMuX2h0bWwgPSB2YWx1ZS5yZXBsYWNlKHZhbHVlLCBzcGFuKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghX2h0bWwgJiYgcnVsZSAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgc3R5bGVDbGFzcyA9IHR5cGUgPT09IFRva2VuVHlwZS5QT1NTSUJMRVxuICAgICAgICAgICAgICAgID8gdGhpcy5zdHlsZXMucG9zc2libGVPcGVyYXRvclxuICAgICAgICAgICAgICAgIDogdHlwZSA9PT0gVG9rZW5UeXBlLk9QRVJBVE9SXG4gICAgICAgICAgICAgICAgICAgID8gdGhpcy5zdHlsZXMub3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlU3RyID0gdHlwZSA9PT0gVG9rZW5UeXBlLlBPU1NJQkxFID8gYFBvc3NpYmxlIG9wZXJhdG9yLiBPcGVyYXRvcnMgc2hvdWxkIGJlIGNhcGl0YWxpemVkIChpLmUgJHt2YWx1ZS50b1VwcGVyQ2FzZSgpfSkuYCA6ICcnO1xuICAgICAgICAgICAgc3BhbiA9IHR5cGUgIT09IFRva2VuVHlwZS5QT1NTSUJMRSAmJiB0eXBlICE9PSBUb2tlblR5cGUuT1BFUkFUT1JcbiAgICAgICAgICAgICAgICA/IHZhbHVlXG4gICAgICAgICAgICAgICAgOiBgPHNwYW4gY2xhc3M9XCIke3N0eWxlQ2xhc3N9XCIgdGl0bGU9XCIke3RpdGxlU3RyfVwiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICB0aGlzLl9odG1sID0gcnVsZS5wYXR0ZXJuID8gdmFsdWUucmVwbGFjZShydWxlLnBhdHRlcm4sIHNwYW4pIDogdGhpcy52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghX2h0bWwgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2h0bWwgPSB0aGlzLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9odG1sO1xuICAgIH1cbiAgICBzZXQgaHRtbChodG1sKSB7XG4gICAgICAgIHRoaXMuX2h0bWwgPSBodG1sO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGUgSUQgZm9yIHRoaXMgdG9rZW4gKFRoaXMgSUQgaXMgbm90IHBlcnNpc3RlZCBhcyBjaGFuZ2VzIGFyZSBtYWRlKVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IGlkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faWQ7XG4gICAgfVxuICAgIGdldCBpc0NoaWxkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNDaGlsZDtcbiAgICB9XG4gICAgc2V0IGlzQ2hpbGQoaXNDaGlsZCkge1xuICAgICAgICB0aGlzLl9pc0NoaWxkID0gaXNDaGlsZDtcbiAgICB9XG4gICAgZ2V0IGlzU2libGluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzU2libGluZztcbiAgICB9XG4gICAgc2V0IGlzU2libGluZyhpc1NpYmxpbmcpIHtcbiAgICAgICAgdGhpcy5faXNTaWJsaW5nID0gaXNTaWJsaW5nO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUcnVlIGlmIHRoaXMgdG9rZW4gaXMgaW5zaWRlIHF1b3Rlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldCBpc0luc2lkZVF1b3RlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzSW5zaWRlUXVvdGVzO1xuICAgIH1cbiAgICBzZXQgaXNJbnNpZGVRdW90ZXMoaXNJbnNpZGVRdW90ZXMpIHtcbiAgICAgICAgdGhpcy5faXNJbnNpZGVRdW90ZXMgPSBpc0luc2lkZVF1b3RlcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIGJvb2xlYW4gb3BlcmF0aW9uIHRoaXMgdG9rZW4gaXMgZm9yXG4gICAgICogQHR5cGUge1Rva2VuT3BlcmF0aW9uc31cbiAgICAgKi9cbiAgICBnZXQgb3BlcmF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0aW9uO1xuICAgIH1cbiAgICBzZXQgb3BlcmF0aW9uKG9wZXJhdGlvbikge1xuICAgICAgICB0aGlzLl9vcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIElmIHRoaXMgdG9rZW4gaXMgYSBUb2tlblR5cGUuT1BFUkFUT1Igb3IgVG9rZW5UeXBlLlBPU1NJQkxFIHRoZSBwaHJhc2UgbGVhZGluZyB1cCB0aGlzIHRva2VuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXQgcGhyYXNlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGhyYXNlO1xuICAgIH1cbiAgICBzZXQgcGhyYXNlKHBocmFzZSkge1xuICAgICAgICB0aGlzLl9waHJhc2UgPSBwaHJhc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBwb3NpdGlvbiB0aGlzIHRva2VuIGlzIGF0IGluIHRoZSBzZWFyY2ggc3RyaW5nXG4gICAgICogQHR5cGUge1Bvc2l0aW9ufVxuICAgICAqL1xuICAgIGdldCBwb3NpdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xuICAgIH1cbiAgICBzZXQgcG9zaXRpb24ocG9zaXRpb24pIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhlIHJ1bGUgdGhhdCBjcmVhdGVkIHRoaXMgdG9rZW5cbiAgICAgKiBAdHlwZSB7UnVsZX1cbiAgICAgKi9cbiAgICBnZXQgcnVsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3J1bGU7XG4gICAgfVxuICAgIHNldCBydWxlKHJ1bGUpIHtcbiAgICAgICAgdGhpcy5fcnVsZSA9IHJ1bGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSB0b2tlbiB0eXBlXG4gICAgICogQHR5cGUge1Rva2VuVHlwZX1cbiAgICAgKi9cbiAgICBnZXQgdHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3R5cGU7XG4gICAgfVxuICAgIHNldCB0eXBlKHR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBzdHJpbmcgdmFsdWUgb2YgdGhpcyB0b2tlblxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0IHZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gICAgfVxuICAgIHNldCB2YWx1ZSh2YWx1ZSkge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgIH1cbn1cbmV4cG9ydHMuVG9rZW4gPSBUb2tlbjtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX2V4cG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9fZXhwb3J0U3RhcikgfHwgZnVuY3Rpb24obSwgZXhwb3J0cykge1xuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBfX2NyZWF0ZUJpbmRpbmcoZXhwb3J0cywgbSwgcCk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL0Jvb2xlYW5TZWFyY2hcIiksIGV4cG9ydHMpO1xuX19leHBvcnRTdGFyKHJlcXVpcmUoXCIuL1BhcnNlclwiKSwgZXhwb3J0cyk7XG5fX2V4cG9ydFN0YXIocmVxdWlyZShcIi4vUnVsZVwiKSwgZXhwb3J0cyk7XG5fX2V4cG9ydFN0YXIocmVxdWlyZShcIi4vVG9rZW5cIiksIGV4cG9ydHMpO1xuIiwiY29uc3QgQlNQID0gcmVxdWlyZSgnYm9vbGVhbi1zZWFyY2gtcGFyc2VyJyk7XG5cblxuY29uc3QgZGVmYXVsdFNlYXJjaEZpZWxkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RlZmF1bHQtZmllbGQnKTtcbmNvbnN0IGRlZmF1bHRPdXRwdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZGVmYXVsdC1vdXRwdXQtY29udGFpbmVyJyk7XG5jb25zdCBkZWZhdWx0QnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RlZmF1bHQtc3VibWl0Jyk7XG5cbmNvbnN0IGN1c3RvbVNlYXJjaEZpZWxkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2N1c3RvbS1maWVsZCcpO1xuY29uc3QgY3VzdG9tT3V0cHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2N1c3RvbS1vdXRwdXQtY29udGFpbmVyJyk7XG5jb25zdCBjdXN0b21CdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3VzdG9tLXN1Ym1pdCcpO1xuXG5kZWZhdWx0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZGVmYXVsdE9uU3VibWl0KTtcbmN1c3RvbUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGN1c3RvbU9uU3VibWl0KTtcblxuZnVuY3Rpb24gZGVmYXVsdE9uU3VibWl0KCkge1xuXHRjb25zdCBzZWFyY2hTdHIgPSBkZWZhdWx0U2VhcmNoRmllbGQudmFsdWU7XG5cdC8vIGRlZmF1bHQgY29uZmlndXJhdGlvblxuXHRjb25zdCBicyA9IG5ldyBCU1AuQm9vbGVhblNlYXJjaChzZWFyY2hTdHIpO1xuXHRkZWZhdWx0T3V0cHV0LmlubmVySFRNTCA9IGJzLmh0bWw7XG5cdGNvbnNvbGUubG9nKCdEZWZhdWx0IEJvb2xlYW5TZWFyY2ggaW5zdGFuY2U9JywgYnMpO1xufVxuXG5mdW5jdGlvbiBjdXN0b21PblN1Ym1pdCgpIHtcblx0Y29uc3Qgc2VhcmNoU3RyID0gY3VzdG9tU2VhcmNoRmllbGQudmFsdWU7XG5cdGNvbnN0IHJ1bGVzID0gey4uLkJTUC5ERUZBVUxUX1JVTEVTfTtcblx0Y29uc3QgdmFsaWRhdGlvblJ1bGVzID0ge1xuXHRcdC4uLkJTUC5ERUZBVUxUX1ZBTElEQVRJT05fUlVMRVMsXG5cdFx0bnVtYmVyOiBuZXcgQlNQLlZhbGlkYXRpb25SdWxlKC9bMC05XSsvZywgJyMnKVxuXHR9O1xuXHRjb25zdCBjdXN0b21Db25maWcgPSB7XG5cdFx0cnVsZXMsXG5cdFx0dmFsaWRhdGlvblJ1bGVzLFxuXHRcdG9wZXJhdG9yU3R5bGVDbGFzczogJ3N1Y2Nlc3MnXG5cdH07XG5cdC8vIGN1c3RvbSBjb25maWd1cmF0aW9uXG5cdGNvbnN0IGJzID0gbmV3IEJTUC5Cb29sZWFuU2VhcmNoKHNlYXJjaFN0ciwgY3VzdG9tQ29uZmlnKTtcblx0Y3VzdG9tT3V0cHV0LmlubmVySFRNTCA9IGJzLmh0bWw7XG5cdGNvbnNvbGUubG9nKCdDdXN0b20gQm9vbGVhblNlYXJjaCBpbnN0YW5jZT0nLCBicyk7XG59XG4iXX0=
