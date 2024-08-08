const https = require('https');
const url = require('url');

const DEFAULT_FID = '354795'; // Replace with your actual default FID
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

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
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for MoxieScout
        const data = await httpsGet(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log('MoxieScout response received:', data);

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

async function fetchAuctionDetails(farcasterName) {
    let fid = DEFAULT_FID;
    let displayName = 'Default Account';

    if (farcasterName.trim() !== '') {
        try {
            console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
            const fidData = await httpsGet(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for Warpcast
            const fidJson = JSON.parse(fidData);
            if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
                fid = fidJson.result.user.fid;
                displayName = farcasterName;
                console.log(`Fetched FID: ${fid} for Farcaster name: ${farcasterName}`);
            } else {
                throw new Error('FID not found in the response');
            }
        } catch (error) {
            console.error('Error fetching FID:', error.message);
            displayName = 'Invalid Farcaster name';
        }
    }

    const auctionData = await getAuctionData(fid);
    return { auctionData, displayName };
}

function generateImageUrl(auctionData, displayName) {
    const text = `Auction for ${displayName}%0AClearing Price: ${auctionData.clearingPrice}%0AAuction Supply: ${auctionData.auctionSupply}%0AStatus: ${auctionData.status}%0ATotal Bid Value: ${auctionData.totalBidValue}`;
    return `https://via.placeholder.com/500x300/1e3a8a/ffffff?text=${encodeURIComponent(text)}`;
}

module.exports = async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body));

    try {
        const { untrustedData } = req.body || {};
        const farcasterName = untrustedData?.inputText || '';

        const { auctionData, displayName } = await fetchAuctionDetails(farcasterName);

        console.log('Auction data:', auctionData);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${auctionData.error ? DEFAULT_IMAGE_URL : generateImageUrl(auctionData, displayName)}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${displayName}</h1>
    <img src="${auctionData.error ? DEFAULT_IMAGE_URL : generateImageUrl(auctionData, displayName)}" alt="Auction Details" style="max-width: 100%; height: auto;">
    ${auctionData.error ? '<p>Error: ' + auctionData.error + '</p>' : ''}
    <script>
        async function fetchAuctionData() {
            const farcasterName = document.querySelector('input[name="farcasterName"]').value.trim();
            const response = await fetch('https://aaron-v-fan-token.vercel.app/api/getAuctionDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ untrustedData: { inputText: farcasterName } })
            });
            const result = await response.text();
            document.body.innerHTML = result;
        }
    </script>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in index.js:', error.message);
        res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="Try Again">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Error</h1>
    <p>Failed to fetch auction data. Please try again.</p>
</body>
</html>
        `);
    }
};
