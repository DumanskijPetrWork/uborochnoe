export const LAUNCH_PUPPETEER_OPTS = {
	headless: "new",
	defaultViewport: null,
	args: [
		"--no-sandbox",
		"--disable-setuid-sandbox",
		"--disable-dev-shm-usage",
		"--disable-accelerated-2d-canvas",
		"--disable-gpu",
		"--window-size=1920x1080",
	],
};

export const PAGE_PUPPETEER_OPTS = {
	networkIdle2Timeout: 5_000,
	waitUntil: "domcontentloaded",
	timeout: 3_000_000,
};
