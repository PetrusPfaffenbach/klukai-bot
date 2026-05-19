import "dotenv/config";

const SteamUser = require('steam-user');
const CS2 = require('node-cs2');

const steamClient = new SteamUser();
const cs2 = new CS2(steamClient);

// ==========================================
// MODO RASTREADOR: Vai printar tudo o que a Valve responder no terminal
// ==========================================
cs2.on('debug', (msg: string) => {
    console.log(`[CS2 GC DEBUG] ${msg}`);
});

steamClient.on('error', (err: any) => {
    console.error(`[STEAM ERROR]`, err);
});

cs2.on('ready', () => {
    console.log('[CS2] Game Coordinator pronto e online!');
});

    export function iniciarSteam() {
        steamClient.logOn({
            accountName: process.env.STEAM_BOT_USER, 
            password: process.env.STEAM_BOT_PASS
        });

        steamClient.on('loggedOn', () => {
                console.log('[STEAM] Bot conectado à rede da Valve com sucesso!');
                
                // Fica online e abre o CS2 direto, sem firulas
                steamClient.setPersona(1); // 1 significa Online
                steamClient.gamesPlayed([730]); 
            });
    };


export async function buscarPartidaCS2(steamId64: string, authCode: string, matchToken: string): Promise<any> {
    
    // Trava de Segurança: Verifica se o GC está online antes de gastar processamento
    if (!cs2.haveGCSession) {
        throw new Error("Game Coordinator não está pronto. O bot acabou de ligar ou a Steam caiu. Tente em 10 segundos.");
    }

    const apiKey = process.env.STEAM_API_KEY; 
    const url = `https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key=${apiKey}&steamid=${steamId64}&steamidkey=${authCode}&knowncode=${matchToken}`;
    
    const resposta = await fetch(url);
    const dadosApi = await resposta.json();
    
    const shareCode = dadosApi?.result?.nextcode;
    
    if (!shareCode || shareCode === "n/a") {
        throw new Error("Não foi possível gerar o Share Code com as credenciais fornecidas.");
    }
    
    console.log(`[CS2] Share Code resgatado com sucesso: ${shareCode}`);
    console.log(`[CS2] Pedindo o placar para o Game Coordinator...`);

    return new Promise((resolve, reject) => {
        
        cs2.requestGame(shareCode);

        // Aumentamos o tempo de tolerância para 30 segundos
        const timeout = setTimeout(() => {
            cs2.removeListener('matchList', listener); 
            reject(new Error("Timeout: O GC da Valve demorou muito para responder (30s)."));
        }, 30000);

        const listener = (matches: any, data: any) => {
            console.log("[CS2 GC] O Evento matchList disparou!"); 
            
            if (matches && matches.length > 0) {
                clearTimeout(timeout); 
                cs2.removeListener('matchList', listener); 
                
                // MUDANÇA AQUI: Agora devolvemos um objeto com o código e os dados!
                resolve({
                    shareCode: shareCode, // O código que a API gerou
                    dadosMatch: matches[0] // O placar bruto do GC
                }); 
            }
        };

        cs2.on('matchList', listener);
    });
}