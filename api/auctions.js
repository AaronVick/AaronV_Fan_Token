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

async function getUserWalletAddress(usernameOrFid) {
  const query = `
    query GetUserByUsernameOrFid($identity: Identity!) {
      Socials(
        input: {filter: {identity: {_eq: $identity}}, blockchain: farcaster}
      ) {
        Social {
          userAssociatedAddresses
        }
      }
    }
  `;
  const variables = { identity: usernameOrFid };

  const headers = {
    'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
  };

  try {
    const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
    const address = result.data?.Socials?.Social?.[0]?.userAssociatedAddresses?.[0];
    if (!address) {
      throw new Error(`No associated wallet address found for user ${usernameOrFid}`);
    }
    return { address };
  } catch (error) {
    console.error('Error in getUserWalletAddress:', error);
    throw error;
  }
}

async function getMoxieAuctionData(address) {
  const query = `
    query GetMoxieAuctionData($address: Identity!) {
      TokenBalances(
        input: {filter: {owner: {_eq: $address}, tokenAddress: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
      ) {
        TokenBalance {
          amount
          formattedAmount
        }
      }
      TokenNfts(
        input: {filter: {owner: {_eq: $address}, address: {_eq: "0x4bc81e5de3221e0b64a602164840d71bb99cb2c8"}}, blockchain: base, limit: 1}
      ) {
        TokenNft {
          contentValue {
            image {
              original
            }
          }
        }
      }
    }
  `;
  const variables = { address };

  const headers = {
    'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
  };

  try {
    const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
    const tokenBalance = result.data?.TokenBalances?.TokenBalance?.[0];
    const tokenNft = result.data?.TokenNfts?.TokenNft?.[0];

    return {
      auctionSupply: tokenBalance?.amount || 'N/A',
      totalBidValue: tokenBalance?.formattedAmount || 'N/A',
      tokenImage: tokenNft?.contentValue?.image?.original || null,
    };
  } catch (error) {
    console.error('Error in getMoxieAuctionData:', error);
    throw error;
  }
}

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
  let text;
  if (errorInfo) {
    text = `Error for ${farcasterName}: ${errorInfo.message}`;
  } else if (auctionData) {
    text = `Auction for ${farcasterName}: Supply: ${auctionData.auctionSupply}, Value: ${auctionData.totalBidValue}`;
  } else {
    text = `No data for ${farcasterName}`;
  }

  return auctionData?.tokenImage || `https://via.placeholder.com/1000x600/8E55FF/FFFFFF?text=${encodeURIComponent(text)}`;
}

module.exports = async (req, res) => {
  console.log('Request received:', req.method);

  try {
    let imageUrl = DEFAULT_IMAGE_URL;
    let buttonText = "View Auction Details";

    if (req.method === 'POST') {
      const farcasterName = req.body?.untrustedData?.inputText || '';
      console.log('Farcaster name:', farcasterName);

      if (farcasterName.trim() !== '') {
        try {
          const { address } = await getUserWalletAddress(farcasterName);
          const auctionData = await getMoxieAuctionData(address);
          imageUrl = generateImageUrl(auctionData, farcasterName);
          buttonText = "Check Another Auction";
        } catch (error) {
          console.error('Error processing user data:', error);
          imageUrl = generateImageUrl(null, farcasterName, { message: error.message });
        }
      }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta property="fc:frame" content="vNext">
<meta property="fc:frame:image" content="${imageUrl}">
<meta property="fc:frame:button:1" content="${buttonText}">
<meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/auctions">
</head>
<body>
<p>Moxie Auction Frame</p>
</body>
</html>
    `.trim();

    console.log('Sending response with image URL:', imageUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
};
