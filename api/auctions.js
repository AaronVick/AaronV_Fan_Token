const url = require('url');
const https = require('https');
const moxieResolveData = require('./moxie_resolve.json');

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const DEFAULT_FID = '354795';
const FALLBACK_URL = 'https://aaron-v-fan-token.vercel.app';
const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';

function safeStringify(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (error) {
        return `[Error serializing object: ${error.message}]`;
    }
}

function logError(message, error) {
    console.error(`${message}:`);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.cause) {
        console.error('Error cause:', error.cause);
    }
}

function httpsPost(url, data, headers = {}) {
    // ... (rest of the function remains the same)
}

function resolveFidToBeneficiary(fid) {
    return moxieResolveData
        ?.filter((d) => d?.fid === fid && d?.type === "WALLET_ADDRESS")
        ?.map((d) => d?.address);
}

async function getUserWalletAddress(usernameOrFid) {
    // First, check if the input is a numeric FID
    const fid = parseInt(usernameOrFid);
    if (!isNaN(fid)) {
        const beneficiaryAddresses = resolveFidToBeneficiary(fid);
        if (beneficiaryAddresses && beneficiaryAddresses.length > 0) {
            return { address: beneficiaryAddresses[0] };
        }
    }

    // If not an FID or no address found, proceed with the Airstack API call
    const query = `
        query GetUserByUsernameOrFid($identity: Identity!) {
            Socials(
                input: {filter: {identity: {_eq: $identity}}, blockchain: farcaster}
            ) {
                Social {
                    userId
                    userAssociatedAddresses
                    profileName
                    profileDisplayName
                    profileImage
                    profileBio
                    profileUrl
                    farcasterProfile {
                        followerCount
                        followingCount
                    }
                }
            }
        }
    `;
    const variables = { identity: usernameOrFid };

    const headers = {
        'Authorization': `Bearer ${process.env.AIRSTACK_API_KEY}`,
        'Content-Type': 'application/json',
    };

    try {
        const result = await httpsPost(AIRSTACK_API_URL, { query, variables }, headers);
        console.log('Airstack user data response:', safeStringify(result));

        if (result.errors) {
            throw new Error(`Airstack query error: ${result.errors[0].message}`);
        }

        const user = result.data?.Socials?.Social?.[0];
        if (!user) {
            throw new Error(`User ${usernameOrFid} not found in Airstack.`);
        }

        const address = user.userAssociatedAddresses?.[0];

        if (!address) {
            throw new Error(`No associated wallet address found for user ${usernameOrFid}`);
        }

        return { address };
    } catch (error) {
        console.error('Error in getUserWalletAddress:', error);
        throw new Error(`User lookup error: ${error.message}`);
    }
}

async function getMoxieAuctionData(address) {
    // ... (rest of the function remains the same)
}

function generateImageUrl(auctionData, farcasterName, errorInfo = null) {
    // ... (rest of the function remains the same)
}

module.exports = async (req, res) => {
    // ... (rest of the module.exports function remains the same)
};
