import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import * as m from '../common/media.js';

import { config } from '../../config/config_biefe.js';


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
			const relatedAccessories = getRelatedAccessories($);
			const relatedAccessoriesSKUs = getRelatedAccessoriesSKUs($, relatedAccessories);

			if (!(name || sku || price)) {
				logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${cardURL})`);
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
			console.error(`Ошибка ${getData.name} (url: ${cardURL}): ${e}`);
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
			console.error(`Ошибка ${getCardURL.name}: ${e}`);
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

function getName($) {
	return $('h1#pagetitle')
		?.text()
		|| '';
}

function getSKU($, fullURL, name) {
	const nameTranslit = f.cyrillicToTranslit(name);
	const sku = $('span.article span.js-replace-article')
		?.first()
		?.text()
		|| f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| f.isUniqueSKU(sku, fullURL) ? sku : `${sku} - ${nameTranslit}`;
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

function getDescriptionVideo($) {
	const video = $('div#video iframe')
		?.parent()
		?.html()
		?.trim()
		|| '';

	return video ? video + `<br>` : video;
}

function getProperties($) {
	return $('div#char div.props_block')
		?.html()
		?.trim()
		|| '';
}

function getImages($) {
	return $('div.big div.owl-stage a')
		?.add('div.big_gallery div.gallery-small a')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
}

function getRelatedAccessories($) {
	return $('div.catalog-detail__bottom-info div.goods div.catalog-block div.catalog-block__info-title a');
}

function getRelatedAccessoriesSKUs($, relatedAccessories) {
	const SKUs = relatedAccessories
		?.find('span')
		?.map((i, elem) => $(elem)
			?.text()
			?.replace(/^.+-/s, '')
			?.trim()
			|| '')
		?.toArray()
		?.map(sku => CATALOGUE.SKUs.get(sku) || sku)
		|| [];

	return [...new Set(SKUs)];

}

function getCardsURLs($) {
	const cards = $('div.catalog-items')
		.find('div.catalog-block__info-title a');

	return cards
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
		.toArray();
}

function getMaxPageNumber($) {
	return $('div.module-pagination div.nums>a')
		?.last()
		?.text() || 1;
}

function getLinkToPageN(originURL, n) {
	return f.appendSearchParamsToURL(
		originURL,
		{
			PAGEN_1: n,
		}
	);
}

function getCategories($) {
	return $('div.sections-list div.sections-list__item a.dark_link')
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
		.text();
	const categoryOwnName = CATALOGUE.categories.get(categoryOwnNameRaw) || categoryOwnNameRaw;
	const categoryFullNameRaw = parentCategoryName ? parentCategoryName + '>' + categoryOwnName : categoryOwnName;

	return CATALOGUE.categories.get(categoryFullNameRaw) || categoryFullNameRaw;
}