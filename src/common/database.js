import ExcelJS from 'exceljs';
import path from 'path';

import { mkdirIfNotExistsSync } from './functions.js';
import { config } from '../../config/config_biefe.js';

// Импорт генераторов из парсеров каталогов
import { getData as bffarinelli } from '..//parsers/bffarinelli.js';
import { getData as transmetall } from '..//parsers/transmetall.js';

// Подключение парсеров
const GET_DATA = {
	bffarinelli,
	transmetall,
}

export async function createDataBase() {
	try {
		for (const catalogue of config.CATALOGUES) {
			const dataGenerator = GET_DATA[catalogue.name](catalogue.url);
			const MEDIA_DIR_NAME = path.join('dist', 'media_' + catalogue.name);

			CACHE.currentItem = 0;
			CACHE.items = new Map();
			CACHE.itemsNoArticle = new Set();

			console.log(`\n[${catalogue.name}]`);

			mkdirIfNotExistsSync(MEDIA_DIR_NAME);
			await createXLSX(dataGenerator, catalogue.name);
		}
	} catch (e) {
		console.log(`Ошибка ${createDataBase.name}: ${e}`);
	}
}

async function createXLSX(dataGenerator, fileName) {
	const articles = new Set();
	const date = new Date();
	const dateString = `_${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;
	const filePath = path.join('dist', fileName + dateString + '.xlsx');
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet(fileName);
	const logsSheet = workbook.addWorksheet('logs');
	const autoWidthColumns = {
		'url': 10,
		'article': 10,
		'price': 10,
		'category': 10,
		'name': 10,
		'images': 10,
	};

	sheet.columns = [
		{ header: 'url', key: 'url' },
		{ header: 'article', key: 'article' },
		{ header: 'price', key: 'price' },
		{ header: 'category', key: 'category' },
		{ header: 'name', key: 'name' },
		{ header: 'description', key: 'description', width: 10 },
		{ header: 'properties', key: 'properties', width: 10 },
		{ header: 'images', key: 'images' }
	];
	logsSheet.columns = sheet.columns;

	// let i = 1;
	for await (const item of dataGenerator) {
		const article = item.article;

		if (article === undefined) {
			const row = CACHE.items.get(item.url) + 1;
			const cell = sheet.getRow(row).getCell('category');

			cell.value += `,${item.category}`;

			const currentLength = cell.text.length;

			if (currentLength > autoWidthColumns['category']) {
				autoWidthColumns['category'] = currentLength;
			}

			continue;
		}

		if (articles.has(article)) {
			console.log(`Повторяющийся артикул в строке ${CACHE.currentItem + 1}: ${article}, url: ${item.url}\n`);
			CACHE.itemsNoArticle.add(item.url);
		} else {
			articles.add(article);
		}

		sheet.addRow(item);
		if (CACHE.itemsNoArticle.has(item.url)) logsSheet.addRow(item);

		for (const id in autoWidthColumns) {
			const currentLength = item[id].toString().length;

			if (currentLength > autoWidthColumns[id]) {
				autoWidthColumns[id] = currentLength;
			}
		}

		// if (i++ >= 10) break; // TODO
	}

	for (const id in autoWidthColumns) {
		const column = sheet.getColumn(id);
		const logsColumn = logsSheet.getColumn(id);
		const width = autoWidthColumns[id];

		column.width = width;
		logsColumn.width = width;
	}

	await workbook.xlsx.writeFile(filePath);
	console.log(`\nОбработано уникальных товаров для каталога ${fileName}: ${CACHE.currentItem}`);
}