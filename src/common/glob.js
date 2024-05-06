import { globSync, globIterate } from "glob";

class GlobHandler {
	pathExists(pattern, options = {}) {
		return !!globSync(pattern, options).length;
	}

	parsePathes(pattern, options = {}) {
		return globSync(pattern, options);
	}

	getParsedPathesIterator(pattern, options = {}) {
		return globIterate(pattern, options);
	}
}

export default new GlobHandler();
