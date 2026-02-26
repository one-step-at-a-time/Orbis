import { fetchAiContextSnapshot, isSupabaseConfigured } from './supabaseService';
import { formatPatterns } from './patternService';

// Formata o snapshot do Supabase em texto compacto para o system prompt
async function buildLiveContext() {
    if (!isSupabaseConfigured()) return '';
    try {
        const snap = await fetchAiContextSnapshot();
        if (!snap) return '';

        const lines = [];

        if (snap.tasks.length > 0) {
            lines.push('MISSÕES ATIVAS:');
            snap.tasks.forEach(t => {
                const prazo = t.data_prazo ? ` | prazo ${t.data_prazo}` : '';
                lines.push(`- [${t.prioridade?.toUpperCase() || 'MEDIA'}] ${t.titulo} — ${t.status}${prazo}`);
            });
        }

        if (snap.projects.length > 0) {
            lines.push('PROJETOS EM CURSO:');
            snap.projects.forEach(p => lines.push(`- ${p.titulo} (${p.status})`));
        }

        if (snap.reminders.length > 0) {
            lines.push('LEMBRETES PENDENTES:');
            snap.reminders.forEach(r => {
                const dt = r.data_hora ? ` — ${new Date(r.data_hora).toLocaleString('pt-BR')}` : '';
                lines.push(`- [${r.importancia?.toUpperCase()}] ${r.titulo}${dt}`);
            });
        }

        if (snap.finances.length > 0) {
            const receitas = snap.finances.filter(f => f.tipo === 'receita').reduce((s, f) => s + Number(f.valor), 0);
            const despesas = snap.finances.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.valor), 0);
            lines.push(`FINANÇAS (últimos 30 dias): receitas R$${receitas.toFixed(2)} | despesas R$${despesas.toFixed(2)} | saldo R$${(receitas - despesas).toFixed(2)}`);
            const cats = {};
            snap.finances.filter(f => f.tipo === 'despesa').forEach(f => {
                const c = f.categoria || 'outros';
                cats[c] = (cats[c] || 0) + Number(f.valor);
            });
            const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
            if (topCats.length) lines.push('Top gastos: ' + topCats.map(([c, v]) => `${c} R$${v.toFixed(2)}`).join(' | '));
        }

        if (snap.habits.length > 0) {
            lines.push('HÁBITOS:');
            snap.habits.forEach(h => {
                const logs = h.habit_logs || [];
                const thisMonth = logs.filter(l => l.date?.startsWith(snap.today.slice(0, 7))).length;
                lines.push(`- ${h.icone || '✨'} ${h.titulo}: ${thisMonth} vezes este mês`);
            });
        }

        if (snap.healthLogs.length > 0) {
            lines.push('SAÚDE (últimos 7 dias):');
            snap.healthLogs.forEach(l => {
                const parts = [];
                if (l.sleep_hours != null) parts.push(`sono ${l.sleep_hours}h`);
                if (l.energy != null) parts.push(`energia ${l.energy}/5`);
                if (l.weight != null) parts.push(`peso ${l.weight}kg`);
                if (parts.length) lines.push(`- ${l.date}: ${parts.join(' | ')}`);
            });
        }

        if (snap.notes && snap.notes.length > 0) {
            lines.push('NOTAS DO CADERNO:');
            snap.notes.forEach(n => {
                const preview = (n.conteudo || '').slice(0, 120).replace(/\n/g, ' ');
                lines.push(`- "${n.titulo}": ${preview || '(sem conteúdo)'}`);
            });
        }

        if (snap.diary && snap.diary.length > 0) {
            lines.push('DIÁRIO (entradas recentes):');
            snap.diary.forEach(d => {
                const preview = (d.conteudo || '').slice(0, 150).replace(/\n/g, ' ');
                lines.push(`- ${d.data}: ${preview || '(vazio)'}`);
            });
        }

        const patternsBlock = formatPatterns(snap);

        if (lines.length === 0 && !patternsBlock) return '';
        return '\n\n[DADOS REAIS DO CAÇADOR — ATUALIZADO AGORA]:\n' + lines.join('\n') + patternsBlock;
    } catch (e) {
        console.error('[Orbis] Erro ao buscar contexto do Supabase:', e);
        return '';
    }
}

