import { Message, transformResolved } from "discord.js";
import { supabase } from "./supabase"
import { buscarPartidaCS2 } from "../services/steamClient";

export async function registerCS(message:any, authCode: string, knowMatch: string )  {
    
    const discordId = message.author.id

    try {

        const MessageWaiting = await message.channel.send(`<@${discordId}>, Atualizando credenciais do CS e unificando o discord + CS. . . `);

        await message.delete().catch((err: any) => 
            console.error("Não consegui deletar a mensagem de texto:", err)
        );
        
        const { data: founduser, error: fetchError } = await supabase
            .from("users")
            .select("steam_id_64")
            .eq("discord_id", discordId)
            .maybeSingle();

        if(fetchError) {
            console.error("[X][X] problema no Supabase (users):", fetchError);
            return MessageWaiting.edit("[X] Erro interno ao consultar o banco de dados.")

        }
        if (!founduser || !founduser.steam_id_64) {
            return MessageWaiting.edit(
                "[!!!] **Você ainda não vinculou sua Steam!**\n" +
                "primeiro registre seu SteamID usando:\n" +
                "`!register-steam <Seu_SteamID64>`\n\n" +
                "Depois disso, você poderá usar o comando do CS normalmente!"
            );
        }

        await MessageWaiting.edit(`<@${discordId}>, Validando credenciais com a Valve e imporatando primeira partida. . .`)

        const { shareCode: newShareCode, dadosMatch: match } = await buscarPartidaCS2(
            founduser.steam_id_64,
            authCode,
            knowMatch
        );

        
        if (!match) {
            return MessageWaiting.edit("[X] A Valve respondeu, mas o pacote do placar veio vazio. Aguarde 1 minuto e tente novamente.");
        }

        const accountConversor = (BigInt(founduser.steam_id_64) - 76561197960265728n).toString();
        
        const AllRounds = match?.roundstatsall || match?.matchinfo?.roundstatsall || [];

        if (AllRounds.length === 0) {
            return MessageWaiting.edit("[X] Credenciais válidas, mas não há rounds salvos nesta partida.");
        }

        if (AllRounds.length === 0) {
            return MessageWaiting.edit("[X] Credenciais válidas, mas não há dados na partida fornecida.");
        }

        const lastMatch = AllRounds[AllRounds.length - 1];
        const account_ids = lastMatch?.reservation?.account_ids || [];
        const playerIndex = account_ids.findIndex((id: any) => id.toString() === accountConversor);

        if (playerIndex === -1) {
            return MessageWaiting.edit("[X] Erro de rastreio: Não encontramos você nesta partida específica.");
        }

        const kills = lastMatch.kills?.[playerIndex] ?? 0;
        const deaths = lastMatch.deaths?.[playerIndex] ?? 0;
        const assists = lastMatch.assists?.[playerIndex] ?? 0;
        const mvps = lastMatch.mvps?.[playerIndex] ?? 0;


        const { error: updateError } = await supabase
            .from("users")
            .update({
                steam_auth_token: authCode,
                steam_know_match: newShareCode
            })
            .eq("discord_id", discordId);

            if (updateError) {
            // O JSON.stringify força o Node a mostrar o erro na tela, custe o que custar!
            console.error("[X][X] Erro detalhado no Supabase:", JSON.stringify(updateError, null, 2));
            return MessageWaiting.edit("[X] Erro ao salvar suas credenciais do CS no banco de dados.");
        }

        const { error: matchError } = await supabase
            .from("cs_matches")
            .insert({
                discord_id: discordId,
                kills: kills,
                deaths: deaths,
                assists: assists,
                mvps: mvps
            })            

        if(matchError) {
            console.error("[X][X] Erro ao inserir partida:", JSON.stringify(matchError, null, 2));
            return MessageWaiting.edit("[X] Credenciais salvas, mas falha ao importar o placar da partida.")
        }

        return MessageWaiting.edit(
            "[REG-OK] **PERFIL ATUALIZADO E PRIMEIRA PARTIDA IMPORTADA!**\n\n" +
            "Seus dados já estão no nosso banco e você pode conferi-los instantaneamente usando `!statuscs`.\n\n" +
            "**[WARNING!] Política de Sincronização (Anti-Ban):**\n" +
            "Para garantir a segurança da sua conta Steam e evitar bloqueios no Game Coordinator da Valve, a Klukai realiza o rastreamento autônomo de novas partidas em um ciclo de **1 hora**.\n\n" +
            "*Nota: Este intervalo de segurança está em fase de testes e poderá sofrer ajustes operacionais no futuro.*"
        );

    } catch (erro: any) {
        console.error("Erro nos serviços do CS:", erro);
        
        if (erro.message && erro.message.includes("Share Code")) {
            message.channel.send(`[X][X] <@${discordId}>, A Valve recusou os códigos. Verifique se o AuthCode e LastMatch estão corretos e são os mais recentes.`);
        } else {
            message.channel.send(`[X][X] <@${discordId}>, Falha de conexão. O Game Coordinator da Valve pode estar offline ou demorou a responder.`);
        }
    }
}