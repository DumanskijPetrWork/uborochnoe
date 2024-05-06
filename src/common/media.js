import sharp from "sharp";
import fs from "fs";
import path from "path";

import * as f from "./functions.js";
import axiosHandler from "./axios.js";
import globHandler from "./glob.js";
import {
	IMG_FORMAT_OPTS,
	IMG_RESIZE_OPTS,
} from "../../config/sharp_options.js";

const clearImageName = function deleteInvalidFileNameSymbols(imageNameRaw) {
	return imageNameRaw.replace(/\//g, "-").replace(/[^-\w\d\s_.]/g, "");
};

const formatImageName = f.pipe(f.cyrillicToTranslit, clearImageName);

const getFullNthFileName = function getFullNthFileNameWithExtension(
	formattedImageName,
	n,
	extName
) {
	return `${formattedImageName}__${n}.${extName}`;
};

const getMediaPaths = function getSearchAndNewMediaFilePaths(
	dirName,
	fileName
) {
	const filePathToSearch = path.resolve(
		dirName,
		"..",
		"*",
		fileName.replace(/\w+$/, "*")
	);
	const newFilePath = path.resolve(dirName, fileName);

	return { filePathToSearch, newFilePath };
};

const getImageStream = async function requestImageReadableDataStreamByURL(url) {
	const response = await axiosHandler.requestTypedContent(
		{
			url,
			responseType: "stream",
		},
		"image"
	);

	if (!response) return;

	return response.data;
};

const getTransform = function resizeAndChangeFormatPipe(onerror) {
	const transform = sharp()
		.resize(IMG_RESIZE_OPTS)
		.webp(IMG_FORMAT_OPTS.quality);

	transform.on("error", onerror);

	return transform;
};

const transformAndSave = async function transformImageStreamDataAndSaveToFile(
	dataStream,
	transform,
	filePath
) {
	const fileStream = fs.createWriteStream(filePath);

	await dataStream.pipe(transform).pipe(fileStream);
};

/**
 * 1. Checks if the image already exists
 * 2. Gets the image data stream from a given URL
 * 3. Transforms and saves the image data stream to the specified file path
 *
 * @param {string} imageURL - The URL of the image to download.
 * @param {string} dirName - The directory name where the image will be saved.
 * @param {string} fileName - The name of the image file.
 * @param {string} [cardURL=""] - The URL of the current card.
 * @returns {Promise<void>} - A promise that resolves when the image is successfully downloaded and saved, or rejects if an error occurs.
 */
const handleImage = async function checkExistanceDownloadAndSaveImage(
	imageURL,
	dirName,
	fileName,
	cardURL = ""
) {
	const { filePathToSearch, newFilePath } = getMediaPaths(dirName, fileName);

	if (globHandler.pathExists(filePathToSearch)) return;

	const transform = getTransform((e) => {
		logger.log(
			`Ошибка обработки файла ${fileName} (url: ${imageURL}, cardURL: ${cardURL}): ${e}`
		);
		fs.unlink(newFilePath, (e) => {
			if (e) {
				logger.log(`Ошибка удаления файла ${newFilePath}: ${e}`);
			}
		});
	});

	try {
		const dataStream = await getImageStream(imageURL);

		if (!dataStream) throw new Error("Изображение не получено");

		await transformAndSave(dataStream, transform, newFilePath);
	} catch (e) {
		logger.log(
			`Ошибка ${
				checkExistanceDownloadAndSaveImage.name
			} (path: ${path.join(
				dirName,
				fileName
			)}, url: ${imageURL}, cardURL: ${cardURL}): ${e}`
		);
	}
};

/**
 * Downloads, handles, and saves images from an array of URLs.
 *
 * @param {Array} imagesURLsArray - An array of image URLs.
 * @param {string} imageNameRaw - The raw name of the image.
 * @param {string} [cardURL=""] - The URL of the current card.
 * @returns {string} - A string containing the names of the downloaded image files, joined by commas.
 */
export default function handleAndSaveImagesByURLs(
	imagesURLsArray,
	imageNameRaw,
	cardURL = ""
) {
	const dirName = CACHE.CURRENT.MEDIA_DIR_NAME;
	const imageName = formatImageName(imageNameRaw);
	const extName = IMG_FORMAT_OPTS.extname;
	const imagesFileNames = [];

	imagesURLsArray.forEach((imageURL, i) => {
		if (!imageURL || !f.isValidURL(imageURL)) {
			logger.log(`Invalid URL: ${imageURL}`);

			return;
		}

		const fileName = getFullNthFileName(imageName, i, extName);
		imagesFileNames.push(fileName);
		handleImage(imageURL, dirName, fileName, cardURL);
	});

	if (imagesURLsArray.length > imagesFileNames.length) {
		logger.log(
			`Товар загрузил не все изображения (url: ${cardURL}, handledImages: ${imagesFileNames})`
		);

		const fileName = getFullNthFileName(imageName, 0, extName);
		imagesFileNames.push(fileName);
	}

	return imagesFileNames.join();
}
