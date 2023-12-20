const WebSocket = require('ws');
// const server = new WebSocket.Server({ port: 3000 });

// import { WebSocket, WebSocketServer } from "ws";

// const wss = new WebSocketServer({port: 8080})


const {WebSocketServer} = require("ws")
const dotenv = require("dotenv")

dotenv.config()
const server = new WebSocketServer({port: process.env.PORT || 8080 })

// Adicione esta variável no início do seu arquivo server.js
const usuariosOnline = new Set();


let logMessages = []; //* Lista para armazenar mensagens

server.on('connection', (socket) => {
    console.log('Cliente conectado');

    //* Declarar Usuario fora do escopo do evento 'close'
    let Usuario = '';

    //* Enviar histórico de mensagens existentes para o novo cliente
    if (logMessages.length > 0) {
        const historyMessage = { type: 'history', data: logMessages, sender: 'Sistema' };
        socket.send(JSON.stringify(historyMessage));
    }

    //* Event listener para mensagens do cliente
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
           
            console.log("----------------------");
            console.log(data.type);
            if (data.type === 'enter') {
                //* Se o tipo de mensagem for 'enter', definir o nome do usuário
                Usuario = data.sender;
                usuariosOnline.add(Usuario);
                 // Enviar lista atualizada de usuários online para todos os clientes
                
                console.log(`Usuário definido como: ${Usuario}`);
                

                //* Enviar mensagem de entrada para o novo cliente
                const enterMessage = { type: 'enter', data: 'Entrou no chat', sender: Usuario };
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(enterMessage));
                    }
                }); 
                broadcastUsuariosOnline();
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
    
                // Adicionar resposta ao log
                logMessages.push({ sender: data.sender, data: data.data, resposta: data.resposta });
    
                // Imprimir o log de mensagens no console do servidor
                console.log('Log de mensagens:', logMessages);
    
                // Broadcast da resposta para todos os clientes
                server.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'answer', data: data.data, sender: data.sender, resposta: data.resposta }));
                    }
                });
            }else if (data.type === 'exit') {
                usuariosOnline.delete(Usuario);

                // Enviar lista atualizada de usuários online para todos os clientes
                broadcastUsuariosOnline();
            }
        } catch (error) {
            console.error('Erro ao analisar a mensagem JSON:', error);
        }

    });

    function broadcastUsuariosOnline() {
        const usuariosArray = Array.from(usuariosOnline);
        const usuariosOnlineMessage = { type: 'usuariosOnline', data: usuariosArray };
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(usuariosOnlineMessage));
            }
        });
    }

    //* Event listener para fechar a conexão
    socket.on('close', () => {
        console.log('Cliente desconectado');

        //* Enviar mensagem de saída para os outros clientes
        const exitMessage = { type: 'exit', data: 'Saiu do chat', sender: Usuario };
        server.clients.forEach((client) => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(exitMessage));
            }
        });
    });
});

