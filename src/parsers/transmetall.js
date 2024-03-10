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
		console.log(`[${CACHE.CURRENT.item + 1}] ${cardURL}`);

		try {
			const pageContent = await p.getPageContent(cardURL);
			const $ = cheerio.load(pageContent);

			const name = getName($);
			const sku = getSKU($, cardURL, name);
			const price = f.formatPrice(getPrice($));
			const category = f.formatCategory(CATALOGUE, cardURL, getCategory($));
			const description = f.formatDescription(getDescription($));
			const properties = f.formatDescription(getProperties($));
			const imagesfileNames = m.downloadImages(getImages($), sku);

			if (!(name || sku || price)) {
				logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА!\n`);
				continue;
			}

			++CACHE.CURRENT.item;

			await f.delay(600);

			yield {
				url: cardURL,
				sku,
				price,
				category,
				name,
				description,
				properties,
				images: imagesfileNames.join() || noImagesFileNames(sku, cardURL),
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
	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);

		for (let n = 1; n <= getMaxPageNumber($); n++) {
			yield getLinkToPageN(url, n);
		}
	} catch (e) {
		console.log(`Ошибка ${getPageURL.name}: ${e}`);
	}
}

function getName($) {
	return $('h1.item-box__h1')
		?.text()
		?.trim()
		|| '';
}

function getSKU($, fullURL, name) {
	const sku = $('div.item-aside div.item-box__article')
		?.first()
		?.text()
		?.trim()
		|| f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL)
		|| CATALOGUE.SKUs.get(sku)
		|| sku;
}

function getPrice($) {
	return $('div.item-box__price span')
		?.text()
		?.trim()
		|| '';
}

function getCategory($) {
	const category = $('ul.breadcrumbs span[itemprop="name"]')
		?.eq(-2)
		?.text()
		?.trim()
		|| '';

	return CATALOGUE.categories.get(category) || category;

}

function getDescription($) {
	return $('div.item-content.offset-top div.item-content__description')
		?.parent()
		?.html()
		?.trim()
		|| '';
}

// function getDescriptionVideo($) {
// 	const video = $('div.fancybox__track div.has-video')
// 		?.parent()
// 		?.find('iframe')
// 		?.html()
// 		?.trim()
// 		|| '';

// 	return video ? video + `<br>` : video;
// }

function getProperties($) {
	return $('div.item-content.offset-top table.item-content__params')
		?.eq(-1)
		?.parent()
		?.not('.item-pane')
		?.html()
		?.trim()
		|| '';
}

function getImages($) {
	// return $('div.fancybox__track div.fancybox__content')
	// 	?.find('img')
	// 	?.map((i, elem) => $(elem).attr('src').replace(/\?.*/, ''))
	// 	?.toArray()
	// 	|| [];
	return $('div.item-image__main div.item-img')
		?.not('.item-img--video')
		?.find('img')
		?.map((i, elem) => $(elem).attr('src').replace(/\?.*/, ''))
		?.toArray()
		|| [];
}

function getCardsURLs($) {
	const cards = $('div[data-page]')
		.first()
		.find('div.element-content a');

	return cards
		.map((i, elem) => ORIGIN_URL + $(elem).attr('href'))
		.filter((i, elem) => !CATALOGUE.exceptions.has(elem))
		.toArray();
}

function getMaxPageNumber($) {
	return $('div.pagination')
		?.children('a.pagination-item')
		?.not('.navigation-item__arrow')
		?.last()
		?.text()
		?.trim() || 1;
}

function getLinkToPageN(originURL, n) {
	return f.appendSearchParamsToURL(
		originURL,
		{
			page: n,
		}
	);
}

function noImagesFileNames(imageName, url) {
	logger.log(`Товар не загрузил изображения: ${url}`);

	return f.cyrillicToTranslit(`${f.clearImageName(imageName)}__0.jpg`);
}
