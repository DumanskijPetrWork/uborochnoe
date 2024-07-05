import * as cheerio from "cheerio";
import * as f from "./functions.js";
import puppeteerHandler from "./puppeteer.js";
import downloadImages from "./media.js";
import axiosHandler from "./axios.js";

export class AbstractParser {
	#config;
	#name;
	#parser;
	#related;
	_CATALOGUE;
	_ORIGIN_URL;
	_delay;

	constructor(config, name, { hasRelated = false, delay = 300 } = {}) {
		const { CATALOGUE, ORIGIN_URL } = f.getCatalogueParams(name, config);
		const { SITE_URL } = config;
		const parser = this._initParser();

		this._CATALOGUE = CATALOGUE;
		this._ORIGIN_URL = ORIGIN_URL;
		this._delay = delay;

		this.#config = { ...CATALOGUE, SITE_URL };
		this.#name = name;
		this.#parser = parser.call(this, this._CATALOGUE.url);
		this.#related = hasRelated ? this._getRelatedGenerator : null;
	}

	get config() {
		return this.#config;
	}

	get name() {
		return this.#name;
	}

	get parser() {
		return this.#parser;
	}

	get related() {
		return this.#related;
	}

	_initParser() {
		const parser = f.decoratorPipe(
			[this._wrapper],
			[
				this._getDataGenerator,
				this._getCardGenerator,
				this._getPageGenerator,
				this._getCategoryGenerator,
			]
		);

		return parser();
	}

	// TODO добавить исключения по url
	_wrapper(g) {
		return async function* (args) {
			const argsArray = Array.isArray(args) ? args : [args];

			for (const arg of argsArray) {
				try {
					const generator = g.call(this, arg);
					const { value, done } = await generator.next();

					if (done) {
						logger.log(
							`Генератор ${g.name} не нашел значения для ${arg}`
						);
						yield arg;
					} else {
						yield value;
						yield* generator;
					}
				} catch (e) {
					logger.log(`ОШИБКА ГЕНЕРАТОРА ${g.name}: ${e}\n`);
					yield arg;
				}
			}
		};
	}

	async _getCheerioDOM(url) {
		try {
			const pageContent = await puppeteerHandler.getPageContent(url);
			return cheerio.load(pageContent);
		} catch (e) {
			throw new Error(`Не удалось загрузить контент по адресу: ${url}`);
		}
	}

