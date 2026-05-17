import { Message } from "discord.js";
import { supabase } from "./supabase"

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

        const { error: updateError } = await supabase
            .from("users")
            .update({
                steam_auth_token: authCode,
                steam_know_match: knowMatch
            })
            .eq("discord_id", discordId);

            if (updateError) {
            // O JSON.stringify força o Node a mostrar o erro na tela, custe o que custar!
            console.error("[X][X] Erro detalhado no Supabase:", JSON.stringify(updateError, null, 2));
            return MessageWaiting.edit("[X] Erro ao salvar suas credenciais do CS no banco de dados.");
        }

        
            

        return MessageWaiting.edit ("[OK] **PERFIL ATUALIZADO!** Dados do CS2 vinculados à conta com sucesso.")
    } catch (erro) {
        console.error("Erro nos serviços do CS", erro);
        message.channel.send(`[X][X] <@${discordId}>, Falha crítica ao processar registro.`);
    }
}