import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import { config } from '../../config/config_lavor.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url, getCardURL),
	relatedDataGenerator: getRelatedData,
};

async function* getData(url, source) {
	for await (const cardURL of source(url)) {
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
			const relatedAccessories = getRelatedAccessories($);
			const relatedAccessoriesArticles = getRelatedAccessoriesArticles($, relatedAccessories);

			addRelatedItems($, relatedAccessories);

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
				related: relatedAccessoriesArticles.join(),
			}
		} catch (e) {
			console.log(`Ошибка ${getData.name} (url: ${fullURL}): ${e}`);
		}
	}
}

async function* getRelatedData(source) {
	for (const cardURL of source) {
		const fullURL = ORIGIN_URL + cardURL;

		console.log(`[RELATED: ${CACHE.CURRENT.item + 1}] ${fullURL}`);

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);

			if (getCategory($) !== 'Каталог') continue;

			const name = getName($);
			const article = getArticle($, fullURL, name);
			const price = f.formatPrice(getPrice($));
			const description = f.formatDescription(getDescription($));
			const imagesfileNames = f.downloadImages([getImages($).at(0)], article, ORIGIN_URL);
			const relatedAccessoriesArticles = getRelatedAccessoriesArticles($, getRelatedAccessories($));

			if (!article) {
				console.log(`АКСЕССУАР БЕЗ АРТИКУЛА! (url: ${fullURL})\n`);
				continue;
			}

			++CACHE.CURRENT.item

			await f.delay(300);

			yield {
				url: fullURL,
				article,
				price,
				name,
				description,
				images: imagesfileNames.join(),
				related: relatedAccessoriesArticles.join(),
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
			const cards = $('div.catalog_greed')
				.find('div.item span.btns a');
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
			const maxPageNumber = $('div.modern-page-navigation')
				?.children('a')
				?.not('.modern-page-next')
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

async function* getCategoryURL(url, parentCategoryName) {
	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);
		const categories = $('div.section_list')
			.first()
			.find('div.descr a.name')
			.toArray();

		if (!categories.length) {
			getCategoryURL.hasNext = false;
			return;
		}

		for (const category of categories) {
			const categoryURL = $(category).attr('href');
			const fullURL = ORIGIN_URL + categoryURL;
			const categoryOwnName = f.capitalizeString(
				$(category)
					.text()
					.replace(/[^а-я\s]/gi, '')
					.trim());
			const categoryFullName = parentCategoryName ? parentCategoryName + '>' + categoryOwnName : categoryOwnName;

			yield* getCategoryURL(fullURL, categoryFullName);

			if (getCategoryURL.hasNext) {
				continue;
			} else {
				getCategoryURL.hasNext = true;
			}

			CACHE.CURRENT.category = categoryFullName;

			if (!CATALOGUE.exceptions.has(fullURL)) {
				yield categoryURL;
			}
		}
	} catch (e) {
		console.log(`Ошибка ${getCategoryURL.name}: ${e}`);
	}
}

function getName($) {
	return $('h1')
		?.text()
		|| '';
}

function getArticle($, fullURL, name) {
	return CATALOGUE.articles.get(fullURL)
		|| $('div.top_block div.articul')
			?.first()
			?.text()
			?.replace(/Артикул:\s*/i, '')
			?.trim()
		|| f.noArticle(name, CACHE.CURRENT.item + 2, fullURL);
}

function getPrice($) {
	return $('div.top_block div.price')
		?.first()
		?.text()
		?.replace(/\s/g, '')
		?.match(/\d+/g)
		?.at(-1)
		|| '';
}

function getCategory($) {
	return $('div.breadcrumb a')
		?.eq(-1)
		?.text()
		?.trim()
		|| '';
}

function getDescription($) {
	return $('div#tab1 div[itemprop="description"]')
		?.html()
		?.trim()
		|| '';
}

function getProperties($) {
	return $('div#tab2 div.row')
		?.html()
		?.trim()
		|| '';
}

function getImages($) {
	return $('div.top_block div.slick-track')
		?.first()
		?.find('a')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}

function getRelatedAccessories($) {
	return $('div.catalog_greed.notindex')
		?.eq(-1)
		?.find('div.item span.descr');
}

function getRelatedAccessoriesArticles($, relatedAccessories) {
	return relatedAccessories
		?.find('span.text>span')
		?.map((i, elem) => $(elem)
			?.eq(-1)
			?.text()
			?.replace(/Артикул:\s*/i, '')
			?.trim()
			|| '')
		?.toArray()
		|| [];
}

function addRelatedItems($, relatedAccessories) {
	getRelatedAccessoriesURLs($, relatedAccessories)
		.forEach(url => CACHE.relatedItems.add(url));
}

function getRelatedAccessoriesURLs($, relatedAccessories) {
	return relatedAccessories
		?.find('a.btn')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}