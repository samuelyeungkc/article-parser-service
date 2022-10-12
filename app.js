const crypto = require('crypto');
const fs = require('fs');
const express = require('express');

const cheerio = require('cheerio');

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const scraperjs = require('scraperjs');


const removeTables = (body) => {
    Array.from(body.querySelectorAll('table'))
        .forEach(table => table.parentElement.removeChild(table));
};

async function puppeteerParse(url, callback) {

	const puppeteer = require('puppeteer');
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto(url, { waitUntil: "networkidle2" });

	const originalHTML = await page.evaluate(_ => {
		return Promise.resolve(document.body.innerHTML);
	});
	const pageTitle = await page.title();
	const hash = crypto.createHash('md5').update(url).digest('hex');

	const jsDom = new JSDOM(originalHTML);
	const html = jsDom.window.document;
	removeTables(jsDom.window.document.body);

	let reader = new Readability(html);
	let article = reader.parse();
	const content = article.content;

    const articleTitle = article.title || pageTitle || '';

	const cheerioInst = cheerio.load(content);
	cheerioInst('head').append(`<meta charset="utf-8">`);
	cheerioInst('head').append(`<title>${articleTitle}</title>`);
	cheerioInst('body').prepend(`<h1>${articleTitle}</h1>`);
	cheerioInst('body').append(`<p><a href="${url}">source</a></p>`);
	const sanitizedHtml = cheerioInst.html();

	const writeFile = `${__dirname}/articles/${hash}.article`;
	fs.writeFileSync(writeFile, sanitizedHtml);

	if (callback) {
		callback(hash);
	}
	await browser.close();

} // end function

function mozillaParse(url, callback) {
	scraperjs.StaticScraper.create(url)
		.scrape(function($) {

			const hash = crypto.createHash('md5').update(url).digest('hex');

			const originalHTML = $.html();

			const jsDom = new JSDOM(originalHTML);
			const html = jsDom.window.document;
			removeTables(jsDom.window.document.body);

			let reader = new Readability(html);
			let article = reader.parse();
			const content = article.content;

			const articleTitle = article.title || $('title').text() || '';

			const cheerioInst = cheerio.load(content);
			cheerioInst('head').append(`<meta charset="utf-8">`);
			cheerioInst('head').append(`<title>${articleTitle}</title>`);
			cheerioInst('body').prepend(`<h1>${articleTitle}</h1>`);
            cheerioInst('body').append(`<p><a href="${url}">source</a></p>`);
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

app.post('/articles/ajax', async (req, res) => {
    try {
        await puppeteerParse(req.body.url, async (hash) => {
            res.redirect(`/articles/${hash}`);
        });
    } catch (err) {
        console.error(err);
        res.send('error');
    }
});

app.post('/articles/new', (req, res) => {
    try {
        mozillaParse(req.body.url, (hash) => {
            res.redirect(`/articles/${hash}`);
        });
    } catch(err) {
        console.error(err);
    }
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
