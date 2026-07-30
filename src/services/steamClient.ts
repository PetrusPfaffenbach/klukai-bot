import "dotenv/config";

const SteamUser = require('steam-user');
const CS2 = require('node-cs2');

const steamClient = new SteamUser();
const cs2 = new CS2(steamClient);
let cooldownActual = 30000;
const cooldownLimit = 120000;


cs2.on('debug', (msg: string) => {
    console.log(`[CS2 GC DEBUG] ${msg}`);
});

steamClient.on('error', (err: any) => {
    console.error(`[STEAM ERROR]`, err);
});

cs2.on('connectedToGC', () => {
    console.log('[CS2] Game Coordinator pronto e online!');
});


cs2.on('disconnectedFromGC', (reason: any) => {
    console.log(`[CS2 WARN] A conexão com o Game Coordinator caiu! (motivo: ${reason}) Entrando em Estado Zombie...`);
    console.log('[CS2 WARN] Reiniciando o jogo em 15 segundos para forçar nova sessão...');
    
    
    steamClient.gamesPlayed([]); 
    
    setTimeout(() => {

        steamClient.gamesPlayed([730]); 
    }, 15000);
});

steamClient.on('disconnected', (eresult: any, msg: string) => {
    console.log(`[STEAM ERROR] Desconectado da Valve! Motivo: ${msg} (Código: ${eresult})`)

    const minutes = (cooldownActual / 60000).toFixed(1);
    const warningTime = cooldownActual < 60000 ? `${cooldownActual / 1000} segundos` : `${minutes} minutos`
    console.log(`[STEAM REBOOT] Rede instável Tentando relogar em ${warningTime}`);

    setTimeout(() => {
        steamClient.logOn({
            accountName: process.env.STEAM_BOT_USER, 
            password: process.env.STEAM_BOT_PASS
        });
    }, cooldownActual);

    cooldownActual *= 2;
    if (cooldownActual >= cooldownLimit) {
        cooldownActual = cooldownLimit;
    }
});


    steamClient.on('playingState', (blocked: boolean, playingApp: any) => {
    let isPlayingCS2 = false;

    if(Array.isArray(playingApp)) {
        isPlayingCS2 = playingApp.includes(730) || playingApp.includes('730');
    } else if (playingApp === 730 || playingApp === '730') {
        isPlayingCS2 = true;
}
    if (!isPlayingCS2) {
        console.log("[STEAM WARN] O bot parou de jogar CS2 inesperadamente. Reabrindo...");
        steamClient.gamesPlayed([730]);
    }
});

    export function iniciarSteam() {

        steamClient.logOn({
        accountName: process.env.STEAM_BOT_USER, 
        password: process.env.STEAM_BOT_PASS
    });
    
        steamClient.on('loggedOn', () => {
                console.log('[STEAM] Bot conectado à rede da Valve com sucesso!');
                
                
                steamClient.setPersona(1); // 1 significa Online
                steamClient.gamesPlayed([730]); 
            });
    };


export async function buscarPartidaCS2(steamId64: string, authCode: string, matchToken: string): Promise<any> {
    

    if (!cs2.haveGCSession) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    if (!cs2.haveGCSession) {
        throw new Error("Game Coordinator não está pronto. O bot acabou de ligar ou a Steam caiu. Tente em 10 segundos.");
    }

    const apiKey = process.env.STEAM_API_KEY; 
    const url = `https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key=${apiKey}&steamid=${steamId64}&steamidkey=${authCode}&knowncode=${matchToken}`;
    const resposta = await fetch(url);
    const urlSeguraParaLog = url.replace(apiKey as string, "CHAVE_OCULTADA_POR_SEGURANCA");

    console.log(`\n[RAIO-X VALVE] A URL gerada foi:\n${urlSeguraParaLog}\n`);
    
    
    if (!resposta.ok) {
       
        const htmlDeErro = await resposta.text();
        throw new Error(`Erro HTTP ${resposta.status} na API da Steam. Resposta: ${htmlDeErro.substring(0, 100)}...`);
    }

    let dadosApi;
    try {
        dadosApi = await resposta.json();
    } catch (e) {
        throw new Error("A API da Steam devolveu HTML em vez de JSON num código HTTP 200 (Muito raro).");
    }


    
    const shareCode = dadosApi?.result?.nextcode;
    
    if (!shareCode || shareCode === "n/a") {
        throw new Error("Não foi possível gerar o Share Code com as credenciais fornecidas.");
    }
    
    console.log(`[CS2] Share Code resgatado com sucesso: ${shareCode}`);
    console.log(`[CS2] Pedindo o placar para o Game Coordinator...`);

    return new Promise((resolve, reject) => {
        
        cs2.requestGame(shareCode);

        
        const timeout = setTimeout(() => {
            cs2.removeListener('matchList', listener); 
            reject(new Error("Timeout: O GC da Valve demorou muito para responder (30s)."));
        }, 30000);

        const listener = (matches: any, data: any) => {
            console.log("[CS2 GC] O Evento matchList disparou!"); 
            
            if (matches && matches.length > 0) {
                clearTimeout(timeout); 
                cs2.removeListener('matchList', listener); 
                
                
                resolve({
                    shareCode: shareCode,
                    dadosMatch: matches[0] || data?.matches?.[0]
                }); 
            }
        }

        cs2.on('matchList', listener);
    });
}