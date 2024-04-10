import { p } from './src/common/puppeteer.js'
import { createDataBase } from './src/common/database.js'
import Cache from './src/common/cache.js';


class App {
	async main() {
		const startTimestamp = Date.now();

		try {
			await createDataBase();
		} catch (e) {
			console.error(`Ошибка ${this.main.name}: ${e}`);
		} finally {
			await p.closeBrowser();
			const execTime = new Date(Date.now() - startTimestamp);
			execTime.setMinutes(execTime.getMinutes() + execTime.getTimezoneOffset());
			console.log(`Время выполнения: ${(execTime.getHours())} ч. ${(execTime.getMinutes())} мин. ${(execTime.getSeconds())} с.`);
		}
	}
}

const app = new App();
global.CACHE = new Cache();

await app.main();