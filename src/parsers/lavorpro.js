import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import * as m from '../common/media.js';

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
		const category = f.formatCategory(CATALOGUE, cardURL, CACHE.CURRENT.category);

		console.log(`[${CACHE.CURRENT.item + 1}] ${cardURL}`);

		if (CACHE.items.has(cardURL)) {
			console.log(`Новая категория для товара: ${cardURL}\n`);

			yield {
				url: cardURL,
				category,
			}

			continue;
		}

		try {
			const pageContent = await p.getPageContent(cardURL);
			const $ = cheerio.load(pageContent);

			const name = getName($);
			const sku = getSKU($, cardURL, name);
			const price = f.formatPrice(getPrice($));
			const description = f.formatDescription(getDescription($));
			const properties = f.formatDescription(getProperties($));
			const imagesfileNames = m.downloadImages(getImages($), sku, ORIGIN_URL);
			const relatedAccessories = getRelatedAccessories($);
			const relatedAccessoriesSKUs = getRelatedAccessoriesSKUs($, relatedAccessories);

			addRelatedItems($, relatedAccessories);

			if (!(name || sku || price)) {
				console.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${cardURL})\n`);
				continue;
			}

			CACHE.items.set(cardURL, ++CACHE.CURRENT.item);

			await f.delay(300);

			yield {
				url: cardURL,
				sku,
				price,
				category,
				name,
				description,
				properties,
				images: imagesfileNames.join(),
				related: relatedAccessoriesSKUs.join(),
			}
		} catch (e) {
			console.log(`Ошибка ${getData.name} (url: ${cardURL}): ${e}`);
		}
	}
}

async function* getRelatedData(source) {
	for (const cardURL of source) {
		console.log(`[RELATED: ${CACHE.CURRENT.item + 1}] ${cardURL}`);

		try {
			const pageContent = await p.getPageContent(cardURL);
			const $ = cheerio.load(pageContent);

			if (getCategory($) !== 'Каталог') {
				console.log(`Аксессуар уже существует: ${cardURL}\n`);
				continue;
			}

			const name = getName($);
			const sku = getSKU($, cardURL, name);
			const price = f.formatPrice(getPrice($));
			const description = f.formatDescription(getDescription($));
			const imagesfileNames = m.downloadImages([getImages($).at(0)], sku, ORIGIN_URL);
			const relatedAccessoriesSKUs = getRelatedAccessoriesSKUs($, getRelatedAccessories($));

			if (!sku) {
				console.log(`АКСЕССУАР БЕЗ АРТИКУЛА! (url: ${cardURL})\n`);
				continue;
			}

			++CACHE.CURRENT.item

			await f.delay(300);

			yield {
				url: cardURL,
				sku,
				price,
				category: 'Запчасти',
				name,
				description,
				images: imagesfileNames.join(),
				related: relatedAccessoriesSKUs.join(),
			}
		} catch (e) {
			console.log(`Ошибка ${getRelatedData.name} (url: ${cardURL}): ${e}`);
		}
	}
}

async function* getCardURL(url) {
	for await (const pageURL of getPageURL(url)) {
		try {
			const pageContent = await p.getPageContent(pageURL);
			const $ = cheerio.load(pageContent);

			for (const url of getCardsURLs($)) {
				yield url;
			}
		} catch (e) {
			console.log(`Ошибка ${getCardURL.name}: ${e}`);
		}
	}
}

async function* getPageURL(url) {
	for await (const categoryURL of getCategoryURL(url)) {
		try {
			const pageContent = await p.getPageContent(categoryURL);
			const $ = cheerio.load(pageContent);

			for (let n = 1; n <= getMaxPageNumber($); n++) {
				yield getLinkToPageN(categoryURL, n);
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
		const categories = getCategories($);

		if (!categories.length) {
			getCategoryURL.hasSubCategories = false;
			return;
		}

		for (const category of categories) {
			const categoryURL = getURLOfCategory($, category);
			const categoryFullName = getFullNameOfCategory($, category, parentCategoryName);

			yield* getCategoryURL(categoryURL, categoryFullName);

			if (getCategoryURL.hasSubCategories) {
				continue;
			} else {
				getCategoryURL.hasSubCategories = true;
			}

			CACHE.CURRENT.category = categoryFullName;

			if (!CATALOGUE.exceptions.has(categoryURL)) {
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

function getSKU($, fullURL, name) {
	const sku = $('div.top_block div.articul')
		?.first()
		?.text()
		?.replace(/Артикул:\s*/i, '')
		?.trim()
		|| f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| sku;
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
	const category = $('div.breadcrumb a')
		?.eq(-1)
		?.text()
		?.trim()
		|| '';

	return CATALOGUE.categories.get(category) || category;
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
		?.find('div.item.slick-slide')
		?.not('.slick-cloned')
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

function getRelatedAccessoriesSKUs($, relatedAccessories) {
	return relatedAccessories
		?.find('span.text>span')
		?.map((i, elem) => $(elem)
			?.eq(-1)
			?.text()
			?.replace(/Артикул:\s*/i, '')
			?.trim()
			|| '')
		?.toArray()
		?.map(sku => CATALOGUE.SKUs.get(sku) || sku)
		|| [];
}

function getRelatedAccessoriesURLs($, relatedAccessories) {
	return relatedAccessories
		?.find('a.btn')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}

function addRelatedItems($, relatedAccessories) {
	getRelatedAccessoriesURLs($, relatedAccessories)
		.forEach(url => CACHE.relatedItems.add(ORIGIN_URL + url));
}

function getCardsURLs($) {
	const cards = $('div.catalog_greed')
		.find('div.item span.btns a');

	return cards
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
		.toArray();
}

function getMaxPageNumber($) {
	return $('div.modern-page-navigation')
		?.children('a')
		?.not('.modern-page-next')
		?.last()
		?.text() || 1;
}

function getLinkToPageN(originURL, n) {
	return `${originURL}?PAGEN_1=${n}`;
}

function getCategories($) {
	return $('div.section_list')
		.first()
		.find('div.descr a.name')
		.toArray();
}

function getURLOfCategory($, category) {
	return ORIGIN_URL + $(category)
		.attr('href');
}

function getFullNameOfCategory($, category, parentCategoryName) {
	const categoryOwnNameRaw = f.capitalizeString(
		$(category)
			.text()
			.replace(/[^а-яa-z\s]/gi, '')
			.trim()
	);
	const categoryOwnName = CATALOGUE.categories.get(categoryOwnNameRaw) || categoryOwnNameRaw;
	const categoryFullNameRaw = parentCategoryName ? parentCategoryName + '>' + categoryOwnName : categoryOwnName;

	return CATALOGUE.categories.get(categoryFullNameRaw) || categoryFullNameRaw;
}