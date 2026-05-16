import "dotenv/config";

export async function SteamProfile(message: any, steamId: string) {
    const apiKey = process.env.STEAM_API_KEY;

    if(!apiKey) {
        console.error("[X][X][X] ERRO: STEAM_API_KEY não encontrada no .env!");
        return message.reply("[K] Erro interno: Chave da Steam não configurada.");
    }

    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;

    try {
        const MensagemEspera = await message.reply("[LOAD] Consultando servidores da Valve (Perfil + CS). . .");
        
        const resposta = await fetch(url);
        const dados = await resposta.json();
        
        // RASTREADOR: Vamos ver o que a Steam mandou de verdade no terminal
        console.log("RESPOSTA BRUTA DA STEAM:", JSON.stringify(dados));

        // Usamos a interrogação (?.) para evitar que o código quebre se a Steam mandar algo vazio
        const jg = dados?.response?.players?.[0];
        
        if(!jg) {
            return MensagemEspera.edit("[X][X] Jogador não encontrado ou a API Key da Steam é inválida!");
        }

        let textoFinal =
            `• **PERFIL DA STEAM**\n` +
            `• **NICK:** ${jg.personaname}\n` +
            `• **Origem:** 🇧🇷 ${jg.loccountrycode || "Não informado"}\n` +
            `• **Status:** ${jg.personastate === 1 ? "[O] Online" : "[OFF] Offline"}\n` +
            `• **Avatar:** ${jg.avatarfull}\n\n`;

        await MensagemEspera.edit(textoFinal);

    } catch (erro) {
        // Printa o erro mastigado no terminal para sabermos a linha exata que quebrou
        console.error("[GLO] Erro interno no serviço da Steam:", erro);
        message.reply("[X][X] Falha crítica interna ao processar os dados da Steam!");
    }
}