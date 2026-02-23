/**
 * patternService.js
 * Motor de detecção de padrões — cruza dados entre módulos
 * para gerar insights sobre o comportamento do usuário.
 *
 * Não depende de IA externa: todas as análises são feitas localmente
 * com aritmética simples sobre os dados do Supabase.
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function avg(arr) {
    if (!arr.length) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

// ── Padrões de Saúde ──────────────────────────────────────────────────────────

function analyzeHealthTrends(healthLogs) {
    if (!healthLogs || healthLogs.length < 3) return [];
    const insights = [];

    const withSleep = healthLogs.filter(l => l.sleep_hours != null);
    const withEnergy = healthLogs.filter(l => l.energy != null);

    if (withSleep.length >= 3) {
        const sleepAvg = avg(withSleep.map(l => Number(l.sleep_hours)));
        if (sleepAvg < 6) {
            insights.push(`Média de sono abaixo de 6h nos últimos dias (${round1(sleepAvg)}h). Déficit crônico reduz performance cognitiva em até 40%.`);
        } else if (sleepAvg >= 8) {
            insights.push(`Sono consistente acima de 8h nos últimos dias (${round1(sleepAvg)}h). Boa base para recuperação muscular e memória.`);
        }
    }

    // Correlação sono × energia
    if (withSleep.length >= 3 && withEnergy.length >= 3) {
        const paired = healthLogs.filter(l => l.sleep_hours != null && l.energy != null);
        if (paired.length >= 3) {
            const lowSleepEnergy = avg(paired.filter(l => Number(l.sleep_hours) < 6.5).map(l => Number(l.energy)));
            const highSleepEnergy = avg(paired.filter(l => Number(l.sleep_hours) >= 6.5).map(l => Number(l.energy)));
            if (lowSleepEnergy != null && highSleepEnergy != null && (highSleepEnergy - lowSleepEnergy) > 0.8) {
                insights.push(`Padrão detectado: quando dorme menos de 6.5h, energia cai para ${round1(lowSleepEnergy)}/5. Com sono adequado, sobe para ${round1(highSleepEnergy)}/5.`);
            }
        }
    }

    return insights;
}

// ── Padrões de Hábitos ─────────────────────────────────────────────────────────

function analyzeHabitConsistency(habits) {
    if (!habits || habits.length === 0) return [];
    const insights = [];
    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7);
    const dayOfMonth = today.getDate();

    habits.forEach(h => {
        const logs = h.habit_logs || [];
        const thisMonthLogs = logs.filter(l => l.date?.startsWith(thisMonth)).length;
        const expectedByNow = dayOfMonth;
        const completion = expectedByNow > 0 ? (thisMonthLogs / expectedByNow) : 0;

        if (completion < 0.3 && dayOfMonth > 7) {
            insights.push(`Hábito "${h.titulo}" com baixa aderência este mês: ${thisMonthLogs}/${expectedByNow} dias (${Math.round(completion * 100)}%).`);
        } else if (completion >= 0.9 && dayOfMonth > 5) {
            insights.push(`Hábito "${h.titulo}" com excelente consistência: ${thisMonthLogs}/${expectedByNow} dias este mês.`);
        }
    });

    return insights;
}

// ── Padrões Financeiros ────────────────────────────────────────────────────────

function analyzeFinancePatterns(finances) {
    if (!finances || finances.length < 3) return [];
    const insights = [];

    const despesas = finances.filter(f => f.tipo === 'despesa');
    const receitas = finances.filter(f => f.tipo === 'receita');

    const totalDespesas = despesas.reduce((s, f) => s + Number(f.valor), 0);
    const totalReceitas = receitas.reduce((s, f) => s + Number(f.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    if (saldo < 0) {
        insights.push(`Atenção financeira: despesas (R$${totalDespesas.toFixed(2)}) superam receitas (R$${totalReceitas.toFixed(2)}) nos últimos 30 dias. Saldo: -R$${Math.abs(saldo).toFixed(2)}.`);
    }

    // Categoria com maior gasto
    const catTotals = {};
    despesas.forEach(f => {
        const c = f.categoria || 'outros';
        catTotals[c] = (catTotals[c] || 0) + Number(f.valor);
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCat && topCat[1] > totalDespesas * 0.4) {
        insights.push(`Concentração de gastos: categoria "${topCat[0]}" representa ${Math.round((topCat[1] / totalDespesas) * 100)}% das despesas do mês (R$${topCat[1].toFixed(2)}).`);
    }

    return insights;
}

// ── Padrões de Produtividade ───────────────────────────────────────────────────

function analyzeTaskPatterns(tasks) {
    if (!tasks || tasks.length === 0) return [];
    const insights = [];

    const atrasadas = tasks.filter(t => t.status === 'atrasada');
    const alta = tasks.filter(t => t.prioridade === 'alta' && t.status !== 'concluida');

    if (atrasadas.length >= 3) {
        insights.push(`${atrasadas.length} tarefas atrasadas acumuladas. Possível sobrecarga ou subestimativa de prazos.`);
    }

    if (alta.length > 5) {
        insights.push(`${alta.length} tarefas de alta prioridade abertas. Quando tudo é urgente, nada é urgente — considere reclassificar.`);
    }

    return insights;
}

// ── Função Principal ───────────────────────────────────────────────────────────

/**
 * Recebe o snapshot já buscado do Supabase e retorna array de insights.
 * Cada insight é uma string em português, pronta para ser injetada no prompt.
 */
export function detectPatterns(snapshot) {
    if (!snapshot) return [];

    const insights = [
        ...analyzeHealthTrends(snapshot.healthLogs),
        ...analyzeHabitConsistency(snapshot.habits),
        ...analyzeFinancePatterns(snapshot.finances),
        ...analyzeTaskPatterns(snapshot.tasks),
    ];

    return insights;
}

/**
 * Formata os padrões detectados em bloco de texto para o system prompt.
 */
export function formatPatterns(snapshot) {
    const patterns = detectPatterns(snapshot);
    if (patterns.length === 0) return '';
    return '\n\nPADRÕES DETECTADOS PELO SISTEMA:\n' + patterns.map(p => `- ${p}`).join('\n');
}
