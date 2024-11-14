import dotenv from "dotenv";
dotenv.config();
import * as w from 'ws';
import EnvVars from '@src/common/EnvVars';


import server from './server';
import logger from "jet-logger";
import {overrideWebsocket} from "@src/cloner/wsOverride";



const SERVER_START_MSG = ('Express server started on port: ' +
	EnvVars.Port.toString());
server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));

const wsServer = new w.WebSocketServer({
	port: 443
});

wsServer.on('connection', (connection,req) => {
	console.log('WS Connection', req.url);
	const url = new URL(`wss://io.dexscreener.com${req.url}`);

	if (url.pathname === '/override') {
		overrideWebsocket(connection);
		return;
	}

	const ws = new w.WebSocket(url, {
		headers: {
			"Origin": "https://dexscreener.com",
			"User-Agent": "IntelliJ HTTP Client/PhpStorm 2024.2.0.1",
		},
		origin: "https://dexscreener.com",
		followRedirects: false,
		minVersion: "TLSv1.3"
	});

	ws.onmessage = (e)=>{
		connection.send(e.data);
	}
	connection.on('message', e => {
		ws.send(e);
	});


});
