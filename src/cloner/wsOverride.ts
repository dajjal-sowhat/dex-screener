import {WebSocket} from "ws";
import {Request, Response} from "express";
import {isAdmin} from "@src/server";

let websockets: {
	[k: string]: WebSocket
} = {};

let Overrides: {
	addresses: string[],
	pair: any
}[] = [];

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

export async function handleGetOverride(req: Request, res: Response) {
	if (!isAdmin(req)) {
		res.redirect('/');
		res.end();
		return;
	}

	const payload = JSON.parse('rawBody' in req  ? req.rawBody+"":'');

	const addresses = [
		payload.pairAddress.toLowerCase(),
		payload.baseToken.address.toLowerCase()
	];

	if (addresses.length !== 2) throw("invalid history type!");

	const detail: any = await getPairDetail(payload.chainId, payload.pairAddress).catch(()=>({}));

	const override = getOverridesForAddress(addresses[0]);

	res.setHeader("content-type", "application/json");
	res.write(JSON.stringify({
		addresses,
		pair: {
			...payload,
			...detail,
			...override
		}
	}));
	res.end();
}

async function getPairDetail(chain: string,address: string) {
	const json = await fetch(`https://io.dexscreener.com/dex/pair-details/v3/${chain}/${address}`, {
		headers: {
			'origin': "https://dexscreener.com",
			'user-agent': `PhpClient/${crypto.randomUUID()}`
		}
	}).then(o=>o.json());

	const required = [
		'websites',
		'chain',
		'lockedAddresses',
		'profile'
	]

	o: for (let obj of Object.values(json)) {
		for (let key of required) {
			try {
				if (!(obj as any)?.[key]) throw("");
			} catch {
				continue o;
			}
		}

		return obj;
	}

	return {};
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
