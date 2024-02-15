import bffarinelli from '../src/parsers/bffarinelli.js';
import transmetall from '../src/parsers/transmetall.js';
import lavorpro from '../src/parsers/lavorpro.js';


// Подключение парсеров
const PARSERS = [
	bffarinelli,
	transmetall,
	lavorpro,
]

export default PARSERS;