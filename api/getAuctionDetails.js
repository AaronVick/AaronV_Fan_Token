const axios = require('axios');
const cheerio = require('cheerio');
const { createCanvas, loadImage } = require('canvas');

const DEFAULT_FID = '354795'; // Replace with your actual FID

async function getAuctionData(fid) {
    // ... (keep the existing getAuctionData function)
}

async function generateAuctionImage(auctionData, displayName) {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 1200, 630);

    // Set text style
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 30px Arial';

    // Draw auction details
    ctx.fillText(`Auction Details for ${displayName}`, 50, 50);
    ctx.font = '20px Arial';
    let y = 100;
    for (const [key, value] of Object.entries(auctionData)) {
        if (key !== 'error') {
            ctx.fillText(`${key}: ${value || 'N/A'}`, 50, y);
            y += 40;
        }
    }

    return canvas.toDataURL();
}

module.exports = async (req, res) => {
    console.log('Received request:', JSON.stringify(req.body));

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

        const imageDataUrl = await generateAuctionImage(auctionData, displayName);

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Moxie Auction Details</title>
                <meta property="fc:frame" content="vNext">
                <meta property="fc:frame:image" content="${imageDataUrl}">
                <meta property="fc:frame:input:text" content="Enter Farcaster name">
                <meta property="fc:frame:button:1" content="View">
                <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/getAuctionDetails">
            </head>
            <body>
                <h1>Auction Details for ${displayName}</h1>
                <img src="${imageDataUrl}" alt="Auction Details">
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in getAuctionDetails:', error.message);
        res.status(500).send(`
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
        `);
    }
};
