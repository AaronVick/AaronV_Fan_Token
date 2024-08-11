<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moxie Auction Details</title>
    <meta property="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="https://www.aaronvick.com/Moxie/11.JPG">
    <meta property="fc:frame:input:text" content="Enter Farcaster name">
    <meta property="fc:frame:button:1" content="View Auction Details">
    <meta property="fc:frame:post_url" content="https://aaron-v-fan-token.vercel.app/api/auctions">
</head>
<body>
    <h1>Moxie Auction Frame</h1>
    <p>Enter a Farcaster name to view auction details.</p>
    <input type="text" id="farcasterName" placeholder="Enter Farcaster name">
    <button onclick="submitFarcasterName()">View Auction Details</button>

    <script>
        function submitFarcasterName() {
            const farcasterName = document.getElementById('farcasterName').value;
            fetch('https://aaron-v-fan-token.vercel.app/api/auctions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    untrustedData: {
                        inputText: farcasterName
                    }
                })
            }).then(response => response.text())
            .then(html => {
                document.open();
                document.write(html);
                document.close();
            })
            .catch(error => console.error('Error:', error));
        }
    </script>
</body>
</html>
