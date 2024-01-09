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

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);

			const name = $('h1.item-box__h1')
				?.text()
				?.trim() || '';
			const article = CATALOGUE.articles.get(fullURL) || $('div.item-aside div.item-box__article')
				?.first()
				?.text()
				?.trim() || f.noArticle(name, CACHE.CURRENT.item + 2, fullURL);
			const price = $('div.item-box__price span')
				?.text()
				?.trim() || '';
			const category = $('ul.breadcrumbs span[itemprop="name"]')
				?.eq(-2)
				?.text()
				?.trim() || '';
			const description = $('div.item-content.offset-top div.item-content__description')
				?.parent()
				?.html()
				?.trim() || '';
			const properties = $('div.item-content.offset-top table.item-content__params')
				?.eq(-1)
				?.parent()
				?.not('.item-pane')
				?.html()
				?.trim() || '';
			const images = $('div.item-image__main div#splide01')
				?.find('li.splide__slide')
				?.not('.video-slide')
				?.find('img')
				?.map((i, elem) => $(elem).attr('src').replace(/\?.*/, ''))
				?.toArray() || [];
			const imagesfileNames = f.downloadImages(images, article);

			await f.delay(300);

			if (!(name || article || price)) {
				console.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${fullURL})\n`);
				continue;
			}

			CACHE.CURRENT.item++;

			yield {
				url: fullURL,
				article,
				price: f.formatPrice(price),
				category,
				name,
				description: f.formatDescription(description),
				properties: f.formatDescription(properties),
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
			const cards = $('div[data-page]')
				.first()
				.find('div.element-content a');
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
	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);
		const maxPageNumber = $('div.pagination')
			?.children('a.pagination-item')
			?.not('.navigation-item__arrow')
			?.last()
			?.text()
			?.trim() || 1;

		for (let n = 1; n <= maxPageNumber; n++) {
			yield `${url}&page=${n}`;
		}
	} catch (e) {
		console.log(`Ошибка ${getPageURL.name}: ${e}`);
	}
}