import "dotenv/config";
import { supabase } from "./supabase";


export async function perfilGenshin(message: any, uid: string) {
    const url = `https://enka.network/api/uid/${uid}/`;
    const discordId = message.author.id;

    try {
        const Waitingmessage = await message.reply("Getting into Enka Servers")
    

    const awnser = await fetch(url, {

        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
    });

    console.log (`[O] RASTREADOR GENSHIN/ENKA: Status ${awnser.status} (${awnser.statusText})\n`)

    if(!awnser.ok) {
            return Waitingmessage.edit(`[X] A Enka recusou o pedido. Erro HTTP: \`${awnser.status}\`.`);
        }

        const dados = await awnser.json();
        const playerInfo = dados.playerInfo;

        if (!playerInfo) {
            return Waitingmessage.edit("[X] Esse UID existe, mas o perfil está sem informações públicas.");
        }

        const { error: dbError } = await supabase
            .from("users")
            .upsert({
                discord_id: discordId,
                genshin_uid: uid
            })

        const textoResposta =
            `✨ **PAINEL DE GENSHIN IMPACT** ✨\n` +
            `• **Nick no Jogo:** \`${playerInfo.nickname}\`\n` +
            `• **Rank de Aventura (AR):** \`Lv. ${playerInfo.level}\`\n` +
            `• **Mundo:** \`Nível ${playerInfo.worldLevel || 0}\`\n` +
            `• **Total de Conquistas:** \`${playerInfo.finishAchievementNum || 0}\` 🏆\n` +
            `• **Abismo Espiral:** \`Andar ${playerInfo.towerFloorIndex || 0} - Sala ${playerInfo.towerLevelIndex || 0}\`\n` +
            `• **Assinatura:** *"${playerInfo.signature || "Sem assinatura"}"*`;
        
        await Waitingmessage.edit(textoResposta);
    } catch (erro) {
        console.error(erro);
        message.reply("[X][X] Falha ao conectar a API da Enka.Network!")
    }

}
