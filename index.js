const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_FID = '354795'; // Replace with your actual FID

async function getAuctionData(fid) {
    try {
        console.log(`Fetching auction data for FID: ${fid}`);
        const response = await axios.get(`https://moxiescout.vercel.app/auction/${fid}`);
        console.log(`MoxieScout response status: ${response.status}`);
        const $ = cheerio.load(response.data);

        const errorMessage = $('.text-red-500').text().trim();
        if (errorMessage === "Failed to load auction details. Please try again later.") {
            console.log('No auction data available');
            return { error: "No Auction Data Available" };
        }

        const data = {
            clearingPrice: $('div:contains("Clearing Price") + div').text().trim(),
            auctionSupply: $('div:contains("Auction Supply") + div').text().trim(),
            auctionStart: $('div:contains("Auction Start") + div').text().trim(),
            auctionEnd: $('div:contains("Auction End") + div').text().trim(),
            totalOrders: $('div:contains("Total Orders") + div').text().trim(),
            uniqueBidders: $('div:contains("Unique Bidders") + div').text().trim(),
            status: $('div:contains("Status") + div').text().trim(),
            totalBidValue: $('div:contains("Total Bid Value") + div').text().trim(),
        };
        console.log('Parsed auction data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching auction data:', error.message);
        return { error: "Failed to fetch auction data" };
    }
}

module.exports = async (req, res) => {
    console.log('Received request:', req.method, req.url);
    console.log('Request body:', req.body);

    if (req.method === 'GET') {
        // Serve the initial frame
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Frame</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
    <meta property="fc:frame:input:text" content="Enter Farcaster name (optional)">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
</head>
<body>
    <h1>Welcome to Moxie Auction Frame</h1>
    <p>Enter a Farcaster name or click the button to view auction details.</p>
    <img src="https://www.aaronvick.com/Moxie/11.JPG" alt="Moxie Auction Frame" style="max-width: 100%; height: auto;">
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    if (req.method === 'POST') {
        // Handle auction data request
        try {
            const { untrustedData } = req.body || {};
            const farcasterName = untrustedData?.inputText || '';

            console.log('Farcaster name:', farcasterName);

            let fid = DEFAULT_FID;
            let displayName = 'Your Account';

            if (farcasterName.trim() !== '') {
                try {
                    const fidResponse = await axios.get(`https://api.farcaster.xyz/v2/user-by-username?username=${farcasterName}`);
                    fid = fidResponse.data.result.user.fid;
                    displayName = farcasterName;
                } catch (error) {
                    console.error('Error fetching FID:', error.message);
                    displayName = 'Invalid Farcaster name';
                }
            }

            console.log('FID:', fid);

            const auctionData = await getAuctionData(fid);

            console.log('Auction data:', auctionData);

            let content;
            if (auctionData.error) {
                content = `<p>${auctionData.error}</p>`;
            } else {
                content = `
                    <p>Clearing Price: ${auctionData.clearingPrice || 'N/A'}</p>
                    <p>Auction Supply: ${auctionData.auctionSupply || 'N/A'}</p>
                    <p>Auction Start: ${auctionData.auctionStart || 'N/A'}</p>
                    <p>Auction End: ${auctionData.auctionEnd || 'N/A'}</p>
                    <p>Total Orders: ${auctionData.totalOrders || 'N/A'}</p>
                    <p>Unique Bidders: ${auctionData.uniqueBidders || 'N/A'}</p>
                    <p>Status: ${auctionData.status || 'N/A'}</p>
                    <p>Total Bid Value: ${auctionData.totalBidValue || 'N/A'}</p>
                `;
            }

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moxie Auction Details</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="View">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
                </head>
                <body>
                    <h1>Auction Details for ${displayName}</h1>
                    ${content}
                </body>
                </html>
            `;

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } catch (error) {
            console.error('Error in getAuctionDetails:', error.message);
            const errorHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                    <meta property="fc:frame" content="vNext">
                    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
                    <meta property="fc:frame:input:text" content="Enter Farcaster name">
                    <meta property="fc:frame:button:1" content="Try Again">
                    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
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

    // Handle any other HTTP method
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};
