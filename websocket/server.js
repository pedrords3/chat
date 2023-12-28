const WebSocket = require('ws');
// const server = new WebSocket.Server({ port: 3000 });
// import { WebSocket, WebSocketServer } from "ws";
// const wss = new WebSocketServer({port: 8080})

const {WebSocketServer} = require("ws");
const dotenv = require("dotenv");
const perguntas = require("./perguntas");
const respostas = require("./respostas");

dotenv.config()
const server = new WebSocketServer({port: process.env.PORT || 8080 })

const salas = new Map(); //* Mapa de salas (id da sala -> array de clientes)

const usuariosOnline = new Set();
const idUsersOnline = new Set();

let logMessages = []; //* Lista para armazenar mensagens
let quantidadeUsuariosOnline = 0;
// var idUsuario = 0;
let sequenciaIds = [];
let idPlayer = 0;
let ArrayPlayers = [];
let contagem = 0;

// let MaxPlayer = [1,2,3,4,5,6,7,8,9,10]; //* numero maximo de jogadores é 10

server.on('connection', (socket) => {
    console.log('Cliente conectado');

    //* Declarar usuario fora do escopo do evento 'close'
    let usuario = '';

    //* Enviar histórico de mensagens existentes para o novo cliente
    if (logMessages.length > 0) {
        const historyMessage = { type: 'history', data: logMessages, sender: 'Sistema' };
        socket.send(JSON.stringify(historyMessage));
    }

    //* Event listener para mensagens do cliente
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'joinSala') {
                const salaId = data.salaId;
                // entrarNaSala(socket, salaId);
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'salaCriada', data: salaId }));
                    }
                });

            } 
            // else if (data.type === 'criarSala') {
            //     criarSala(socket);
            // }
           
            else if (data.type === 'enter' && !usuario) {
                //* Se o tipo de mensagem for 'enter', definir o nome do usuário
                usuario = data.sender;        
                idPlayer = data.idusuario; 
                
                //* Guarda Id do usuario
                ArrayPlayers.push(idPlayer);

                if (!usuariosOnline.has(usuario)) {
                    quantidadeUsuariosOnline++;
                    usuariosOnline.add(usuario);
                    idUsersOnline.add(idPlayer);
                    
                }
                
                console.log(`Usuário definido como: ${usuario}`);
                
                console.log("Id Usuario "+idPlayer);
                //* Enviar mensagem de entrada para o novo cliente
                const enterMessage = { type: 'enter', data: 'Entrou no chat', sender: usuario, qtdusuarios: quantidadeUsuariosOnline, iduser: idPlayer };
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(enterMessage));
                    }
                }); 
                               
                //* Enviar quantidade atualizada de usuários online para o cliente que acabou de se conectar
                broadcastUsuariosOnline();
                // socket.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));

            } else if (data.type === 'message') {
                console.log(`Recebido de ${data.sender}: ${data.data}`);

                //* Adicionar mensagem ao log
                logMessages.push({ sender: data.sender, data: data.data });

                //* Imprimir o log de mensagens no console do servidor
                console.log('Log de mensagens:', logMessages);

                //* Broadcast da mensagem para todos os clientes
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'message', data: data.data, sender: data.sender }));
                    }
                });
            }else if (data.type === 'answer') {
                console.log(data);
                console.log(`Resposta recebida de ${data.sender} - id = ${data.idusuario}: ${data.resposta}`);
    
                //* Adicionar resposta ao log
                logMessages.push({ sender: data.sender, data: data.data, resposta: data.resposta, iduser: data.idusuario });
    
                //* Imprimir o log de mensagens no console do servidor
                console.log('Log de mensagens:', logMessages);
    
                //* Transmissão da resposta para todos os clientes
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'answer', data: data.data, sender: data.sender, resposta: data.resposta, iduser: data.idusuario }));
                    }
                });
            }else if (data.type === 'exit') {
                quantidadeUsuariosOnline--;

                usuariosOnline.delete(usuario);
                idUsersOnline.delete(idPlayer);
                ArrayPlayers.delete(idPlayer); //* remove id do jogador que saiu

                //* Enviar lista atualizada de usuários online para todos os clientes
                broadcastUsuariosOnline();
                // broadcastQuantidadeUsuariosOnline();
                // socket.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));
            }else if(data.type === 'novaRodada'){
                const idHost = data.idUsuario;
                iniciarNovaRodada(idHost); //* inicia proxima rodada, e define o id do host

            }else if(data.type === 'finalizarRodada'){
                finalizarRodada();

            }else if(data.type === 'cartasRespostas'){

                let arrayRespostas = [];
                for(let i = 0; i < 10; i++){
                    arrayRespostas.push(respostasRandom());
                }
                
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'retornoRespostas', cartas: arrayRespostas }));
                    }
                });

            }else if(data.type === 'pontuacaoUsuario'){
                const idPontuador = data.idUsu;
                const Thiss = data.thiss;
                pontuacaoJogador(idPontuador, Thiss);
            
            }
        } catch (error) {
            console.error('Erro ao analisar a mensagem JSON:', error);
        }

    });

    function pontuacaoJogador(idPontuador, This){
        const usuariosArray = Array.from(usuariosOnline);
        const idUsuariosArray = Array.from(idUsersOnline);
        const pontuacao = { type: 'pontuacaoJogador', data: usuariosArray, qtdUsuarios: quantidadeUsuariosOnline, idUser: idUsuariosArray, pontuador: idPontuador, thiss: This };
        
        //* Enviar lista atualizada de usuários online para todos os clientes
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(pontuacao));
            }
        });
    }

    // function broadcastQuantidadeUsuariosOnline() {
    //     //* Enviar quantidade atualizada de usuários online para todos os clientes
    //     server.clients.forEach((client) => {
    //         if (client.readyState === WebSocket.OPEN) {
    //             client.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));
    //         }
    //     });
    // }

    function broadcastUsuariosOnline() {
        const usuariosArray = Array.from(usuariosOnline);
        const idUsuariosArray = Array.from(idUsersOnline);

        const usuariosOnlineMessage = { type: 'usuariosOnline', data: usuariosArray, qtdUsuarios: quantidadeUsuariosOnline, idUser: idUsuariosArray };

        //* Enviar lista atualizada de usuários online para todos os clientes
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(usuariosOnlineMessage));
            }
        });

        //* Atualizar a quantidade de usuários online
        updateQuantidadeUsuariosOnline();
    }

    function updateQuantidadeUsuariosOnline() {
        //* Enviar a quantidade atualizada de usuários online para todos os clientes
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));
            }
        });
    }

    //* Event listener para fechar a conexão
    socket.on('close', () => {
        console.log('Cliente desconectado');
        const exitMessage = { type: 'exit', data: 'Saiu do chat', sender: usuario, iduser: idPlayer };
    
        //* Remover o usuário da lista de usuários online
        if (usuariosOnline.has(usuario)) {
            usuariosOnline.delete(usuario);
            idUsersOnline.delete(idPlayer);

            quantidadeUsuariosOnline--;
    
            //* Enviar lista atualizada de usuários online para todos os clientes
            broadcastUsuariosOnline();
            // broadcastQuantidadeUsuariosOnline();
    
            const qtdUsuarios = { type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }; //* Atualiza quantidade de jogadores online
            //* Enviar mensagem de saída para os outros clientes
            server.clients.forEach((client) => {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                    //*Envia retorno para o client
                    client.send(JSON.stringify(exitMessage));
                    client.send(JSON.stringify(qtdUsuarios)); 
                }
            });
        }

    });
    
});

