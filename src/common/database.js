import ExcelJS from "exceljs";
import path from "path";

import * as f from "./functions.js";
import Logger from "./logger.js";
import globHandler from "./glob.js";
import PARSERS from "../parsers/parsers.js";

export async function createDataBase() {
	for (const parser of PARSERS) {
		await newParse(parser);

		if (parser.related) await newParse(parser, true);
	}

	async function newParse(parser, isRelated = false) {
		const dirName = isRelated ? parser.name + "_related" : parser.name;
		const dataGenerator = isRelated
			? parser.related(CACHE.relatedItems)
			: parser.parser;

		CACHE.clear(!isRelated);
		f.updateDirs(parser.config.SITE_URL, dirName);
		global.logger = new Logger(
			path.join(CACHE.CURRENT.DATA_DIR_NAME, "logs.log")
		);
		console.log(`\n[${isRelated ? "RELATED: " : ""}${parser.name}]`);
		await createXLSX(dataGenerator, dirName, parser.config.limit);
	}
}

async function createXLSX(dataGenerator, fileName, limitItemsNumber) {
	const filePath = path.join(
		CACHE.CURRENT.DATA_DIR_NAME,
		`${fileName}_${f.currentDateString}.xlsx`
	);
	const updatedOnlyfilePath = filePath.replace(".xlsx", "_updated.xlsx");

	try {
		const workbook = new ExcelJS.Workbook();
		const workbookUpdatedOnly = new ExcelJS.Workbook();
		const sheetName = "Товары";
		const sheet = workbook.addWorksheet(sheetName);
		const sheetUpdatedOnly = workbookUpdatedOnly.addWorksheet(sheetName);
		const columnsIds = getColumns();

		[sheet, sheetUpdatedOnly].forEach(
			(sheet) => (sheet.columns = columnsIds)
		);
		await fillContent({
			dataGenerator,
			sheet,
			sheetUpdatedOnly,
			limitItemsNumber,
		});
		await workbook.xlsx.writeFile(filePath);
		await workbookUpdatedOnly.xlsx.writeFile(updatedOnlyfilePath);
	} catch (e) {
		console.error(`Ошибка ${createXLSX.name}: ${e}`);
	} finally {
		console.log(
			`\nОбработано уникальных товаров для каталога ${fileName}: ${CACHE.CURRENT.item}`
		);
	}
}

async function fillContent({
	dataGenerator,
	sheet,
	sheetUpdatedOnly,
	limitItemsNumber = -1,
}) {
	const autoWidthColumns = getAutoWidthColumns();

	try {
		const existingItems = await getExistingItemsIds("url");

		let i = 1;
		for await (const item of dataGenerator) {
			const url = item.url;
			const sku = item.sku;
			const category = item.category;

			if (category !== undefined && sku === undefined) {
				const row = CACHE.items.get(url) + 1;
				let currentLength;

				[sheet, sheetUpdatedOnly].forEach((sheet) => {
					const cell = sheet.getRow(row).getCell("category");

					cell.value += `|${category}`;
					currentLength = cell.text.length;
				});

				if (currentLength > autoWidthColumns["category"]) {
					autoWidthColumns["category"] = currentLength;
				}

				continue;
			}

			const fullItemInfo = Object.assign(
				item,
				{ reason: CACHE.itemsNoSKU.get(url) },
				{ type: "simple" }
			);

			sheet.addRow(fullItemInfo);
			if (!existingItems.has(url)) sheetUpdatedOnly.addRow(fullItemInfo);

			for (const id in autoWidthColumns) {
				const currentLength = item[id]?.toString().length || 0;

				if (currentLength > autoWidthColumns[id])
					autoWidthColumns[id] = currentLength;
			}

			if (limitItemsNumber !== -1 && i++ >= limitItemsNumber) break;
		}

		for (const id in autoWidthColumns) {
			[sheet, sheetUpdatedOnly].forEach((sheet) => {
				sheet.getColumn(id).width = autoWidthColumns[id];
			});
		}
	} catch (e) {
		console.error(`Ошибка ${fillContent.name}: ${e}`);
	}
}

async function getExistingItemsIds(id) {
	try {
		const existingItems = new Set();
		const workbookFilenames = globHandler.getParsedPathesIterator(
			path.join(CACHE.CURRENT.DATA_DIR_NAME, "*.xlsx")
		);

		for await (const workbookFilename of workbookFilenames) {
			const values = await getXLSXColumnById(workbookFilename, id);

			values.forEach((id) => existingItems.add(id));
		}

		return existingItems;
	} catch (e) {
		console.error(`Ошибка ${getExistingItemsIds.name}: ${e}`);
	}
}

async function getXLSXColumnById(filename, id) {
	try {
		const workbook = new ExcelJS.Workbook();

		await workbook.xlsx.readFile(filename);

		const sheet = workbook.worksheets[0];
		sheet.columns = getColumns();
		const column = sheet?.getColumn(id);
		const values = column?.values || [];

		values.splice(0, 2);

		return values;
	} catch (e) {
		console.error(`Ошибка ${getXLSXColumnById.name}: ${e}`);
	}
}

function getAutoWidthColumns() {
	return {
		url: 10,
		name: 10,
		sku: 10,
		price: 10,
		variation: 10,
		category: 10,
		images: 10,
		related: 10,
	};
}

function getColumns() {
	return [
		{ header: "url", key: "url" },
		{ header: "name", key: "name" },
		{ header: "reason", key: "reason", width: 20 },
		{ header: "sku", key: "sku" },
		{ header: "price", key: "price" },
		{ header: "type", key: "type", width: 10 },
		{ header: "variation", key: "variation" },
		{ header: "category", key: "category" },
		{ header: "images", key: "images" },
		{ header: "description", key: "description", width: 10 },
		{ header: "properties", key: "properties", width: 10 },
		{ header: "docs", key: "docs", width: 10 },
		{ header: "related", key: "related" },
	];
}
