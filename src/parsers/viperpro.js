import { AbstractAPIParser } from "../common/abstractParser.js";
import * as f from "../common/functions.js";

export default class APIParser extends AbstractAPIParser {
	_getCategoryFullName(url) {
		return f.formatCategory(this._CATALOGUE, url, CACHE.CURRENT.category);
	}

	_getTabsOptions(url, uid) {
		return {
			method: "GET",
			url: url + "getproducttabs",
			params: { storepartuid: "491553257541", productuid: uid },
			headers: {
				Origin: "https://viper-pro.ru",
				"Accept-Language": "ru",
				"User-Agent": f.getNewUserAgentString(),
			},
		};
	}

	_getProductsListOptions(url, categoryFilter) {
		return {
			method: "GET",
			url: url + "getproductslist",
			params: {
				storepartuid: "491553257541",
				"filters[storepartuid]": categoryFilter,
			},
			headers: {
				"accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
				"user-agent": f.getNewUserAgentString(),
			},
		};
	}

	_getProducts(data) {
		return data?.products || [];
	}

	_getCategoryFiltersOptions(url) {
		return {
			method: "GET",
			url: url + "getfilters",
			params: { storepartuid: "491553257541" },
			headers: {
				"Content-Type":
					"multipart/form-data; boundary=---011000010111000001101001",
				"Accept-Language": "ru",
				"User-Agent": f.getNewUserAgentString(),
			},
		};
	}

	_getCategoryFilters(data) {
		return data.filters[0].values;
	}

	_getFullNameOfCategory(category) {
		return this._CATALOGUE.categories.get(category) || category;
	}

	_getSKU(skuRaw, fullURL, name) {
		const nameTranslit = f.cyrillicToTranslit(name);
		const sku = skuRaw || f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

		return this._CATALOGUE.SKUs.get(fullURL) ||
			this._CATALOGUE.SKUs.get(sku) ||
			f.isUniqueSKU(sku, fullURL)
			? sku
			: `${sku} - ${nameTranslit}`;
	}

	_getDescription(text) {
		const description =
			text
				?.replace(/<strong[^>]*?>\s*ХАРАКТЕРИСТИКИ\s*<\/strong>/gi, "")
				?.replace(
					/<strong[^>]*?>\s*КОМПЛЕКТАЦИЯ\s*<\/strong>/gi,
					"<h2>Комплектация</h2>"
				)
				?.replace(
					/<strong[^>]*?>\s*ОСОБЕННОСТИ\s*<\/strong>/gi,
					"<h2>Особенности</h2>"
				) || "";

		return description;
	}

	_getDescriptionVideo(tabs) {
		if (!tabs?.length) return "";

		const video = tabs.find((tab) => tab.title === "ВИДЕО")?.data;

		return video ? video + `<br>` : video;
	}

	_getProperties(characteristics) {
		if (!characteristics?.length) return "";

		const properties = characteristics.map(
			(item) => `<tr><td>${item.title}</td><td>${item.value}</td></tr>`
		);

		return `<h2>Характеристики:</h2><table>${properties.join("")}</table>`;
	}

	_getDocs(tabs) {
		if (!tabs?.length) return "";

		const docs = tabs.find((tab) => tab.title === "ДОКУМЕНТЫ")?.data;
		const parts = tabs.find(
			(tab) => tab.title === "КАТАЛОГ ЗАПЧАСТЕЙ"
		)?.data;

		return docs || parts ? [docs, parts].join("<br>") : "";
	}

	_getImages(galleryString) {
		const images = [...galleryString.matchAll(/{"img":"(?<link>.+?)"}/g)];

		return images.map(
			(item) => item.groups?.link?.replaceAll("\\", "") || ""
		);
	}
}
