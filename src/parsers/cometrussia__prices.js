import { AbstractParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";
import * as cheerio from "cheerio";

export default class Parser extends AbstractParser {
	_getDataGenerator(source) {
		return async function* getData(url) {
			for await (const item of source.call(this, url)) {
				const $ = cheerio.load(item); // TODO $(item)
				const cardURL = this._getURL($(item));
				this._logNewItem(cardURL);

				if (CACHE.items.has(cardURL)) {
					continue;
				}

				const name = this._getName($(item));
				const sku = this._getSKU($(item), cardURL, name);
				const price = f.formatPrice(this._getPrice($(item)));

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
				};
			}
		};
	}

	_getURL(item) {
		return (
			this._ORIGIN_URL +
			item.find("div.item-card-info>a.item-card-info__name").attr("href")
		);
	}

	_getName(item) {
		return (
			item
				?.find("div.item-card-info>a.item-card-info__name")
				?.text()
				?.trim() || ""
		);
	}

	_getSKU(item, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			item
				?.find("div.item-card-info div.item-card-art")
				?.text()
				?.replace(/Артикул:/i, "")
				?.trim() || name;

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice(item) {
		return (
			item
				?.find(
					"div.item-card-buy>div.item-card-cost>div.item-card-cost__current"
				)
				?.text()
				?.replace(/[^\d,.]/g, "") || ""
		);
	}

	_getCardsURLs($) {
		return $("div.catalog-content--items div.item-card").toArray();
	}

	_getMaxPageNumber($) {
		return (
			$("div.pagination__pages>a.pagination__element")?.eq(-2)?.text() ||
			1
		);
	}

	_getLinkToPageN(originURL, n) {
		return f.appendSearchParamsToURL(originURL, {
			PER_PAGE: 72,
			PAGEN_1: n,
		});
	}

	_getCategories($) {
		return $("div.main-labels div.main-labels__text a")
			.add("div.categories-array div.categories-box__label a")
			.toArray();
	}

	_getURLOfCategory($, category) {
		const categoryURL = this._ORIGIN_URL + $(category).attr("href");

		if (CACHE.categoriesURLs.has(categoryURL)) {
			return;
		} else {
			CACHE.categoriesURLs.add(categoryURL);
		}

		return categoryURL;
	}

	_getFullNameOfCategory($, category, parentCategoryName) {
		const categoryOwnNameRaw = $(category).text().trim();
		const categoryOwnName =
			this._CATALOGUE.categories.get(categoryOwnNameRaw) ||
			categoryOwnNameRaw;
		const categoryFullNameRaw = parentCategoryName
			? parentCategoryName + ">" + categoryOwnName
			: categoryOwnName;

		return (
			this._CATALOGUE.categories.get(categoryFullNameRaw) ||
			categoryFullNameRaw
		);
	}
}
