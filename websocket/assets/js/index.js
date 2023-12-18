// const socket = new WebSocket('ws://localhost:3000');
// const socket = new WebSocket('ws://26.8.200.242:3000');
const socket = new WebSocket('wss://chat-tqep.onrender.com');
// console.log(socket);
        let username = sessionStorage.getItem('username') || ''; //* Obter o nome de usuário armazenado na sessionStorage
        let lastPageReloadTime = parseInt(sessionStorage.getItem('lastPageReloadTime')) || 0; //* Obter o último tempo de recarregamento da página

        //*  Event listener para quando a conexão é aberta
        socket.addEventListener('open', (event) => {
            console.log('Conectado ao servidor WebSocket');

            //* Se o nome de usuário ainda não estiver definido, solicitar e definir o nome de usuário
            if (!username) {
                username = prompt('Digite seu nome de usuário:');
                sessionStorage.setItem('username', username); //* Armazenar o nome de usuário na sessionStorage
            }

            //* Enviar mensagem de entrada para o servidor
            socket.send(JSON.stringify({ type: 'enter', sender: username }));
        });

        //* Event listener para mensagens recebidas do servidor
        socket.addEventListener('message', (event) => {
            const chatDiv = document.getElementById('chat');
            const escolhasPlayersDiv = document.querySelector('.escolhasPlayers'); // Adicionado
        
            const messageData = JSON.parse(event.data); //* Json retorno do servidor
            console.log(messageData);
            const messageType = messageData.type;
            const messageText = messageData.data;
            const senderName = messageData.sender;
            const respostaText = messageData.resposta;
        
            const isCurrentUser = senderName === username;
        
            if (messageType === 'enter' || messageType === 'exit') {
                chatDiv.innerHTML += `<p><strong>${senderName}:</strong> ${messageText}</p>`;
            } else if (messageType === 'history') {
                messageData.data.forEach((message) => {
                    chatDiv.innerHTML += formatMessage(message);
                });
            } else if (messageType === 'answer') {
                //* Exibir resposta escolhida na div "escolhasPlayers"
                escolhasPlayersDiv.innerHTML = escolhasPlayersDiv.innerHTML;
                escolhasPlayersDiv.innerHTML += `<p>${senderName} escolheu: ${respostaText}</p>`;
            } else {
                chatDiv.innerHTML += formatMessage({ sender: senderName, data: messageText });
            }
        
            chatDiv.scrollTop = chatDiv.scrollHeight;
        });
        

        //* Função para formatar a mensagem com destaque para o usuário atual
        function formatMessage(message) {
            const isCurrentUser = message.sender === username;
            const messageClass = isCurrentUser ? 'currentUserMessage' : 'otherUserMessage';
            const usernameClass = isCurrentUser ? 'username' : 'otherUsername';
        
            //* Verificar se a mensagem é uma resposta e estilizá-la de acordo
            const isAnswer = message.type === 'answer';
            const answerClass = isAnswer ? 'answerMessage' : '';
        
            return `<p class="${messageClass} ${answerClass}"><span class="${usernameClass}">${message.sender}:</span> ${message.data}</p>`;
        }
        
        // function formatMessage(message) {
        //     const isCurrentUser = message.sender === username;
        //     const messageClass = isCurrentUser ? 'currentUserMessage' : 'otherUserMessage';
        //     const usernameClass = isCurrentUser ? 'username' : 'otherUsername';
        //     return `<p class="${messageClass}"><span class="${usernameClass}">${message.sender}:</span> ${message.data}</p>`;
        // }

        //* Função para enviar mensagens
        function sendMessage() {
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim(); //* Remover espaços em branco do início e do final

            if (message !== '') {
                //* Enviar a mensagem para o servidor (como uma string)
                socket.send(JSON.stringify({ type: 'message', data: message, sender: username }));

                //* Limpar o campo de entrada
                messageInput.value = '';
            } else {
                //*Nada digitado           
            }
        }

        //* Controlar a recarga da página
        function reloadPage() {
            const currentTime = new Date().getTime();

            //* Verificar se já se passaram pelo menos 2 minutos desde o último recarregamento da página
            if (currentTime - lastPageReloadTime >= 2 * 60 * 1000) {
                sessionStorage.setItem('lastPageReloadTime', currentTime);
                return true; //* Permitir a recarga da página
            } else {
                //* Informar ao usuário que ele só pode recarregar a página a cada 2 minutos
                alert('Você só pode recarregar a página a cada 2 minutos.');
                return false; // Impedir a recarga da página
            }
        }

        //! enviar mensagem pelo enter
        document.getElementById('messageInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); //* Impedir que a tecla Enter insira uma nova linha no campo de texto
                sendMessage(); //* Chamar a função sendMessage() quando a tecla Enter for pressionada
            }
        });

    //! ENVIA RESPOSTA ESCOLHIDA
    const answerCards = document.querySelectorAll('.answer');
    answerCards.forEach((card) => {
        card.addEventListener('click', () => {
            const selectedAnswer = card.innerHTML.trim();
            // alert(selectedAnswer);
    
            // Enviar a resposta para o servidor
            // socket.send(JSON.stringify({ type: 'answer', data: selectedAnswer, sender: username }));
            socket.send(JSON.stringify({ type: 'answer', data: 'Respondeu', sender: username, resposta: selectedAnswer}));
        });
    });