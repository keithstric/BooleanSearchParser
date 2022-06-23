import { BooleanSearch } from './BooleanSearch';
import * as chai from 'chai';
import { expect, spy } from 'chai'
import * as spies from 'chai-spies';
import { JSDOM } from 'jsdom';

chai.use(spies);

describe('Boolean Search class', () => {
	let bs: BooleanSearch;

	beforeEach(() => {
		bs = new BooleanSearch('this and that OR other not "something else"');
	});

	it('should update the searchString property', () => {
		expect(bs.searchString).to.equal('this and that OR other not "something else"');
	});

	it('should remove new lines', () => {
		bs = new BooleanSearch('this \nthat');
		expect(bs.searchString).to.equal('this that');
	});

	it('should have a Parser', () => {
		expect(bs.parser).to.be.ok;
	});

	it('should call parse on the parser when html is requested', () => {
		const parseSpy = spy.on(bs.parser, 'parse');
		const html = bs.html;
		expect(parseSpy).to.have.been.called;
	});

	it('should call parse on the parser when tokens are requested', () => {
		const parseSpy = spy.on(bs.parser, 'parse');
		const tokens = bs.tokens;
		expect(parseSpy).to.have.been.called;
	});

	it('should have operators and possible operators wrapped in spans', () => {
		const html = bs.html;
		const frag = JSDOM.fragment(html);
		const possibles = frag.querySelectorAll('.warning');
		const operators = frag.querySelectorAll('.operator');
		expect(possibles.length).to.equal(2);
		expect(operators.length).to.equal(1);
		expect(bs.possibleOperators.length).to.equal(2);
		expect(bs.operators.length).to.equal(1);
	});
	
	it('should have errors wrapped in spans', () => {
		bs = new BooleanSearch('this [nor');
		const html = bs.html;
		const frag = JSDOM.fragment(html);
		const errors = frag.querySelectorAll('.error');
		expect(errors.length).to.equal(1);
		expect(bs.errors.length).to.equal(1);
		expect(bs.isMalformed).to.be.true;
	});

	it('should uppercase possible operators unless inside quotes', () => {
		bs = new BooleanSearch('this and that or "something or else"');
		const fixedSearchStr = bs.fixOperators(true);
		expect(fixedSearchStr).to.be.ok;
		const html = bs.html;
		const frag = JSDOM.fragment(html);
		const operators = frag.querySelectorAll('.operator');
		expect(operators.length).to.equal(bs.operators.length);
		expect(bs.possibleOperators.length).to.equal(0);
		expect(bs.errors.length).to.equal(0);
	});

});
