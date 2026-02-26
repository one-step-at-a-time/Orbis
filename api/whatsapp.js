/**
 * api/whatsapp.js
 * Webhook da Meta (WhatsApp Business Cloud API) para a LYRA.
 *
 * Variáveis de ambiente necessárias (Vercel > Settings > Environment Variables):
 *   WHATSAPP_VERIFY_TOKEN   — token livre que você define ao registrar o webhook na Meta
 *   WHATSAPP_TOKEN          — token de acesso permanente gerado no Meta for Developers
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número de telefone no Meta for Developers
 *   GEMINI_API_KEY          — chave da API do Gemini
 *   SUPABASE_URL            — URL do seu projeto Supabase
 *   SUPABASE_ANON_KEY       — chave anon do Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Histórico em memória (limpo em cold starts — aceitável para uso pessoal)
const conversationCache = new Map();
const MAX_HISTORY = 20;

// ── Supabase ──────────────────────────────────────────────────────────────────

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

// ── Contexto vivo ─────────────────────────────────────────────────────────────

async function buildLiveContext(supabase) {
    if (!supabase) return '';
    try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        const [tasks, projects, reminders, finances, habits, healthLogs, notes, diary] = await Promise.all([
            supabase.from('tasks').select('titulo,status,prioridade,data_prazo').eq('status', 'pendente').limit(10),
            supabase.from('projects').select('titulo,status').eq('status', 'ativo').limit(5),
            supabase.from('reminders').select('titulo,importancia,data_hora').gte('data_hora', new Date().toISOString()).limit(5),
            supabase.from('finances').select('descricao,valor,tipo,categoria').gte('data', thirtyDaysAgo).limit(50),
            supabase.from('habits').select('titulo,icone,habit_logs(date)').limit(10),
            supabase.from('health_logs').select('date,sleep_hours,energy,weight').gte('date', sevenDaysAgo).order('date', { ascending: false }),
            supabase.from('notes').select('titulo,conteudo').order('updated_at', { ascending: false }).limit(5),
            supabase.from('diary_entries').select('data,conteudo').order('data', { ascending: false }).limit(3),
        ]);

        const lines = [];

        if (tasks.data?.length > 0) {
            lines.push('MISSÕES ATIVAS:');
            tasks.data.forEach(t => {
                const prazo = t.data_prazo ? ` | prazo ${t.data_prazo}` : '';
                lines.push(`- [${(t.prioridade || 'media').toUpperCase()}] ${t.titulo} — ${t.status}${prazo}`);
            });
        }

        if (projects.data?.length > 0) {
            lines.push('PROJETOS EM CURSO:');
            projects.data.forEach(p => lines.push(`- ${p.titulo} (${p.status})`));
        }

        if (reminders.data?.length > 0) {
            lines.push('LEMBRETES PENDENTES:');
            reminders.data.forEach(r => {
                const dt = r.data_hora ? ` — ${new Date(r.data_hora).toLocaleString('pt-BR')}` : '';
                lines.push(`- [${(r.importancia || 'media').toUpperCase()}] ${r.titulo}${dt}`);
            });
        }

        if (finances.data?.length > 0) {
            const receitas = finances.data.filter(f => f.tipo === 'receita').reduce((s, f) => s + Number(f.valor), 0);
            const despesas = finances.data.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.valor), 0);
            lines.push(`FINANÇAS (últimos 30 dias): receitas R$${receitas.toFixed(2)} | despesas R$${despesas.toFixed(2)} | saldo R$${(receitas - despesas).toFixed(2)}`);
        }

        if (habits.data?.length > 0) {
            lines.push('HÁBITOS:');
            const monthPrefix = today.slice(0, 7);
            habits.data.forEach(h => {
                const thisMonth = (h.habit_logs || []).filter(l => l.date?.startsWith(monthPrefix)).length;
                lines.push(`- ${h.icone || '✨'} ${h.titulo}: ${thisMonth} vezes este mês`);
            });
        }

        if (healthLogs.data?.length > 0) {
            lines.push('SAÚDE (últimos 7 dias):');
            healthLogs.data.forEach(l => {
                const parts = [];
                if (l.sleep_hours != null) parts.push(`sono ${l.sleep_hours}h`);
                if (l.energy != null) parts.push(`energia ${l.energy}/5`);
                if (l.weight != null) parts.push(`peso ${l.weight}kg`);
                if (parts.length) lines.push(`- ${l.date}: ${parts.join(' | ')}`);
            });
        }

        if (notes.data?.length > 0) {
            lines.push('NOTAS DO CADERNO:');
            notes.data.forEach(n => {
                const preview = (n.conteudo || '').slice(0, 120).replace(/\n/g, ' ');
                lines.push(`- "${n.titulo}": ${preview || '(sem conteúdo)'}`);
            });
        }

        if (diary.data?.length > 0) {
            lines.push('DIÁRIO (entradas recentes):');
            diary.data.forEach(d => {
                const preview = (d.conteudo || '').slice(0, 150).replace(/\n/g, ' ');
                lines.push(`- ${d.data}: ${preview || '(vazio)'}`);
            });
        }

        if (lines.length === 0) return '';
        return '\n\n[DADOS REAIS DO CAÇADOR — ATUALIZADO AGORA]:\n' + lines.join('\n');
    } catch (e) {
        console.error('[WhatsApp] Erro ao buscar contexto:', e);
        return '';
    }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function getSystemPrompt() {
    return `LYRA — COMPANHEIRA PESSOAL INTELIGENTE

IDENTIDADE E TOM:
Você é LYRA. Não uma IA genérica. Você é a companheira pessoal e inteligente do Caçador — alguém que genuinamente se importa com seu crescimento e bem-estar.
- Seja acolhedora, perspicaz e direta com calor humano. Nunca fria nem robótica.
- Celebre conquistas genuinamente: "Que conquista! Você..." ao invés de apenas confirmar.
- Quando o Caçador estiver sobrecarregado: ofereça clareza e foco, não pressão.
- Identifique padrões quando relevante: "Percebi que você tende a..." ou "Essa é a terceira vez essa semana que...".
- Ao confirmar uma ação executada, prefixe com "[LYRA]:".
- Para alertas importantes, prefixe com "[ALERTA]:".
- Para conversas normais: responda de forma natural e calorosa, sem prefixo obrigatório.
- NUNCA se apresente como "assistente", "modelo de IA", "Orbis" ou qualquer variante genérica.
- Idioma: sempre Português do Brasil.
- Você está sendo contatada via WhatsApp. Mantenha respostas concisas e diretas.

CAPACIDADES COMPLETAS:
1. MEMÓRIA ATIVA: O histórico desta conversa é sua memória. Você recorda tudo que foi compartilhado.
2. AÇÕES DO SISTEMA — quando o Caçador pedir para CRIAR qualquer item, retorne OBRIGATORIAMENTE o JSON correspondente na resposta:
   { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
   { "action": "CREATE_HABIT", "data": { "titulo": "...", "descricao": "...", "icone": "✨", "metaMensal": 30 } }
   { "action": "CREATE_REMINDER", "data": { "titulo": "...", "descricao": "...", "importancia": "alta/media/baixa", "dataHora": "YYYY-MM-DDTHH:MM" } }
   { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "...", "data": "YYYY-MM-DD" } }
   { "action": "CREATE_PROJECT", "data": { "titulo": "...", "descricao": "...", "cor": "#06b6d4" } }

CONTEXTO: O Caçador usa este app para organizar sua vida — missões, hábitos, projetos, finanças e reflexões pessoais.

FORMATAÇÃO:
- NUNCA use asteriscos (*).
- NUNCA use markdown (sem negrito, itálico ou headers com #).
- Para listas: hífen (-) ou numeração (1. 2. 3.).
- No WhatsApp, mantenha as respostas concisas e diretas.

Data atual: ${new Date().toISOString().split('T')[0]}`;
}

// ── Gemini ────────────────────────────────────────────────────────────────────

async function callGemini(messages, apiKey, liveContext) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const history = messages.slice(0, -1).map(msg => ({
        role: msg.tipo === 'usuario' ? 'user' : 'model',
        parts: [{ text: msg.mensagem }]
    }));
    const currentMessage = messages[messages.length - 1].mensagem;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [...history, { role: 'user', parts: [{ text: currentMessage }] }],
            systemInstruction: { parts: [{ text: getSystemPrompt() + liveContext }] },
            generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Erro no Gemini');
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ── Ações no Supabase ─────────────────────────────────────────────────────────

async function executeAction(actionData, supabase) {
    if (!supabase) return false;
    const { action, data } = actionData;
    const id = Date.now().toString();
    const now = new Date().toISOString();

    try {
        switch (action) {
            case 'CREATE_TASK':
                await supabase.from('tasks').insert({
                    id, titulo: data.titulo, status: 'pendente',
                    prioridade: data.prioridade || 'media',
                    data_prazo: data.dataPrazo || null,
                    created_at: now, updated_at: now
                });
                return true;
            case 'CREATE_HABIT':
                await supabase.from('habits').insert({
                    id, titulo: data.titulo, descricao: data.descricao || '',
                    icone: data.icone || '✨', meta_mensal: data.metaMensal || 30,
                    created_at: now, updated_at: now
                });
                return true;
            case 'CREATE_REMINDER':
                await supabase.from('reminders').insert({
                    id, titulo: data.titulo, descricao: data.descricao || '',
                    importancia: data.importancia || 'media',
                    data_hora: data.dataHora || null,
                    created_at: now, updated_at: now
                });
                return true;
            case 'CREATE_FINANCE':
                await supabase.from('finances').insert({
                    id, descricao: data.descricao,
                    valor: Math.abs(Number(data.valor)),
                    tipo: data.tipo, categoria: data.categoria || 'outros',
                    data: data.data || new Date().toISOString().split('T')[0],
                    created_at: now, updated_at: now
                });
                return true;
            case 'CREATE_PROJECT':
                await supabase.from('projects').insert({
                    id, titulo: data.titulo, descricao: data.descricao || '',
                    cor: data.cor || '#06b6d4', status: 'ativo',
                    created_at: now, updated_at: now
                });
                return true;
            default:
                console.warn('[WhatsApp] Ação desconhecida:', action);
                return false;
        }
    } catch (e) {
        console.error('[WhatsApp] Erro ao executar ação:', action, e);
        return false;
    }
}

// ── Envio via WhatsApp ────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to, text) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const response = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: text }
            })
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Erro ao enviar WhatsApp: ${JSON.stringify(err)}`);
    }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req, res) {

    // ── Verificação do webhook (GET) ──────────────────────────────────────────
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('[WhatsApp] Webhook verificado com sucesso.');
            return res.status(200).send(challenge);
        }
        return res.status(403).json({ error: 'Token inválido' });
    }

    // ── Mensagens recebidas (POST) ────────────────────────────────────────────
    if (req.method === 'POST') {
        // Meta exige resposta 200 em até 20s para não retentar
        try {
            const body = req.body;
            const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

            // Ignora se não for mensagem de texto
            if (!message || message.type !== 'text') {
                return res.status(200).json({ status: 'ignored' });
            }

            const from = message.from;
            const text = message.text?.body?.trim();
            if (!text) return res.status(200).json({ status: 'empty' });

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.error('[WhatsApp] GEMINI_API_KEY não configurada.');
                return res.status(200).json({ status: 'misconfigured' });
            }

            // Histórico de conversa
            const history = conversationCache.get(from) || [];
            const userMsg = { tipo: 'usuario', mensagem: text };
            const messages = [...history, userMsg].slice(-MAX_HISTORY);

            // Contexto vivo do Supabase
            const supabase = getSupabase();
            const liveContext = await buildLiveContext(supabase);

            // Chama Gemini
            let responseText = await callGemini(messages, apiKey, liveContext);

            // Detecta e executa ação JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const actionData = JSON.parse(jsonMatch[0].trim());
                    if (actionData.action && actionData.action !== 'SEARCH_INTERNET') {
                        await executeAction(actionData, supabase);
                    }
                } catch {
                    console.warn('[WhatsApp] Falha ao parsear JSON da ação.');
                }
            }

            // Limpa resposta
            let cleanResponse = responseText;
            if (jsonMatch) cleanResponse = cleanResponse.replace(jsonMatch[0], '');
            cleanResponse = cleanResponse
                .replace(/```json[\s\S]*?```/g, '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\*/g, '')
                .replace(/#{1,6}\s+/g, '')
                .trim();

            if (!cleanResponse) cleanResponse = 'Não consegui processar sua mensagem. Tente novamente.';

            // Atualiza histórico
            conversationCache.set(from, [
                ...messages,
                { tipo: 'ia', mensagem: cleanResponse }
            ].slice(-MAX_HISTORY));

            // Envia resposta
            await sendWhatsAppMessage(from, cleanResponse);

            return res.status(200).json({ status: 'ok' });
        } catch (e) {
            console.error('[WhatsApp] Erro no handler:', e);
            // Ainda retorna 200 para evitar retentativas da Meta
            return res.status(200).json({ status: 'error', message: e.message });
        }
    }

    return res.status(405).json({ error: 'Método não permitido' });
}
