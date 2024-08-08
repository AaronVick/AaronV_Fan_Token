const https = require('https');

const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

function httpsGet(urlString) {
    return new Promise((resolve, reject) => {
        https.get(urlString, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getAuctionData(fid) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Fetching auction data for FID: ${fid} (Attempt ${attempt})`);
            const moxieUrl = `https://moxiescout.vercel.app/auction/${fid}`;
            console.log('MoxieScout URL:', moxieUrl);
            const data = await httpsGet(moxieUrl);
            console.log('MoxieScout raw response:', data.substring(0, 500) + '...'); // Log first 500 characters

            if (data.includes("Failed to load auction details. Please try again later.")) {
                console.log('No auction data available, retrying...');
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                continue;
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

            if (Object.values(auctionData).every(value => value === 'N/A')) {
                console.log('All data is N/A, retrying...');
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                continue;
            }

            console.log('Parsed auction data:', auctionData);
            return auctionData;
        } catch (error) {
            console.error(`Error fetching auction data (Attempt ${attempt}):`, error.message);
            if (attempt === MAX_RETRIES) {
                return { error: "Failed to fetch auction data after multiple attempts" };
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    return { error: "Failed to fetch auction data after all retries" };
}

module.exports = { getAuctionData };
