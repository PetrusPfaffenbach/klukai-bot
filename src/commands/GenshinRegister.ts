import { Message } from "discord.js";
import { supabase } from "../services/supabase";
import { SteamProfile } from "../services/steamServices";
import { perfilGenshin } from "../services/enkaServices";


export async function GenshinRegister(message: any, discordIdUser: string) {
    
    const FormattedMessage = message.content.toLowerCase();

    try {
        const {data: userData, error: fetchError} = await supabase
            .from("users")
            .select("genshin_uid")
            .eq("discord_id", discordIdUser)
            .maybeSingle();
        
        if (fetchError) {
            console.error("[SUPABASE ERRO]:", fetchError);
            return message.reply("[X][X][X] Erro interno ao consultar o banco de dados.");
        }


    if(FormattedMessage.startsWith("!registrar-genshin")) {
        const regex2 = message.content.match(/\d{8,10}/);
        const uidExtract = regex2 ? regex2[0] : null;
    
    if(!uidExtract) {
        return message.reply("[!] UID Inválido! Digite um UID válido do Genshin!")
    }

    const { error: upsertError } = await supabase
        .from("users")
        .upsert({
            discord_id: discordIdUser,
            genshin_uid: uidExtract
        })

        if (upsertError) {
                console.error("[SUPABASE ERRO]:", upsertError);
                return message.reply("[X][X] Erro ao salvar seu SteamID no banco de dados.");
            }
        return message.reply(`[OK] **SUCESSO** Seu Discord foi vinculado ao seu UID do Genshin`)
    }
    
        if(FormattedMessage === "!perfil-genshin") {
            const savedUid = userData?.genshin_uid;
        
            if(!savedUid) {
                return message.reply("**[!]** Você ainda não registrou seu UID do Genshin! utilize \`!registrar_genshin <seu_uid>\` primeiro.")
            }
            return perfilGenshin(message, savedUid);
        }
    } catch (erro) {
        console.error("Falha crítica no comando de Enka:", erro);
        return message.reply("[X][X] Ocorreu um erro interno ao processar o comando da Enka.");
    }
    
}