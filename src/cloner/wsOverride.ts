import {WebSocket} from "ws";
import {Request, Response} from "express";
import {isAdmin} from "@src/server";
import {deepMerge} from "@src/cloner/filters";
import {getLocalStorageItem, setLocalStorageItem} from "@src/cloner/data";
import merge from "lodash.merge";



let websockets: {
	[k: string]: WebSocket
} = {};

export let Overrides: {
	addresses: string[],
	pair: any
}[] = [];
export let CachedPairs: {
	[key: string]: any
} = {}

getLocalStorageItem('overrides').then(r=> {
	if (r?.length) Overrides = r;
	console.log('Overrides loaded', Overrides.length);
});
getLocalStorageItem("pairs").then(r=>{
	if (r) CachedPairs = r;
	console.log("Pairs Loaded", Object.keys(CachedPairs).length);
})

export function overrideWebsocket(ws: WebSocket) {
	const uuid = crypto.randomUUID();
	websockets[uuid] = ws;

	ws.onclose = ()=>{
		delete websockets[uuid];
	}
	ws.onerror = ()=>{
		delete websockets[uuid];
	}

	ws.send(JSON.stringify(Overrides));
}

export async function updateOverrides(func: ((overrides: typeof Overrides) => typeof Overrides) | ((o: typeof Overrides) => Promise<typeof Overrides>)) {
	try {
		Overrides = (await func(Overrides)) || Overrides || [];
	} catch (e) {
		console.error(e);
	}

	Object.values(websockets).map(ws => {
		try {
			ws.send(JSON.stringify(Overrides));
		} catch {}
	});

	setLocalStorageItem("overrides", Overrides).catch(console.error);
}

export function getOverridesForAddress(address: (string | undefined) | string[],index = false) {
	if (!address) return undefined;

	for (let _ad of [...(typeof address === 'string' ? [address] : address)]) {
		if (!index) {
			const o = Overrides.find(o => o.addresses.includes(_ad.toLowerCase()))?.pair
			if (o) return o;
		} else {
			const o = Overrides.findIndex(o => o.addresses.includes(_ad.toLowerCase()))
			if (o !== -1) return o;
		}
	}

	return undefined;
}


export const additionalProperties = {
	id: ".",
	image: "",
	headerImage: "",
	eti: false,
	profile: {
		"header": false,
		"website": false,
		"twitter": false,
		"discord": false,
		"telegram": false,
		"linkCount": 0,
		imgKey: '',
		eti: false
	},
	name: "",
	description: "",
	socials: [
		{
			"type": "twitter",
			"url": "https://x.com/pepnutsolana"
		}
	],
	websites: [
		{
			"label": "Website",
			"url": "https://pepnutsol.com/"
		}
	],
	showProfile: false,
	overrideLogs: "",
	reactions: {
		"poop": {
			"total": 0
		},
		"fire": {
			"total": 0
		},
		"rocket": {
			"total": 0
		},
		"triangular_flag_on_post": {
			"total": 0
		}
	}
}

export async function handleGetOverride(req: Request, res: Response) {
	if (!isAdmin(req)) {
		res.redirect('/');
		res.end();
		return;
	}

	const payload = JSON.parse('rawBody' in req  ? req.rawBody+"":'');
	const key  = payload.pairAddress.toLowerCase();
	const addresses = [
		key,
		payload.baseToken.address.toLowerCase()
	];

	if (addresses.length !== 2) throw("invalid history type!");

	const detail: any = await getPairDetail(payload.chainId, payload.pairAddress).catch(()=>({}));

	const override = getOverridesForAddress(addresses[0]) || {};

	res.setHeader("content-type", "application/json");
	res.write(JSON.stringify({
		addresses,
		pair: deepMerge(merge(additionalProperties,{
			...payload,
			...detail,
		}), override),
		override
	}));
	res.end();

	setCachedPair(key, payload).catch(console.error);
}

export async function setCachedPair(key: string, payload: any) {
	if (!payload) {
		delete CachedPairs[key];
	} else CachedPairs[key] = payload;
	return await setLocalStorageItem('pairs', CachedPairs).catch(console.error);
}

async function getPairDetail(chain: string,address: string) {
	console.log('detail of ',chain,address);
	const json = await fetch(`https://io.dexscreener.com/dex/pair-details/v3/${chain}/${address}`, {
		headers: {
			'origin': "https://dexscreener.com",
			'user-agent': `PhpClient/${crypto.randomUUID()}`
		}
	}).then(o=>o.json());

	const contains = [
		'holders',
		'profile',
		'tokenDetails',
		'score'
	]

	let R: any = {};

	for (let obj of Object.values(json)) {
		let contained = false;
		for (let key of contains) {
			try {
				if (typeof (obj as any)?.[key] !== 'undefined') {
					contained = true;
					break;
				}
			} catch {}
		}
		if (!contained) continue;

		R = {
			...R,
			...(obj as any)
		}
	}

	return R;
}

export async function handleSetOverride(req: Request, res: Response) {
	if (!isAdmin(req)) {
		res.end();
		return;
	}

	const payload = JSON.parse('rawBody' in req  ? req.rawBody+"":'');

	const addresses: string[] = payload.addresses;

	await updateOverrides(overrides => {
		const override = getOverridesForAddress(addresses);
		const index = getOverridesForAddress(addresses,true);
		const newOverride = {
			pair: payload.pair,
			addresses
		};

		if (override) {
			overrides[index] = newOverride
		} else {
			overrides.push(newOverride);
		}

		return overrides;
	});

	res.status(200).end();
}