	_getDataGenerator(source) {
		return async function* getData(url) {
			for await (const cardURL of source.call(this, url)) {
				this._logNewItem(cardURL);

				const category = this._getCategoryFullName(cardURL);

				if (CACHE.items.has(cardURL)) {
					console.log(`Новая категория для товара: ${category}\n`);

					yield {
						url: cardURL,
						category,
					};

					continue;
				}

				const $ = await this._getCheerioDOM(cardURL);

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

				if (this.#related) this._addRelated($, related);

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

	async *_getRelatedGenerator(source) {
		for await (const cardURL of source) {
			this._logNewItem(cardURL, "RELATED");

			const $ = await this._getCheerioDOM(cardURL);

			if (!this._isCategoryNameExcepted($)) {
				console.log(`Аксессуар уже существует\n`);
				continue;
			}

			const category = this._setCategoryName();
			const name = this._getName($);
			const sku = this._getSKU($, cardURL, name);
			const price = f.formatPrice(this._getPrice($));
			const description = f.formatDescription(
				this._getDescription($),
				this._getDescriptionVideo($)
			);
			const properties = f.formatDescription(this._getProperties($));
			const docs = this._getDocs($);
			const images = downloadImages(
				[this._getImages($).at(0)],
				sku,
				cardURL
			);
			const related = this._getRelated($);
			const relatedSKUs = this._getRelatedSKUs($, related);

			if (!sku) {
				logger.log(`АКСЕССУАР БЕЗ АРТИКУЛА! (url: ${cardURL})`);
				continue;
			}

			++CACHE.CURRENT.item;

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
	}

	_getCardGenerator(source) {
		return async function* getCardURL(url) {
			for await (const pageURL of source.call(this, url)) {
				const $ = await this._getCheerioDOM(pageURL);

				for (const url of this._getCardsURLs($)) {
					yield url;
				}
			}
		};
	}

	_getPageGenerator(source) {
		return async function* getPageURL(url) {
			for await (const categoryURL of source.call(this, url)) {
				const $ = await this._getCheerioDOM(categoryURL);

				for (let n = 1; n <= this._getMaxPageNumber($); n++) {
					yield this._getLinkToPageN(categoryURL, n);
				}
			}
		};
	}

	_getCategoryGenerator() {
		return async function* getCategoryURL(url, parentCategoryName) {
			const $ = await this._getCheerioDOM(url);
			const processCategory = (category) => {
				const categoryURL = this._getURLOfCategory($, category);
				const categoryFullName = this._getFullNameOfCategory(
					$,
					category,
					parentCategoryName
				);

				return { categoryURL, categoryFullName };
			};
			const categories = this._getCategories($)
				.map(processCategory)
				.filter(({ categoryURL }) => categoryURL);

			if (!categories.length) {
				getCategoryURL.hasSubCategories = false;
				return;
			}

			for (const { categoryURL, categoryFullName } of categories) {
				yield* getCategoryURL.call(this, categoryURL, categoryFullName);

				if (getCategoryURL.hasSubCategories) {
					continue;
				} else {
					getCategoryURL.hasSubCategories = true;
				}

				CACHE.CURRENT.category = categoryFullName;

				if (!this._CATALOGUE.exceptions.has(categoryURL)) {
					yield categoryURL;
				}
			}
		};
	}

	_logNewItem(url, itemType = "") {
		console.log(`[${itemType}`, CACHE.CURRENT.item + 1, `] ${url}`);
	}

	_getCategoryFullName() {
		throw new Error("Метод _getCategoryFullName не реализован");
	}

	_getName() {
		throw new Error("Метод _getName не реализован");
	}

	_getSKU() {
		throw new Error("Метод _getSKU не реализован");
	}

	_getPrice() {
		throw new Error("Метод _getPrice не реализован");
	}

	_getDescription() {
		throw new Error("Метод _getDescription не реализован");
	}

	_getDescriptionVideo() {
		throw new Error("Метод _getDescriptionVideo не реализован");
	}

	_getProperties() {
		throw new Error("Метод _getProperties не реализован");
	}

	_getDocs() {
		throw new Error("Метод _getDocs не реализован");
	}

	_getImages() {
		throw new Error("Метод _getImages не реализован");
	}

	_getCardsURLs() {
		throw new Error("Метод _getCardsURLs не реализован");
	}

	_getMaxPageNumber() {
		throw new Error("Метод _getMaxPageNumber не реализован");
	}

	_getLinkToPageN() {
		throw new Error("Метод _getLinkToPageN не реализован");
	}

	_getCategories() {
		throw new Error("Метод _getCategories не реализован");
	}

	_getURLOfCategory() {
		throw new Error("Метод _getURLOfCategory не реализован");
	}

	_getFullNameOfCategory() {
		throw new Error("Метод _getFullNameOfCategory не реализован");
	}

	_getRelated() {
		throw new Error("Метод _getRelated не реализован");
	}

	_getRelatedSKUs() {
		throw new Error("Метод _getRelatedSKUs не реализован");
	}

	_addRelatedItems() {
		throw new Error("Метод _addRelatedItems не реализован");
	}

	_isCategoryNameExcepted() {
		throw new Error("Метод _isCategoryNameExcepted не реализован");
	}

	_setCategoryName() {
		throw new Error("Метод _setCategoryName не реализован");
	}
}

export class AbstractAPIParser extends AbstractParser {
	_initParser() {
		const parser = f.decoratorPipe(
			[this._wrapper],
			[
				this._getDataGenerator,
				this._getProductGenerator,
				this._getCategoryFiltersGenerator,
			]
		);

		return parser();
	}

	_getDataGenerator(source) {
		return async function* requestData(catalogueURL) {
			for await (const product of source.call(this, catalogueURL)) {
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
				const options = this._getTabsOptions(catalogueURL, uid);
				const sku = this._getSKU(skuRaw, url, name);
				const category = this._getCategoryFullName(url);

				this._logNewItem(url);

				// TODO убрать. Есть фильтрация по имени
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

				const { data: { tabs } = {} } = await axiosHandler.request(
					options
				);
				const description = f.formatDescription(
					this._getDescription(text),
					this._getDescriptionVideo(tabs)
				);
				const properties = this._getProperties(characteristics);
				const docs = this._getDocs(tabs);
				const images = downloadImages(
					this._getImages(gallery),
					sku,
					url
				);

				CACHE.items.set(url, ++CACHE.CURRENT.item);

				await f.delay(this._delay);

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
			}
		};
	}

	_getProductGenerator(source) {
		return async function* requestProduct(url) {
			for await (const categoryFilter of source.call(this, url)) {
				const options = this._getProductsListOptions(
					url,
					categoryFilter
				);
				const { data } = await axiosHandler.request(options);

				for (const product of this._getProducts(data)) {
					yield product;
				}
			}
		};
	}

	_getCategoryFiltersGenerator() {
		return async function* requestCategoryFilters(url) {
			const options = this._getCategoryFiltersOptions(url);
			const { data } = await axiosHandler.request(options);

			for (const { value: filter } of this._getCategoryFilters(data)) {
				CACHE.CURRENT.category = this._getFullNameOfCategory(filter);

				yield filter;
			}
		};
	}

	_getTabsOptions() {
		throw new Error("Метод _getTabsOptions не реализован");
	}

	_getProductsListOptions() {
		throw new Error("Метод _getProductsListOptions не реализован");
	}

	_getProducts() {
		throw new Error("Метод _getProducts не реализован");
	}

	_getCategoryFiltersOptions() {
		throw new Error("Метод _getCategoryFiltersOptions не реализован");
	}

	_getCategoryFilters() {
		throw new Error("Метод _getCategoryFilters не реализован");
	}
}
