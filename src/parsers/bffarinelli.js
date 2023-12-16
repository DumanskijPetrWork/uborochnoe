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

		if (getData.items.has(fullURL)) {
			console.log(`Новая категория для товара: ${fullURL}\n`);

			yield {
				url: fullURL,
				category: getCategoryURL.currentCategoryName,
			}

			continue;
		}

		try {
			const pageContent = await p.getPageContent(fullURL);
			const $ = cheerio.load(pageContent);

			const name = $('h1#pagetitle')?.text() || '';
			const article = $('span.article span.js-replace-article')?.first()?.text() || noArticle(name, getData.currentItem + 2, fullURL);
			const price = $('div.catalog-detail__right-info span.price__new-val')?.attr('content') || '';
			// const category = $('div#navigation span.breadcrumbs__item-name')?.eq(-2)?.text() || '';
			const description = $('div#desc div.content')?.html() || '';
			const properties = $('div#char div.props_block')?.html() || '';
			const images = $('div.owl-stage')
				?.first()
				?.find('a')
				?.map((i, elem) => $(elem).attr('href'))
				?.toArray() || [];
			const imagesfileNames = [];

			let i = 0;
			for (const imageURL of images) {
				const fileName = `${article.replace(/\//g, "-")}__${i++}` + path.extname(imageURL);

				imagesfileNames.push(fileName);
				downloadMedia(ORIGIN_URL + imageURL, 'media_' + CATALOGUE_NAME, fileName);
			}

			await delay(500);

			if (name || article || price) {
				getData.currentItem++;
				getData.items.set(fullURL, getData.currentItem);

				yield {
					url: fullURL,
					article,
					price: formatPrice(price),
					category: getCategoryURL.currentCategoryName,
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
	getCategoryURL.currentCategoryName = '';

	try {
		const pageContent = await p.getPageContent(url);
		const $ = cheerio.load(pageContent);
		const categories = $('ul.map-columns__dropdown')
			.first()
			.find('a')
			.toArray();

		for (const category of categories) {
			const categoryURL = $(category).attr('href');

			getCategoryURL.currentCategoryName = $(category).text();

			if (!CATALOGUE.exceptions.has(categoryURL)) {
				yield categoryURL;
			}
		}
	} catch (e) {
		console.log(`Ошибка ${getCategoryURL.name}: ${e}`);
	}
}