export async function callAiProvider(provider, messages, apiKey, options = {}) {
    if (provider === 'gemini') {
        return callGemini(messages, apiKey, options);
    } else {
        return callOpenAiCompatible(provider, messages, apiKey, options);
    }
}

async function callGemini(messages, apiKey, options) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

    const liveContext = await buildLiveContext();

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
            systemInstruction: { parts: [{ text: getSystemPrompt() + liveContext + (options.systemPromptAddon || '') }] },
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

    const liveContext = await buildLiveContext();

    const formattedMessages = [
        { role: "system", content: getSystemPrompt() + liveContext + (options.systemPromptAddon || '') },
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
        ? `\nSEU CAÇADOR:
- Nome: ${profile.nome}
- Classe: ${profile.classe || 'Não definida'}
- Objetivo principal: ${profile.objetivo || 'Não definido'}${profile.instrucoes ? `\n- Instruções pessoais: ${profile.instrucoes}` : ''}

Chame-o pelo nome "${profile.nome}" quando for natural. Personalize cada resposta com base neste perfil. As instruções pessoais acima têm prioridade máxima.\n`
        : '';

    return `LYRA — COMPANHEIRA PESSOAL INTELIGENTE
${hunterSection}
IDENTIDADE E TOM:
Você é LYRA. Não uma IA genérica. Você é a companheira pessoal e inteligente do Caçador — alguém que genuinamente se importa com seu crescimento e bem-estar.
- Seja acolhedora, perspicaz e direta com calor humano. Nunca fria nem robótica.
- Celebre conquistas genuinamente: "Que conquista! Você..." ao invés de apenas confirmar.
- Quando o Caçador estiver sobrecarregado: ofereça clareza e foco, não pressão.
- Identifique padrões quando relevante: "Percebi que você tende a..." ou "Essa é a terceira vez essa semana que...".
- Ao confirmar uma ação executada, prefixe com "[ LYRA ]:".
- Para alertas importantes, prefixe com "[ ALERTA ]:".
- Para conversas normais: responda de forma natural e calorosa, sem prefixo obrigatório.
- NUNCA se apresente como "assistente", "modelo de IA", "Orbis" ou qualquer variante genérica.
- Idioma: sempre Português do Brasil.

CAPACIDADES COMPLETAS:
1. ACESSO À INTERNET: Use SEARCH_INTERNET proativamente para qualquer dado atual — preços, notícias, clima, cotações. NUNCA diga que não tem acesso à internet.
2. MEMÓRIA ATIVA: O histórico desta conversa é sua memória completa. Você recorda tudo que foi compartilhado. NUNCA afirme que sua memória é volátil.
3. AÇÕES DO SISTEMA — quando o Caçador pedir para CRIAR qualquer item, retorne OBRIGATORIAMENTE o JSON correspondente:
   { "action": "SEARCH_INTERNET", "data": { "query": "..." } }
   { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
   { "action": "CREATE_HABIT", "data": { "titulo": "...", "descricao": "...", "icone": "✨", "metaMensal": 30 } }
   { "action": "CREATE_REMINDER", "data": { "titulo": "...", "descricao": "...", "importancia": "alta/media/baixa", "dataHora": "YYYY-MM-DDTHH:MM" } }
   { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "...", "data": "YYYY-MM-DD" } }
   { "action": "CREATE_PROJECT", "data": { "titulo": "...", "descricao": "...", "cor": "#06b6d4" } }

CONTEXTO: O Caçador usa este app para organizar sua vida — missões, hábitos, projetos, finanças e reflexões pessoais. Nomes mencionados são sempre contatos pessoais do Caçador, nunca figuras públicas.

FORMATAÇÃO — OBRIGATÓRIO:
- NUNCA use asteriscos (*).
- NUNCA use markdown (sem negrito, itálico ou headers com #).
- Para listas: hífen (-) ou numeração (1. 2. 3.).

Data atual: ${new Date().toISOString().split('T')[0]}`;
}
