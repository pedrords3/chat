const WebSocket = require('ws');
// const server = new WebSocket.Server({ port: 3000 });
// import { WebSocket, WebSocketServer } from "ws";
// const wss = new WebSocketServer({port: 8080})

const {WebSocketServer} = require("ws");
const dotenv = require("dotenv");
const perguntas = require("./Perguntas");

dotenv.config()
const server = new WebSocketServer({port: process.env.PORT || 8080 })

//TODO-----------SISTEMA DE PERGUNTAS--------------------------------
let rodadaAtual = 0;
let perguntaAtual;

function iniciarNovaRodada() {
    rodadaAtual++;
    perguntaAtual = obterPerguntaAleatoria();
    enviarNovaRodadaParaClientes();
}

function obterPerguntaAleatoria() {
    // Lógica para obter uma pergunta aleatória sem repetição
    // Certifique-se de implementar a lógica para evitar repetição de perguntas
    // Aqui, estamos usando um simples array shuffle para obter uma pergunta aleatória
    const perguntasEmbaralhadas = perguntas.slice().sort(() => Math.random() - 0.5);
    return perguntasEmbaralhadas[0];
}

function enviarNovaRodadaParaClientes() {
    const mensagemNovaRodada = {
        type: 'novaRodada',
        data: {
            rodada: rodadaAtual,
            pergunta: perguntaAtual.pergunta,
            opcoes: perguntaAtual.opcoes,
        },
    };

    // Enviar mensagem para todos os clientes
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(mensagemNovaRodada));
        }
    });
}

//TODO---------------↑↑↑----------------------------

const usuariosOnline = new Set();

let logMessages = []; //* Lista para armazenar mensagens
let quantidadeUsuariosOnline = 0;

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
           
            if (data.type === 'enter' && !usuario) {
                //* Se o tipo de mensagem for 'enter', definir o nome do usuário
                usuario = data.sender;
                
                if (!usuariosOnline.has(usuario)) {
                    quantidadeUsuariosOnline++;
                    usuariosOnline.add(usuario);
                }
                
                console.log(`Usuário definido como: ${usuario}`);
                
                //* Enviar mensagem de entrada para o novo cliente
                const enterMessage = { type: 'enter', data: 'Entrou no chat', sender: usuario };
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
    iniciarNovaRodada();
});

