const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795'; // Replace with your actual default FID

function httpsGet(urlString, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = url.parse(urlString);
        options.headers = headers;
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function generateImageUrl(message) {
    return `https://via.placeholder.com/800x400/1e3a8a/ffffff?text=${encodeURIComponent(message)}`;
}

module.exports = async (req, res) => {
    console.log('Received request:', req.method, req.url);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    const defaultImageUrl = 'https://www.aaronvick.com/Moxie/11.JPG';

    if (req.method === 'GET') {
        console.log('Serving initial frame');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${defaultImageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
</head>
<body>
    <h1>Welcome to Moxie Auction Frame</h1>
    <p>Enter a Farcaster name or click the button to view auction details.</p>
    <img src="${defaultImageUrl}" alt="Moxie Auction Frame" style="max-width: 100%; height: auto;">
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};
