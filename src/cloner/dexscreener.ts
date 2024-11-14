import {Request, Response} from "express";
import fs from "fs-extra";
import * as Path from "node:path";
import * as process from "node:process";
import {overrideJs, overrideJson} from "@src/cloner/filters";

export const DEXSCREENER = "https://dexscreener.com";
export const ourUrl = new URL(process.env['URL'] || "http://localhost:3000");
export async function handleFromFetch(req: Request, res: Response, domain = DEXSCREENER, _try = 0) {
	let url = new URL(`${domain}${req.url}`);
	let fromCache = true;

	if (url.pathname.startsWith("/dajjal")) {
		const [_,__,sub,...others] = url.pathname.split("/");

		url = new URL(url);
		url.hostname = `${sub}.${url.hostname}`;
		url.pathname = `/${others.join("/")}`;
		fromCache = false;
	}

	console.log(`${req.method} (${_try}): ${url}`);

	// Copy and filter headers to mimic a browser
	let headers: Partial<any> = Object.fromEntries(
		Object.entries(req.headers).map(([k, v]) => {
			if (['content-length'].includes(k)) return undefined;

			const v1 = (v + "").replaceAll(ourUrl.host, url.host).replaceAll(ourUrl.protocol, url.protocol);
			return [k, v1];
		}).filter(o => !!o)
	);
	headers['host'] = url.host;
	headers['origin'] = DEXSCREENER;
	headers['referer'] = url.toString();
	headers['user-agent'] = `PhpStorm/Client ${crypto.randomUUID()}`

	try {
		const source = await (fromCache ? cachedFetch:fetch)(url.toString(), {
			method: req.method,
			headers,
			//@ts-ignore
			body: req.method !== "GET" ? req.rawBody : undefined
		});
		const sourceHeaders = Object.fromEntries(source.headers.entries());

		// Stream response back to the client
		const buffer = await source.arrayBuffer();
		let actualSource = Buffer.from(buffer);

		const type = sourceHeaders['content-type'] || "";

		if (type.includes("javascript") || type.includes("html")) {
			const str = actualSource.toString('utf8');
			const final = await overrideJs(url,str);

			actualSource = Buffer.from(final);
		} else if (type.includes('application/json')) {
			try {
				const str = actualSource.toString('utf8');
				actualSource = Buffer.from(
					await overrideJson(url, JSON.parse(str))
				);
			} catch {}
		}

		sourceHeaders['content-length'] = actualSource.length+"";
		// Set response headers from the source, modify host and protocol where necessary
		Object.entries(sourceHeaders).forEach(([key,value]: any) => {
			if (!key.includes("encod") && key !== 'set-cookie') {
				res.setHeader(key, value.replaceAll(url.hostname, ourUrl.hostname).replaceAll(url.protocol, ourUrl.protocol));
			}
		});

		if (source.status === 403) {
			const content = Buffer.from(actualSource).toString('utf-8');
			if (content.includes("Just a moment")) {
				res.redirect("/");
				return;
			}
		}

		res.status(source.status).write(actualSource);
		res.end();
	} catch (e) {
		if (e.message === "fetch failed" && _try < 5) return handleFromFetch(req, res,DEXSCREENER, _try + 1);
		res.status(500).send(`Error: ${e.message}`);
	}
}

export async function cachedFetch(url: URL | string, init: RequestInit = {}): ReturnType<typeof fetch> {
	const path = getFileCachePath({
		url: url.toString()
	});
	const parse = Path.parse(path);

	if (fs.existsSync(path) && init.method === "GET") {
		const _headers = await fs.promises.readFile(path+".headers");

		const headers = JSON.parse(_headers.toString('utf8'));
		const override = headers._override

		delete headers._override;

		const h =  new Headers(headers);
		return {
			...override,
			arrayBuffer: ()=>fs.promises.readFile(path),
			headers: h,
			url: url.toString(),
			ok: true,
			redirected: false,
			type: "default",
			clone: ()=>(undefined as any),
			body: init.body as any
		}
	} else {
		const _org = await fetch(url,init);
		const source = _org.clone();

		if (source.ok) {
			const buffer = await source.arrayBuffer();
			try {
				await fs.promises.mkdir(parse.dir, {
					recursive: true
				});
			} catch {
			}

			await fs.promises.writeFile(path, Buffer.from(buffer));
			await fs.promises.writeFile(path + ".headers", JSON.stringify({
				...Object.fromEntries(source.headers.entries()),
				_override: {
					status: source.status,
					statusText: source.statusText,
					bodyUsed: source.bodyUsed
				}
			}));
		}

		return _org;
	}
}

export async function handleFromCache(req: Request, res: Response, write: undefined | {
	arrayBuffer: ArrayBuffer,
	headers: Headers
} = undefined) {
	const finalPath = getFileCachePath(req);
	if (!fs.existsSync(finalPath)) throw (`${finalPath} doesn't exists!`);

	console.log("CACHE HIT", finalPath)
	res.status(200).sendFile(finalPath, {
		headers: {
			"content-type": "text/html"
		}
	});
}

export function getFileCachePath(req: Request | {
	url: string
}) {
	const url = new URL((req.url.includes("http") ? "" : "https://localhost") + req.url);
	const paths = url.pathname.split("/");

	const dirs = paths.slice(0, -1);
	const dirPath = Path.join(process.cwd(), "cache", ...dirs);

	const filename = paths.at(-1) || "_";
	return Path.join(dirPath, filename);
}

export async function handleClone(req: Request, res: Response) {
	try {
		await handleFromFetch(req, res);
	} catch (e) {
		console.error(e);
	} finally {
	}
}
