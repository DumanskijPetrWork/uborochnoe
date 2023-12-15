import { p } from './src/common/puppeteer.js'
import { createDataBase } from './src/common/database.js'


await main();

async function main() {
	const startTimestamp = Date.now();

	try {
		await createDataBase();
	} catch (e) {
		console.log(`Ошибка ${main.name}: ${e}`);
	} finally {
		await p.closeBrowser();
		const execTime = new Date(Date.now() - startTimestamp);
		console.log(`Время выполнения: ${(execTime.getMinutes())} мин. ${(execTime.getSeconds())} с.`);
	}
}