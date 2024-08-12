const { parse } = require('url');

module.exports = (req, res) => {
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
  <meta property="fc:frame:button:1" content="View Auction Details">
  <meta property="fc:frame:post_url" content="${postUrl}">
</head>
<body>
</body>
</html>
`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
