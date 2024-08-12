const { parse } = require('url');

module.exports = (req, res) => {
  const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';
  const postUrl = 'https://aaron-v-fan-token.vercel.app/api/auctions';

  // Log details about the request and the URLs used
  console.log('Request received');
  console.log('Image URL:', imageUrl);
  console.log('Post URL:', postUrl);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta property="fc:frame" content="vNext">
      <meta property="fc:frame:image" content="${imageUrl}">
      <meta property="fc:frame:post_url" content="${postUrl}">
      <meta property="fc:frame:button:1" content="View Auction Details">
    </head>
    <body>
      <h1>Moxie Auction Frame</h1>
      <p>Image URL: ${imageUrl}</p>
    </body>
    </html>
  `;

  // Log the generated HTML
  console.log('Generated HTML:', html);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html);
};
