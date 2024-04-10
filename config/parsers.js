import bffarinelli from '../src/parsers/bffarinelli.js';
import transmetall from '../src/parsers/transmetall.js';
import lavorpro from '../src/parsers/lavorpro.js';
import viperpro from '../src/parsers/viperpro.js';
import ghiblirussia from '../src/parsers/ghiblirussia.js';
import cometrussia from '../src/parsers/cometrussia.js';
import cometrussia__prices from '../src/parsers/cometrussia__prices.js';


// Подключение парсеров
const PARSERS = [
	// bffarinelli,
	// transmetall,
	// lavorpro,
	// viperpro,
	// ghiblirussia,
	// cometrussia,
	cometrussia__prices,
]

export default PARSERS;