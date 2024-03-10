import { p } from './src/common/puppeteer.js'
import { createDataBase } from './src/common/database.js'


global.CACHE = {
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

		if (all) {
			this.relatedItems = new Set();
		}
	}
};

class App {
	async main() {
		const startTimestamp = Date.now();

		try {
			await createDataBase();
		} catch (e) {
			console.log(`Ошибка ${this.main.name}: ${e}`);
		} finally {
			await p.closeBrowser();
			const execTime = new Date(Date.now() - startTimestamp);
			console.log(`Время выполнения: ${(execTime.getMinutes())} мин. ${(execTime.getSeconds())} с.`);
		}
	}
}

const app = new App();
await app.main();