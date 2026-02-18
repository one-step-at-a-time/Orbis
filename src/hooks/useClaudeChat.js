import { useState } from 'react';
import { callAiProvider } from '../services/aiProviderService';
import { searchInternet } from '../services/searchService';
import { useAppData } from '../context/DataContext';

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
            "preço", "valor", "cotação", "quanto custa", "quanto tá",
            "clima", "tempo em", "previsão", "chover", "calor",
            "quem ganhou", "quem é", "o que aconteceu", "notícias",
            "resumo de hoje", "hoje", "agora", "últimas"
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

            let responseText = await callAiProvider(freshProvider, finalMessages, freshApiKey);

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

                        responseText = await callAiProvider(freshProvider, augmentedMessages, freshApiKey);
                        setIsSearching(false);
                    } else {
                        executeAction(actionData);
                    }
                } catch (e) {
                    setIsSearching(false);
                    console.error("[Orbis] Erro na ação:", e);
                    if (e.message.includes("Brave")) setError(e.message);
                }
            }

            setLoading(false);

            // Limpeza final RADICAL: remover blocos markdown, JSON e chaves residuais
            const cleanFinal = responseText
                .replace(/```json[\s\S]*?```/g, "")
                .replace(/```[\s\S]*?```/g, "")
                .replace(/\{[\s\S]*?\}/g, "")
                .replace(/json$/gm, "") // Remove "json" solto no fim da linha
                .trim();

            return cleanFinal;
        } catch (err) {
            setIsSearching(false);
            console.error("[Orbis] Erro fatal no fluxo:", err);
            setError(err.message);
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

    return { sendMessage, loading, isSearching, error, hasKey: !!apiKey, provider };
}
