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

		  fs.writeFileSync(writeFile, JSON.stringify(article));
		  callback($.html());

		}).catch((err) => {
		  console.log(err);
		});
} // end function


const app = express();
const port = 8989;

app.get('/', (req, res) => {
	console.log(req.query);
	parseArticle(
		'https://zacharydcarter.substack.com/p/what-the-virginia-election-means', 
		(content) => {
			res.send(content);
		}
	);
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
