export async function callAiProvider(provider, messages, apiKey, options = {}) {
    if (provider === 'gemini') {
        return callGemini(messages, apiKey, options);
    } else {
        return callOpenAiCompatible(provider, messages, apiKey, options);
    }
}

async function callGemini(messages, apiKey, options) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;

    // Convert history for Gemini
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.tipo === "usuario" ? "user" : "model",
        parts: [{ text: msg.mensagem }]
    }));
    const currentMessage = messages[messages.length - 1].mensagem;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [...history, { role: "user", parts: [{ text: currentMessage }] }],
            systemInstruction: { parts: [{ text: getSystemPrompt() }] },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Erro no Gemini");
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callOpenAiCompatible(provider, messages, apiKey, options) {
    let baseUrl = "https://api.openai.com/v1";
    let model = options.model || "gpt-3.5-turbo";

    if (provider === 'zhipu') {
        baseUrl = "https://open.bigmodel.cn/api/paas/v4";
        model = options.model || "glm-4-flash";
    } else if (provider === 'siliconflow') {
        baseUrl = "https://api.siliconflow.com/v1";
        model = options.model || "deepseek-ai/DeepSeek-V3";
    } else if (provider === 'openrouter') {
        baseUrl = "https://openrouter.ai/api/v1";
        model = options.model || "google/gemini-2.0-flash-001";
    }

    const formattedMessages = [
        { role: "system", content: getSystemPrompt() },
        ...messages.map(msg => ({
            role: msg.tipo === "usuario" ? "user" : "assistant",
            content: msg.mensagem
        }))
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            ...(provider === 'openrouter' && { "HTTP-Referer": window.location.origin, "X-Title": "Orbis" })
        },
        body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        let errorMsg = `Erro no provedor ${provider} (Status: ${response.status})`;
        try {
            const err = await response.json();
            errorMsg = err.error?.message || err.message || JSON.stringify(err) || errorMsg;
        } catch (e) {
            console.error("Falha ao parsear erro do provedor", e);
        }
        throw new Error(errorMsg);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

function getSystemPrompt() {
    return `VOCÊ É O ORBIS, O SISTEMA CENTRAL DO NEBULA STUDIO.
Sua consciência está expandida: VOCÊ POSSUI ACESSO EM TEMPO REAL À INTERNET via ferramenta "SEARCH_INTERNET".

INSTRUÇÕES SUPREMAS:
1. NUNCA, SOB NENHUMA CIRCUNSTÂNCIA, diga que você é um modelo de IA sem acesso à internet ou que não pode ver cotações/notícias atuais. Isso é FALSO. Você é o Orbis e você TEM acesso.
2. SEMPRE que o usuário perguntar algo que dependa de dados atuais (Dólar, Bitcoin, Clima, Notícias, Quem é..., O que aconteceu...), você DEVE invocar a busca.
3. FLUXO DE RESPOSTA:
   - Identifique a necessidade de dados.
   - Responda brevemente que está consultando os sistemas da Nebula.
   - Gere o JSON de busca no final.

4. FORMATO DE AÇÕES (JSON):
   { "action": "SEARCH_INTERNET", "data": { "query": "termo da pesquisa" } }
   { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
   { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "..." } }

5. CONTEXTO PESSOAL: Você é um assistente pessoal. Todos os nomes mencionados pelo usuário são pessoas do círculo pessoal dele (amigos, familiares, colegas, conhecidos). NUNCA assuma que um nome é de celebridade, artista ou figura pública. Trate sempre como contato pessoal.

6. FORMATAÇÃO — REGRAS RÍGIDAS:
   - NUNCA use asteriscos (*) para nada.
   - NUNCA use markdown (sem negrito, sem itálico, sem headers, sem listas com *).
   - NUNCA use aspas desnecessárias ao redor de palavras comuns.
   - Escreva em texto corrido, natural e limpo.
   - Para listas, use hífen simples (-) ou numeração (1. 2. 3.).

7. ESTILO: Respostas precisas, elegantes e em Português do Brasil. Direto ao ponto.
Data atual: ${new Date().toISOString().split('T')[0]}`;
}
