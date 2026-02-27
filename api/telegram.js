/**
 * telegram.js
 * Webhook principal do bot Telegram do Orbis.
 * Recebe mensagens, processa comandos diretos ou linguagem natural via Lyra.
 *
 * Env vars: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *           AI_PROVIDER, AI_API_KEY, AI_MODEL (opcional)
 */

import { getSupabase, listPendingTasks, findTaskByTitle, completeTask, createTask, listHabitsWithTodayStatus, logHabitByTitle, createFinance } from './lib/supabase-server.js';
import { fetchServerAiContext } from './lib/supabase-server.js';
import { buildLiveContextFromSnapshot, buildServerSystemPrompt, callServerAiProvider } from './lib/ai-server.js';
import { extractActionJsons, removeActionJsons } from './lib/action-parser.js';
import { executeServerAction } from './lib/action-executor.js';

const TELEGRAM_MAX_LENGTH = 4096;

// ── Telegram API ───────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId, text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    // Trunca se exceder limite do Telegram
    const safeText = text.length > TELEGRAM_MAX_LENGTH
        ? text.slice(0, TELEGRAM_MAX_LENGTH - 20) + '\n\n...(truncado)'
        : text;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: safeText,
        }),
    });
}

// ── Slash Commands ─────────────────────────────────────────────────────────────

async function cmdListTasks() {
    const supabase = getSupabase();
    const tasks = await listPendingTasks(supabase);
    if (tasks.length === 0) return 'Nenhuma tarefa pendente. Tudo limpo!';

    const lines = tasks.map((t, i) => {
        const priority = { alta: '🔴', media: '🟡', baixa: '🟢' }[t.prioridade] || '🟡';
        const prazo = t.data_prazo ? ` (prazo: ${t.data_prazo})` : '';
        return `${i + 1}. ${priority} ${t.titulo} [${t.status}]${prazo}`;
    });
    return `TAREFAS PENDENTES:\n\n${lines.join('\n')}`;
}

async function cmdCompleteTask(searchTerm) {
    if (!searchTerm) return 'Use: /concluir <nome da tarefa>';
    const supabase = getSupabase();
    const tasks = await findTaskByTitle(supabase, searchTerm);
    if (tasks.length === 0) return `Nenhuma tarefa encontrada com "${searchTerm}".`;

    const task = tasks[0];
    const ok = await completeTask(supabase, task.id);
    if (!ok) return 'Erro ao concluir tarefa.';

    let msg = `✅ Tarefa "${task.titulo}" concluida!`;
    if (tasks.length > 1) {
        msg += `\n\n(Havia ${tasks.length} resultados, concluida a primeira. Outras opcoes:`;
        tasks.slice(1).forEach((t, i) => msg += `\n${i + 2}. ${t.titulo}`);
        msg += ')';
    }
    return msg;
}

async function cmdCreateTask(title) {
    if (!title) return 'Use: /tarefa <titulo da tarefa>';
    const supabase = getSupabase();
    const result = await createTask(supabase, { titulo: title, prioridade: 'media' });
    if (result.error) return 'Erro ao criar tarefa.';
    return `✅ Tarefa "${title}" criada com sucesso!`;
}

async function cmdListHabits() {
    const supabase = getSupabase();
    const habits = await listHabitsWithTodayStatus(supabase);
    if (habits.length === 0) return 'Nenhum habito cadastrado ainda.';

    const lines = habits.map(h => {
        const check = h.doneToday ? '✅' : '⬜';
        return `${check} ${h.icone || '✨'} ${h.titulo} (${h.thisMonth}x este mes)`;
    });
    return `HABITOS DE HOJE:\n\n${lines.join('\n')}`;
}

async function cmdLogHabit(searchTerm) {
    if (!searchTerm) return 'Use: /habito <nome do habito>';
    const supabase = getSupabase();
    const result = await logHabitByTitle(supabase, searchTerm);
    if (!result.found) return `Nenhum habito encontrado com "${searchTerm}".`;
    if (result.alreadyLogged) return `✅ Habito "${result.titulo}" ja foi registrado hoje!`;
    if (result.error) return 'Erro ao registrar habito.';
    return `✅ Habito "${result.titulo}" registrado para hoje!`;
}

