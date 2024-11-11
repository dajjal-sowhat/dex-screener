import {WebSocket} from "ws";

let websockets: {
	[k: string]: WebSocket
} = {};

const defaultConfig: Record<string, any> = {
	pair: {
		priceUsd: "0.93",
		baseToken: {
			name: "moz",
			symbol: "MOZI"
		},
		image: "https://ei.phncdn.com/www-static/images/pornhub_logo_straight.svg?cache=2024110601",
		socials: [
			{
				"type": "twitter",
				"url": "https://pornhub.com"
			},
			{
				"type": "telegram",
				"url": "https://t.me/ballotboxsolana"
			}
		]
	}
}

export const OverrideConfig = new Proxy(defaultConfig, {
	set: (e,e2,e3) => {
		e[e2 as string] = e3;
		Object.values(websockets).map(ws => {
			ws.send(JSON.stringify(e));
		});
		return true;
	}
});

export function overrideWebsocket(ws: WebSocket) {
	const uuid = crypto.randomUUID();
	websockets[uuid] = ws;

	ws.onclose = ()=>{
		delete websockets[uuid];
	}

	ws.send(JSON.stringify(OverrideConfig));
}
