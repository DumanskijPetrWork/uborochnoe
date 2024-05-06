import fs from 'fs';
import { Console } from 'console';
import process from 'process';

export default class Logger extends Console {
	constructor(outputFilePath) {
		super({
			stdout: fs.createWriteStream(outputFilePath),
			stderr: process.stderr
		});
	}

	log(message, ...optionalParams) {
		super.log(message, ...optionalParams);
		console.log(message, ...optionalParams);
	}
}