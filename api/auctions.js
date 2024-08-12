module.exports = (req, res) => {
  const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';

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

  // Set response headers and status
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html);
};
