import ExcelJS from 'exceljs';
import path from 'path';

import * as f from './functions.js';
import bffarinelli from '..//parsers/bffarinelli.js';
import transmetall from '..//parsers/transmetall.js';
import lavorpro from '..//parsers/lavorpro.js';


// Подключение парсеров
const PARSERS = [
	// bffarinelli,
	// transmetall,
	lavorpro,
]

export async function createDataBase() {
	for (const parser of PARSERS) {
		await newParse(parser);

		if (parser.relatedDataGenerator) await newParse(parser, true);
	}

	async function newParse(parser, isRelated) {
		const dirName = isRelated ? parser.name + '_related' : parser.name;
		const dataGenerator = isRelated ? parser.relatedDataGenerator(CACHE.relatedItems) : parser.dataGenerator;

		CACHE.clear(isRelated ? false : true);
		f.updateDirs(parser.config.SITE_URL, dirName);
		console.log(`\n[${isRelated ? 'RELATED: ' : ''}${parser.name}]`);
		await createXLSX(dataGenerator, dirName);
	}
}

async function createXLSX(dataGenerator, fileName) {
	const date = new Date();
	const dateString = `_${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`;
	const filePath = path.join(CACHE.CURRENT.DATA_DIR_NAME, fileName + dateString + '.xlsx');

	try {
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet('Товары');
		const logsSheet = workbook.addWorksheet('Logs');

		sheet.columns = getColumns();
		logsSheet.columns = sheet.columns.concat({ header: 'reason', key: 'reason', width: 20 });
		await fillContent(dataGenerator, sheet, logsSheet);
		await workbook.xlsx.writeFile(filePath);
	} catch (e) {
		console.log(`Ошибка ${createXLSX.name}: ${e}`);
	} finally {
		console.log(`\nОбработано уникальных товаров для каталога ${fileName}: ${CACHE.CURRENT.item}`);
	}
}

async function fillContent(dataGenerator, sheet, logsSheet) {
	const autoWidthColumns = getAutoWidthColumns();
	let i = 1;

	try {
		for await (const item of dataGenerator) {
			const article = item.article;
			const category = item.category;

			if (category !== undefined) {
				if (article === undefined) {
					const row = CACHE.items.get(item.url) + 1;
					const cell = sheet.getRow(row).getCell('category');

					cell.value += `,${category}`;

					const currentLength = cell.text.length;

					if (currentLength > autoWidthColumns['category']) {
						autoWidthColumns['category'] = currentLength;
					}

					continue;
				}

				if (CACHE.articles.has(article)) {
					console.log(`Повторяющийся артикул в строке ${CACHE.CURRENT.item + 1}: ${article}, url: ${item.url}\n`);
					CACHE.itemsNoArticle.set(item.url, 'Повторяющийся артикул');
				} else if (article !== '') {
					CACHE.articles.add(article);
				}

				const reason = CACHE.itemsNoArticle.get(item.url);
				if (reason) logsSheet.addRow(Object.assign(item, { reason: reason }));
			}

			sheet.addRow(item);

			for (const id in autoWidthColumns) {
				const currentLength = item[id]?.toString().length || 0;

				if (currentLength > autoWidthColumns[id]) autoWidthColumns[id] = currentLength;
			}

			// if (i++ >= 45) break;
		}

		for (const id in autoWidthColumns) {
			const column = sheet.getColumn(id);
			const logsColumn = logsSheet.getColumn(id);
			const width = autoWidthColumns[id];

			column.width = width;
			logsColumn.width = width;
		}
	} catch (e) {
		console.log(`Ошибка ${fillContent.name}: ${e}`);
	}
}

function getAutoWidthColumns() {
	return {
		'url': 10,
		'article': 10,
		'price': 10,
		'category': 10,
		'name': 10,
		'images': 10,
		'related': 10,
	};
}

function getColumns() {
	return [
		{ header: 'url', key: 'url' },
		{ header: 'article', key: 'article' },
		{ header: 'price', key: 'price' },
		{ header: 'category', key: 'category' },
		{ header: 'name', key: 'name' },
		{ header: 'description', key: 'description', width: 10 },
		{ header: 'properties', key: 'properties', width: 10 },
		{ header: 'images', key: 'images' },
		{ header: 'related', key: 'related' }
	];
}