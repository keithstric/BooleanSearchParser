import { Token, TokenType, TokenOperations } from './Token';
import { expect } from 'chai'
import { Rule } from './Rule';

describe('Token class', () => {
	let token: Token;
	beforeEach(() => {
		token = new Token('this', TokenType.TERM);
	});

	it('should produce an id', () => {
		expect(token.id).to.be.ok;
	});

	it('should set the value', () => {
		expect(token.value).to.equal('this');
	});

	it('should return html based on the operator type', () => {
		token = new Token('and', TokenType.POSSIBLE, TokenOperations.AND);
		token.rule = new Rule(/and/g, TokenOperations.AND, TokenType.POSSIBLE);
		let html = token.html;
		const htmlTagRegex = /<span\b[^>]*>(.*?)<\/span>/;
		let matches = html.match(htmlTagRegex);
		expect(matches).to.be.ok;
		if (matches) {
			expect(matches.length).to.be.greaterThan(-1);
			expect(html.indexOf('"warning"')).to.be.greaterThan(-1);
		}
		
		token = new Token('AND', TokenType.OPERATOR, TokenOperations.AND);
		token.rule = new Rule(/AND/g, TokenOperations.AND, TokenType.OPERATOR);
		html = token.html;
		matches = html.match(htmlTagRegex);
		expect(matches).to.be.ok;
		if (matches) {
			expect(matches.length).to.be.greaterThan(-1);
			expect(html.indexOf('"operator"')).to.be.greaterThan(-1);
		}
		
		token = new Token('[', TokenType.TERM, TokenOperations.ERROR);
		token.rule = new Rule(/\[/g, TokenOperations.ERROR, TokenType.TERM);
		token.errors.push(new Error('Invalid Token'));
		html = token.html;
		matches = html.match(htmlTagRegex);
		expect(matches).to.be.ok;
		if (matches) {
			expect(matches.length).to.be.greaterThan(-1);
			expect(html.indexOf('"error"')).to.be.greaterThan(-1);
		}
	});

	it('should return html', () => {
		expect(token.html).to.equal(token.value);
	});

	it('should update the operation property', () => {
		expect(token.operation).to.be.ok;
	});

	it('should update the start and end position', () => {
		// token = new Token('foo', TokenType.TERM, TokenOperations.NONE, 3);
		expect(token.position).to.be.ok;
		expect(token.position.start).to.equal(1);
		expect(token.position.end).to.equal(token.position.start + (token.value.length - 1));
	})
});
