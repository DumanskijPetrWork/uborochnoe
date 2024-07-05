import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

import PARSERS from '../../config/parsers.js';
import * as f from './functions.js';
import globHandler from './glob.js';

await createVariations();

async function createVariations() {
	try {
		for (const parser of PARSERS) {
			const variationsFilePath = path.resolve(
				'dist',
				'*',
				parser.name,
				'variations',
				'*.xlsx'
			);
			const parsedFilesPathes = globHandler.parsePathes(
				path.resolve(variationsFilePath, '..', '..', '*.xlsx'),
				{
					ignore: {
						ignored: (p) => /related|with_variations/.test(p.name),
					},
				}
			);

			for (const file of globHandler.parsePathes(variationsFilePath)) {
				await variationsToJSON(file);
			}

			for (const filePath of parsedFilesPathes) {
				await addVariations(filePath);
			}
		}
	} catch (e) {
		console.error(`Ошибка ${createVariations.name}: ${e}`);
	}
}

async function addVariations(filePath) {
	const variationsFilePath = globHandler.parsePathes(
		path.resolve(filePath, '..', 'variations', '*.json')
	);
	if (!variationsFilePath.length) return;

	try {
		const data = JSON.parse(fs.readFileSync(variationsFilePath[0]));
		const workbook = new ExcelJS.Workbook();

		await workbook.xlsx.readFile(filePath);

		const worksheet = workbook.worksheets[0];

		worksheet.getRow(1).values.forEach((value, i) => {
			worksheet.getColumn(i).key = value;
		});

		for (const [sku, variations] of Object.entries(data)) {
			let currentRowIndex = worksheet
				.getColumn('sku')
				.values.findIndex((cell) => cell?.includes(sku));

			if (currentRowIndex == -1) continue;

			f.setCellsValues(worksheet, currentRowIndex, {
				type: 'variable',
				price: '',
			});

			worksheet.duplicateRow(currentRowIndex, variations.length, true);

			for (const variation of variations) {
				f.setCellsValues(worksheet, ++currentRowIndex, {
					variation: variation.variation,
					price: variation.price,
				});
			}
		}

		await workbook.xlsx.writeFile(
			f.changeFileName(filePath, 'with_variations', 'xlsx')
		);
	} catch (e) {
		console.error(`Ошибка ${addVariations.name}: ${e}`);
	}
}

async function variationsToJSON(filePath) {
	try {
		const variations = new Map();
		const workbook = new ExcelJS.Workbook();

		await workbook.xlsx.readFile(filePath);

		const worksheet = workbook.worksheets[0];

		worksheet.getRow(1).values.forEach((value, i) => {
			worksheet.getColumn(i).key = value;
		});

		for (let i = 2; i <= worksheet.rowCount; i++) {
			const row = worksheet.getRow(i);
			const variationRaw = row.getCell('variation').value;
			const variation = variationRaw?.richText?.[0]?.text || variationRaw;
			const nameRaw = row.getCell('name').value;
			const name = nameRaw?.richText?.[0]?.text || nameRaw;
			const price = row.getCell('price').value;
			const sku = row.getCell('sku').value;

			if (variation && /\w|[а-я]/i.test(variation)) {
				const item = variations.get(sku);

				if (item) {
					item.push({ name, variation, price });
				} else {
					variations.set(sku, [{ name, variation, price }]);
				}
			}
		}

		const json = JSON.stringify(Object.fromEntries(variations));

		fs.writeFileSync(
			f.changeFileName(filePath, 'variations', 'json'),
			json
		);
	} catch (e) {
		console.error(`Ошибка ${variationsToJSON.name}: ${e}`);
	}
}
