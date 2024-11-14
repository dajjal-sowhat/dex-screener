import dotenv from "dotenv";
dotenv.config();
import * as w from 'ws';
import EnvVars from '@src/common/EnvVars';
import http from "http";
import app from './server';
import logger from "jet-logger";
import {overrideWebsocket} from "@src/cloner/wsOverride";
import path from "path";

const server = http.createServer(app);
const SERVER_START_MSG = ('Express server started on port: ' + EnvVars.Port.toString());

// Create WebSocket server without path restriction
const wsServer = new w.WebSocketServer({
	noServer: true  // Don't attach to server automatically
});

// Handle upgrade requests manually
server.on('upgrade', (request, socket, head) => {
	const pathname = new URL(request.url+"", 'ws://localhost').pathname;

	logger.info(`Upgrade ${pathname}`);
	// Handle all WebSocket connections
	wsServer.handleUpgrade(request, socket, head, (ws) => {
		wsServer.emit('connection', ws, request);
	});
});

// Start the server
server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));

// Handle WebSocket connections
wsServer.on('connection', (connection, req) => {

	console.log('WS Connection', req.url);

	// Create the target URL without /ws prefix
	const url = new URL(`wss://io.dexscreener.com${req.url}`);

	if (url.pathname === '/override') {
		overrideWebsocket(connection);
		return;
	}

	// Create connection to target WebSocket
	const ws = new w.WebSocket(url, {
		headers: {
			"Origin": "https://dexscreener.com",
			"User-Agent": "IntelliJ HTTP Client/PhpStorm 2024.2.0.1",
		},
		origin: "https://dexscreener.com",
		followRedirects: false,
		minVersion: "TLSv1.3"
	});

	// Handle messages from target to client
	ws.onmessage = (e) => {
		if (connection.readyState === w.WebSocket.OPEN) {
			connection.send(e.data);
		}
	};

	// Handle messages from client to target
	connection.on('message', e => {
		if (ws.readyState === w.WebSocket.OPEN) {
			ws.send(e);
		}
	});

	// Handle connection closure
	connection.on('close', () => {
		if (ws.readyState === w.WebSocket.OPEN) {
			ws.close();
		}
	});

	// Handle errors
	connection.on('error', (error) => {
		logger.err(`Client connection error: ${error}` );
		if (ws.readyState === w.WebSocket.OPEN) {
			ws.close();
		}
	});

	ws.on('error', (error) => {
		logger.err(`Target connection error: ${error}`);
		if (connection.readyState === w.WebSocket.OPEN) {
			connection.close();
		}
	});
});

// Error handling for the WebSocket server
wsServer.on('error', (error) => {
	logger.err(`WebSocket server error: ${error}`);
});
