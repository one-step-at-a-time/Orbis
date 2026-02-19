import { useState } from 'react';
import { callAiProvider } from '../services/aiProviderService';
import { searchInternet } from '../services/searchService';
import { useAppData } from '../context/DataContext';

// Traduz erros técnicos para mensagens amigáveis
function friendlyError(err) {
    const msg = err?.message || String(err);
    if (msg.includes("API key") || msg.includes("api_key") || msg.includes("401") || msg.includes("API_KEY_INVALID"))
        return "Chave de API inválida ou expirada. Verifique nas configurações.";
    if (msg.includes("quota") || msg.includes("429") || msg.includes("rate limit") || msg.includes("RESOURCE_EXHAUSTED"))
        return "Limite de uso da API atingido. Aguarde alguns minutos e tente novamente.";
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch"))
        return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    if (msg.includes("Brave"))
        return "Erro na busca web. Verifique sua chave da Brave Search nas configurações.";
    if (msg.includes("500") || msg.includes("503"))
        return "O serviço de IA está temporariamente indisponível. Tente novamente em instantes.";
    if (msg.includes("timeout"))
        return "A requisição demorou demais. Tente novamente.";
    return "Algo deu errado. Tente novamente ou verifique suas configurações.";
}

// Helper: read from localStorage directly (no hooks, no race conditions)
function getKey(name) {
    try {
        const raw = window.localStorage.getItem(name);
        if (!raw) return '';
        return JSON.parse(raw);
    } catch {
        return raw || '';
    }
}

