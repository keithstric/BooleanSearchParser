(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const BSP = require('boolean-search-parser');

const searchField = document.querySelector('input');
const output = document.querySelector('#output-container');
const button = document.querySelector('#submit');
button.addEventListener('click', onSubmit);

function onSubmit() {
	const searchStr = searchField.value;
	const bs = new BSP.BooleanSearch(searchStr);
	output.innerHTML = bs.html;
	console.log('bs=', bs);
}

},{"boolean-search-parser":6}],2:[function(require,module,exports){
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

},{"./Parser":3,"./Rule":4,"./Token":5}],3:[function(require,module,exports){
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
     * The initial matches gathered from the searchString
     * @type {Match[]}
     */
    get initialMatches() {
        if (!this._initialMatches || !this._initialMatches.length) {
            if (this.searchString && this.selectedRules && this.selectedRules.length) {
                this._initialMatches = this.getInitialMatches(this.searchString, this.selectedRules);
            }
            else {
                throw new Error('You must provide a search string and selected rules');
            }
        }
        return this._initialMatches;
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
     * The matches with phrases added
     * @type {Match[]}
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
     * The rules we use for validating tokens
     * @type {ValidationRule[]}
     */
    get validationRules() {
        return this._validationRules;
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
                let kidToken = queTokens.shift();
                while (kidToken) {
                    const { operation } = kidToken;
                    if (this.isGrouping(kidToken) && operation === OPEN) {
                        parent.children.push(kidToken);
                        inProcParents.unshift(parent);
                        getKids(kidToken);
                        kidToken = queTokens.shift();
                    }
                    else if (this.isGrouping(kidToken) && operation === CLOSE) {
                        // In a nested grouping, don't want the closing token to be included as a child
                        // of the currently processing parent. It should be a child of the previous
                        // parent if it exists.
                        const prevParent = inProcParents.shift();
                        if (prevParent) {
                            prevParent.children.push(kidToken);
                        }
                        else {
                            queTokens.unshift(kidToken);
                        }
                        break;
                    }
                    else {
                        parent.children.push(kidToken);
                        kidToken = queTokens.shift();
                    }
                }
            };
            let token = queTokens.shift();
            while (token) {
                const { operation } = token;
                if (this.isGrouping(token) && operation === OPEN) {
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
            selectedRules = selectedRules;
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
            const returnVal = (type === QUOTE || type === GROUPING);
            return returnVal;
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
                            const msg = `Invalid character at position ${token.position.start} "${rule.character}": `;
                            token.errors.push(new Error(msg));
                        }
                    }
                });
                if (token.type === Token_1.TokenType.GROUPING && token.value === '(' && idx > 2) {
                    // Ensure an operator precedes a grouping
                    const prevToken = this.getPrecedingOperatorToken(tokens, idx);
                    if (prevToken && (!prevToken.token || (prevToken && prevToken.distance > 2))) {
                        const value = prevToken.token ? prevToken.token.value : token.value;
                        const msg = `An operator should precede a grouping at position ${token.position.start} "${value}": `;
                        token.errors.push(new Error(msg));
                    }
                }
                if (token.type === Token_1.TokenType.OPERATOR) {
                    // Ensure no back to back operators
                    const nextToken = arr[idx + 1];
                    const nextToken2 = arr[idx + 2];
                    if ((nextToken && nextToken.type === Token_1.TokenType.OPERATOR) ||
                        (nextToken2 && nextToken2.type === Token_1.TokenType.OPERATOR)) {
                        const msg = `Cannot have operators back to back at position ${token.position.start} "${token.value} ${nextToken.value}": `;
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
                        const msg = `Unmatched ${tokenType.msgNamePart} at position ${filteredTokens[0].position.start} "${filteredTokens[0].value}": `;
                        filteredTokens[0].errors.push(new Error(msg));
                    }
                }
            });
            const { WHITE_SPACE, POSSIBLE, OPERATOR } = Token_1.TokenType;
            const firstToken = tokens[0].type;
            const secondToken = tokens.length >= 2 ? tokens[1].type : null;
            if ((firstToken === OPERATOR || firstToken === POSSIBLE) ||
                (firstToken === WHITE_SPACE && (secondToken && secondToken === OPERATOR || secondToken === POSSIBLE))) {
                const msg = `A search must not begin with an operator at position 0 "${tokens[0].value}": `;
                tokens[0].errors.push(new Error(msg));
            }
            const lastIdx = tokens.length - 1;
            const lastToken = tokens[lastIdx].type;
            const nextLastToken = tokens.length >= 2 ? tokens[lastIdx - 1].type : null;
            if ((lastToken === OPERATOR || lastToken === POSSIBLE) ||
                (lastToken === WHITE_SPACE &&
                    (nextLastToken && nextLastToken === POSSIBLE || nextLastToken === OPERATOR))) {
                const msg = `A search must not end with an operator at position ${tokens[lastIdx].position.start} "${tokens[lastIdx].value}": `;
                tokens[lastIdx].errors.push(new Error(msg));
            }
        }
        // console.log('parser.validateTokens, tokens=', tokens);
        return tokens;
    }
}
exports.Parser = Parser;

},{"./Token":5}],4:[function(require,module,exports){
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

},{"./Token":5}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./BooleanSearch":2,"./Parser":3,"./Rule":4,"./Token":5}]},{},[1]);
