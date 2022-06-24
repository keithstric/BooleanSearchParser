import {Parser} from "./Parser";
import {EscapeableRule, Rule, ValidationRule} from "./Rule";
import {Token, TokenOperations, TokenStyleClasses, TokenType} from "./Token";

/**
 * The definition for Rules. The key will be the name
 * of a rule
 */
export type Rules = {
	[key: string]: Rule;
}

/**
 * The definition for ValidationRules. This follows the
 * same pattern as {@see Rules}. The key will be the name
 * of the rule
 */
export type ValidationRules = {
	[key: string]: ValidationRule;
}

/**
 * Configuration object for defining your own rules
 */
export type Config = {
	rules?: Rules,
	validationRules?: ValidationRules,
	possibleOperatorStyleClass?: string,
	operatorStyleClass?: string,
	errorStyleClass?: string
}

export const DEFAULT_RULES: Rules = {
	and: new Rule(/and/g, TokenOperations.AND, TokenType.POSSIBLE),
	or: new Rule(/or/g, TokenOperations.OR, TokenType.POSSIBLE),
	not: new Rule(/not/g, TokenOperations.NOT, TokenType.POSSIBLE),
	AND: new Rule(/AND/g, TokenOperations.AND),
	plus: new Rule(/\+/g, TokenOperations.AND),
	OR: new Rule(/OR/g, TokenOperations.OR),
	tilde: new Rule(/~/g, TokenOperations.OR),
	NOT: new Rule(/NOT/g, TokenOperations.NOT),
	minus: new Rule(/-/g, TokenOperations.NOT),
	openParen: new Rule(/\(/g, TokenOperations.OPEN, TokenType.GROUPING),
	closeParen: new Rule(/\)/g, TokenOperations.CLOSE,TokenType.GROUPING),
	quote: new EscapeableRule(/"/g, TokenOperations.NONE, TokenType.QUOTE),
	space: new Rule(/\s/g, TokenOperations.NONE, TokenType.WHITE_SPACE),
	openAngle: new Rule(/\</g, TokenOperations.NONE, TokenType.ASCII),
	closeAngle: new Rule(/\>/g, TokenOperations.NONE, TokenType.ASCII)
};

export const DEFAULT_VALIDATION_RULES: ValidationRules = {
	openAngle: new ValidationRule(/\</g, '<'),
	closeAngle: new ValidationRule(/\>/g, '>'),
	openCurly: new ValidationRule(/\{/g, '{'),
	closeCurly: new ValidationRule(/\}/g, '}'),
	openSquare: new ValidationRule(/\[/g, '['),
	closeSquare: new ValidationRule(/\]/g, ']'),
	backSlash: new ValidationRule(/\\/g, '\\'),
	forwardSlash: new ValidationRule(/\//g, '/'),
	comma: new ValidationRule(/,/g, ','),
	period: new ValidationRule(/\./g, '.')
};

/**
 * The classes and methods in this package were based off of the {@link https://github.com/frederickf/bqpjs} library.
 * The BooleanSearch class is the entry point to the parser. The following
 * properties will parse the search string automatically:
 * {@link BooleanSearch#tokens}
 * {@link BooleanSearch#html}
 * @class {BooleanSearch}
 */
export class BooleanSearch {
	private _errors: Error[] = [];
	private _html: string = '';
	private _isMalformed = false;
	private _maxLength: number = 511;
	private _operators: Token[] = [];
	private _parser: Parser | undefined;
	private _possibleOperators: Token[] = [];
	private _rules: Rules | undefined;
	private _selectedRules: Rule[] = [];
	private _selectedValidationRules: ValidationRule[] = [];
	private _srchString: string = '';
	private _tokens: Token[] = [];
	private _validationRules: ValidationRules | undefined;
	private _styles: TokenStyleClasses = {
		error: 'error',
		operator: 'operator',
		possibleOperator: 'warning'
	};

	constructor(srchString?: string, config?: Config) {
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
	addRule(ruleName: string, rule: Rule) {
		const rules = {
			...this.rules,
			[ruleName]: rule
		};
		this.rules = rules;
		// console.warn('If you want this rule to be used, be sure to add the rule name to the ruleNames array in the appropriate position');
	}

	/**
	 * Fix the possible operators and update the search string
	 * @param resetSearch {boolean} - set true to reset search string, tokens and html
	 * @returns {string}
	 */
	fixOperators(resetSearchString: boolean = false): string {
		let returnVal = this.searchString;
		if (this.tokens && this.tokens.length) {
			returnVal = '';
			this.tokens.forEach((token: Token) => {
				if (token.type === TokenType.POSSIBLE) {
					token.value = token.value.toUpperCase();
					token.type = TokenType.OPERATOR;
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
				errorTokens.forEach((token: Token) => {
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
				const {tokens, maxLength, searchString} = this;
				const searchStringLen = searchString.length;
				const isTooLong = searchStringLen > maxLength;
				const htmlArr = tokens.map((token: Token, idx: number, arr: Token[]) => {
					token.styles = this.styles;
					const {html, position, value} = token;
					let returnHtml = html;
					if (isTooLong) {
						if (position.start <= maxLength && position.end >= maxLength) {
							if (idx + 1 === tokens.length) {
								returnHtml = `<span class="${this.styles.error}">${value}</span>`;
							}else{
								returnHtml = `<span class="${this.styles.error}">${value}`;
							}
						}else if (idx + 1 === tokens.length) {
							returnHtml = `${value}</span>`;
						}
					}
					return returnHtml;
				});
				this._html = htmlArr.join('');
			}catch(e) {
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
				this._operators = this.tokens.filter((token) => token.type === TokenType.OPERATOR);
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
			this._parser = new Parser(this.searchString, this.selectedRules, this.selectedValidationRules);
		}
		return this._parser;
	}

	set parser(parser: Parser) {
		this._parser = parser;
	}

	/**
	 * Get an array of the possible operators
	 * @type {Token[]}
	 */
	get possibleOperators() {
		if (!this._possibleOperators || !this._possibleOperators.length) {
			if (this._tokens && this._tokens.length) {
				this._possibleOperators = this.tokens.filter((token) => token.type === TokenType.POSSIBLE);
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
			this._rules = DEFAULT_RULES;
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
		}else if (!this.searchString) {
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
		return Object.keys(this.validationRules);
	}

	/**
	 * Objet of rules with a name. The key should match a value in the ruleNames array
	 * @type {ValidationRules}
	 */
	get validationRules() {
		if (!this._validationRules) {
			this._validationRules = DEFAULT_VALIDATION_RULES;
		}
		return this._validationRules;
	}

	set validationRules(validationRules) {
		this._validationRules = validationRules;
	}

	private reset(searchString?: string) {
		this.searchString = searchString || '';
		this.tokens = [];
		this._possibleOperators = [];
		this._operators = [];
		this._errors = [];
		this.parser = new Parser(this.searchString, this.selectedRules, this.selectedValidationRules);
	}
}
