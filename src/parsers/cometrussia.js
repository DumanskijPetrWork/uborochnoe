import { AbstractParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";

export default class Parser extends AbstractParser {
	_getCategoryFullName(url) {
		return f.formatCategory(this._CATALOGUE, url, CACHE.CURRENT.category);
	}

	_getName($) {
		return $("h1.headline__header")?.text()?.trim() || "";
	}

	_getSKU($, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			$(
				"div.prod-card-section div.first-item-info__info div.prod-info-block"
			)
				?.not('div[itemprop="description"]')
				?.first()
				?.find("div.prod-info-row__col")
				?.filter((i, elem) => /артикул/i.test($(elem).text()))
				?.parent()
				?.children()
				?.last()
				?.text()
				?.trim() || nameTranslit;

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice($) {
		return (
			$("div.first-item-info__form div.item-card-cost__current")
				?.text()
				?.replace(/[^\d,.]/g, "") || ""
		);
	}

	_getDescription($) {
		return (
			$(
				'div.prod-card-section div.first-item-info__info div.prod-info-block[itemprop="description"] div.prod-info-text-small'
			)
				?.html()
				?.trim() || ""
		);
	}

	_getDescriptionVideo($) {
		const videoIDs =
			$("div.yt-lazyload")
				?.map((i, elem) => $(elem).attr("data-id"))
				?.toArray()
				?.map((id) => f.createYouTubeIframe(id)) || [];

		return videoIDs.join(`<br>`);
	}

	_getProperties($) {
		const characteristics =
			$(
				"div.prod-card-section div.first-item-info__info div.prod-info-block"
			)
				?.not('div[itemprop="description"]')
				?.first()
				?.find("div.prod-info-block__content div.prod-info-row")
				?.toArray() || [];

		const properties = characteristics.map(characteristicsToTable);

		return `<h2>Характеристики:</h2><table>${properties.join("")}</table>`;

		function characteristicsToTable(item) {
			const [key, value] = $(item)
				.children()
				.map((i, elem) => $(elem)?.html()?.trim())
				.toArray();
			return `<tr><td>${key}</td><td>${value}</td></tr>`;
		}
	}

	_getDocs($) {
		const docs =
			$("div.fi-docs>a.fi-docs__row")
				?.map((i, elem) => {
					const href = this._ORIGIN_URL + $(elem).attr("href");
					const text = $(elem).find("span").text().trim();

					return `<a href=${href}>${text}</a>`;
				})
				?.toArray() || [];

		return docs.join("<br>");
	}

	_getImages($) {
		return (
			$("div.fii-photo div.fii-photo-slider__slide a.js-image-popup")
				?.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
				?.toArray() || []
		);
	}

	_getCardsURLs($) {
		const cards = $(
			"div.catalog-content--items div.item-card div.item-card-info>a"
		);

		return cards
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.filter((i, elem) => !this._CATALOGUE.exceptions.has(elem))
			.toArray();
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

	_getRelated() {
		return "";
	}

	_getRelatedSKUs() {
		return "";
	}
}
