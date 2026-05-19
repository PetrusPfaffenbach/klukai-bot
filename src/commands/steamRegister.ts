import { Message } from "discord.js";
import { supabase } from "../services/supabase";
import { SteamProfile } from "../services/steamServices";

export async function steamRegister(message: any , discordIdUser: string) {

    const FormattedMessage = message.content.toLowerCase();

    try {
        
        const { data: userData, error: fetchError} = await supabase
        .from("users")
        .select("steam_id_64")
        .eq("discord_id", discordIdUser)
        .maybeSingle();
        
        if (fetchError) {
            console.error("[SUPABASE ERRO]:", fetchError);
            return message.reply("[X][X][X] Erro interno ao consultar o banco de dados.");
        }
        
        if(FormattedMessage.startsWith("!registrar-steam")) {
            const regex = message.content.match(/\d{17}/);
            const steamIdExtract = regex ? regex[0] : null;
            
            if(!steamIdExtract) {
                return message.reply("[!]SteamID64 não encontrado ou inválido!. Cole seu ID de 17 dígitos ou link completo do perfil");
            }
            
            const { error: upsertError } = await supabase
            .from("users")
            .upsert({
                discord_id: discordIdUser,
                steam_id_64: steamIdExtract
            });
            if (upsertError) {
                console.error("[SUPABASE ERRO]:", upsertError);
                return message.reply("[X][X][X] Erro ao salvar seu SteamID no banco de dados.");
            }
            
            return message.reply(`[OK] **SUCESSO!** Seu Discord foi vinculado ao SteamID com sucesso.`);
        }
        
        if(FormattedMessage === "!perfil-steam") {
            const steamIdSave = userData?.steam_id_64;
            
            if(!steamIdSave) {
                return message.reply("**[!]** Você ainda não se registrou! Digite \`!registrar <seu_link_steam>\`, para ver seu perfil!")
            }
            
            SteamProfile(message, steamIdSave);
        }
    } catch(error) {
        console.error("Falha crítica no comando de Steam:", error);
        return message.reply("[X][X] Ocorreu um erro interno ao processar o comando da Steam.");
    }
}