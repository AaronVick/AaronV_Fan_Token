module.exports = (req, res) => {
  console.log('Request received:', req.url);

  const imageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';
  console.log('Image URL:', imageUrl);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
</head>
<body>
    <h1>Welcome to Moxie Auction Frame</h1>
    <p>Enter a Farcaster name or click the button to view auction details.</p>
    <img src="${imageUrl}" alt="Moxie Auction Frame" style="max-width: 100%; height: auto;">
</body>
</html>
  `;

  console.log('HTML content:', html);

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
