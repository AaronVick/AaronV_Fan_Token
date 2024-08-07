const https = require('https');
const url = require('url');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({ 
  cloud_name: process.env.CloudAPI, 
  api_key: process.env.CloudAPI,
  api_secret: process.env.CloudAPICode
});

const DEFAULT_FID = '354795'; // Replace with your actual FID

// ... (keep other functions as they are)

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
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
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

    if (req.method === 'POST') {
        try {
            console.log('Processing POST request');
            const body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => {
                    data += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
                req.on('error', reject);
            });

            console.log('Parsed body:', body);

            const { untrustedData } = body;
            const farcasterName = untrustedData?.inputText || '';

            console.log('Farcaster name:', farcasterName);

            let fid = DEFAULT_FID;
            let displayName = 'Your Account';

            if (farcasterName.trim() !== '') {
                try {
                    const fidData = await httpsGet(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
                    const fidJson = JSON.parse(fidData);
                    fid = fidJson.result.user.fid;
                    displayName = farcasterName;
                } catch (error) {
                    console.error('Error fetching FID:', error.message);
                    displayName = 'Invalid Farcaster name';
                }
            }

            console.log('FID:', fid);

            const auctionData = await getAuctionData(fid);

            console.log('Auction data:', auctionData);

            const generatedImageUrl = await generateImage(auctionData, displayName);

            console.log('Generated image URL:', generatedImageUrl);

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${generatedImageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="View">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    <img src="${generatedImageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
                </body>
                </html>
            `;

            console.log('Sending response HTML');
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error in POST handler:', error);
            const errorHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="${defaultImageUrl}">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="Try Again">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
                </head>
                <body>
                    <h1>Error</h1>
                    <p>Failed to fetch auction data. Please try again.</p>
                </body>
                </html>
            `;
            return res.status(500).send(errorHtml);
        }
    }

    console.log('Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};
