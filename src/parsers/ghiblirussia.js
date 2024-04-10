import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import { p } from '../common/puppeteer.js';
import * as f from '../common/functions.js';
import * as m from '../common/media.js';

import { config } from '../../config/config_ghibli.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url, getCardURL),
};

async function* getData(url, source) {
	for await (const cardURL of source(url)) {
		console.log(`[${CACHE.CURRENT.item + 1}] ${cardURL}`);

		try {
			const pageContent = await p.getPageContent(cardURL);
			const $ = cheerio.load(pageContent);

			const name = getName($);
			const sku = getSKU($, cardURL, name);
			const price = f.formatPrice(getPrice($));
			const category = f.formatCategory(CATALOGUE, cardURL, getCategoryFullName($));
			const description = f.formatDescription(getDescription($));
			const properties = f.formatDescription(getProperties($));
			const imagesfileNames = m.downloadImages(getImages($), sku, ORIGIN_URL);
			const relatedAccessoriesSKUs = getRelatedAccessoriesSKUs($);

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
	for await (const categoryURL of getCategoryURL(url)) {
		try {
			const pageContent = await p.getPageContent(categoryURL);
			const $ = cheerio.load(pageContent);

			for (const url of getCardsURLs($)) {
				yield url;
			}
		} catch (e) {
			console.error(`Ошибка ${getCardURL.name}: ${e}`);
		}
	}
}

async function* getCategoryURL(URLs) {
	if (URLs instanceof Array) {
		for (const url of URLs) {
			yield* getCategoryURL(url);
		}
		return;
	}

	try {
		const pageContent = await p.getPageContent(URLs);
		const $ = cheerio.load(pageContent);

		for (const category of getCategories($)) {
			if (!CATALOGUE.exceptions.has(category)) {
				yield category;
			}
		}
	} catch (e) {
		console.error(`Ошибка ${getCategoryURL.name}: ${e}`);
	}
}

function getName($) {
	return $('h1')
		?.text()
		?.trim()
		|| '';
}

function getSKU($, fullURL, name) {
	const nameTranslit = f.cyrillicToTranslit(name);
	const sku = $('div.content_main div.art_full span.art_value_full')
		?.first()
		?.text()
		|| f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| f.isUniqueSKU(sku, fullURL) ? sku : `${sku} - ${nameTranslit}`;
}

function getPrice($) {
	return $('div.content_main div.normal_price span.cen')
		?.first()
		?.text()
		?.replace(/\s/g, '')
		?.match(/\d+/g)
		?.at(-1)
		|| '';
}

function getCategoryFullName($) {
	const categoryFullName = $('ul.xleb-default a')
		.slice(2)
		.map((i, elem) => $(elem)
			.text()
			.trim()
		)
		.toArray()
		.map(item => CATALOGUE.categories.get(item) || item)
		.join('>');

	return CATALOGUE.categories.get(categoryFullName) || categoryFullName;
}

function getDescription($) {
	return $('div#cart-param div.overviwe')
		?.html()
		?.trim()
		|| '';
}

function getProperties($) {
	const properties = $('div#cart-param-3 div.txt')
		?.html()
		?.trim()
		|| '';

	const descriptionAccessories = getRelatedAccessories($);

	return properties + `<br>` + descriptionAccessories;
}

function getImages($) {
	const images = $('div#gallery_in_overviwe div.image-default a')
		?.map((i, elem) => $(elem).attr('href'))
		?.toArray()
		|| [];
	const mainImage = getMainImage($);

	return [mainImage, ...images];
}

function getMainImage($) {
	return $('div.gallery div.owl-item.active a.image-default')
		?.first()
		?.attr('href')
		|| '';
}

function getRelatedAccessories($) {
	return $('div#cart-param-2 div.txt')
		?.html()
		?.trim()
		|| '';
}

function getRelatedAccessoriesSKUs($) {
	const SKUs = $('div#cart-param-2 div.txt')
		?.find('li.icom_datalist_value strong')
		?.map((i, elem) => $(elem)
			?.text()
			?.trim()
		)
		?.toArray()
		?.map(sku => CATALOGUE.SKUs.get(sku) || sku)
		|| [];

	return [...new Set(SKUs)];
}

function getCardsURLs($) {
	const items = $('article.blk_body li.item a');
	const cards = items.length ? items : $('div.catalog-item div.blk_name a');

	return cards
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
		.toArray();
}

function getCategories($) {
	return $('li.sub div.name a')
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.toArray();
}