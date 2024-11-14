import {ourUrl} from "@src/cloner/dexscreener";
import {getOverridesForAddress} from "@src/cloner/wsOverride";


const FHKey = "fetchHistory:";

export async function overrideJs(url: URL, code: string): Promise<string> {
	code = code.replaceAll("wss://io.dexscreener.com", `ws${ourUrl.protocol.replace("http","")}//${ourUrl.hostname}:8080`)

	if (code.includes(FHKey)) {
		code = overrideData(FHKey,code);
	}
	if (code.includes("patch:") && code.includes("arrayBuffer:") && code.includes("avro:")) {
		code = overrideData("avro:", code,code.lastIndexOf("arrayBuffer:"));
		const n1 = code.lastIndexOf("=>JSON.stringify(");
		const key = "decode:";
		const n2 = code.indexOf(key,n1);
		code = overrideData(key, code, n2+key.length,true)

		const k1 = ".searchParams.set(\"key\",";
		const f1 = code.indexOf(k1);
		const s1 = code.substring(f1-1,f1);
		code = writeAt(code,f1-4,`window.filter_image(${s1}),`);

		const f2 = code.indexOf(k1, f1+k1.length);
		const s2 = code.substring(f2-1,f2);
		code = writeAt(code,f2-4,`window.filter_image(${s2}, 'banner'),`);

		code = overrideData("callback:", code, code.indexOf("{intervalInMs:"))
	}


	code = code.replaceAll("localhost", ourUrl.hostname);

	return code;
}

export async function overrideJson(url: URL, json: Record<string | symbol, any>): Promise<string> {
	if (url.pathname.includes("/dex/pair-details")) {
		const address = url.pathname.split("/").at(-1);
		json = Object.fromEntries(
			Object.entries(json).map(([k,v]) => {
				return [
					k,
					v && typeof v === 'object' ? deepMerge(v,getOverridesForAddress(address)):v
				]
			})
		)
	}

	return JSON.stringify(json);
}

function overrideData(key: string,code: string,position: number = 0,inline = false,replace: string = `window.filter_${key.replace(":","")}(%function%)`): string {
	try {
		const start = code.indexOf(key,position) + key.length;
		const split = code.indexOf(`}${!inline ? ",":""}`,start);

		const func = code.substring(start,split+(!inline ? 1:0));

		code = code.replace(func,replace.replaceAll("%function%",func))
	} catch {}

	return code;
}

function writeAt(input: string, index: number, insert: string) {
	return input.slice(0, index) + insert + input.slice(index);
}

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<any>
		? T[P]
		: T[P] extends object
			? DeepPartial<T[P]>
			: T[P];
};


export function deepMerge<T extends object>(
	source: T,
	replacement: DeepPartial<T>
): T  {
	if (!source || !replacement) {
		return source;
	}

	// Handle non-object types
	if (typeof source !== 'object') {
		return source;
	}

	// Create a deep clone of source to avoid mutations
	const result = Array.isArray(source)
		? [...source] as T
		: { ...source };

	// Iterate through source properties
	for (const key in result) {
		// Skip inherited properties
		if (!Object.prototype.hasOwnProperty.call(result, key)) continue;

		// Check if replacement has this property
		if (!(key in replacement)) continue;

		// Safe type assertion since we know the key exists
		const currentValue = result[key];
		const replacementValue = (replacement as T)[key];

		// Handle arrays - replace entirely
		if (Array.isArray(currentValue)) {
			if (Array.isArray(replacementValue)) {
				(result as any)[key] = [...replacementValue];
			}
			continue;
		}

		// Handle nested objects
		if (
			currentValue &&
			typeof currentValue === 'object' &&
			replacementValue &&
			typeof replacementValue === 'object' &&
			!Array.isArray(currentValue)
		) {
			(result as any)[key] = deepMerge(
				currentValue,
				replacementValue as object
			);
			continue;
		}

		// Replace primitive values
		(result as any)[key] = replacementValue;
	}

	return result;
}
