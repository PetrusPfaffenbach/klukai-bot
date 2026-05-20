import { EmbedBuilder, Message } from "discord.js";
import { supabase } from "../services/supabase";

export async function executeStatusCS(message: Message, discordIdUser: string) {
    try {
        const WaitingMessage = await message.reply("[...] Consultando banco de dados local. . . ");
        
        const { data: lastestMatch, error } = await supabase
            .from("cs_matches")
            .select("kills, deaths, assists, mvps")
            .eq("discord_id", discordIdUser)
            .order("created-at", {ascending: false})
            .limit(1)
            .maybeSingle();

        if (error || !lastestMatch) {
            return WaitingMessage.edit("[!][!] Nenhuma partida encontrada no banco! Registre-se com `!registrar-cs` ou aguarde o ciclo de 1 hora do scanner")
        }
        
        const { kills, deaths, assists, mvps } = lastestMatch;

        const FinalKda = ((kills + assists) / (deaths === 0 ? 1 : deaths)).toFixed(2);

        let CardColor = "#FF0000"; // Vermelho por padrão
        if (parseFloat(FinalKda) >= 1.5) CardColor = "#00FF00"; // Verde
        else if (parseFloat(FinalKda) >= 1.0) CardColor = "#FFFF00"; // Amarelo
        

        const embed = new EmbedBuilder()
            .setColor(CardColor as any)
            .setTitle('[OUTPUT] Suas Últimas Estatísticas do CS2')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription('Dados recuperados instantaneamente do cache interno da Klukai. O rastreador autônomo atualiza as informações a cada 1 hora.')   
            .addFields (
                { name: 'K/D/A', value: `\`${kills} / ${deaths} / ${assists}\``, inline: true },
                { name: 'KAD', value: `💀 **${FinalKda}**`, inline: true },
                { name: '⭐ MVPs', value: `\`${mvps}\` vezes`, inline: true }
            )
            .setFooter({ text: 'CSBotstats • Fast Cache Retrieval' }) 
            .setTimestamp();
            
        return WaitingMessage.edit({
            content: "[CS] Estatísticas recuperadas com sucesso!",
            embeds: [embed]
        });

    } catch (erro) {
        console.error("Erro ao puxar stats do Supabase:", erro);
        return message.reply("[X][X] Ocorreu um erro interno de banco de dados.");
    }
}