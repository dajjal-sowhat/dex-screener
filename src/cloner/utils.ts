import * as https from "node:https";

export async function fetchWithTLS(url: string | URL,options:  https.RequestOptions & {body: any}): Promise<any> {
	return new Promise((resolve, reject) => {
		const { hostname, pathname } = new URL(url);

		const requestOptions = {
			hostname,
			port: 443,
			path: pathname,
			method: options.method || 'GET',  // Default to GET if not specified
			headers: options.headers || {},   // Set headers if provided

		};

		const req = https.request(requestOptions, (res) => {
			let data = '';

			// Collect response data chunks
			res.on('data', (chunk) => {
				data += chunk;
			});

			// Resolve with response-like object when done
			res.on('end', () => {
				resolve({
					status: res.statusCode,
					statusText: res.statusMessage,
					headers: res.headers,
					text: () => Promise.resolve(data),
					json: () => Promise.resolve(JSON.parse(data)),
					arrayBuffer: ()=>Promise.resolve(Buffer.from(data))
				});
			});
		});

		// Handle request errors
		req.on('error', (e) => {
			reject(e);
		});

		// Write body if present
		if (options.body) {
			req.write(options.body);
		}

		// Send the request
		req.end();
	});
}
