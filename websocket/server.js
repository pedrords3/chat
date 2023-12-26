const WebSocket = require('ws');
// const server = new WebSocket.Server({ port: 3000 });
// import { WebSocket, WebSocketServer } from "ws";
// const wss = new WebSocketServer({port: 8080})

const {WebSocketServer} = require("ws");
const dotenv = require("dotenv");
const perguntas = require("./perguntas");

dotenv.config()
const server = new WebSocketServer({port: process.env.PORT || 8080 })

const salas = new Map(); //* Mapa de salas (id da sala -> array de clientes)


const usuariosOnline = new Set();

let logMessages = []; //* Lista para armazenar mensagens
let quantidadeUsuariosOnline = 0;
var idUsuario = 0;
var ArrayUsuarios = [];
let sequenciaIds = [];

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
                entrarNaSala(socket, salaId);
            } else if (data.type === 'criarSala') {
                criarSala(socket);
            }
           
            if (data.type === 'enter' && !usuario) {
                //* Se o tipo de mensagem for 'enter', definir o nome do usuário
                usuario = data.sender;
                
                if (!usuariosOnline.has(usuario)) {
                    quantidadeUsuariosOnline++;
                    usuariosOnline.add(usuario);
                }
                
                console.log(`Usuário definido como: ${usuario}`);
                
                idUsuario++;
                
                console.log("Id Usuario "+idUsuario);
                //* Enviar mensagem de entrada para o novo cliente
                //? PEGAR E PASSAR O ID DO USUARIO
                const enterMessage = { type: 'enter', data: 'Entrou no chat', sender: usuario, qtdusuarios: quantidadeUsuariosOnline, iduser: idUsuario };
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(enterMessage));
                    }
                }); 
                broadcastUsuariosOnline();
                 
                //* Enviar quantidade atualizada de usuários online para o cliente que acabou de se conectar
                socket.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));

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
                console.log(`Resposta recebida de ${data.sender}: ${data.resposta}`);
    
                //* Adicionar resposta ao log
                logMessages.push({ sender: data.sender, data: data.data, resposta: data.resposta });
    
                //* Imprimir o log de mensagens no console do servidor
                console.log('Log de mensagens:', logMessages);
    
                //* Transmissão da resposta para todos os clientes
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'answer', data: data.data, sender: data.sender, resposta: data.resposta }));
                    }
                });
            }else if (data.type === 'exit') {
                quantidadeUsuariosOnline--;

                usuariosOnline.delete(usuario);

                //* Enviar lista atualizada de usuários online para todos os clientes
                broadcastUsuariosOnline();
                broadcastQuantidadeUsuariosOnline();
                socket.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));
            }
            else if (data.type === 'hostDefinido') {
                console.log("Host definido: "+data.nomeuser);
            // }else if(data.type === 'iniciarRodada'){
            }else if(data.type === 'novaRodada'){
                iniciarNovaRodada();
            }
        } catch (error) {
            console.error('Erro ao analisar a mensagem JSON:', error);
        }

    });

    function broadcastQuantidadeUsuariosOnline() {
        //* Enviar quantidade atualizada de usuários online para todos os clientes
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'quantidadeUsuariosOnline', data: quantidadeUsuariosOnline }));
            }
        });
    }

    function broadcastUsuariosOnline() {
        const usuariosArray = Array.from(usuariosOnline);
        const usuariosOnlineMessage = { type: 'usuariosOnline', data: usuariosArray };

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
        const exitMessage = { type: 'exit', data: 'Saiu do chat', sender: usuario };
    
        //* Remover o usuário da lista de usuários online
        if (usuariosOnline.has(usuario)) {
            usuariosOnline.delete(usuario);
            quantidadeUsuariosOnline--;
    
            //* Enviar lista atualizada de usuários online para todos os clientes
            broadcastUsuariosOnline();
            broadcastQuantidadeUsuariosOnline();
    
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
    // iniciarNovaRodada(); // INICIANDO SEMPRE QUE ALGUEM NOVO USUARIO ENTRA OU ATIVA NO SERVIDOR
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
function criarSala(socket) {
    const novaSalaId = gerarSalaId(); // Implemente a geração de IDs de sala
    const novaSala = [socket];
    salas.set(novaSalaId, novaSala);
    // Adicione mais lógica conforme necessário (como notificar outros clientes da nova sala)
    socket.send(JSON.stringify({ type: 'salaCriada', data: { salaId: novaSalaId } }));
}

//* Gerar um ID de sala único
function gerarSalaId() {
    // Lógica para gerar um ID único (pode ser um UUID ou algo semelhante)
    // Certifique-se de implementar uma lógica robusta para evitar colisões de IDs
}


//TODO-----------SISTEMA DE PERGUNTAS E RODADAS--------------------------------
let rodadaAtual = 0;
let perguntaAtual;

function iniciarNovaRodada() {
    rodadaAtual++;
    perguntaAtual = obterPerguntaAleatoria();
     //* Obter o próximo ID na sequência para ser o host
     const proximoHostId = sequenciaIds.shift();
     sequenciaIds.push(proximoHostId);
 
     enviarNovaRodadaParaClientes(proximoHostId);
    
}

function obterPerguntaAleatoria() {
    // Lógica para obter uma pergunta aleatória sem repetição
    // Certifique-se de implementar a lógica para evitar repetição de perguntas
    // Array shuffle para obter uma pergunta aleatória
    const perguntasEmbaralhadas = perguntas.slice().sort(() => Math.random() - 0.5);
    return perguntasEmbaralhadas[0];
}

function enviarNovaRodadaParaClientes(hostId) {
    const mensagemNovaRodada = {
        type: 'novaRodada',
        data: {
            rodada: rodadaAtual,
            pergunta: perguntaAtual.pergunta,
            // opcoes: perguntaAtual.opcoes,
            // host: hostId
            host: 100
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