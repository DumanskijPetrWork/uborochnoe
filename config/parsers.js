import Bffarinelli from '../src/parsers/bffarinelli.js';
import Cometrussia from '../src/parsers/cometrussia.js';
import CometrussiaPrices from '../src/parsers/cometrussia__prices.js';
import Ghiblirussia from '../src/parsers/ghiblirussia.js';
import Lavorpro from '../src/parsers/lavorpro.js';
import Transmetall from '../src/parsers/transmetall.js';
import Viperpro from '../src/parsers/viperpro.js';

import biefe_config from './config_biefe.js';
import comet_config from './config_comet.js';
import ghibli_config from './config_ghibli.js';
import lavor_config from './config_lavor.js';
import viper_config from './config_viper.js';

// Подключение парсеров
export default [
	new Bffarinelli(biefe_config, 'bffarinelli'),
	new Transmetall(biefe_config, 'transmetall'),
	new Lavorpro(lavor_config, 'lavorpro', { hasRelated: true }),
	new Viperpro(viper_config, 'viperpro'),
	new Ghiblirussia(ghibli_config, 'ghiblirussia'),
	new Cometrussia(comet_config, 'cometrussia'),
	new CometrussiaPrices(comet_config, 'cometrussia__prices'),
	// new Aquatecnica(ms_group_config, "aquatecnica__prices"),
];
