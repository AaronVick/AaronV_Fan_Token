const { parse } = require('url');

module.exports = (req, res) => {
  try {
    const { query } = parse(req.url, true);
    const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';
    const postUrl = 'https://aaron-v-fan-token.vercel.app/api/auctions';

    console.log('Request received');
    console.log('Query:', query);
    console.log('Image URL:', imageUrl);

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
      <meta property="fc:frame:input:text" content="Enter Farcaster name">
    </head>
    <body>
      <h1>Moxie Auction Frame</h1>
    </body>
    </html>
    `;

    console.log('Generated HTML:', html);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    res.end(html);
  } catch (error) {
    console.error('Error in generating frame:', error);
    res.statusCode = 500;
    res.end('An error occurred.');
  }
};
