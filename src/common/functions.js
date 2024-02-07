import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import CyrillicToTranslit from 'cyrillic-to-translit-js';


export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function updateDirs(siteURL, catalogueName) {
	const DATA_DIR_NAME = CACHE.CURRENT.DATA_DIR_NAME = path.join(
		'dist',
		new URL(siteURL).hostname);
	const MEDIA_DIR_NAME = CACHE.CURRENT.MEDIA_DIR_NAME = path.join(
		DATA_DIR_NAME,
		'media_' + catalogueName);

	mkdirIfNotExistsSync(DATA_DIR_NAME, MEDIA_DIR_NAME);
}

export function getCatalogueParams(parserName, config) {
	const catalogueName = path.parse(parserName).name;
	const CATALOGUE = config.CATALOGUES.find(catalogue => catalogue.name === catalogueName);
	const ORIGIN_URL = new URL(CATALOGUE.url).origin;

	return { CATALOGUE, ORIGIN_URL };
}

export function noArticle(rawArticle, lineNumber, url) {
	const regexp = /\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)|\b[A-Z\d]+\b/g;
	const regexpExclude = /\b[A-Z]+\b|\b[\d]+(W|L|P|A|V)?\b|\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)/;
	const article = rawArticle.match(regexp)?.filter(str => !regexpExclude.test(str))[0] || rawArticle;

	console.log(`Товар без артикула (строка: ${lineNumber}, вычислено: ${article}, источник: ${rawArticle}):\n${url}\n`);
	CACHE.itemsNoArticle.set(url, 'Нет артикула');

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

export function capitalizeString(str) {
	return str.at(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatDescription(rawDescription) {
	const regexp = /^\s*<br>\s*|<(h[1-6]).*>\s*Описание\s*<\/\1>\s*/gi;
	const description = rawDescription.replace(regexp, '').replace(/\t/g, '').trim();

	return description;
}

export function downloadImages(images, imageName, originURL = '') {
	const imagesfileNames = [];
	let i = 0;

	for (const imageURL of images) {
		const fileName = cyrillicToTranslit(
			`${imageName
				.replace(/\//g, "-")
				.replace(/[^-\w\d\s_.]/g, "")
			}__${i++}` +
			path.extname(imageURL));

		imagesfileNames.push(fileName);
		downloadMedia(originURL + imageURL, fileName);
	}

	return imagesfileNames;
}

async function downloadMedia(url, fileName) {
	const dirName = CACHE.CURRENT.MEDIA_DIR_NAME;
	const filePath = path.resolve(dirName, fileName);

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

function cyrillicToTranslit(str) {
	return new CyrillicToTranslit().transform(str, '_').toLowerCase();
}

function mkdirIfNotExistsSync(...dirs) {
	for (const dir of dirs) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
	}
}