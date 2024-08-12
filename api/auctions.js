const https = require('https');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

function httpsPost(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsedData = JSON.parse(body);
                        resolve(parsedData);
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP Error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function getMoxieData(farcasterName) {
    // This is a placeholder function. Implement the actual Airstack query here.
    // For now, it just returns some mock data.
    return {
        auctionId: '123456',
        auctionSupply: '1000',
        status: 'Active',
        totalBidValue: '500 ETH'
    };
}

function generateHtml(imageUrl, buttonText, inputText, postUrl) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${imageUrl}">
            <meta property="fc:frame:button:1" content="${buttonText}">
            ${inputText ? `<meta property="fc:frame:input:text" content="${inputText}">` : ''}
            ${postUrl ? `<meta property="fc:frame:post_url" content="${postUrl}">` : ''}
        </head>
        <body>
            <h1>Moxie Auction Frame</h1>
        </body>
        </html>
    `;
}

module.exports = async (req, res) => {
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);

    let imageUrl = DEFAULT_IMAGE_URL;
    let buttonText = "View Auction Details";
    let inputText = "Enter Farcaster name";
    let postUrl = `https://${req.headers.host}/api/auctions`;

    if (req.method === 'POST' && req.body?.untrustedData?.inputText) {
        const farcasterName = req.body.untrustedData.inputText;
        try {
            const moxieData = await getMoxieData(farcasterName);
            imageUrl = `https://www.example.com/generate-image?data=${encodeURIComponent(JSON.stringify(moxieData))}`;
            buttonText = "Check Another Auction";
            inputText = "Enter Farcaster name";
        } catch (error) {
            console.error('Error fetching Moxie data:', error);
            imageUrl = `https://www.example.com/error-image?message=${encodeURIComponent(error.message)}`;
            buttonText = "Try Again";
        }
    }

    const html = generateHtml(imageUrl, buttonText, inputText, postUrl);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
};
