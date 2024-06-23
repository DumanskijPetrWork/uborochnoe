import axios, { AxiosError } from "axios";

class AxiosHandler {
	constructor(timeout = 0) {
		this.timeout = timeout;
	}

	async request(options, timeout = this.timeout) {
		try {
			const response = await axios.request({
				...options,
				timeout,
				validateStatus(status) {
					return status >= 200 && status < 300;
				},
			});

			return response;
		} catch (e) {
			if (e.name != "AxiosError") throw e;

			logger.log(`${e} (url: ${options.url})`);
		}
	}

	async requestTypedContent(
		options,
		allowedTypesArray,
		timeout = this.timeout
	) {
		try {
			const response = await this.request(options, timeout);

			if (!response) return;

			const {
				headers: {
					"content-type": contentType,
					"content-length": contentLength,
				},
			} = response;
			const matchAllowedType = allowedTypesArray.some((type) =>
				contentType.startsWith(type)
			);

			if (!matchAllowedType) {
				throw new AxiosError(
					`Wrong data type (type: ${contentType}, expected: ${allowedTypesArray})`
				);
			}

			if (!+contentLength) {
				throw new AxiosError(`Empty file data (type: ${contentType})`);
			}

			return response;
		} catch (e) {
			if (e.name != "AxiosError") throw e;

			logger.log(`${e} (url: ${options.url})`);
		}
	}
}

export default new AxiosHandler();
