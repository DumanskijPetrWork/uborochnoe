import axios, { AxiosError } from "axios";
import { fileURLToPath } from "url";
import * as f from "../common/functions.js";
import downloadImages from "../common/media.js";

import { config } from "../../config/config_viper.js";

const __filename = fileURLToPath(import.meta.url);
const { CATALOGUE } = f.getCatalogueParams(__filename, config);

export default {
	config,
	name: CATALOGUE.name,
	dataGenerator: getData(CATALOGUE.url, requestProduct),
};

async function* getData(catalogueURL, source) {
	for await (const product of source(catalogueURL)) {
		const {
			uid,
			url,
			title: name,
			sku: skuRaw,
			price,
			text,
			characteristics,
			gallery,
		} = product;
		const options = getTabsOptions(catalogueURL, uid);
		const sku = getSKU(skuRaw, url, name);
		const category = f.formatCategory(
			CATALOGUE,
			url,
			CACHE.CURRENT.category
		);

		console.log(`[${CACHE.CURRENT.item + 1}] ${url}`);

		if (/NILFISK/i.test(name)) {
			console.log(`Товар NILFISK\n`);
			continue;
		}

		if (CACHE.items.has(url)) {
			console.log(`Новая категория для товара: ${category}\n`);

			yield {
				url,
				category,
			};

			continue;
		}

		if (!(name || sku || price)) {
			logger.log(`ПУСТАЯ КАРТОЧКА ТОВАРА! (url: ${url})`);
			continue;
		}

		try {
			const response = await axios.request(options);
			const { status } = response;

			if (status != 200)
				throw new AxiosError(`Response status: ${status}`);

			const tabs = response?.data?.tabs;
			const description = f.formatDescription(
				getDescription(text),
				getDescriptionVideo(tabs)
			);
			const properties = getProperties(characteristics);
			const docs = getDocs(tabs);
			const images = downloadImages(getImages(gallery), sku);

			CACHE.items.set(url, ++CACHE.CURRENT.item);

			await f.delay(300);

			yield {
				url,
				sku,
				price: f.formatPrice(price),
				category,
				name,
				description,
				properties,
				docs,
				images,
			};
		} catch (e) {
			console.error(`Ошибка ${getData.name} (url: ${url}): ${e}`);
		}
	}
}

async function* requestProduct(url) {
	for await (const categoryFilter of requestCategoryFilters(url)) {
		const options = getProductsListOptions(url, categoryFilter);

		try {
			const response = await axios.request(options);
			const { status } = response;

			if (status != 200)
				throw new AxiosError(`Response status: ${status}`);

			for (const product of response?.data?.products || []) {
				yield product;
			}
		} catch (e) {
			console.error(`Ошибка ${requestProduct.name}: ${e}`);
		}
	}
}

async function* requestCategoryFilters(url) {
	const options = getCategoryFiltersOptions(url);

	try {
		const response = await axios.request(options);
		const { status } = response;

		if (status != 200) throw new AxiosError(`Response status: ${status}`);

		for (const category of response.data.filters[0].values) {
			const { value: filter } = category;

			CACHE.CURRENT.category = getCategoryFullName(filter);

			yield filter;
		}
	} catch (e) {
		console.error(`Ошибка ${requestCategoryFilters.name}: ${e}`);
	}
}

function getTabsOptions(url, uid) {
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

function getProductsListOptions(url, categoryFilter) {
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

function getCategoryFiltersOptions(url) {
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

function getSKU(skuRaw, fullURL, name) {
	const nameTranslit = f.cyrillicToTranslit(name);
	const sku = skuRaw || f.noSKU(name, CACHE.CURRENT.item + 2, fullURL);

	return CATALOGUE.SKUs.get(fullURL) ||
		CATALOGUE.SKUs.get(sku) ||
		f.isUniqueSKU(sku, fullURL)
		? sku
		: `${sku} - ${nameTranslit}`;
}

function getDescription(text) {
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

function getDescriptionVideo(tabs) {
	if (!tabs?.length) return "";

	const video = tabs.find((tab) => tab.title === "ВИДЕО")?.data;

	return video ? video + `<br>` : video;
}

function getProperties(characteristics) {
	if (!characteristics?.length) return "";

	const properties = characteristics.map(
		(item) => `<tr><td>${item.title}</td><td>${item.value}</td></tr>`
	);

	return `<h2>Характеристики:</h2><table>${properties.join("")}</table>`;
}

function getDocs(tabs) {
	if (!tabs?.length) return "";

	const docs = tabs.find((tab) => tab.title === "ДОКУМЕНТЫ")?.data;
	const parts = tabs.find((tab) => tab.title === "КАТАЛОГ ЗАПЧАСТЕЙ")?.data;

	return docs || parts ? [docs, parts].join("<br>") : "";
}

function getImages(galleryString) {
	const images = [...galleryString.matchAll(/{"img":"(?<link>.+?)"}/g)];

	return images.map((item) => item.groups?.link?.replaceAll("\\", "") || "");
}

function getCategoryFullName(category) {
	return CATALOGUE.categories.get(category) || category;
}
