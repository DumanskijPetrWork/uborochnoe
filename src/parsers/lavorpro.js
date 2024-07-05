import * as f from "../common/functions.js";
import { AbstractParser } from "../common/abstractParser.js";

export default class Parser extends AbstractParser {
	_getCategoryFullName(url) {
		return f.formatCategory(this._CATALOGUE, url, CACHE.CURRENT.category);
	}

	_getName($) {
		return $("h1")?.text() || "";
	}

	_getSKU($, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku =
			$("div.top_block div.articul")
				?.map((i, elem) => $(elem)?.text()?.replace(/.*:/, "")?.trim())
				?.toArray()
				?.find((item) => item) ||
			f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getPrice($) {
		return (
			$("div.top_block div.price")
				?.first()
				?.text()
				?.replace(/\s/g, "")
				?.match(/\d+/g)
				?.at(-1) || ""
		);
	}

	_getDescription($) {
		return $('div#tab1 div[itemprop="description"]')?.html()?.trim() || "";
	}

	_getDescriptionVideo() {
		return "";
	}

	_getProperties($) {
		return $("div#tab2 div.row")?.html()?.trim() || "";
	}

	_getDocs() {
		return "";
	}

	_getImages($) {
		return (
			$("div.top_block div.slick-track")
				?.first()
				?.find("div.item.slick-slide")
				?.not(".slick-cloned")
				?.find("a")
				?.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
				?.toArray() || []
		);
	}

	_getCardsURLs($) {
		const cards = $("div.catalog_greed").find("div.item span.btns a");

		return cards
			.map((i, elem) => this._ORIGIN_URL + $(elem).attr("href"))
			.filter((i, elem) => !this._CATALOGUE.exceptions.has(elem))
			.toArray();
	}

	_getMaxPageNumber($) {
		return (
			$("div.modern-page-navigation")
				?.children("a")
				?.not(".modern-page-next")
				?.last()
				?.text() || 1
		);
	}

	_getLinkToPageN(originURL, n) {
		return f.appendSearchParamsToURL(originURL, {
			PAGEN_1: n,
		});
	}

	_getCategories($) {
		return $("div.section_list").first().find("div.descr a.name").toArray();
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
		const categoryOwnNameRaw = f.capitalizeString(
			$(category)
				.text()
				.replace(/[^а-яa-z\s]/gi, "")
				.trim()
		);
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
		return $("div.catalog_greed.notindex")
			?.eq(-1)
			?.find("div.item span.descr");
	}

	_getRelatedSKUs($, related) {
		const SKUs =
			related
				?.find("span.text>span")
				?.map((i, elem) =>
					$(elem)
						?.find("span:not(:has(*))")
						?.map(
							(i, elem) =>
								$(elem)?.text()?.replace(/.*:/, "")?.trim() ||
								""
						)
						?.toArray()
						?.find((item) => item)
				)
				?.toArray()
				?.filter((item) => item)
				?.map((sku) => this._CATALOGUE.SKUs.get(sku) || sku) || [];

		return [...new Set(SKUs)].join();
	}

	_addRelated($, relatedAccessories) {
		const getRelatedAccessoriesURLs = ($, relatedAccessories) => {
			return (
				relatedAccessories
					?.find("a.btn")
					?.map((i, elem) => $(elem).attr("href"))
					?.toArray() || []
			);
		};

		getRelatedAccessoriesURLs($, relatedAccessories).forEach((url) =>
			CACHE.relatedItems.add(this._ORIGIN_URL + url)
		);
	}

	_isCategoryNameExcepted($) {
		const getCategoryName = ($) => {
			const category =
				$("div.breadcrumb a")?.eq(-1)?.text()?.trim() || "";

			return this._CATALOGUE.categories.get(category) || category;
		};

		return getCategoryName($) === "Каталог";
	}

	_setCategoryName() {
		return "Запчасти";
	}
}
