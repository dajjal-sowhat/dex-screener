import fs from "fs";
import * as Path from "path";


const storagePath = Path.join(process.cwd(), 'data');
const _cached: Record<string, any> = {};

export async function getLocalStorageItem(key: string) {
	const cache = _cached[key];
	if (cache) return cache;

	try {
		const data = await fs.promises.readFile(Path.join(storagePath, `${key}.data`)).then(r=>r.toString('utf8'));
		const object = JSON.parse(data);
		_cached[key] = object;
		return object;
	} catch {
		return {};
	}
}

export async function setLocalStorageItem(key: string, value: Record<string, any> | any[]) {
	await fs.promises.mkdir(storagePath, {
		recursive: true
	}).catch(()=>undefined);

	try {
		await fs.promises.writeFile(Path.join(storagePath, `${key}.data`), JSON.stringify(value));
		_cached[key] = value;
		return value;
	} catch (e) {
		console.error(`FAIL TO WRITE ${key} storage`,e);
		throw e;
	}
}
