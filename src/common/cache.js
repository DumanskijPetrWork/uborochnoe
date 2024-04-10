export default class Cache {
	clear(all) {
		this.CURRENT = {
			DATA_DIR_NAME: '',
			MEDIA_DIR_NAME: '',
			category: '',
			item: 0,
		};

		this.items = new Map();
		this.itemsNoSKU = new Map();
		this.SKUs = new Set();
		this.categoriesURLs = new Set();

		if (all) {
			this.relatedItems = new Set();
		}
	}
}
