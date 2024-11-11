import path from 'path';
import express from 'express';

import 'express-async-errors';
import {handleClone} from "@src/cloner/dexscreener";


const app = express();


app.use(function(req, res, next) {
	//@ts-ignore
	req.rawBody = '';
	req.setEncoding('utf8');

	req.on('data', function(chunk) {
		//@ts-ignore
		req.rawBody += chunk;
	});

	req.on('end', function() {
		next();
	});
});

const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));


app.set('view engine', 'ejs');
app.set('views',  path.join(__dirname, 'views'));

app.get("/", (req,res) => {
	const env = process.env;
	res.render('index', {url: req.url, ENV_URL: env['URL']+"", ENV_ADMIN: env['ADMIN']+""});
})

app.use(handleClone);


export default app;
