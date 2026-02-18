export async function searchInternet(query, apiKey) {
    if (!apiKey) throw new Error("Brave Search API Key não configurada.");

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-Subscription-Token": apiKey
            }
        });

        if (!response.ok) {
            let errorMsg = `Erro na API da Brave (${response.status})`;
            try {
                const err = await response.json();
                errorMsg = err.message || JSON.stringify(err);
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Format results to snippets
        const snippets = data.web?.results?.map(res => ({
            title: res.title,
            description: res.description,
            url: res.url
        })) || [];

        return snippets;
    } catch (error) {
        console.error("Search Error:", error);
        throw error;
    }
}
