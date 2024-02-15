import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import * as f from './functions.js';


export function downloadImages(images, imageName, originURL = '') {
	const imagesfileNames = [];
	let i = 0;

	for (const imageURL of images) {
		const fileName = f.cyrillicToTranslit(
			`${f.clearImageName(imageName)}__${i++}` + path.extname(imageURL)
		);

		imagesfileNames.push(fileName);
		downloadMedia(originURL + imageURL, fileName);
	}

	return imagesfileNames;
}

async function downloadMedia(url, fileName) {
	const dirName = CACHE.CURRENT.MEDIA_DIR_NAME;
	const searchFilePath = path.resolve(dirName, '..', '*', fileName);
	const newFilePath = path.resolve(dirName, fileName);

	try {
		if (globSync(searchFilePath).length) return;

		const response = await axios({
			url,
			responseType: 'stream',
		});

		response.data.pipe(fs.createWriteStream(newFilePath));
	} catch (e) {
		console.log(`Ошибка ${downloadMedia.name} (path: ${path.join(dirName, fileName)}, url: ${url}): ${e}`);
	}
}