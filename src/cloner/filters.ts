import {ourUrl} from "@src/cloner/dexscreener";
import {getOverridesForAddress} from "@src/cloner/wsOverride";


const FHKey = "fetchHistory:";

export async function overrideJs(url: URL, code: string): Promise<string> {
	code = code.replaceAll("wss://io.dexscreener.com", `ws${ourUrl.protocol.replace("http","")}//${ourUrl.hostname}:9933`)

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
	}

	return code;
}

export async function overrideJson(url: URL, json: Record<string | symbol, any>): Promise<string> {
	if (url.pathname.includes("/dex/pair-details")) {
		const address = url.pathname.split("/").at(-1);
		json = Object.fromEntries(
			Object.entries(json).map(([k,v]) => {
				return [
					k,
					v && typeof v === 'object' && 'profile' in v ? deepMerge(v,getOverridesForAddress(address)):v
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


function deepMerge<T extends Record<string, any>, T2 extends Record<string, any>>(object1: T, object2: T2): T & T2 {
	const result: any = { ...object1 }; // Casting to 'any' to allow dynamic property assignment

	if (Array.isArray(object1) && Array.isArray(object2)) {
		return [...object1, ...object2] as unknown as T & T2;
	}

	Object.keys(object2).forEach((key) => {
		if (Array.isArray(object2[key]) && Array.isArray(result[key])) {
			const ov = object2[key];
			let c = [...result[key]];
			for (let i = 0; i < ov.length; i++) {
				c[i] = ov[i];
			}
			result[key] = c;
		} else if (typeof object2[key] === 'object' && object2[key] !== null && typeof result[key] === 'object') {
			result[key] = deepMerge(result[key], object2[key]);
		} else {
			result[key] = object2[key];
		}
	});

	return result as T & T2;
}