//* Entrar em uma sala existente
function entrarNaSala(socket, salaId) {
    if (salas.has(salaId)) {
        const sala = salas.get(salaId);
        sala.push(socket);
        // Adicione mais lógica conforme necessário (como notificar outros clientes da sala)
    } else {
        //* Sala não encontrada
        socket.send(JSON.stringify({ type: 'erroSala', data: 'Sala não encontrada.' }));
    }
}

//* Cliente criar uma nova sala
// function criarSala(socket) {
//     const novaSalaId = gerarSalaId(); // Implemente a geração de IDs de sala
//     const novaSala = [socket];
//     salas.set(novaSalaId, novaSala);
//     //? Adicione mais lógica conforme necessário (como notificar outros clientes da nova sala)
//     socket.send(JSON.stringify({ type: 'salaCriada', data: { salaId: novaSalaId } }));
// }

//* Gerar um ID de sala único
function gerarSalaId() {
    //* Gerar um ID único 
    //? Certifique-se de implementar uma lógica robusta para evitar colisões de IDs

    return 1;
}


//TODO-----------SISTEMA DE PERGUNTAS E RODADAS--------------------------------
let rodadaAtual = 0;
let perguntaAtual;
let contadorPlayers = 0;

function iniciarNovaRodada(idHost) {
    rodadaAtual++;
    perguntaAtual = obterPerguntaAleatoria();

    enviarNovaRodadaParaClientes(idHost);
    
}

function finalizarRodada(){
    //! Termina a rodada e pega o proximo host
    contadorPlayers++;
    
    //! Se contador de jogadores for maior ou igual ao array de player o contador zera novamente
    if(contadorPlayers >= ArrayPlayers.length){
        contadorPlayers = 0;
    }
    
    //* Obter o próximo ID na sequência para ser o host
    const proximoHostId = ArrayPlayers[contadorPlayers]; 
    sequenciaIds.push(proximoHostId);

    const mensagemNovaRodada = {
        type: 'finalizarRodada',
        data: {
            host: proximoHostId
        },
    };

    //* Enviar mensagem para todos os clientes
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(mensagemNovaRodada));
        }
    });

}

function obterPerguntaAleatoria() {
    // Lógica para obter uma pergunta aleatória sem repetição
    // Certifique-se de implementar a lógica para evitar repetição de perguntas
    // Array shuffle para obter uma pergunta aleatória
    const perguntasEmbaralhadas = perguntas.slice().sort(() => Math.random() - 0.5);
    return perguntasEmbaralhadas[0];
}

function respostasRandom(){ 
    const respotasEmbaralhadas = respostas.slice().sort(() => Math.random() - 0.5);
    return respotasEmbaralhadas[0];

}


function enviarNovaRodadaParaClientes(idHost) {
    const mensagemNovaRodada = {
        type: 'novaRodada',
        data: {
            rodada: rodadaAtual,
            pergunta: perguntaAtual.pergunta,
            host: idHost
        },
    };

    //* Enviar mensagem para todos os clientes
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(mensagemNovaRodada));
        }
    });
}


//TODO---------------↑↑↑----------------------------