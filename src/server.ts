import path from 'path';
import express from 'express';

import 'express-async-errors';
import {handleClone, handleFromFetch} from "@src/cloner/dexscreener";
import * as process from "node:process";
import {
	CachedPairs,
	getOverridesForAddress,
	handleGetOverride,
	handleSetOverride,
	Overrides
} from "@src/cloner/wsOverride";
import {deepMerge} from "@src/cloner/filters";



const app = express();


app.use(function (req, res, next) {
	//@ts-ignore
	req.rawBody = '';
	req.setEncoding('utf8');

	req.on('data', function (chunk) {
		//@ts-ignore
		req.rawBody += chunk;
	});

	req.on('end', function () {
		next();
	});
});

const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let tries: {
	[s: string]: number
} = {}
app.post("/bypass", (req, res) => {
	const params = new URLSearchParams(req.url.substring(req.url.indexOf("?")))
	const p = params.get("p");
	const n = tries[req.ip + ""] || 0

	if (p === process.env['PASSWORD'] && n < 5) {
		res.cookie(p.split("").reverse().join(""), p);
		delete tries[req.ip + ""];
	} else {
		tries[req.ip + ""] = n + 1;
	}

	res.status(200).write("OK");
	res.end();
})

export function isAdmin(req: express.Request) {
	const password = process.env['PASSWORD'];
	const cookies = Object.fromEntries(req.headers.cookie?.split(";").map(s => s.split("=").map(s => s.trim())) || []);
	return password === cookies[password?.split("").reverse().join("") + ""];
}
function render(req: express.Request, res: express.Response, route: any = {}) {
	const env = process.env;

	const adminCheck = isAdmin(req);

	res.render('index', {
		url: req.url,
		ENV_URL: env['URL'] + "",
		isAdmin: adminCheck,
		ENV_ADMIN: adminCheck ? env['ADMIN'] : "/wp-admin",
		route: typeof route === 'object' ? route || {e: true}:{e: true},
		overrides: Overrides
	});
}
app.get("/", render);
app.get("/:platformId/:pairAddress", async (req,res)=>{
	const pair = CachedPairs[req.params.pairAddress];
	if (!pair) {
		res.redirect("/");
		res.end();
		return;
	}

	async function handleDetailFetch(n = 0) {
		if (n > 5) throw("FAIL");
		try {
			return await fetch(`https://io.dexscreener.com/dex/pair-details/v3/${req.params.platformId}/${req.params.pairAddress}`, {
				headers: {
					'origin': "https://dexscreener.com",
					'user-agent': `PhpClient/${crypto.randomUUID()}`
				}
			}).then(o=>o.json())
		} catch (e) {
			console.error(e);
			return await handleDetailFetch(n+1);
		}
	}

	const pairDetails = await handleDetailFetch().catch((e)=>{
		res.write("FAIL");
		res.end();
		throw(e);
	});


	const route = {
		...req.params,
		id: "pairDetail",
		data: {
			pair: {
				"schemaVersion": "1.3.0",
				pair: deepMerge(pair, getOverridesForAddress(req.params.pairAddress))
			},
			pairDetails
		}
	};

	render(req,res,  route);
})

app.post("/get-override", handleGetOverride);
app.post("/set-override", handleSetOverride);
app.use(handleClone);


export default app;
