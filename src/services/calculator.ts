import { EmbedBuilder } from "discord.js";
import { supabase } from "./supabase";

export async function registrarPartidaManual(
    interaction: any, 
    k: number, 
    d: number, 
    a: number, 
    cegos: number, 
    hs: number, 
    destaques: number
) {
    const discordId = interaction.user.id;

    try {
        // 1. VALIDAÇÃO BÁSICA
        if (isNaN(k) || isNaN(d) || isNaN(a) || isNaN(cegos) || isNaN(hs)) {
            return interaction.editReply("❌ Erro de formato: Você não digitou os números corretamente no formulário.");
        }

        // 2. SALVANDO NO SUPABASE
        const { error: insertError } = await supabase
            .from("cs_matches")
            .insert({
                discord_id: discordId,
                kills: k,
                deaths: d,
                assists: a,
                enemies_flashed: cegos,
                hs_percentage: hs,
                highlights: destaques
            });

        if (insertError) {
            console.error("[X] Erro ao salvar partida no Supabase:", insertError);
            return interaction.editReply(`❌ <@${discordId}>, erro interno ao salvar a partida no banco.`);
        }

        // 3. CÁLCULO DA SÚMULA
        const divisorDeaths = d === 0 ? 1 : d;
        const kdaPartida = parseFloat(((k + a) / divisorDeaths).toFixed(2));

        // 4. LÓGICA DE CORES DO EMBED (Dinâmico com base na performance!)
        let corCard = "#808080"; // Cinza neutro
        if (kdaPartida >= 1.5) corCard = "#00FF00"; // Verde (Mandou muito bem)
        else if (kdaPartida >= 1.0) corCard = "#FFFF00"; // Amarelo (Ficou positivo)
        else corCard = "#FF0000"; // Vermelho (Foi carregado)

        // 5. MONTANDO A INTERFACE RICA (EmbedBuilder)
        const embedSumula = new EmbedBuilder()
            .setColor(corCard as any)
            .setTitle('📊 Súmula de Partida Registrada')
            .setAuthor({ 
                name: interaction.user.username, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setDescription('Os dados foram computados e enviados para o servidor central da Klukai.')
            .addFields(
                { name: 'K/D/A', value: `\`${k} / ${d} / ${a}\``, inline: true },
                { name: 'KDA Final', value: `💀 **${kdaPartida}**`, inline: true },
                { name: 'Taxa de HS', value: `🎯 \`${hs}%\``, inline: true },
                { name: 'Utilidade', value: `👁️ \`${cegos}\` Inimigos Cegos`, inline: false },
                { name: '⭐ MVP / Destaque', value: `\`${destaques}\` vezes`, inline: true }
            )
            .setFooter({ text: 'Rastreador de Histórico do CS2' })
            .setTimestamp();

        // 6. RESPONDE A INTERAÇÃO ORIGINAL COM O CARD PRONTO
        return interaction.editReply({ embeds: [embedSumula] });

    } catch (erro) {
        console.error("Falha crítica no personalcalculator:", erro);
        interaction.editReply(`❌ <@${discordId}>, falha crítica ao computar os dados.`);
    }
}