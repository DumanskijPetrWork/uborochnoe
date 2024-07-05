import { AbstractParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";
import downloadImages from "../common/media.js";

export default class Parser extends AbstractParser {
	_initParser() {
		const parser = f.decoratorPipe(
			[this._wrapper],
			[
				this._getDataGenerator,
				this._getCardGenerator,
				this._getCategoryGenerator,
			]
		);

		return parser();
	}

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

	_getCategoryGenerator() {
		return async function* getCategoryURL(url) {
			const $ = await this._getCheerioDOM(url);

			for (const category of this._getCategories($)) {
				if (!this._CATALOGUE.exceptions.has(category)) {
					yield category;
				}
			}
		};
	}

	_getCategoryFullName(url, $) {
		const getCategoryName = ($) => {
			const categoryFullName = $("ul.xleb-default a")
				.slice(2)
				.map((i, elem) => $(elem).text().trim())
				.toArray()
				.map((item) => this._CATALOGUE.categories.get(item) || item)
				.join(">");

			return (
				this._CATALOGUE.categories.get(categoryFullName) ||
				categoryFullName
			);
		};

		return f.formatCategory(this._CATALOGUE, url, getCategoryName($));
	}

	_getName($) {
		return $("h1")?.text()?.trim() || "";
	}

	_getSKU($, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			$("div.content_main div.art_full span.art_value_full")
				?.first()
				?.text() || f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice($) {
		return (
			$("div.content_main div.normal_price span.cen")
				?.first()
				?.text()
				?.replace(/\s/g, "")
				?.match(/\d+/g)
				?.at(-1) || ""
		);
	}

	_getDescription($) {
		return $("div#cart-param div.overviwe")?.html()?.trim() || "";
	}

	_getDescriptionVideo() {
		return "";
	}

	_getProperties($) {
		const getRelatedAccessories = ($) => {
			return $("div#cart-param-2 div.txt")?.html()?.trim() || "";
		};
		const properties = $("div#cart-param-3 div.txt")?.html()?.trim() || "";

		const descriptionAccessories = getRelatedAccessories($);

		return properties + `<br>` + descriptionAccessories;
	}

	_getDocs() {
		return "";
	}

	_getImages($) {
		const getMainImage = ($) => {
			return (
				$("div.gallery div.owl-item.active a.image-default")
					?.first()
					?.attr("href") || ""
			);
		};
		const images =
			$("div#gallery_in_overviwe div.image-default a")
				?.map((i, elem) => $(elem).attr("href"))
				?.toArray() || [];
		const mainImage = getMainImage($);

		return [mainImage, ...images].map((img) => this._ORIGIN_URL + img);
	}

	_getCardsURLs($) {
		const items = $("article.blk_body li.item a");
		const cards = items.length
			? items
			: $("div.catalog-item div.blk_name a");

		return cards
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.filter((i, elem) => !this._CATALOGUE.exceptions.has(elem))
			.toArray();
	}

	_getCategories($) {
		return $("li.sub div.name a")
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.toArray();
	}

	_getRelated($) {
		return $("div#cart-param-2 div.txt");
	}

	_getRelatedSKUs($, related) {
		const SKUs =
			related
				?.find("li.icom_datalist_value strong")
				?.map((i, elem) => $(elem)?.text()?.trim())
				?.toArray()
				?.map((sku) => this._CATALOGUE.SKUs.get(sku) || sku) || [];

		return [...new Set(SKUs)].join();
	}
}
