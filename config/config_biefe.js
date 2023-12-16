// Подключение каталогов
export const config = {
	SITE_URL: "https://biefe.ru/",
	CATALOGUES: [
		{
			name: "bffarinelli",
			url: "https://bffarinelli.com/sitemap/",
			exceptions: new Set([
				"/product/aksessuary/",
			]),
			articles: new Map([
				[],
			]),
		},
		{
			name: "transmetall",
			url: "https://www.transmetall.ru/catalog/all-bieffe?limit=30",
			exceptions: new Set([
			]),
			articles: new Map([
				[],
			]),
		},
	],
}