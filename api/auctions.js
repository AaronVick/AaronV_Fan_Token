const { parse } = require('url');

module.exports = (req, res) => {
  const imageUrl = 'https://via.placeholder.com/1000x600.png'; // Placeholder image from a public CDN

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${imageUrl}">
    </head>
    <body>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html);
};
