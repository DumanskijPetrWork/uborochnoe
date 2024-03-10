import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import * as m from '../common/media.js';

import { config } from '../../config/config_comet.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url, getCardURL),
};

async function* getData(url, source) {
	for await (const cardURL of source(url)) {
		const category = f.formatCategory(CATALOGUE, cardURL, CACHE.CURRENT.category);

		console.log(`[${CACHE.CURRENT.item + 1}] ${cardURL}`);

		if (CACHE.items.has(cardURL)) {
			console.log(`Новая категория для товара: ${category}\n`);

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
			const description = f.formatDescription(getDescription($), getDescriptionVideo($));
			const properties = f.formatDescription(getProperties($));
			const imagesfileNames = m.downloadImages(getImages($), sku, ORIGIN_URL);

			if (!(name || sku || price)) {
				logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА!\n`);
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
			}
		} catch (e) {
			console.log(`Ошибка ${getData.name} (url: ${cardURL}): ${e}`);
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
	return $('h1.headline__header')
		?.text()
		?.trim()
		|| '';
}

function getSKU($, fullURL, name) {
	const sku = $('div.prod-card-section div.first-item-info__info div.prod-info-block')
		?.not('div[itemprop="description"]')
		?.first()
		?.find('div.prod-info-row__col')
		?.filter((i, elem) => /артикул/i.test($(elem).text()))
		?.parent()
		?.children()
		?.last()
		?.text()
		?.trim()
		|| f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| sku;
}

function getPrice($) {
	return $('div.first-item-info__form div.item-card-cost__current')
		?.text()
		?.replace(/[^\d,.]/g, '')
		|| '';
}

function getDescription($) {
	return $('div.prod-card-section div.first-item-info__info div.prod-info-block[itemprop="description"] div.prod-info-text-small')
		?.html()
		?.trim()
		|| '';
}

function getDescriptionVideo($) {
	const videoID = $('div.yt-lazyload')
		?.attr('data-id');

	return videoID ? f.createYouTubeIframe(videoID) + `<br>` : '';
}

function getProperties($) {
	const characteristics = $('div.prod-card-section div.first-item-info__info div.prod-info-block')
		?.not('div[itemprop="description"]')
		?.first()
		?.find('div.prod-info-block__content div.prod-info-row')
		?.toArray()
		|| [];

	const properties = characteristics.map(characteristicsToTable);

	return `<h2>Характеристики:</h2><table>${properties.join('')}</table>`;

	function characteristicsToTable(item) {
		const [key, value] = $(item)
			.children()
			.map((i, elem) => $(elem)?.html()?.trim())
			.toArray();
		return `<tr><td>${key}</td><td>${value}</td></tr>`;
	}
}

function getImages($) {
	return $('div.fii-photo div.fii-photo-slider__slide a.js-image-popup')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}

function getCardsURLs($) {
	const cards = $('div.catalog-content--items div.item-card div.item-card-info a');

	return cards
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
		.toArray();
}

function getMaxPageNumber($) {
	return $('div.pagination__pages>a.pagination__element')
		?.eq(-2)
		?.text() || 1;
}

function getLinkToPageN(originURL, n) {
	return f.appendSearchParamsToURL(
		originURL,
		{
			PER_PAGE: 72,
			PAGEN_1: n,
		}
	);
}

function getCategories($) {
	return $('div.main-labels div.main-labels__text a')
		.add('div.categories-array div.categories-box__label a')
		.toArray();
}

function getURLOfCategory($, category) {
	return ORIGIN_URL + $(category)
		.attr('href');
}

function getFullNameOfCategory($, category, parentCategoryName) {
	const categoryOwnNameRaw = $(category)
		.text()
		.trim();
	const categoryOwnName = CATALOGUE.categories.get(categoryOwnNameRaw) || categoryOwnNameRaw;
	const categoryFullNameRaw = parentCategoryName ? parentCategoryName + '>' + categoryOwnName : categoryOwnName;

	return CATALOGUE.categories.get(categoryFullNameRaw) || categoryFullNameRaw;
}