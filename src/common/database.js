import ExcelJS from 'exceljs';
import path from 'path';

import * as f from './functions.js';
import PARSERS from '../../config/parsers.js';


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
	const filePath = path.join(
		CACHE.CURRENT.DATA_DIR_NAME,
		`${fileName}_${f.currentDateString}.xlsx`
	);

	try {
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet('Товары');

		sheet.columns = getColumns();
		await fillContent(dataGenerator, sheet);
		await workbook.xlsx.writeFile(filePath);
	} catch (e) {
		console.log(`Ошибка ${createXLSX.name}: ${e}`);
	} finally {
		console.log(`\nОбработано уникальных товаров для каталога ${fileName}: ${CACHE.CURRENT.item}`);
	}
}

async function fillContent(dataGenerator, sheet) {
	const autoWidthColumns = getAutoWidthColumns();
	let i = 1;

	try {
		for await (const item of dataGenerator) {
			const sku = item.sku;
			const category = item.category;

			if (category !== undefined) {
				if (sku === undefined) {
					const row = CACHE.items.get(item.url) + 1;
					const cell = sheet.getRow(row).getCell('category');

					cell.value += `|${category}`;

					const currentLength = cell.text.length;

					if (currentLength > autoWidthColumns['category']) {
						autoWidthColumns['category'] = currentLength;
					}

					continue;
				}

				if (CACHE.SKUs.has(sku)) {
					console.log(`Повторяющийся артикул в строке ${CACHE.CURRENT.item + 1}: ${sku}, url: ${item.url}\n`);
					CACHE.itemsNoSKU.set(item.url, 'Повторяющийся артикул');
				} else if (sku !== '') {
					CACHE.SKUs.add(sku);
				}
			}

			sheet.addRow(
				Object.assign(
					item,
					{ reason: CACHE.itemsNoSKU.get(item.url) },
					{ type: 'simple' },
				)
			);

			for (const id in autoWidthColumns) {
				const currentLength = item[id]?.toString().length || 0;

				if (currentLength > autoWidthColumns[id]) autoWidthColumns[id] = currentLength;
			}

			// if (i++ >= 3) break;
		}

		for (const id in autoWidthColumns) {
			const column = sheet.getColumn(id);
			const width = autoWidthColumns[id];

			column.width = width;
		}
	} catch (e) {
		console.log(`Ошибка ${fillContent.name}: ${e}`);
	}
}

function getAutoWidthColumns() {
	return {
		'url': 10,
		'name': 10,
		'sku': 10,
		'price': 10,
		'variation': 10,
		'category': 10,
		'images': 10,
		'related': 10,
	};
}

function getColumns() {
	return [
		{ header: 'url', key: 'url' },
		{ header: 'name', key: 'name' },
		{ header: 'reason', key: 'reason', width: 20 },
		{ header: 'sku', key: 'sku' },
		{ header: 'price', key: 'price' },
		{ header: 'type', key: 'type', width: 10 },
		{ header: 'variation', key: 'variation' },
		{ header: 'category', key: 'category' },
		{ header: 'images', key: 'images' },
		{ header: 'description', key: 'description', width: 10 },
		{ header: 'properties', key: 'properties', width: 10 },
		{ header: 'docs', key: 'docs', width: 10 },
		{ header: 'related', key: 'related' },
	];
}