async function cmdRegisterFinance(tipo, argText) {
    const usage = `Use: /${tipo === 'receita' ? 'receita' : 'gasto'} <valor> <descricao>`;
    if (!argText) return usage;

    const parts = argText.split(' ');
    const valor = parseFloat(parts[0]);
    if (isNaN(valor) || parts.length < 2) return usage;

    const descricao = parts.slice(1).join(' ');
    const supabase = getSupabase();
    const result = await createFinance(supabase, { descricao, valor, tipo });
    if (result.error) return 'Erro ao registrar lancamento.';
    return `✅ ${tipo === 'receita' ? 'Receita' : 'Despesa'} de R$${valor.toFixed(2)} registrada: "${descricao}"`;
}

function cmdHelp() {
    return `🤖 COMANDOS DISPONIVEIS:

/tarefas — Listar tarefas pendentes
/concluir <nome> — Concluir uma tarefa
/tarefa <titulo> — Criar nova tarefa
/habitos — Listar habitos com status de hoje
/habito <nome> — Registrar habito para hoje
/gasto <valor> <descricao> — Registrar despesa
/receita <valor> <descricao> — Registrar receita
/ajuda — Mostrar este menu

💬 Ou envie qualquer mensagem para conversar com a LYRA!`;
}

// ── Slash Command Router ───────────────────────────────────────────────────────

async function handleSlashCommand(text) {
    const [cmd, ...args] = text.split(' ');
    const argText = args.join(' ').trim();

    switch (cmd.toLowerCase().split('@')[0]) { // Remove @botname se presente
        case '/tarefas':   return await cmdListTasks();
        case '/concluir':  return await cmdCompleteTask(argText);
        case '/tarefa':    return await cmdCreateTask(argText);
        case '/habitos':   return await cmdListHabits();
        case '/habito':    return await cmdLogHabit(argText);
        case '/gasto':     return await cmdRegisterFinance('despesa', argText);
        case '/receita':   return await cmdRegisterFinance('receita', argText);
        case '/ajuda':
        case '/start':
        case '/help':      return cmdHelp();
        default:           return 'Comando desconhecido. Use /ajuda para ver os comandos.';
    }
}

// ── Natural Language Handler ───────────────────────────────────────────────────

async function handleNaturalLanguage(text) {
    const provider = process.env.AI_PROVIDER || 'siliconflow';
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) return 'Bot nao configurado: chave de IA ausente.';

    const supabase = getSupabase();
    const snapshot = await fetchServerAiContext(supabase);
    const contextBlock = buildLiveContextFromSnapshot(snapshot);
    const systemPrompt = buildServerSystemPrompt(contextBlock);

    const aiResponse = await callServerAiProvider(
        provider,
        [{ role: 'user', content: text }],
        apiKey,
        { model: process.env.AI_MODEL || undefined, systemPrompt }
    );

    // Parse e executa ações
    const actions = extractActionJsons(aiResponse);
    const results = [];
    for (const action of actions) {
        const result = await executeServerAction(supabase, action);
        if (result) results.push(result);
    }

    // Limpa resposta
    let clean = removeActionJsons(aiResponse)
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s+/g, '')
        .trim();

    if (results.length > 0) {
        clean += '\n\n' + results.join('\n');
    }

    return clean || 'Sem resposta da IA.';
}

// ── Main Handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};
    if (!message || !message.text) {
        return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    try {
        let reply;
        if (text.startsWith('/')) {
            reply = await handleSlashCommand(text);
        } else {
            reply = await handleNaturalLanguage(text);
        }
        await sendTelegramMessage(chatId, reply);
    } catch (err) {
        console.error('[Telegram Bot] Error:', err);
        await sendTelegramMessage(chatId, `Erro: ${err.message || 'Algo deu errado.'}`);
    }

    return res.status(200).json({ ok: true });
}
