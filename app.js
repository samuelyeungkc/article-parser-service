const fs = require('fs');
const crypto = require('crypto');

const {
  extract
} = require('article-parser');

const url = 'https://www.zdnet.com/article/dumping-google-chrome-heres-the-best-browser-to-replace-it/?sdfdsf=dsda';

extract(url).then((article) => {
//  console.log(article);
  const content = article.content;

  const hash = crypto.createHash('md5').update(url).digest('hex');
  const writeFile = `${__dirname}/${hash}`;
  console.log(writeFile);
  fs.writeFileSync(writeFile, JSON.stringify(article));
}).catch((err) => {
  console.log(err);
});

