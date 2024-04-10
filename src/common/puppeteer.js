import puppeteer from "puppeteer";
import { getNewUserAgentString } from "./functions.js"
import { LAUNCH_PUPPETEER_OPTS, PAGE_PUPPETEER_OPTS } from "../../config/puppeteer_options.js";


class PuppeteerHandler {
	disableRequests = ['stylesheet', 'font', 'image'];

	constructor() {
		this.browser = null;
	}

	async initBrowser() {
		try {
			this.browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS);
			console.log('* Puppeteer запущен *');
		} catch (e) {
			console.error(`Ошибка ${this.initBrowser.name}: ${e}`);
		}
	}

	async closeBrowser() {
		if (this.browser) {
			await this.browser.close();
			console.log('\n* Puppeteer успешно завершил работу *\n');
		} else {
			console.error('\n* Puppeteer не использовался *\n');
		}
	}

	async getPageContent(url) {
		if (!this.browser) {
			await this.initBrowser();
		}

		try {
			const page = await this.browser.newPage();
			await page.setUserAgent(getNewUserAgentString());

			await page.setRequestInterception(true);
			page.on('request',
				(req) => this.disableRequests.includes(req.resourceType()) ? req.abort() : req.continue());

			await page.goto(url, PAGE_PUPPETEER_OPTS);
			const content = await page.content();
			page.close();

			return content;
		} catch (e) {
			console.error(`Ошибка ${this.getPageContent.name}: ${e}`);
		}
	}
}

export const p = new PuppeteerHandler();