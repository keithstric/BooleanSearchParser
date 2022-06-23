import { Parser } from './Parser';
import { BooleanSearch } from './BooleanSearch';
import * as chai from 'chai';
import { expect, spy } from 'chai'
import * as spies from 'chai-spies';
import { TokenType } from './Token';

chai.use(spies);

describe('Parser class', () => {
	let parser: Parser;
	let bs: BooleanSearch;

	beforeEach(() => {
		bs = new BooleanSearch('this and that OR other not "something or else"');
		parser = new Parser(bs.searchString, bs.selectedRules, bs.selectedValidationRules);
	});

	it('should set the search string', () => {
		expect(parser.searchString).to.be.ok;
	});

	it('should set the selected rules', () => {
		expect(parser.selectedRules).to.be.ok;
		expect(parser.selectedRules.length).to.be.ok;
	});
	
	it('should set the selected validation rules', () => {
		expect(parser.validationRules).to.be.ok;
		expect(parser.validationRules.length).to.be.ok;
	});

	it('should get the initial matches', () => {
		const initMatchesSpy = spy.on(parser, 'getInitialMatches');
		const matches = parser.initialMatches;
		expect(matches).to.be.ok;
		expect(matches.length).to.be.ok;
		expect(initMatchesSpy).to.have.been.called;
	});

	it('should get the final matches', () => {
		const matchPhraseSpy = spy.on(parser, 'getMatchPhrases');
		const matches = parser.matches;
		expect(matches).to.be.ok;
		expect(matches.length).to.be.ok;
		expect(matchPhraseSpy).to.have.been.called;
	});

	it('should get the initial tokens', () => {
		const matchesTokensSpy = spy.on(parser, 'matchesToTokens');
		const initTokens = parser.initialTokens;
		expect(initTokens).to.be.ok;
		expect(initTokens.length).to.be.ok;
		expect(matchesTokensSpy).to.have.been.called;
	});

	it('should get the whole tokens', () => {
		const combineSplitsSpy = spy.on(parser, 'createTermsFromSplits');
		const wholeTokens = parser.wholeTokens;
		expect(wholeTokens).to.be.ok;
		expect(wholeTokens.length).to.be.ok;
		expect(combineSplitsSpy).to.have.been.called;
	});

	it('should get the final tokens', () => {
		const combineQuoteSpy = spy.on(parser, 'createTermsFromQuotes');
		const finalTokens = parser.finalTokens;
		expect(finalTokens).to.be.ok;
		expect(finalTokens.length).to.be.ok;
		expect(combineQuoteSpy).to.have.been.called;
	});

	it('should get the validated tokens', () => {
		const validateSpy = spy.on(parser, 'validateTokens');
		const validatedTokens = parser.validatedTokens;
		expect(validatedTokens).to.be.ok;
		expect(validatedTokens.length).to.be.ok;
		expect(validateSpy).to.have.been.called;
	});

	it('should put split words back together again', () => {
		parser = new Parser('forklift and candor', bs.selectedRules, bs.selectedValidationRules);
		const wholeTokens = parser.wholeTokens;
		expect(wholeTokens.length).to.equal(5);
		expect(wholeTokens[0].value).to.equal('forklift');
		expect(wholeTokens[0].type).to.equal(TokenType.TERM);
		expect(wholeTokens[4].value).to.equal('candor');
		expect(wholeTokens[4].type).to.equal(TokenType.TERM);
		expect(wholeTokens[2].type).to.equal(TokenType.POSSIBLE);
	});

	it('should combine text between quotes into a single term token', () => {
		parser = new Parser('this and "something or else"', bs.selectedRules, bs.selectedValidationRules);
		const finalTokens = parser.finalTokens;
		expect(finalTokens.length).to.equal(7);
		expect(finalTokens[5].value).to.equal('something or else');
		expect(finalTokens[5].type).to.equal(TokenType.TERM);
	});

	it('should add errors to validated tokens', () => {
		parser = new Parser('this [ and (that or other and "something or else', bs.selectedRules, bs.selectedValidationRules);
		const validatedTokens = parser.validatedTokens;
		const errorTokens = validatedTokens.filter(token => token.errors.length);
		expect(validatedTokens.length).to.be.ok;
		expect(errorTokens.length).to.equal(3);
	});

	it('should reset itself if the search string changes', () => {
		const tokens = parser.validatedTokens;
		expect(parser.searchString).to.equal('this and that OR other not "something or else"');
		const resetSpy = spy.on(parser, 'reset');
		parser.searchString = 'this and that';
		expect(resetSpy).to.have.been.called;
		expect(parser.searchString).to.equal('this and that');
		expect(parser['_finalTokens'].length).to.equal(0);
		expect(parser['_initialMatches'].length).to.equal(0);
		expect(parser['_initialTokens'].length).to.equal(0);
		expect(parser['_matches'].length).to.equal(0);
		expect(parser['_tree'].length).to.equal(0);
		expect(parser['_validatedTokens'].length).to.equal(0);
		expect(parser['_wholeTokens'].length).to.equal(0);
	});

	it('should get a tree of tokens for "group" type tokens', () => {
		parser.searchString = '((this and that) or (other and thing)) and "something else"';
		let tree = parser.tree;
		expect(tree.length).to.equal(7)
		expect(tree[0].children.length).to.equal(7);
		expect(tree[0].children[5].children.length).to.equal(5);
		expect(tree[5].children.length).to.equal(1);
		expect(tree[tree.length - 1].type).to.equal(TokenType.QUOTE);
	});

	it('should create a new token', () => {
		const token = parser.createNewToken('new token', TokenType.TERM, 0, 8);
		expect(token).to.be.ok;
		expect(token.type).to.equal(TokenType.TERM);
		expect(token.position.start).to.equal(0);
		expect(token.position.end).to.equal(8);
		expect(token.id).to.be.ok;
	});
});
