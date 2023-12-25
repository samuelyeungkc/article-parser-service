const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const cheerio = require('cheerio');

const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const scraperjs = require('scraperjs');

const santizeElementTextContent = (element) => {
  return element.textContent
    .split('\n')
    .filter((e) => e.trim() !== '')
    .join(' ');
};

const removeElement = (body, querySelector) => {
  Array.from(body.querySelectorAll(querySelector)).forEach((element) =>
    element.parentElement.removeChild(element)
  );
};

const parseHtml = (url, originalHTML) => {
  const jsDom = new JSDOM(originalHTML);
  const html = jsDom.window.document;
  removeElement(jsDom.window.document.body, 'table');
  removeElement(jsDom.window.document.body, 'figcaption');

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
  return new Promise((resolve) => {
    scraperjs.StaticScraper.create(url).scrape(function ($) {
      const originalHTML = $.html();
      cacheArticle(url, originalHTML);
      resolve(getUrlHash(url));
    });
  });
} // end function

const app = express();
app.use(cors());
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
const port = 8989;

app.get('/', (req, res) => {
  res.sendFile('submit.html', { root: __dirname });
});

app.post('/articles/body', async (req, res) => {
  try {
    const { url, body } = req.body;
    const hash = cacheArticle(url, body);
    res.json({ url: `/articles/${hash}` });
  } catch (err) {
    console.error('Unable to parse body', err);
    res.json({ status: 'error' });
  }
});

app.post('/articles/new', async (req, res) => {
  try {
    const hash = await mozillaParse(req.body.url);
    res.redirect(`/articles/${hash}`);
  } catch (err) {
    console.error('Unable to parse new due to', err);
    res.json({ status: 'error' });
  }
});

app.get('/articles/submit', (req, res) => {
  res.sendFile('submit.html', { root: __dirname });
});

app.get('/articles/:id', (req, res) => {
  const path = `${__dirname}/articles/${req.params.id}.article`;
  // const fileContent = fs.readFileSync();
  console.log('path', path);
  fs.readFile(path, 'utf8', (_, fileContent) => {
    res.send(fileContent);
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
