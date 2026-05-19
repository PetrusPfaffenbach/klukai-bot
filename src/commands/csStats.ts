import { EmbedBuilder, Message } from "discord.js";
import { supabase } from "../services/supabase";
import { buscarPartidaCS2 } from "../services/steamClient";

export async function executeStatusCS(message: Message, discordIdUser: string) {
    try {
        const WaitingMessage = await message.reply("[...] Puxando dados dos servidores da Valve. . . ");
        
        const { data: userData, error } = await supabase
            .from("users")
            .select("steam_id_64, steam_auth_token, steam_know_match")
            .eq("discord_id", discordIdUser)
            .maybeSingle();
            
        if (error || !userData || !userData.steam_auth_token || !userData.steam_id_64) {
            return WaitingMessage.edit("[!!] Você não vinculou seu CS2 ou sua Steam! Use `!registrar-cs <AuthCode> <LastMatch>`");
        }

        const { shareCode, dadosMatch: partida } = await buscarPartidaCS2(
            userData.steam_id_64,
            userData.steam_auth_token,
            userData.steam_know_match
        );

        
        const accountConversor = (BigInt(userData.steam_id_64) - 76561197960265728n).toString();
        console.log(`[Klukai] Seu ID curto procurado: ${accountConversor}`);

        const AllRounds = partida.roundstatsall || [];

        let kills = 0;
        let deaths = 0;
        let assists = 0;
        let mvps = 0;
        let finder = false;

        if (AllRounds.length > 0) {
            const lastMatch = AllRounds[AllRounds.length - 1];
            const account_ids = lastMatch?.reservation?.account_ids || [];
            const playerIndex = account_ids.findIndex((id: any) => id.toString() === accountConversor);
            
            if (playerIndex !== -1) {
                finder = true;
                kills = lastMatch.kills?.[playerIndex] ?? 0;
                deaths = lastMatch.deaths?.[playerIndex] ?? 0;
                assists = lastMatch.assists?.[playerIndex] ?? 0;
                mvps = lastMatch.mvps?.[playerIndex] ?? 0;
                console.log(`[SUCESSO] Placar extraído: K:${kills} | D:${deaths} | A:${assists} | MVPs:${mvps}`);
            }
        }

        const FinalKda = ((kills + assists) / (deaths === 0 ? 1 : deaths)).toFixed(2);

        let CardColor = "#808080";
        if (finder) {
            if (parseFloat(FinalKda) >= 1.5) CardColor = "#00FF00";
            else if (parseFloat(FinalKda) >= 1.0) CardColor = "#FFFF00";
            else CardColor = "#FF0000";
        }

        const embed = new EmbedBuilder()
            .setColor(CardColor as any)
            .setTitle('[OUTPUT] Suas Últimas Estatísticas do CS2')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(finder
                ? 'Dados reais extraídos com sucesso do Game Coordinator da Valve. [!] VERIFIQUE NO CS SE OS DADOS ESTÃO CORRETOS! [!]'
                : '[!][X] Partida encontrada, mas não conseguimos mapear suas estatísticas de jogador.'      
            )   
            .addFields (
                { name: 'K/D/A', value: `\`${kills} / ${deaths} / ${assists}\``, inline: true },
                { name: 'KAD', value: `💀 **${FinalKda}**`, inline: true }, // Ajustado para "KAD"
                { name: '⭐ MVPs', value: `\`${mvps}\` vezes`, inline: true }
            )
            .setFooter({ text: 'CSBotstats • CS2 Tracking' }) 
            .setTimestamp();
            
        return WaitingMessage.edit({
            content: finder ? "[CS] Estatísticas calculadas com sucesso!" : "[X] Dados Indisponíveis.",
            embeds: [embed]
        });
    } catch (erro) {
        console.error("Erro ao puxar stats do CS2:", erro);
        return message.reply("[X][X] Ocorreu um erro interno ao processar a resposta da Valve.");
    }
}