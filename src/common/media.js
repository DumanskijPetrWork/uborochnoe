import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import * as f from './functions.js';
import { IMG_FORMAT_OPTS, IMG_RESIZE_OPTS } from '../../config/sharp_options.js';


export function downloadImages(images, imageName, originURL = '') {
	const imagesfileNames = [];
	let i = 0;

	for (const imageURL of images) {
		if (!imageURL) continue;

		const fileName = f.cyrillicToTranslit(
			`${f.clearImageName(imageName)}__${i++}.${IMG_FORMAT_OPTS.extname}`
		);

		imagesfileNames.push(fileName);
		downloadMedia(originURL + imageURL, fileName);
	}

	return imagesfileNames;
}

async function downloadMedia(url, fileName) {
	const dirName = CACHE.CURRENT.MEDIA_DIR_NAME;
	const searchFilePath = path.resolve(dirName, '..', '*', fileName.replace(/\w+$/, '*'));
	const newFilePath = path.resolve(dirName, fileName);

	try {
		if (globSync(searchFilePath).length) return;

		axios({
			url,
			responseType: 'stream',
		})
			.then(response => response.data
				.pipe(sharp())
			)
			.then(img => img
				.resize(IMG_RESIZE_OPTS)
				.webp(IMG_FORMAT_OPTS.quality)
			)
			.then(formattedImg => formattedImg
				.pipe(fs.createWriteStream(newFilePath))
			);
	} catch (e) {
		console.log(`Ошибка ${downloadMedia.name} (path: ${path.join(dirName, fileName)}, url: ${url}): ${e}`);
	}
}