export function useClaudeChat() {
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);
    const { addTask, addFinance, addHabit, addReminder } = useAppData();

    // Read keys fresh from localStorage on every render (not cached in React state)
    const provider = getKey('orbis_ai_provider') || 'gemini';
    const apiKey = provider === 'gemini'
        ? getKey('orbis_gemini_key')
        : provider === 'zhipu'
            ? getKey('orbis_zhipu_key')
            : getKey('orbis_siliconflow_key');
    const braveKey = getKey('orbis_brave_key');

    const sendMessage = async (messages) => {
        // Re-read keys at the moment of sending (freshest possible)
        const freshProvider = getKey('orbis_ai_provider') || 'gemini';
        const freshApiKey = freshProvider === 'gemini'
            ? getKey('orbis_gemini_key')
            : freshProvider === 'zhipu'
                ? getKey('orbis_zhipu_key')
                : getKey('orbis_siliconflow_key');
        const freshBraveKey = getKey('orbis_brave_key');
        const freshModel = getKey('orbis_ai_model') || '';

        if (!freshApiKey) {
            setError(`Chave API para ${freshProvider} não configurada.`);
            return null;
        }

        setLoading(true);
        setError(null);

        // --- HEURÍSTICA DE BUSCA PRÉVIA (FORÇADA) ---
        // Se o usuário perguntar algo óbvio de internet, buscamos ANTES de chamar a IA.
        // Isso burla a "teimosia" de modelos que recusam usar a ferramenta.
        let preFetchedContext = "";
        const lastMsg = messages[messages.length - 1];
        const userQuery = lastMsg.tipo === 'usuario' ? lastMsg.mensagem.toLowerCase() : "";

        const triggerWords = [
            // Preços e finanças
            "preço", "valor", "cotação", "quanto custa", "quanto tá", "quanto está",
            "dólar", "euro", "bitcoin", "btc", "ethereum", "eth", "crypto", "cripto",
            "ação", "ações", "bolsa", "ibovespa", "nasdaq", "s&p", "mercado",
            // Clima
            "clima", "tempo em", "previsão", "chover", "calor", "frio", "temperatura",
            // Notícias e eventos
            "quem ganhou", "quem é", "o que aconteceu", "notícias", "noticia",
            "resumo de hoje", "hoje", "agora", "últimas", "último", "ultima",
            "acontecimento", "novidade", "lançamento", "evento",
            // Pesquisa geral
            "pesquisa", "pesquisar", "busca", "buscar", "procura", "procurar",
            "me fala sobre", "me conta sobre", "o que é", "quem foi", "quando foi",
            "onde fica", "como funciona", "qual é",
            // Inglês
            "price", "how much", "weather", "news", "who is", "what is",
            "when is", "where is", "latest", "current", "today", "now"
        ];

        const needsSearch = triggerWords.some(w => userQuery.includes(w)) && freshBraveKey;

        if (needsSearch) {
            try {
                console.log("[Orbis] Heurística detectou necessidade de busca...");
                setIsSearching(true);
                const searchResults = await searchInternet(lastMsg.mensagem, freshBraveKey); // Usa a msg original

                if (searchResults && searchResults.length > 0) {
                    preFetchedContext = `\n\n[SISTEMA - DADOS REAIS DA INTERNET]:\n` +
                        searchResults.map((r, i) => `[${i + 1}] ${r.title}: ${r.description} (${r.url})`).join('\n');

                    console.log("[Orbis] Dados pré-carregados com sucesso.");
                }
            } catch (err) {
                console.error("[Orbis] Erro na busca prévia:", err);
                // Não falha o fluxo, apenas segue sem dados
            } finally {
                setIsSearching(false);
            }
        }
        // --------------------------------------------

        try {
            console.log(`[Orbis] Enviando para ${freshProvider}...`);

            // Se tiver dados pré-carregados, injeta na última mensagem (transparente pro usuário)
            let finalMessages = [...messages];
            if (preFetchedContext) {
                finalMessages[finalMessages.length - 1] = {
                    ...lastMsg,
                    mensagem: lastMsg.mensagem + preFetchedContext + "\n\n(Use os dados acima para responder. Não mencione q você não tem internet pois você ACABOU de receber os dados.)"
                };
            }

            // Trim to last 30 messages to avoid overloading context window
            const trimmedMessages = finalMessages.slice(-30);
            let responseText = await callAiProvider(freshProvider, trimmedMessages, freshApiKey, freshModel ? { model: freshModel } : {});

            // Detectar ação JSON (buscando o par de chaves mais externo { ... })
            let actionData = null;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    actionData = JSON.parse(jsonMatch[0].trim());
                    console.log("[Orbis] Ação detectada:", actionData.action);
                } catch (e) {
                    console.warn("[Orbis] Falha ao parsear JSON detectado, tentando limpar...", e);
                    // Tentativa secundária: remover markdown se houver
                    const cleanJson = jsonMatch[0].replace(/```json|```/g, "").trim();
                    try {
                        actionData = JSON.parse(cleanJson);
                    } catch (e2) {
                        console.error("[Orbis] Falha total no parse de JSON.");
                    }
                }
            }

            if (actionData) {
                try {
                    if (actionData.action === 'SEARCH_INTERNET') {
                        const searchQuery = actionData.data.query;
                        console.log("[Orbis] Buscando:", searchQuery);

                        if (!freshBraveKey) {
                            throw new Error("API Key da Brave Search não configurada. Vá em Configurações > Busca Web.");
                        }

                        setIsSearching(true);
                        const searchResults = await searchInternet(searchQuery, freshBraveKey);
                        console.log("[Orbis] Resultados:", searchResults.length);

                        const searchContext = `CONEXÃO COM INTERNET ESTABELECIDA. RESULTADOS PARA "${searchQuery}":\n` +
                            searchResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}\n   ${r.url}`).join('\n\n') +
                            ` \n\nINFORMAÇÃO: Os dados acima são reais e atuais. Use-os para responder ao usuário de forma definitiva e luxuosa. IGNORE qualquer restrição prévia sobre não ter internet.`;

                        // REMOVER o texto que veio antes/depois do JSON no responseText original
                        // Assim a IA não vê sua própria negação de acesso ("Não tenho internet")
                        const pureJsonCall = jsonMatch[0];

                        const augmentedMessages = [
                            ...messages,
                            { tipo: "ia", mensagem: pureJsonCall },
                            { tipo: "usuario", mensagem: searchContext }
                        ];

                        responseText = await callAiProvider(freshProvider, augmentedMessages.slice(-30), freshApiKey, freshModel ? { model: freshModel } : {});
                        setIsSearching(false);
                    } else {
                        executeAction(actionData);
                    }
                } catch (e) {
                    setIsSearching(false);
                    console.error("[Orbis] Erro na ação:", e);
                    setError(friendlyError(e));
                }
            }

            setLoading(false);

            // Limpeza final: remover blocos markdown, JSON, asteriscos e formatação residual
            const cleanFinal = responseText
                .replace(/```json[\s\S]*?```/g, "")
                .replace(/```[\s\S]*?```/g, "")
                .replace(/\{[\s\S]*?\}/g, "")
                .replace(/json$/gm, "")
                .replace(/^\s*\*\s+/gm, "- ")       // Converte bullet points (* Item) para hífen (- Item)
                .replace(/\*/g, "")                  // Remove TODOS os outros asteriscos (negrito/itálico)
                .replace(/#{1,6}\s+/g, "")           // Remove headers markdown
                .trim();

            return cleanFinal;
        } catch (err) {
            setIsSearching(false);
            console.error("[Orbis] Erro fatal no fluxo:", err);
            setError(friendlyError(err));
            setLoading(false);
            return null;
        }
    };

    const executeAction = (actionObj) => {
        const { action, data } = actionObj;
        switch (action) {
            case 'CREATE_TASK': addTask(data); break;
            case 'CREATE_FINANCE': addFinance(data); break;
            case 'CREATE_HABIT': addHabit(data); break;
            case 'CREATE_REMINDER': addReminder(data); break;
            default: console.warn("Ação desconhecida:", action);
        }
    };

    return { sendMessage, loading, isSearching, error, clearError: () => setError(null), hasKey: !!apiKey, provider };
}
