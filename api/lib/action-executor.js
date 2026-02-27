/**
 * action-executor.js
 * Executa ações parsed das respostas da IA contra o Supabase.
 * Suporta CREATE_TASK, COMPLETE_TASK, LOG_HABIT, CREATE_FINANCE,
 * CREATE_HABIT, CREATE_REMINDER, CREATE_PROJECT.
 */

import {
    createTask, completeTask, findTaskByTitle,
    logHabitByTitle, createFinance,
    createHabit, createReminder, createProject
} from './supabase-server.js';

export async function executeServerAction(supabase, actionObj) {
    const { action, data } = actionObj;
    if (!action || !data) return null;

    switch (action) {
        case 'CREATE_TASK': {
            const result = await createTask(supabase, {
                titulo: data.titulo,
                prioridade: data.prioridade,
                dataPrazo: data.dataPrazo,
            });
            if (result.error) return `[ ERRO ]: Falha ao criar tarefa "${data.titulo}". Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ Tarefa "${data.titulo}" criada no Orbis!`;
        }

        case 'COMPLETE_TASK': {
            const tasks = await findTaskByTitle(supabase, data.titulo);
            if (tasks.length === 0) return `[ AVISO ]: Nenhuma tarefa encontrada com "${data.titulo}". Verifique o nome e tente novamente.`;
            const task = tasks[0];
            const ok = await completeTask(supabase, task.id);
            if (!ok) return `[ ERRO ]: Falha ao concluir tarefa "${task.titulo}". Pode ser problema de permissao (RLS).`;
            return `✅ Tarefa "${task.titulo}" marcada como concluida no Orbis!`;
        }

        case 'LOG_HABIT': {
            const result = await logHabitByTitle(supabase, data.titulo);
            if (!result.found) return `[ AVISO ]: Nenhum habito encontrado com "${data.titulo}".`;
            if (result.alreadyLogged) return `[ INFO ]: Habito "${result.titulo}" ja foi registrado hoje!`;
            if (result.error) return `[ ERRO ]: Falha ao registrar habito. Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ Habito "${result.titulo}" registrado no Orbis!`;
        }

        case 'CREATE_FINANCE': {
            const result = await createFinance(supabase, {
                descricao: data.descricao,
                valor: data.valor,
                tipo: data.tipo,
                categoria: data.categoria,
                data: data.data,
            });
            if (result.error) return `[ ERRO ]: Falha ao registrar lancamento. Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ ${data.tipo === 'receita' ? 'Receita' : 'Despesa'} de R$${Math.abs(Number(data.valor)).toFixed(2)} (${data.descricao}) registrada no Orbis!`;
        }

        case 'CREATE_HABIT': {
            const result = await createHabit(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                icone: data.icone,
                metaMensal: data.metaMensal,
            });
            if (result.error) return `[ ERRO ]: Falha ao criar habito. Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ Habito "${data.titulo}" criado no Orbis!`;
        }

        case 'CREATE_REMINDER': {
            const result = await createReminder(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                importancia: data.importancia,
                dataHora: data.dataHora,
            });
            if (result.error) return `[ ERRO ]: Falha ao criar lembrete. Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ Lembrete "${data.titulo}" criado no Orbis!`;
        }

        case 'CREATE_PROJECT': {
            const result = await createProject(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                cor: data.cor,
            });
            if (result.error) return `[ ERRO ]: Falha ao criar projeto. Detalhes: ${result.error.message || 'erro desconhecido'}`;
            return `✅ Projeto "${data.titulo}" criado no Orbis!`;
        }

        default:
            return null;
    }
}
