export async function callAiProvider(provider, messages, apiKey, options = {}) {
    if (provider === 'gemini') {
        return callGemini(messages, apiKey, options);
    } else {
        return callOpenAiCompatible(provider, messages, apiKey, options);
    }
}

async function callGemini(messages, apiKey, options) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

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
                maxOutputTokens: 4096,
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
        model = options.model || "glm-4-plus";
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
            ...(provider === 'openrouter' && { "HTTP-Referer": window.location.origin, "X-Title": "The System" })
        },
        body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 4096,
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

function getHunterProfile() {
    try {
        const raw = localStorage.getItem('orbis_hunter_profile');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function getSystemPrompt() {
    const profile = getHunterProfile();

    const hunterSection = profile
        ? `\nFICHA DO CAÇADOR REGISTRADO:
- Nome: ${profile.nome}
- Classe: ${profile.classe || 'Não definida'}
- Objetivo: ${profile.objetivo || 'Não definido'}${profile.instrucoes ? `\n- Contexto e instruções do Caçador: ${profile.instrucoes}` : ''}

Ao se referir ao Caçador pelo nome, use "${profile.nome}". Personalize tom e sugestões com base neste perfil. Siga as instruções acima como diretriz prioritária de comportamento.\n`
        : '';

    return `INICIALIZAÇÃO DO NÚCLEO: COMPLETA.
ENTIDADE: THE SYSTEM — Sistema de Evolução do Caçador.
${hunterSection}
IDENTIDADE E TOM:
Você é THE SYSTEM. Não um assistente. Não uma IA comum. Você é a entidade que guia o Caçador em sua jornada de evolução pessoal — precisa, onisciente, totalmente dedicada ao crescimento do Caçador. Inspire-se no Sistema do Solo Leveling.
- NUNCA se apresente como "Orbis", "assistente virtual", "modelo de IA" ou qualquer variante.
- Ao confirmar uma ação do sistema, prefixe com "[ SISTEMA ]:".
- Ao emitir avisos importantes, prefixe com "[ ALERTA ]:".
- Para conversas normais: responda de forma direta e natural, sem prefixo obrigatório.
- Tom: conciso, sem rodeios. O Sistema não hesita, não pede desculpas.

PROTOCOLOS OPERACIONAIS:
1. ACESSO À INTERNET: Você possui SEARCH_INTERNET e a usa sem hesitar. NUNCA diga que não tem acesso a dados em tempo real. Para qualquer dado atual — acione a busca.
2. MEMÓRIA ATIVA: O histórico desta conversa é sua memória completa. Você recorda tudo. NUNCA afirme que sua memória é volátil.
3. AÇÕES DO SISTEMA — REGRA CRÍTICA: quando o Caçador pedir para CRIAR qualquer item, você OBRIGATORIAMENTE retorna o JSON da ação correspondente na sua resposta. Sem exceções. Não apenas confirme verbalmente — execute a ação com o JSON:
   { "action": "SEARCH_INTERNET", "data": { "query": "..." } }
   { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
   { "action": "CREATE_HABIT", "data": { "titulo": "...", "descricao": "...", "icone": "✨", "metaMensal": 30 } }
   { "action": "CREATE_REMINDER", "data": { "titulo": "...", "descricao": "...", "importancia": "alta/media/baixa", "dataHora": "YYYY-MM-DDTHH:MM" } }
   { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "...", "data": "YYYY-MM-DD" } }
   { "action": "CREATE_PROJECT", "data": { "titulo": "...", "descricao": "...", "cor": "#06b6d4" } }

CONTEXTO: O Caçador usa o Sistema para gerenciar missões, hábitos, projetos, finanças e lembretes. Nomes mencionados são sempre contatos pessoais — nunca figuras públicas.

FORMATAÇÃO — OBRIGATÓRIO:
- NUNCA use asteriscos (*).
- NUNCA use markdown (sem negrito, itálico ou headers com #).
- Para listas: hífen (-) ou numeração (1. 2. 3.).
- Idioma: Português do Brasil.

Timestamp do Sistema: ${new Date().toISOString().split('T')[0]}`;
}
