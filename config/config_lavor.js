// Подключение каталогов
export const config = {
	SITE_URL: "https://lavor.pro/",
	CATALOGUES: [
		{
			name: "lavorpro",
			url: "https://lavorpro.ru/catalog/",
			exceptions: new Set([
				"https://lavorpro.ru/catalog/moyushchie-sredstva/",
			]),
			categories: new Map([
				["Подметальные машины>С ручным приводом", "Подметальные машины>С механическим приводом"],
				["Клининговое оборудование evoline>Поломоечные машины", "Клининговое оборудование EVOline>Поломоечные машины EVOline"],
				["Клининговое оборудование evoline>Подметальные машины", "Клининговое оборудование EVOline>Подметальные машины EVOline"],
				["Клининговое оборудование evoline>Однодисковые машины полотеры", "Клининговое оборудование EVOline>Однодисковые полотеры EVOline"],
			]),
			SKUs: new Map([
			]),
		},
	],
}