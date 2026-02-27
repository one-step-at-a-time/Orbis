/**
 * telegram-setup.js
 * Endpoint para registrar o webhook do Telegram.
 * Acesse GET /api/telegram-setup após o deploy para ativar o bot.
 */

export default async function handler(req, res) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN nao configurado nas env vars do Vercel.' });
    }

    // Monta a URL do webhook baseado no host da requisição
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const webhookUrl = `${protocol}://${host}/api/telegram`;

    try {
        // Registra webhook no Telegram
        const setResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message'],
                drop_pending_updates: true,
            }),
        });

        const setData = await setResponse.json();

        // Busca info do bot
        const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const meData = await meResponse.json();

        // Configura os comandos do bot (aparece no menu do Telegram)
        await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commands: [
                    { command: 'tarefas',  description: 'Listar tarefas pendentes' },
                    { command: 'concluir', description: 'Concluir uma tarefa' },
                    { command: 'tarefa',   description: 'Criar nova tarefa' },
                    { command: 'habitos',  description: 'Listar habitos de hoje' },
                    { command: 'habito',   description: 'Registrar habito para hoje' },
                    { command: 'gasto',    description: 'Registrar despesa' },
                    { command: 'receita',  description: 'Registrar receita' },
                    { command: 'ajuda',    description: 'Mostrar comandos disponiveis' },
                ],
            }),
        });

        return res.status(200).json({
            success: true,
            webhook: setData,
            bot: meData.ok ? { username: meData.result.username, name: meData.result.first_name } : null,
            webhookUrl,
            message: `Bot configurado! Abra t.me/${meData.result?.username} e envie /ajuda.`,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
