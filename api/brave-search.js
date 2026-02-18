export default async function handler(req, res) {
    const { q, count = 5 } = req.query;
    const apiKey = req.headers['x-brave-key'];

    if (!apiKey) {
        return res.status(400).json({ error: 'Chave da Brave Search não fornecida.' });
    }

    if (!q) {
        return res.status(400).json({ error: 'Parâmetro de busca ausente.' });
    }

    try {
        const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey
                }
            }
        );

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
