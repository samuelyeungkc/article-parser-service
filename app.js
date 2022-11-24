const crypto = require('crypto');
const fs = require('fs');
const express = require('express');

const cheerio = require('cheerio');

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const scraperjs = require('scraperjs');


const santizeElementTextContent = (element) => {
    return element.textContent.split('\n')
        .filter(e => e.trim() !== '')
        .join(' ');
};

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
	const body = jsDom.window.document.body.querySelector('#readability-page-1');
	body.innerHTML = santizeElementTextContent(body);

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

const parseHtml = (url, originalHTML) => {
    const jsDom = new JSDOM(originalHTML);
    const html = jsDom.window.document;
    removeTables(jsDom.window.document.body);

    let reader = new Readability(html);
    let article = reader.parse();
    const content = article.content;

    jsDom.window.document.body.innerHTML = content;
    const body = jsDom.window.document.body.querySelector('#readability-page-1');
    const content2 = `<div>${santizeElementTextContent(body)}</div>`;
    const articleTitle = article.title;
    return `
                <html lang="en">
                    <head><meta charset="utf-8"><title>${articleTitle}</title></head>
                    <body><h1>${articleTitle}</h1>${body.textContent}<p><a href="${url}">source</a></p>
                    </body>
                </html>
            `;
};

const getUrlHash = (url) => {
    return crypto.createHash('md5').update(url).digest('hex');
};

const cacheArticle = (url, originalHTML) => {
    const hash = getUrlHash(url);
    const sanitizedHtml = parseHtml(url, originalHTML);
    const writeFile = `${__dirname}/articles/${hash}.article`;
    fs.writeFileSync(writeFile, sanitizedHtml);
    return hash;
};

function mozillaParse(url) {
    return new Promise((resolve => {
        scraperjs.StaticScraper.create(url)
            .scrape(function($) {
                const originalHTML = $.html();
                cacheArticle(url, originalHTML);
                resolve(getUrlHash(url));
            })
    }));
} // end function

const app = express();
app.use(express.urlencoded({limit: '50mb'}));
app.use(express.json({limit: '50mb'}));
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

app.post('/articles/new', async (req, res) => {
    try {
        const hash = await mozillaParse(req.body.url);
        res.redirect(`/articles/${hash}`);
    } catch (err) {
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
