function parseArticle(parseUrl, callback) {
	const { extract } = require('article-parser');
	extract(parseUrl).then((article) => {
		//  console.log(article);
		  const content = article.content;

		  const crypto = require('crypto');
		  const hash = crypto.createHash('md5').update(parseUrl).digest('hex');
		  const writeFile = `${__dirname}/${hash}.article`;
		  console.log(writeFile);
		  const fs = require('fs');
		  fs.writeFileSync(writeFile, JSON.stringify(article));

		  if (callback && article.content) {
			  callback(article.content);
		  }
		}).catch((err) => {
		  console.log(err);
		});

}


const express = require('express');
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
