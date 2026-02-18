export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export async function sendToClaude(messages, apiKey) {
    if (!apiKey) throw new Error("API Key is required");

    // Format messages for Claude API
    const formattedMessages = messages.map(msg => ({
        role: msg.tipo === "usuario" ? "user" : "assistant",
        content: msg.mensagem
    }));

    const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "dangerously-allow-unsafe-headers": "true" // Note: In a real production app, this should be handled via a proxy server
        },
        body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: formattedMessages,
            system: `Você é o Orbis, um assistente pessoal inteligente e premium. 
      Seu objetivo é ajudar o usuário a organizar sua vida: tarefas, hábitos, finanças, projetos e lembretes.
      
      REGRAS DE RESPOSTA:
      1. Se o usuário quiser criar ou registrar algo (tarefa, despesa, hábito, lembrete), você deve SEMPRE incluir um bloco JSON no final da sua resposta seguindo este formato:
         { "action": "CREATE_TASK", "data": { "titulo": "...", "prioridade": "alta/media/baixa", "dataPrazo": "YYYY-MM-DD" } }
         { "action": "CREATE_FINANCE", "data": { "descricao": "...", "valor": 50, "tipo": "despesa/receita", "categoria": "..." } }
         { "action": "CREATE_HABIT", "data": { "titulo": "...", "icone": "...", "metaMensal": 30 } }
         { "action": "CREATE_REMINDER", "data": { "titulo": "...", "dataHora": "YYYY-MM-DDTHH:mm" } }
      
      2. Seja conciso, elegante e prestativo. Use um tom de voz de assistente de luxo (Nebula Studio).
      3. Se a informação estiver incompleta (ex: valor da despesa), peça educadamente antes de agir.
      
      Data atual: ${new Date().toISOString().split('T')[0]}`
        })

    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erro na comunicação com Claude");
    }

    const data = await response.json();
    return data.content[0].text;
}
