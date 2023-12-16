import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

import { config } from '../../config/config_biefe.js';


export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function mkdirIfNotExistsSync(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

export function getCatalogueParams(catalogueName) {
	const CATALOGUE_NAME = path.parse(catalogueName).name;
	const CATALOGUE = config.CATALOGUES.find(catalogue => catalogue.name === CATALOGUE_NAME);
	const ORIGIN_URL = new URL(CATALOGUE.url).origin;

	return { CATALOGUE, ORIGIN_URL };
}

export function noArticle(rawArticle, lineNumber, url, getData) {
	const regexp = /\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)|\b[A-Z\d]+\b/g;
	const regexpExclude = /\b[A-Z]+\b|\b[\d]+(W|L|P|A|V)?\b|\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)/;
	const article = rawArticle.match(regexp)?.filter(str => !regexpExclude.test(str))[0] || rawArticle;

	console.log(`Товар без артикула (строка: ${lineNumber}, вычислено: ${article}, источник: ${rawArticle}):\n${url}\n`);
	getData.itemsNoArticle.add(url);

	return article;
}

export function formatPrice(priceString) {
	const price = parseInt(priceString.replace(/\s/g, ''));

	if (!price) {
		return 0;
	}

	let n = (price > 1000) ? 100 : 10;

	return Math.ceil(price / n) * n;
}

export function formatDescription(rawDescription) {
	const regexp = /<(h[1-6]).*>\s*Описание\s*<\/\1>\s*/gi;
	const description = rawDescription.replace(regexp, '').replace(/\t/g, '');

	return description;
}

export async function downloadMedia(url, dirName, fileName) {
	const filePath = path.resolve('dist', dirName, fileName);

	try {
		if (fs.existsSync(filePath)) return;

		const response = await axios({
			url,
			responseType: 'stream',
		});

		response.data.pipe(fs.createWriteStream(filePath));
	} catch (e) {
		console.log(`Ошибка ${downloadMedia.name} (path: ${path.join(dirName, fileName)}, url: ${url}): ${e}`);
	}
}