const crypto = require('crypto');
const fs = require('fs');
const { extract } = require('article-parser');
const express = require('express');

const cheerio = require('cheerio');

function parseArticle(parseUrl, callback) {
	extract(parseUrl).then((article) => {
		//  console.log(article);
		  const content = article.content;

		  if (!callback) {
			  return;
		  }

		  if (!content) {
			  callback('No content found');
		  }

		  const $ = cheerio.load(content);
		  $('head').append(`<title>${article.title || ''}</title>`);

		  const hash = crypto.createHash('md5').update(parseUrl).digest('hex');
		  const writeFile = `${__dirname}/${hash}.article`;
		  console.log(writeFile);

		  fs.writeFile(writeFile, $.html(), () => {});
		  callback($.html(), hash);

		}).catch((err) => {
		  console.log(err);
		});
} // end function


const app = express();
app.use(express.urlencoded());
const port = 8989;

app.get('/', (req, res) => {
	res.sendFile('submit.html', { root: __dirname });
})

app.post('/articles/new', (req, res) => {
	console.log('req', req.body.url);

	parseArticle(
		req.body.url,
		(content, hash) => {
			res.redirect(`/articles/${hash}`);
		}
	);

});

app.get('/articles/submit', (req, res) => {
	res.sendFile('submit.html', { root: __dirname });
});

app.get('/articles/:id', (req, res) => {
	const path = `${__dirname}/${req.params.id}.article`;
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
