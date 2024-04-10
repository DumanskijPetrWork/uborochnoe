import fs from 'fs-extra';
import path from 'path';
import { URL } from 'url';
import UserAgent from "user-agents";
import CyrillicToTranslit from 'cyrillic-to-translit-js';


export function getNewUserAgentString() {
	return new UserAgent().toString();
}

export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function updateDirs(siteURL, catalogueName) {
	const DATA_DIR_NAME = CACHE.CURRENT.DATA_DIR_NAME = path.join(
		'dist',
		new URL(siteURL).hostname,
		catalogueName
	);
	const MEDIA_DIR_NAME = CACHE.CURRENT.MEDIA_DIR_NAME = path.join(
		DATA_DIR_NAME,
		'media',
		currentDateString
	);
	const VARIATIONS_DIR_NAME = path.join(
		DATA_DIR_NAME,
		'variations'
	);

	mkdirIfNotExistsSync(DATA_DIR_NAME, MEDIA_DIR_NAME, VARIATIONS_DIR_NAME);
}

export function changeFileName(filePath, suffix, extName) {
	return path.join(
		path.dirname(filePath),
		`${path.basename(filePath, '.xlsx')}_${suffix}.${extName}`,
	)
}

export function getCatalogueParams(parserName, config) {
	const catalogueName = path.parse(parserName).name;
	const CATALOGUE = config.CATALOGUES.find(catalogue => catalogue.name === catalogueName);
	const catalogueURL = CATALOGUE.url instanceof Array ? CATALOGUE.url[0] : CATALOGUE.url;
	const ORIGIN_URL = new URL(catalogueURL).origin;

	return { CATALOGUE, ORIGIN_URL };
}

export function appendSearchParamsToURL(rawURL, searchParams) {
	const url = new URL(rawURL);

	for (const [param, value] of Object.entries(searchParams)) {
		url.searchParams.set(param, value);
	}

	return url.href;
}

export function noSKU(rawSKU, lineNumber, url) {
	const regexp = /\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)|\b[A-Z\d]+\b/g;
	const regexpExclude = /\b[A-Z]+\b|\b[\d]+(W|L|P|A|V)?\b|\s(для|в)\s.*?\b[A-Z\d]+\b|\(.*?\b[A-Z\d]+\b.*?\)/;
	const sku = rawSKU.match(regexp)?.filter(str => !regexpExclude.test(str))[0] || rawSKU;

	logger.log(`Товар без артикула (строка: ${lineNumber}, вычислено: ${sku}, источник: ${rawSKU})`);
	CACHE.itemsNoSKU.set(url, 'Нет артикула');

	return sku;
}

export function isUniqueSKU(sku, url) {
	if (!CACHE.SKUs.has(sku) && sku !== '') {
		CACHE.SKUs.add(sku);

		return true;
	}

	logger.log(`Повторяющийся артикул в строке ${CACHE.CURRENT.item + 1}: ${sku}`);
	CACHE.itemsNoSKU.set(url, 'Повторяющийся артикул');
}

export function formatCategory(CATALOGUE, url, defaultCategoryName, replaceAllCategories = false) {
	const catalogueCategoryName = CATALOGUE.categories.get(url);

	if (replaceAllCategories) return catalogueCategoryName || defaultCategoryName;

	if (catalogueCategoryName) {
		CATALOGUE.categories.delete(url);

		return `${catalogueCategoryName}|${defaultCategoryName}`;
	}

	return defaultCategoryName;
}

export function formatPrice(priceString, { round: round = true, discount: discount = 0 } = {}) {
	let price = parseInt(priceString.replace(/\s/g, ''));

	if (!price) {
		return 0;
	}

	if (round) {
		const n = (price > 1000) ? 100 : 10;
		price = Math.ceil(price / n) * n;
	}

	return price * (100 - discount) / 100;
}

export function capitalizeString(str) {
	return str.at(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatDescription(rawDescription, descriptionVideo) {
	const regexp = /^\s*<br>\s*|<(h[1-6]).*?>\s*Описание\s*<\/\1>\s*/gi;
	const description = rawDescription
		.replace(regexp, '')
		.replace(/<a.*?<\/a>/gs, '')
		.replace(/\t/g, '')
		.trim();

	return description || descriptionVideo ? [descriptionVideo, description].join('<br>') : '';
}

export function cyrillicToTranslit(str) {
	return new CyrillicToTranslit().transform(str, '_').toLowerCase();
}

export function clearImageName(str) {
	return str
		.replace(/\//g, "-")
		.replace(/[^-\w\d\s_.]/g, "");
}

export function setCellsValues(worksheet, rowIndex, valuesByColumnsNames) {
	const row = worksheet.getRow(rowIndex);

	for (const [columnName, value] of Object.entries(valuesByColumnsNames)) {
		row.getCell(columnName).value = value;
	}
}

export function createYouTubeIframe(
	id,
	{
		allow = [
			'accelerometer',
			'autoplay',
			'encrypted-media',
			'gyroscope',
			'picture-in-picture'
		],
		allowfullscreen = true,
	} = {}
) {
	return `<iframe allow="${allow.join(';')
		}" ${allowfullscreen ? 'allowfullscreen' : ''
		} src="${appendSearchParamsToURL(
			`https://www.youtube.com/embed/${id}`,
			{
				rel: 0,
				showinfo: 0,
				autoplay: 1
			}
		)}"></iframe>`;
}

export const currentDateString = getCurrentDateString();

function getCurrentDateString() {
	const date = new Date();

	return `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;
}

function mkdirIfNotExistsSync(...dirs) {
	dirs.forEach(dir => fs.ensureDirSync(dir));
}

// class PeekableAsyncIterator { // TODO
// 	constructor(iterator) {
// 		return (async () => {
// 			this.iterator = iterator;
// 			this.peek = await this.iterator.next();

// 			return this;
// 		})();
// 	}

// 	async next() {
// 		const current = this.peek;
// 		this.peek = await this.iterator.next();

// 		return current;
// 	}

// 	[Symbol.iterator]() {
// 		return this; // TODO
// 	}
// }

export async function* getIterableValues(asyncIterator, values) {
	const valuesArray = Array.isArray(values) ? values : [values];
	const firstCall = await asyncIterator.next();

	if (firstCall.done) {
		for (const value of valuesArray) yield value;

		return;
	}

	yield firstCall;

	for await (const value of asyncIterator) {
		yield value;
	}
}