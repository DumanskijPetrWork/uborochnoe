import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';

import { config } from '../../config/config_comet.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url, getCardItem),
};

async function* getData(url, source) {
	for await (const item of source(url)) {
		const $ = cheerio.load(item);
		const cardURL = getURL($, item);

		console.log(`[${CACHE.CURRENT.item + 1}] ${cardURL}`);

		if (CACHE.items.has(cardURL)) {
			continue;
		}

		try {
			const name = getName($, item);
			const sku = getSKU($, item, cardURL, name);
			const price = f.formatPrice(getPrice($, item));

			if (!(name || sku || price)) {
				logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${cardURL})`);
				continue;
			}

			CACHE.items.set(cardURL, ++CACHE.CURRENT.item);

			yield {
				url: cardURL,
				sku,
				price,
				name,
			}
		} catch (e) {
			console.error(`Ошибка ${getData.name} (url: ${cardURL}): ${e}`);
		}
	}
}

async function* getCardItem(url) {
	for await (const pageURL of getPageURL(url)) {
		try {
			const pageContent = await p.getPageContent(pageURL);
			const $ = cheerio.load(pageContent);

			for (const item of getCardsItems($)) {
				yield item;
			}
		} catch (e) {
			console.error(`Ошибка ${getCardItem.name}: ${e}`);
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
			console.error(`Ошибка ${getPageURL.name}: ${e}`);
		}
	}
}

async function* getCategoryURL(url, parentCategoryName) {
	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);
		const categories = getCategories($)
			.map(category => ({
				categoryURL: getURLOfCategory($, category),
				categoryFullName: getFullNameOfCategory($, category, parentCategoryName),
			}))
			.filter(category => category.categoryURL);

		if (!categories.length) {
			getCategoryURL.hasSubCategories = false;
			return;
		}

		for (const { categoryURL, categoryFullName } of categories) {
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
		console.error(`Ошибка ${getCategoryURL.name}: ${e}`);
	}
}

function getURL($, item) {
	return ORIGIN_URL + $(item)
		.find('div.item-card-info>a.item-card-info__name')
		.attr('href');
}

function getName($, item) {
	return $(item)
		?.find('div.item-card-info>a.item-card-info__name')
		?.text()
		?.trim()
		|| '';
}

function getSKU($, item, fullURL, name) {
	const nameTranslit = f.cyrillicToTranslit(name);
	const sku = $(item)
		?.find('div.item-card-info div.item-card-art')
		?.text()
		?.replace(/Артикул:/i, '')
		?.trim()
		|| name;

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| f.isUniqueSKU(sku, fullURL) ? sku : `${sku} - ${nameTranslit}`;
}

function getPrice($, item) {
	return $(item)
		?.find('div.item-card-buy>div.item-card-cost>div.item-card-cost__current')
		?.text()
		?.replace(/[^\d,.]/g, '')
		|| '';
}

function getCardsItems($) {
	return $('div.catalog-content--items div.item-card')
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
	const categoryURL = ORIGIN_URL + $(category).attr('href');

	if (CACHE.categoriesURLs.has(categoryURL)) {
		return;
	} else {
		CACHE.categoriesURLs.add(categoryURL);
	}

	return categoryURL;
}

function getFullNameOfCategory($, category, parentCategoryName) {
	const categoryOwnNameRaw = $(category)
		.text()
		.trim();
	const categoryOwnName = CATALOGUE.categories.get(categoryOwnNameRaw) || categoryOwnNameRaw;
	const categoryFullNameRaw = parentCategoryName ? parentCategoryName + '>' + categoryOwnName : categoryOwnName;

	return CATALOGUE.categories.get(categoryFullNameRaw) || categoryFullNameRaw;
}