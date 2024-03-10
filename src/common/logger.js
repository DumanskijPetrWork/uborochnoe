import fs from 'fs';
import { Console } from 'console';
import process from 'process';

export class Logger extends Console {
	constructor(outputFilePath) {
		super({
			stdout: fs.createWriteStream(outputFilePath),
			stderr: process.stderr
		});
	}
}