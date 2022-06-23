import { Rule } from './Rule';
import { expect } from 'chai'
import { TokenOperations, TokenType } from './Token';

describe('Rule class', () => {
	let rule: Rule;
	beforeEach(() => {
		rule = new Rule(/and/g, TokenOperations.AND, TokenType.POSSIBLE);
	});

	it('should set the pattern', () => {
		expect(rule.pattern).to.be.ok;
	});

	it('should set the operation', () => {
		expect(rule.operation).to.be.ok;
	});

	it('should set the token type', () => {
		expect(rule.type).to.be.ok;
	});

	it('should properly identify a match to the pattern', () => {
		expect(rule.test('this and')).to.be.greaterThan(-1);
		expect(rule.test('this or')).to.equal(-1);
	});
});
