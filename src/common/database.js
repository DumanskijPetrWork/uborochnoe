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
const LOGS_DIR_NAME = path.join('dist', 'logs');

mkdirIfNotExistsSync(LOGS_DIR_NAME);

export async function createDataBase() {
	try {
		for (const catalogue of config.CATALOGUES) {
			const getData = GET_DATA[catalogue.name];
			const dataGenerator = getData(catalogue.url);
			const MEDIA_DIR_NAME = path.join('dist', 'media_' + catalogue.name);

			getData.currentItem = 0;
			getData.items = new Map();
			getData.itemsNoArticle = new Set();

			console.log(`\n[${catalogue.name}]`);

			mkdirIfNotExistsSync(MEDIA_DIR_NAME);
			await createXLSX(dataGenerator, catalogue.name, getData);
		}
	} catch (e) {
		console.log(`Ошибка ${createDataBase.name}: ${e}`);
	}
}

async function createXLSX(dataGenerator, fileName, getData) {
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

	for await (const item of dataGenerator) {
		const article = item.article;

		if (article === undefined) {
			const row = getData.items.get(item.url) + 1;
			const cell = sheet.getRow(row).getCell('category');

			cell.value += `,${item.category}`;

			const currentLength = cell.text.length;

			if (currentLength > autoWidthColumns['category']) {
				autoWidthColumns['category'] = currentLength;
			}

			continue;
		}

		if (articles.has(article)) {
			console.log(`Повторяющийся артикул в строке ${getData.currentItem + 1}: ${article}, url: ${item.url}\n`);
			getData.itemsNoArticle.add(item.url);
		} else {
			articles.add(article);
		}

		sheet.addRow(item);
		if (getData.itemsNoArticle.has(item.url)) logsSheet.addRow(item);

		for (const id in autoWidthColumns) {
			const currentLength = item[id].toString().length;

			if (currentLength > autoWidthColumns[id]) {
				autoWidthColumns[id] = currentLength;
			}
		}
	}

	for (const id in autoWidthColumns) {
		const column = sheet.getColumn(id);
		column.width = autoWidthColumns[id];
	}

	await workbook.xlsx.writeFile(filePath);
	console.log(`\nОбработано уникальных товаров для каталога ${fileName}: ${getData.currentItem}`);
}