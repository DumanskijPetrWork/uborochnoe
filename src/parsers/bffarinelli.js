import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import { config } from '../../config/config_biefe.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url),
};

async function* getData(url) {
	for await (const cardURL of getCardURL(url)) {
		const fullURL = ORIGIN_URL + cardURL;

		console.log(`[${CACHE.CURRENT.item + 1}] ${fullURL}`);

		if (CACHE.items.has(fullURL)) {
			console.log(`Новая категория для товара: ${fullURL}\n`);

			yield {
				url: fullURL,
				category: CACHE.CURRENT.category,
			}

			continue;
		}

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);

			const name = getName($);
			const article = getArticle($, fullURL, name);
			const price = f.formatPrice(getPrice($));
			const description = f.formatDescription(getDescription($));
			const properties = f.formatDescription(getProperties($));
			const imagesfileNames = f.downloadImages(getImages($), article, ORIGIN_URL);

			if (!(name || article || price)) {
				console.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${fullURL})\n`);
				continue;
			}

			CACHE.items.set(fullURL, ++CACHE.CURRENT.item);

			await f.delay(300);

			yield {
				url: fullURL,
				article,
				price,
				category: CACHE.CURRENT.category,
				name,
				description,
				properties,
				images: imagesfileNames.join(),
			}
		} catch (e) {
			console.log(`Ошибка ${getData.name} (url: ${fullURL}): ${e}`);
		}
	}
}

async function* getCardURL(url) {
	for await (const pageURL of getPageURL(url)) {
		try {
			const pageContent = await p.getPageContent(pageURL);
			const $ = cheerio.load(pageContent);
			const cards = $('div.catalog-items')
				.find('div.catalog-block__info-title a');
			const cardsURLs = cards
				.map((i, elem) => $(elem).attr('href'))
				.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
				.toArray();

			for (const url of cardsURLs) {
				yield url;
			}
		} catch (e) {
			console.log(`Ошибка ${getCardURL.name}: ${e}`);
		}
	}
}

async function* getPageURL(url) {
	for await (const categoryURL of getCategoryURL(url)) {
		const fullURL = ORIGIN_URL + categoryURL;

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);
			const maxPageNumber = $('div.module-pagination')
				?.children('div.catalog-block__info-title a')
				?.last()
				?.text() || 1;

			for (let n = 1; n <= maxPageNumber; n++) {
				yield `${fullURL}?PAGEN_1=${n}`;
			}
		} catch (e) {
			console.log(`Ошибка ${getPageURL.name}: ${e}`);
		}
	}
}

async function* getCategoryURL(url) {
	CACHE.CURRENT.category = '';

	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);
		const categories = $('ul.map-columns__dropdown')
			.first()
			.find('a')
			.toArray();

		for (const category of categories) {
			const categoryURL = $(category).attr('href');

			CACHE.CURRENT.category = $(category).text();

			if (!CATALOGUE.exceptions.has(categoryURL)) {
				yield categoryURL;
			}
		}
	} catch (e) {
		console.log(`Ошибка ${getCategoryURL.name}: ${e}`);
	}
}

function getName($) {
	return $('h1#pagetitle')
		?.text()
		|| '';
}

function getArticle($, fullURL, name) {
	return CATALOGUE.articles.get(fullURL)
		|| $('span.article span.js-replace-article')
			?.first()
			?.text()
		|| f.noArticle(name, CACHE.CURRENT.item + 2, fullURL);
}

function getPrice($) {
	return $('div.catalog-detail__right-info span.price__new-val')
		?.attr('content')
		|| '';
}

function getDescription($) {
	return $('div#desc div.content')
		?.html()
		?.trim()
		|| '';
}

function getProperties($) {
	return $('div#char div.props_block')
		?.html()
		?.trim()
		|| '';
}

function getImages($) {
	return $('div.owl-stage')
		?.first()
		?.find('a')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}