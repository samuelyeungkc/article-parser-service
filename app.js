const crypto = require('crypto');
const fs = require('fs');
const express = require('express');

const cheerio = require('cheerio');

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const scraperjs = require('scraperjs');

function mozillaParse(url, callback) {
	scraperjs.StaticScraper.create('https://spectrum.ieee.org/snitch-riscv-processor-6x-faster')
		.scrape(function($) {

			const hash = crypto.createHash('md5').update(url).digest('hex');

			const originalHTML = $.html();

			const jsDom = new JSDOM(originalHTML);
			const html = jsDom.window.document;

			let reader = new Readability(html);
			let article = reader.parse();
			const content = article.content;

			const cheerioInst = cheerio.load(content);
			cheerioInst('head').append(`<meta charset="utf-8">`);
			cheerioInst('head').append(`<title>${article.title || ''}</title>`);
			const sanitizedHtml = cheerioInst.html();

			const writeFile = `${__dirname}/articles/${hash}.article`;
			fs.writeFileSync(writeFile, sanitizedHtml);

			if (callback) {
				callback(hash);
			}
		});
} // end function

const app = express();
app.use(express.urlencoded());
const port = 8989;

app.get('/', (req, res) => {
	res.sendFile('submit.html', { root: __dirname });
})

app.post('/articles/new', (req, res) => {
	mozillaParse(req.body.url, (hash) => {
		res.redirect(`/articles/${hash}`);
	});
});

app.get('/articles/submit', (req, res) => {
	res.sendFile('submit.html', { root: __dirname });
});

app.get('/articles/:id', (req, res) => {
	const path = `${__dirname}/articles/${req.params.id}.article`;
	// const fileContent = fs.readFileSync();
	console.log('path', path);
	fs.readFile(
		path,
		'utf8',
		(_, fileContent) => {
			res.send(fileContent);
		}
	);
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
