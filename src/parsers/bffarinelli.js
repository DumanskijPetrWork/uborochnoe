import { AbstractParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";

export default class Parser extends AbstractParser {
	_getCategoryFullName(url) {
		return f.formatCategory(this._CATALOGUE, url, CACHE.CURRENT.category);
	}

	_getName($) {
		return $("h1#pagetitle")?.text() || "";
	}

	_getSKU($, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			$("span.article span.js-replace-article")?.first()?.text() ||
			f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice($) {
		return (
			$("div.catalog-detail__right-info span.price__new-val")?.attr(
				"content"
			) || ""
		);
	}

	_getDescription($) {
		return $("div#desc div.content")?.html()?.trim() || "";
	}

	_getDescriptionVideo($) {
		const video = $("div#video iframe")?.parent()?.html()?.trim() || "";

		return video ? video + `<br>` : video;
	}

	_getProperties($) {
		return $("div#char div.props_block")?.html()?.trim() || "";
	}

	_getDocs() {
		return "";
	}

	_getImages($) {
		return (
			$("div.big div.owl-stage a")
				?.add("div.big_gallery div.gallery-small a")
				?.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
				?.toArray() || []
		);
	}

	_getCardsURLs($) {
		const cards = $("div.catalog-items").find(
			"div.catalog-block__info-title a"
		);

		return cards
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.filter((i, elem) => !this._CATALOGUE.exceptions.has(elem))
			.toArray();
	}

	_getMaxPageNumber($) {
		return $("div.module-pagination div.nums>a")?.last()?.text() || 1;
	}

	_getLinkToPageN(originURL, n) {
		return f.appendSearchParamsToURL(originURL, {
			PAGEN_1: n,
		});
	}

	_getCategories($) {
		return $(
			"div.sections-list div.sections-list__item a.dark_link"
		).toArray();
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
		const categoryOwnNameRaw = $(category).text();
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

	_getRelated($) {
		return $(
			"div.catalog-detail__bottom-info div.goods div.catalog-block div.catalog-block__info-title a"
		);
	}

	_getRelatedSKUs($, related) {
		const SKUs =
			related
				?.find("span")
				?.map(
					(i, elem) =>
						$(elem)?.text()?.replace(/^.+-/s, "")?.trim() || ""
				)
				?.toArray()
				?.map((sku) => this._CATALOGUE.SKUs.get(sku) || sku) || [];

		return [...new Set(SKUs)].join();
	}
}
