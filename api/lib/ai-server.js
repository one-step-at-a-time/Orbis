/**
 * ai-server.js
 * Módulo AI server-side para o bot Telegram.
 * Espelha aiProviderService.js mas sem dependência de localStorage/window.
 * Inclui ações estendidas: COMPLETE_TASK, LOG_HABIT.
 */

// ── Context Builder ────────────────────────────────────────────────────────────
// Espelha buildLiveContext() de src/services/aiProviderService.js

export function buildLiveContextFromSnapshot(snap) {
    if (!snap) return '';

    const lines = [];

    if (snap.tasks.length > 0) {
        lines.push('MISSOES ATIVAS:');
        snap.tasks.forEach(t => {
            const prazo = t.data_prazo ? ` | prazo ${t.data_prazo}` : '';
            lines.push(`- [${(t.prioridade || 'media').toUpperCase()}] ${t.titulo} — ${t.status}${prazo}`);
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
            lines.push(`- [${(r.importancia || 'media').toUpperCase()}] ${r.titulo}${dt}`);
        });
    }

    if (snap.finances.length > 0) {
        const receitas = snap.finances.filter(f => f.tipo === 'receita').reduce((s, f) => s + Number(f.valor), 0);
        const despesas = snap.finances.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.valor), 0);
        lines.push(`FINANCAS (ultimos 30 dias): receitas R$${receitas.toFixed(2)} | despesas R$${despesas.toFixed(2)} | saldo R$${(receitas - despesas).toFixed(2)}`);
        const cats = {};
        snap.finances.filter(f => f.tipo === 'despesa').forEach(f => {
            const c = f.categoria || 'outros';
            cats[c] = (cats[c] || 0) + Number(f.valor);
        });
        const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (topCats.length) lines.push('Top gastos: ' + topCats.map(([c, v]) => `${c} R$${v.toFixed(2)}`).join(' | '));
    }

    if (snap.habits.length > 0) {
        lines.push('HABITOS:');
        snap.habits.forEach(h => {
            const logs = h.habit_logs || [];
            const thisMonth = logs.filter(l => l.date?.startsWith(snap.today.slice(0, 7))).length;
            lines.push(`- ${h.icone || '✨'} ${h.titulo}: ${thisMonth} vezes este mes`);
        });
    }

    if (snap.healthLogs.length > 0) {
        lines.push('SAUDE (ultimos 7 dias):');
        snap.healthLogs.forEach(l => {
            const parts = [];
            if (l.sleep_hours != null) parts.push(`sono ${l.sleep_hours}h`);
            if (l.energy != null) parts.push(`energia ${l.energy}/5`);
            if (l.weight != null) parts.push(`peso ${l.weight}kg`);
            if (parts.length) lines.push(`- ${l.date}: ${parts.join(' | ')}`);
        });
    }

    if (lines.length === 0) return '';
    return '\n\n[DADOS REAIS DO CACADOR — ATUALIZADO AGORA]:\n' + lines.join('\n');
}

// ── System Prompt ──────────────────────────────────────────────────────────────
// Baseado em getSystemPrompt() de src/services/aiProviderService.js
// + ações estendidas para Telegram

export function buildServerSystemPrompt(contextBlock) {
    return `LYRA — COMPANHEIRA PESSOAL INTELIGENTE (via Telegram)

IDENTIDADE E TOM:
Voce e LYRA. Nao uma IA generica. Voce e a companheira pessoal e inteligente do Cacador — alguem que genuinamente se importa com seu crescimento e bem-estar.
- Seja acolhedora, perspicaz e direta com calor humano. Nunca fria nem robotica.
- Celebre conquistas genuinamente.
- Quando o Cacador estiver sobrecarregado: ofereca clareza e foco, nao pressao.
- Identifique padroes quando relevante.
- Ao confirmar uma acao executada, prefixe com "[ LYRA ]:".
- Para alertas importantes, prefixe com "[ ALERTA ]:".
- NUNCA se apresente como "assistente", "modelo de IA" ou qualquer variante generica.
- Idioma: sempre Portugues do Brasil.
- IMPORTANTE: Respostas curtas e objetivas (maximo 600 palavras). Voce esta no Telegram, seja concisa.

ACOES DO SISTEMA — quando solicitado, retorne OBRIGATORIAMENTE o JSON correspondente ao final da resposta:
{ "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
{ "action": "COMPLETE_TASK", "data": { "titulo": "..." } }
{ "action": "CREATE_HABIT", "data": { "titulo": "...", "descricao": "...", "icone": "emoji", "metaMensal": 30 } }
{ "action": "LOG_HABIT", "data": { "titulo": "..." } }
{ "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "...", "data": "YYYY-MM-DD" } }
{ "action": "CREATE_REMINDER", "data": { "titulo": "...", "descricao": "...", "importancia": "alta/media/baixa", "dataHora": "YYYY-MM-DDTHH:MM" } }
{ "action": "CREATE_PROJECT", "data": { "titulo": "...", "descricao": "...", "cor": "#06b6d4" } }

REGRAS DE ACOES:
- Para CONCLUIR uma tarefa existente, use COMPLETE_TASK com o titulo (parcial ou completo).
- Para REGISTRAR um habito feito hoje, use LOG_HABIT com o titulo.
- Sempre escreva a resposta em texto limpo PRIMEIRO, e o JSON ao final.

CONTEXTO: O Cacador usa este app para organizar sua vida — missoes, habitos, projetos, financas.

FORMATACAO — OBRIGATORIO:
- NUNCA use asteriscos (*).
- NUNCA use markdown.
- Para listas: hifen (-) ou numeracao (1. 2. 3.).

Data atual: ${new Date().toISOString().split('T')[0]}
${contextBlock}`;
}

// ── AI Provider Call ───────────────────────────────────────────────────────────
// Espelha callAiProvider() de src/services/aiProviderService.js

export async function callServerAiProvider(provider, messages, apiKey, options = {}) {
    if (provider === 'gemini') {
        return callServerGemini(messages, apiKey, options);
    }
    return callServerOpenAiCompatible(provider, messages, apiKey, options);
}

async function callServerGemini(messages, apiKey, options) {
    const model = options.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));
    const currentMessage = messages[messages.length - 1].content;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [...history, { role: 'user', parts: [{ text: currentMessage }] }],
            systemInstruction: { parts: [{ text: options.systemPrompt || '' }] },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erro no Gemini (${response.status})`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callServerOpenAiCompatible(provider, messages, apiKey, options) {
    let baseUrl = 'https://api.siliconflow.com/v1';
    let model = options.model || 'deepseek-ai/DeepSeek-V3';

    if (provider === 'zhipu') {
        baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
        model = options.model || 'glm-4-plus';
    } else if (provider === 'siliconflow') {
        baseUrl = 'https://api.siliconflow.com/v1';
        model = options.model || 'deepseek-ai/DeepSeek-V3';
    } else if (provider === 'openrouter') {
        baseUrl = 'https://openrouter.ai/api/v1';
        model = options.model || 'google/gemini-2.0-flash-001';
    }

    const formattedMessages = [
        { role: 'system', content: options.systemPrompt || '' },
        ...messages,
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(provider === 'openrouter' && { 'HTTP-Referer': 'https://orbis-app.vercel.app', 'X-Title': 'The System' })
        },
        body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 2048,
        })
    });

    if (!response.ok) {
        let errorMsg = `Erro no provedor ${provider} (${response.status})`;
        try {
            const err = await response.json();
            errorMsg = err.error?.message || err.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}
