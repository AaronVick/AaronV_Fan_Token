export default function handler(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send('<h1>API Route Working Correctly</h1>');
}
