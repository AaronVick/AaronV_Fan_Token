import { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_IMAGE_URL = 'https://www.aaronvick.com/Moxie/11.JPG';
const POST_URL = 'https://aaron-v-fan-token.vercel.app/api/auctions';

export default async (req: VercelRequest, res: VercelResponse) => {
    console.log('Received request method:', req.method);
    console.log('Request body:', JSON.stringify(req.body));

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Moxie Auction Frame</title>
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${DEFAULT_IMAGE_URL}">
            <meta property="fc:frame:post_url" content="${POST_URL}">
            <meta property="fc:frame:button:1" content="View Auction Details">
            <meta property="fc:frame:input:text" content="Enter Farcaster name">
        </head>
        <body>
            <h1>Moxie Auction Frame</h1>
            <p>Enter a Farcaster name to view auction details.</p>
        </body>
        </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
};
