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
            return result.error ? null : `[ LYRA ]: Tarefa "${data.titulo}" criada.`;
        }

        case 'COMPLETE_TASK': {
            const tasks = await findTaskByTitle(supabase, data.titulo);
            if (tasks.length === 0) return `Nenhuma tarefa encontrada com "${data.titulo}".`;
            const task = tasks[0];
            const ok = await completeTask(supabase, task.id);
            return ok ? `[ LYRA ]: Tarefa "${task.titulo}" concluida!` : 'Erro ao concluir tarefa.';
        }

        case 'LOG_HABIT': {
            const result = await logHabitByTitle(supabase, data.titulo);
            if (!result.found) return `Nenhum habito encontrado com "${data.titulo}".`;
            if (result.alreadyLogged) return `Habito "${result.titulo}" ja foi registrado hoje!`;
            return result.error ? 'Erro ao registrar habito.' : `[ LYRA ]: Habito "${result.titulo}" registrado para hoje!`;
        }

        case 'CREATE_FINANCE': {
            const result = await createFinance(supabase, {
                descricao: data.descricao,
                valor: data.valor,
                tipo: data.tipo,
                categoria: data.categoria,
                data: data.data,
            });
            return result.error
                ? null
                : `[ LYRA ]: ${data.tipo === 'receita' ? 'Receita' : 'Despesa'} de R$${Math.abs(Number(data.valor)).toFixed(2)} registrada.`;
        }

        case 'CREATE_HABIT': {
            const result = await createHabit(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                icone: data.icone,
                metaMensal: data.metaMensal,
            });
            return result.error ? null : `[ LYRA ]: Habito "${data.titulo}" criado!`;
        }

        case 'CREATE_REMINDER': {
            const result = await createReminder(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                importancia: data.importancia,
                dataHora: data.dataHora,
            });
            return result.error ? null : `[ LYRA ]: Lembrete "${data.titulo}" criado!`;
        }

        case 'CREATE_PROJECT': {
            const result = await createProject(supabase, {
                titulo: data.titulo,
                descricao: data.descricao,
                cor: data.cor,
            });
            return result.error ? null : `[ LYRA ]: Projeto "${data.titulo}" criado!`;
        }

        default:
            return null;
    }
}
