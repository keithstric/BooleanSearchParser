import {Rule, ValidationRule} from "./Rule";
import {Token, TokenOperations, TokenType} from "./Token";

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
export class Parser {
	private _finalTokens: Token[] = [];
	private _initialMatches: Match[] = [];
	private _initialTokens: Token[] = [];
	private _searchString: string = '';
	private _selectedRules: Rule[];
	private _tree: Token[] = [];
	private _validatedTokens: Token[] = [];
	private _validationRules: ValidationRule[];
	private _wholeTokens: Token[] = [];

	constructor(searchString: string, selectedRules: Rule[], selectedValidationRules: ValidationRule[]) {
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
			if (this.validationRules?.length) {
				if (this.finalTokens?.length){
					this._validatedTokens = this.validateTokens(this.finalTokens, this.validationRules);
				}
			}else{
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
		if (!this._finalTokens?.length) {
			if (this.wholeTokens?.length){
				this._finalTokens = this.createTermsFromQuotes(this.wholeTokens);
			}
		}
		return this._finalTokens;
	}

	/**
	 * The tokens with split words combined. 2nd pass
	 */
	get wholeTokens() {
		if (!this._wholeTokens?.length) {
			if (this.initialTokens?.length){
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
		if (!this._initialTokens?.length) {
			if (this.initialMatches?.length) {
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
		if (!this._initialMatches?.length) {
			if (this.searchString && this.selectedRules?.length) {
				const initMatches = this.getInitialMatches(this.searchString, this.selectedRules);
				this._initialMatches = this.getMatchPhrases(initMatches);
			}else{
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
		if (!this._tree?.length) {
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
	getInitialMatches(searchString: string, selectedRules: Rule[]): Match[] {
		// We can't make tokens yet because not all matches will be exactly a token
		// For example, termAND will match the AND test
		let matches: Match[] = [];
		if (searchString && selectedRules) {
			const searchStr = searchString;
			let subStr = '';

			for (let currentIdx = 0; currentIdx < searchStr.length; currentIdx++) {
				subStr += searchStr.charAt(currentIdx)
				for (const rule of selectedRules) {
					let matchStart = rule.test(subStr);
					if (matchStart !== -1) {
						matches.push({
							subStr,
							currentIdx,
							matchStart,
							type: rule.type ? rule.type : TokenType.TERM,
							operation: rule.operation || TokenOperations.NONE,
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
					type: TokenType.TERM,
					operation: TokenOperations.NONE,
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
	getMatchPhrases(matches: Match[]): Match[] {
		let parsedMatches: Match[] = [];
		let phraseStack: Match[] = [];

		if (matches && matches.length > 0) {
			matches.forEach((match: Match, idx: number, arr: Match[]) => {
				if (match.type !== TokenType.POSSIBLE && match.type !== TokenType.OPERATOR) {
					phraseStack.push(match);
				} else {
					let phraseArr = [];
					phraseArr.push(match.subStr);
					while (phraseStack.length > 0) {
						let lastIdx = phraseStack.length - 1;
						let lastPhraseMatch = phraseStack[lastIdx];
						if (lastPhraseMatch.type !== TokenType.POSSIBLE && lastPhraseMatch.type !== TokenType.OPERATOR) {
							phraseArr.push(lastPhraseMatch.subStr);
							phraseStack.pop();
						} else {
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
	matchesToTokens(matches: Match[]): Token[] {
		let tokens: Token[] = [];
		if (matches && matches.length) {
			matches.forEach((match: Match, idx: number, arr: Match[]) => {
				const { subStr, matchStart, currentIdx, type, operation, phrase, rule } = match;
				if (matchStart >= 0) {
					let nonTerm = subStr.slice(matchStart);
					const pos = currentIdx - nonTerm.length;
					if (matchStart > 0) { // match found in middle or end of subStr
						let term = subStr.slice(0, matchStart);
						let newToken = new Token(term, TokenType.TERM, undefined, pos);
						newToken = this.checkTokenType(newToken);
						newToken.phrase = phrase || '';
						newToken.rule = rule;
						tokens.push(newToken);
					}
					let otherToken = new Token(nonTerm, type, operation, currentIdx);
					otherToken.rule = rule;
					otherToken.phrase = phrase || '';
					tokens.push(otherToken);
				} else {
					const pos = currentIdx - 1;
					const newToken = new Token(subStr, TokenType.TERM, undefined, pos);
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
	createTermsFromSplits(tokens: Token[]): Token[] {
		let newTokens: Token[] = [];
		if (tokens && tokens.length) {
			let hangingTokens: Token[] = [];
			tokens.forEach((token: Token, idx: number, arr: Token[]) => {
				const nextToken = arr[idx + 1];
				if (hangingTokens.length) {
					// Got pieces of a word hanging out
					if (this.isTermOrOperator(token) && (nextToken && this.isTermOrOperator(nextToken))) {
						// Got more pieces of the word after this
						hangingTokens.push(token);
					} else {
						// Reached end of word, next token is not a word or operator, combine our hanging tokens into a single token
						const tempVal = hangingTokens.map(token => token.value).join('') + token.value;
						const newEnd = token.position.end;
						const newStart = newEnd - (tempVal.length - 1);
						const newToken = this.createNewToken(tempVal, TokenType.TERM, newStart, newEnd);
						newTokens.push(newToken);
						hangingTokens = [];
					}
				} else {
					// No hanging tokens (i.e. pieces of a word)
					if (!this.isTermOrOperator(token)) {
						// current token not a word or operator, push it
						newTokens.push(token);
					} else {
						// current token is a word or operator
						if (!nextToken || !this.isTermOrOperator(nextToken)) {
							// next token isn't a word or operator, just push it
							newTokens.push(token);
						} else if (nextToken && this.isTermOrOperator(nextToken)) {
							// next token is a word or operator, current token is a piece of a word, stash it in hangingTokens
							hangingTokens.push(token);
						} else {
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
	createNewToken(value: string, type: TokenType, start: number, end: number): Token {
		const newToken = new Token(value, type, undefined);
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
	createTermsFromQuotes(tokens: Token[]): Token[] {
		let newTokens: Token[] = [];
		if (tokens && tokens.length) {
			const quotes = tokens.filter(token => token.type === TokenType.QUOTE);
			if (quotes?.length) {
				let currentValue = '';
				let unclosedQuoteToken: Token | null = null;
				tokens.forEach((token: Token, idx: number, arr: Token[]) => {
					if (unclosedQuoteToken === null) { // no opening quote yet
						if (token.type === TokenType.QUOTE) { // opening quote
							unclosedQuoteToken = token;
							token.operation = TokenOperations.OPEN;
							token.isSibling = true;
							token.type === TokenType.QUOTE;
						}
						newTokens.push(token);
					} else { // we have an opening quote somewhere
						if (token.type === TokenType.QUOTE) { // closing quote
							const newToken = new Token(currentValue, TokenType.TERM, undefined);
							newToken.isInsideQuotes = true;
							newTokens.push(newToken);
							currentValue = '';
							unclosedQuoteToken = null;
							token.operation = TokenOperations.CLOSE;
							token.isSibling = true;
							token.type = TokenType.QUOTE;
							newTokens.push(token);
						} else { // not to the closing quote yet, just keep adding to the currentValue
							if (!this.isTermOrOperator(token) && token.type !== TokenType.WHITE_SPACE) {
								newTokens.push(token);
							}else{
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
	validateTokens(tokens: Token[], selectedValidationRules: ValidationRule[]): Token[] {
		if (tokens && tokens.length) {
			tokens.forEach((token: Token, idx: number, arr: Token[]) => {
				selectedValidationRules.forEach((rule: ValidationRule) => {
					// Loop through validation rules and ensure each token passes each rule
					let match = rule.test(token.value);
					if (match !== -1) {
						if (!token.isInsideQuotes) {
							const msg = `Invalid character at position ${token.position.start} &#39;${rule.character}&#39;: `;
							token.errors.push(new Error(msg));
						}
					}
				});
				if (token.type === TokenType.GROUPING && token.value === '(' && idx > 2) {
					// Ensure an operator precedes a grouping
					const prevToken = this.getPrecedingOperatorToken(tokens, idx);
					if (prevToken && (!prevToken.token || (prevToken && prevToken.distance > 2))) {
						const value = prevToken.token ? prevToken.token.value : token.value;
						const msg = `An operator should precede a grouping at position ${token.position.start} &#39;${value}&#39;: `;
						token.errors.push(new Error(msg));
					}
				}
				if (token.type === TokenType.OPERATOR) {
					// Ensure no back to back operators
					const nextToken = arr[idx + 1];
					const nextToken2 = arr[idx + 2];
					if ((nextToken && nextToken.type === TokenType.OPERATOR) ||
						(nextToken2 && nextToken2.type === TokenType.OPERATOR)) {
						const msg = `Cannot have operators back to back at position ${token.position.start} &#39;${token.value} ${nextToken.value}&#39;: `
						token.errors.push(new Error(msg));
					}
				}
			});
			const unclosedTypes = [
				{ type: TokenType.GROUPING, msgNamePart: 'paren' },
				{ type: TokenType.QUOTE, msgNamePart: 'quote' }
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
			const {WHITE_SPACE, POSSIBLE, OPERATOR} = TokenType;
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
	createTree(tokens: Token[]): Token[] {
		const tree: Token[] = [];
		if (tokens && tokens.length) {
			const {OPEN, CLOSE} = TokenOperations;
			const queTokens = Array.from(tokens);
			const inProcParents: Token[] = []; // Populate for nested groups
			const getKids = (parent: Token) => {
				let kidToken = queTokens.shift();
				while(kidToken) {
					const {operation} = kidToken;
					if(this.isGrouping(kidToken) && operation === OPEN) {
						kidToken.isChild = true;
						kidToken.isSibling = true;
						parent.children.push(kidToken);
						inProcParents.unshift(kidToken);
						getKids(kidToken);
						kidToken = queTokens.shift();
					}else if (this.isGrouping(kidToken) && operation === CLOSE) {
						// In a nested grouping, don't want the closing token to be included as a child
						// of the currently processing parent. It should be a child of the previous
						// parent if it exists.
						kidToken.isSibling = true;
						const prevParent = inProcParents.shift();
						if (prevParent && inProcParents[0] && inProcParents[0]?.id !== prevParent.id) {
							kidToken.isChild = true;
							inProcParents[0].children.push(kidToken);
						}else{
							queTokens.unshift(kidToken);
						}
						break;
					}else{
						kidToken.isChild = true;
						parent.children.push(kidToken);
						kidToken = queTokens.shift();
					}
				}
			}
			let token = queTokens.shift();
			while (token) {
				const {operation} = token;
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
	checkTokenType(token: Token): Token {
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
			} else if (typesInStr.length === 1) {
				token.type = typesInStr[0] || TokenType.TERM;
				token.rule = rulesInStr[0];
			} else {
				token.type = TokenType.TERM;
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
	getPrecedingOperatorToken(tokens: Token[], startIdx: number): { token: Token, distance: number } | null {
		let returnToken: Token | null = null;
		let returnObj = null;
		if (tokens?.length && (tokens.length - 1) >= startIdx) {
			returnToken = tokens[startIdx];
			let position = startIdx;
			let count = 0;
			while (position > -1 && returnToken && (returnToken.type !== TokenType.OPERATOR && returnToken.type !== TokenType.POSSIBLE)) {
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
	getUnclosedGroupItem(tokens: Token[], tokenType: TokenType): Token | null {
		let unclosedGroupToken: Token | null = null;
		if (tokens && tokens.length) {
			const typeTokens = tokens.filter(token => token.type === tokenType);
			if (typeTokens && typeTokens.length) {
				tokens.forEach((token: Token, idx: number, arr: Token[]) => {
					const { type } = token;
					if (unclosedGroupToken === null) {
						if (type === tokenType) {
							unclosedGroupToken = token;
						}
					} else {
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
	isGrouping(token: Token): boolean {
		if (token) {
			const { type } = token;
			const { QUOTE, GROUPING } = TokenType;
			return (type === QUOTE || type === GROUPING);
		}
		return false;
	}

	/**
	 * Returns true if token is a TERM, POSSIBLE or OPERATOR
	 * @param token {Token}
	 * @returns {boolean}
	 */
	isTermOrOperator(token: Token): boolean {
		if (token) {
			const { type } = token;
			const { TERM, POSSIBLE, OPERATOR } = TokenType;
			return type === TERM || type === POSSIBLE || type === OPERATOR;
		}
		return false;
	}

	/**
	 * Parse the search string and build out all the properties
	 */
	parse(): Token[] {
		if (this.searchString && this.selectedRules && this.validationRules) {
			return this.validatedTokens;
		}else{
			throw new Error('You must provide the search string, selected rules and validation rules to proceed');
		}
	}

	/**
	 * Reset all the arrays of this class
	 */
	reset(): void {
		this._finalTokens = [];
		this._initialMatches = [];
		this._initialTokens = [];
		this._tree = [];
		this._validatedTokens = [];
		this._wholeTokens = [];
	}

}
