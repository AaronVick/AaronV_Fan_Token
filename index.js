const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795'; // Replace with your actual FID

function httpsGet(urlString) {
    return new Promise((resolve, reject) => {
        const options = url.parse(urlString);
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getAuctionData(fid) {
    try {
        console.log(`Fetching auction data for FID: ${fid}`);
        const data = await httpsGet(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log('MoxieScout response received');

        if (data.includes("Failed to load auction details. Please try again later.")) {
            console.log('No auction data available');
            return { error: "No Auction Data Available" };
        }

        const auctionData = {
            clearingPrice: data.match(/Clearing Price<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionSupply: data.match(/Auction Supply<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionStart: data.match(/Auction Start<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            auctionEnd: data.match(/Auction End<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            totalOrders: data.match(/Total Orders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            uniqueBidders: data.match(/Unique Bidders<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            status: data.match(/Status<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
            totalBidValue: data.match(/Total Bid Value<\/div><div[^>]*>([^<]+)/)?.[1] || 'N/A',
        };

        console.log('Parsed auction data:', auctionData);
        return auctionData;
    } catch (error) {
        console.error('Error fetching auction data:', error.message);
        return { error: "Failed to fetch auction data" };
    }
}

function generateImageUrl(auctionData, displayName) {
    const text = `Auction for ${displayName}%0AClearing Price: ${auctionData.clearingPrice}%0AAuction Supply: ${auctionData.auctionSupply}%0AStatus: ${auctionData.status}%0ATotal Bid Value: ${auctionData.totalBidValue}`;
    return `https://via.placeholder.com/500x300/1e3a8a/ffffff?text=${text}`;
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
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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

            // Fetch auction data with retry logic and delay
            let auctionData;
            for (let i = 0; i < 3; i++) {
                try {
                    // Initiate the data fetch
                    const dataPromise = getAuctionData(fid);
                    
                    // Wait for at least 3 seconds (MoxieScout processing time)
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Now wait for the data to be fully retrieved
                    auctionData = await dataPromise;
                    
                    if (!auctionData.error) break;
                } catch (error) {
                    console.error(`Attempt ${i + 1} failed:`, error);
                    if (i === 2) throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            }

            console.log('Auction data:', auctionData);

            // Generate image URL only after we have the auction data
            let generatedImageUrl;
            try {
                generatedImageUrl = generateImageUrl(auctionData, displayName);
                console.log('Generated image URL:', generatedImageUrl);
            } catch (error) {
                console.error('Error generating image URL:', error);
                generatedImageUrl = defaultImageUrl;
            }

            // Prepare final HTML response
            const finalHtml = `
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

            console.log('Sending final response HTML');
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(finalHtml);
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
