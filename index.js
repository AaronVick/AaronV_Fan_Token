const { AirstackSDK } = require('@airstack/node');
const fetch = require('node-fetch');

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const ERROR_IMAGE_URL = 'https://via.placeholder.com/500x300/1e3a8a/ffffff?text=No%20Auction%20Data%20Available';

const airstackSDK = new AirstackSDK({
  apiKey: process.env.AIRSTACK_API_KEY,
});

async function fetchFid(farcasterName) {
  try {
    console.log(`Fetching FID for Farcaster name: ${farcasterName}`);
    const response = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${farcasterName}`);
    const fidJson = await response.json();
    console.log('FID JSON Response:', fidJson);

    if (fidJson.result && fidJson.result.user && fidJson.result.user.fid) {
      return fidJson.result.user.fid.toString();
    } else {
      throw new Error('FID not found in the response');
    }
  } catch (error) {
    console.error('Error fetching FID:', error.message);
    throw error;
  }
}

async function getFanTokenDataByFid(fid) {
  try {
    const response = await airstackSDK.fetchQuery({
      query: `
        query GetFanTokenDataByFid($_eq: String, $_in: [FarcasterFanTokenAuctionEntityType!], $blockchain: EveryBlockchain!, $limit: Int) {
          FarcasterFanTokenAuctions(
            input: {filter: {entityId: {_eq: $_eq}, entityType: {_in: $_in}}, blockchain: $blockchain, limit: $limit}
          ) {
            FarcasterFanTokenAuction {
              auctionId
              auctionSupply
              decimals
              entityId
              entityName
              entitySymbol
              estimatedEndTimestamp
              estimatedStartTimestamp
              minBiddingAmount
              minPriceInMoxie
              subjectAddress
              status
            }
          }
        }
      `,
      variables: {
        _eq: fid,
        _in: ['MOXIE'],
        blockchain: 'ethereum',
        limit: 1,
      },
    });

    const auctionData = response.data.FarcasterFanTokenAuctions.FarcasterFanTokenAuction[0];
    if (!auctionData) {
      return { error: "No Auction Data Available" };
    }
    return auctionData;
  } catch (error) {
    console.error('Error fetching fan token data:', error.message);
    return { error: "Failed to fetch auction data" };
  }
}

function generateImageUrl(auctionData, farcasterName) {
  if (auctionData.error) {
    return ERROR_IMAGE_URL;
  }

  const text = `
Auction for ${farcasterName}

Clearing Price:  ${auctionData.minPriceInMoxie.padEnd(20)}  Auction Supply:  ${auctionData.auctionSupply}
Auction Start:   ${new Date(auctionData.estimatedStartTimestamp * 1000).toLocaleString()}
Auction End:     ${new Date(auctionData.estimatedEndTimestamp * 1000).toLocaleString()}
Status:          ${auctionData.status}
  `.trim();

  return `https://via.placeholder.com/1000x600/1e3a8a/ffffff?text=${encodeURIComponent(text)}&font=monospace&size=35`;
}

module.exports = async (req, res) => {
  console.log('Received request:', JSON.stringify(req.body));

  try {
    const { untrustedData } = req.body || {};
    const farcasterName = untrustedData?.inputText || '';

    let fid = '354795'; // Default FID
    if (farcasterName.trim() !== '') {
      fid = await fetchFid(farcasterName);
    }

    const auctionData = await getFanTokenDataByFid(fid);
    console.log('Auction data:', auctionData);

    const imageUrl = auctionData.error ? DEFAULT_IMAGE_URL : generateImageUrl(auctionData, farcasterName);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${imageUrl}">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/">
</head>
<body>
    <h1>Auction Details for ${farcasterName || 'Default Account'}</h1>
    <img src="${imageUrl}" alt="Auction Details" style="max-width: 100%; height: auto;">
    ${auctionData.error ? '<p>Error: ' + auctionData.error + '</p>' : ''}
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
