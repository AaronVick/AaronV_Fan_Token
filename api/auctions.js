module.exports = async (req, res) => {
  const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';
  const postUrl = 'https://aaron-v-fan-token.vercel.app/api/auctions';

  console.log('Request received');
  console.log('Image URL:', imageUrl);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Moxie Auction Frame</title>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:button:1" content="View Auction Details" />
  <meta property="fc:frame:post_url" content="${postUrl}" />
</head>
<body>
  <h1>Moxie Auction Frame</h1>
</body>
</html>
`;

  console.log('Generated HTML:', html);

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
