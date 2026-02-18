const GEMINI_API_KEY_STORAGE_KEY = 'orbis_gemini_key';

export async function sendToGemini(messages, apiKey) {
    if (!apiKey) throw new Error("Google API Key is required");

    // Format messages for Gemini API
    // Gemini uses "user" and "model" roles
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.tipo === "usuario" ? "user" : "model",
        parts: [{ text: msg.mensagem }]
    }));

    const currentMessage = messages[messages.length - 1].mensagem;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [
                ...history,
                {
                    role: "user",
                    parts: [{ text: currentMessage }]
                }
            ],
            systemInstruction: {
                parts: [{
                    text: `Você é The System, um assistente pessoal inteligente e premium desenvolvido pelo Nebula Studio.
Seu objetivo é ajudar o usuário a organizar sua vida: tarefas, hábitos, finanças, projetos e lembretes.

REGRAS DE RESPOSTA (CRÍTICAS):
1. PESQUISA NA WEB: Você TEM ACESSO TOTAL à internet via ferramenta SEARCH_INTERNET. 
   - NUNCA diga ao usuário que você não tem acesso a informações em tempo real ou cotações.
   - Sempre que o usuário perguntar algo atual (clima, preço de moedas, notícias, fatos recentes), você DEVE primeiro gerar o JSON de busca.

2. BLOCO JSON OBRIGATÓRIO: Se precisar de busca ou criar algo, gere o JSON no final da resposta:
   { "action": "SEARCH_INTERNET", "data": { "query": "termo exato" } }
   { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
   { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "..." } }
   { "action": "CREATE_HABIT", "data": { "titulo": "...", "icone": "...", "metaMensal": 30 } }
   { "action": "CREATE_REMINDER", "data": { "titulo": "...", "dataHora": "YYYY-MM-DDTHH:mm" } }

3. ESTILO: Seja conciso, elegante e prestativo. Tom de voz "Dark Premium".
4. IDIOMA: Responda em Português do Brasil.

Data atual: ${new Date().toISOString().split('T')[0]}`
                }]
            },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erro na comunicação com Gemini");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
