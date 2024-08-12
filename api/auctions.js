const url = require('url');

const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

function generateFrameHTML(imageUrl, buttonText, inputText) {
  const postUrl = new URL('/api/auctions', FALLBACK_URL).toString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:post_url" content="${postUrl}">
    <meta property="fc:frame:button:1" content="${buttonText}">
    ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
</head>
<body>
    <h1>Moxie Auction Frame</h1>
</body>
</html>`;
}

module.exports = async (req, res) => {
  console.log('Request method:', req.method);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  let html;
  if (req.method === 'GET') {
    console.log('Handling GET request');
    html = generateFrameHTML(DEFAULT_IMAGE_URL, "View Auction Details", "Enter Farcaster name");
  } else if (req.method === 'POST') {
    console.log('Handling POST request');
    const farcasterName = req.body?.untrustedData?.inputText || 'Unknown User';
    console.log('Farcaster name:', farcasterName);

    // For now, we'll just echo back the input in a placeholder image
    const placeholderImage = `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=Auction+for+${encodeURIComponent(farcasterName)}`;
    html = generateFrameHTML(placeholderImage, "Check Another Auction", "Enter Farcaster name");
  } else {
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Sending HTML response');
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
};
