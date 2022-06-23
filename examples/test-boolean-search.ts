import {Token, BooleanSearch} from '../src';

const bs: BooleanSearch = new BooleanSearch('this and that AND (something OR other) and something else');
const html: string = bs.html;
console.log('html=', html);
