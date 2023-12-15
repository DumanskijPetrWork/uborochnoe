import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import path from 'path';

import { p } from '../common/puppeteer.js';
import { delay, getCatalogueParams, downloadMedia, formatPrice, noArticle } from '../common/functions.js';


const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE_NAME, CATALOGUE, ORIGIN_URL } = getCatalogueParams(__filename);

export async function* getData(url) {
	for await (const cardURL of getCardURL(url)) {
		const fullURL = ORIGIN_URL + cardURL;

		console.log(`[${getData.currentItem + 1}] ${fullURL}`);

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);

			const name = $('h1.item-box__h1')?.text()?.trim() || '';
			const article = $('div.item-aside div.item-box__article')?.first()?.text()?.trim() || noArticle(name, getData.currentItem + 2, fullURL);
			const price = $('div.item-box__price span')?.text()?.trim() || '';
			const category = $('ul.breadcrumbs span[itemprop="name"]')?.eq(-2)?.text()?.trim() || '';
			const description = $('div.item-content.offset-top div.item-content__description')?.parent()?.html() || '';
			const properties = $('div.item-content.offset-top table.item-content__params')
				?.eq(-1)
				?.parent()
				?.not('.item-pane')
				?.html() || '';
			const images = $('div.item-image__main div#splide01')
				?.find('li.splide__slide')
				?.not('.video-slide')
				?.find('img')
				?.map((i, elem) => $(elem).attr('src').replace(/\?.*/, ''))
				?.toArray() || [];
			const imagesfileNames = [];

			let i = 0;
			for (const imageURL of images) {
				const fileName = `${article.replace(/\//g, "'")}__${i++}` + path.extname(imageURL);

				imagesfileNames.push(fileName);
				downloadMedia(imageURL, 'media_' + CATALOGUE_NAME, fileName);
			}

			await delay(500);

			if (name || article || price) {
				getData.currentItem++;

				yield {
					url: fullURL,
					article,
					price: formatPrice(price),
					category,
					name,
					description,
					properties,
					images: imagesfileNames.join(),
				}
			} else {
				console.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${fullURL})\n`);
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
				.filter((i, elem) => !CATALOGUE.exceptions.includes(elem))
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