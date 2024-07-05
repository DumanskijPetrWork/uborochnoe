import { AbstractParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";
import downloadImages from "../common/media.js";

export default class Parser extends AbstractParser {
	_getDataGenerator(source) {
		return async function* getData(url) {
			for await (const cardURL of source.call(this, url)) {
				this._logNewItem(cardURL);

				const $ = await this._getCheerioDOM(cardURL);
				const category = this._getCategoryFullName(cardURL, $);

				if (CACHE.items.has(cardURL)) {
					console.log(`Новая категория для товара: ${category}\n`);

					yield {
						url: cardURL,
						category,
					};

					continue;
				}

				const name = this._getName($);
				const sku = this._getSKU($, cardURL, name);
				const price = f.formatPrice(this._getPrice($));
				const description = f.formatDescription(
					this._getDescription($),
					this._getDescriptionVideo($)
				);
				const properties = f.formatDescription(this._getProperties($));
				const docs = this._getDocs($);
				const images = downloadImages(this._getImages($), sku, cardURL);
				const related = this._getRelated($);
				const relatedSKUs = this._getRelatedSKUs($, related);

				if (!(name || sku || price)) {
					logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${cardURL})`);
					continue;
				}

				CACHE.items.set(cardURL, ++CACHE.CURRENT.item);

				await f.delay(this._delay);

				yield {
					url: cardURL,
					sku,
					price,
					category,
					name,
					description,
					properties,
					docs,
					images,
					related: relatedSKUs,
				};
			}
		};
	}

	_getCategoryFullName(url, $) {
		const getCategoryName = ($) => {
			const category =
				$('ul.breadcrumbs span[itemprop="name"]')
					?.eq(-2)
					?.text()
					?.trim() || "";

			return this._CATALOGUE.categories.get(category) || category;
		};
		return f.formatCategory(this._CATALOGUE, url, getCategoryName($));
	}

	_getName($) {
		return $("h1")?.text()?.trim() || "";
	}

	_getSKU($, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			$("div.item-aside div.item-box__article")
				?.first()
				?.text()
				?.trim() || f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice($) {
		return $("div.item-box__price span")?.text()?.trim() || "";
	}

	_getDescription($) {
		return (
			$("div.item-content.offset-top div.item-content__description")
				?.parent()
				?.html()
				?.trim() || ""
		);
	}

	_getDescriptionVideo() {
		// TODO
		// 	const video = $('div.fancybox__track div.has-video')
		// 		?.parent()
		// 		?.find('iframe')
		// 		?.html()
		// 		?.trim()
		// 		|| '';
		// 	return video ? video + `<br>` : video;

		return "";
	}

	_getProperties($) {
		return (
			$("div.item-content.offset-top table.item-content__params")
				?.eq(-1)
				?.parent()
				?.not(".item-pane")
				?.html()
				?.trim() || ""
		);
	}

	_getDocs() {
		return "";
	}

	_getImages($) {
		return (
			$("div.item-image__main div.item-img")
				?.not(".item-img--video")
				?.find("img")
				?.map((i, elem) => $(elem).attr("src").replace(/\?.*/, ""))
				?.toArray() || []
		);
	}

	_getCardsURLs($) {
		const cards = $("div[data-page]").first().find("div.element-content a");

		return cards
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.filter((i, elem) => !this._CATALOGUE.exceptions.has(elem))
			.toArray();
	}

	_getMaxPageNumber($) {
		return (
			$("div.pagination")
				?.children("a.pagination-item")
				?.not(".navigation-item__arrow")
				?.last()
				?.text()
				?.trim() || 1
		);
	}

	_getLinkToPageN(originURL, n) {
		return f.appendSearchParamsToURL(originURL, {
			page: n,
		});
	}

	_getRelated() {
		return "";
	}

	_getRelatedSKUs() {
		return "";
	}
}
