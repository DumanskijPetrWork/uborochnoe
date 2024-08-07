// Подключение каталогов
export default {
	SITE_URL: 'https://ghibli.info/',
	CATALOGUES: [
		{
			name: 'ghiblirussia',
			url: [
				'https://ghiblirussia.com/catalog/',
				'https://ghiblirussia.com/katalog-KRUGER/',
			],
			exceptions: new Set([]),
			categories: new Map([[]]),
			SKUs: new Map([[]]),
		},
	],
};
