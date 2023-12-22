// const socket = new WebSocket('ws://localhost:3000');
// const socket = new WebSocket('ws://26.8.200.242:3000');
const socket = new WebSocket('wss://chat-tqep.onrender.com');

    let username = sessionStorage.getItem('username') || ''; //* Obter o nome de usuário armazenado na sessionStorage
    let lastPageReloadTime = parseInt(sessionStorage.getItem('lastPageReloadTime')) || 0; //* Obter o último tempo de recarregamento da página

    //!Add Load
    $("#loader").addClass("d-flex");
    $("#loader").css("display","block");
    $("#TextoLoad").text("Carregando Chat");

    //*  Event listener para quando a conexão é aberta
    socket.addEventListener('open', (event) => {
        console.log('Conectado ao servidor WebSocket');
        //! Remover Load
        $("#loader").css("display","none");
    	$("#loader").removeClass("d-flex"); 

        var url = new URL(window.location.href);

        // Lógica para permitir que o cliente escolha ou crie uma sala
        // const escolherSala = prompt('Digite o ID da sala para entrar ou deixe em branco para criar uma nova sala:');
        const escolherSala = url.searchParams.get('Sala');
        // alert(escolherSala);
        if (escolherSala) {
            socket.send(JSON.stringify({ type: 'joinSala', salaId: escolherSala }));
        } else {
            socket.send(JSON.stringify({ type: 'criarSala' }));
        }
        
        //* Se o nome de usuário ainda não estiver definido, solicitar e definir o nome de usuário
        if (!username) {
            // username = prompt('Digite seu nome de usuário:');
            console.log(username);
            // Obter a URL atual
            
            // Obter o valor do parâmetro 'User'
            username = url.searchParams.get('User');
            sessionStorage.setItem('username', username); //* Armazenar o nome de usuário na sessionStorage

            url.searchParams.delete('User');
            url.searchParams.delete('Sala');

            // Atualizar a URL no histórico do navegador
            history.replaceState(null, '', url.href);

        }

        //* Enviar mensagem de entrada para o servidor
        socket.send(JSON.stringify({ type: 'enter', sender: username }));

        //! Cria cartas runtime
        console.log("Criando cartas");
        CriaCartas();
    });

    //* Event listener para mensagens recebidas do servidor
    socket.addEventListener('message', (event) => {

        const chatDiv = document.getElementById('chat');
        const escolhasPlayersDiv = document.querySelector('.escolhasPlayers');
        const jogadoresOnlineDiv = document.getElementById('jogadoresOnline');
        const quantidadeUsuariosOnlineSpan = document.getElementById('PlayersOn'); // Adicione esta linha

    
        const messageData = JSON.parse(event.data); //* Json retorno do servidor
        // console.log(messageData);
        const messageType = messageData.type;
        const messageText = messageData.data;
        const senderName = messageData.sender;
        const respostaText = messageData.resposta;
    
        const isCurrentUser = senderName === username;
    
        console.log("↓");
        console.log(messageType);
        console.log("↑");

        if (messageType === 'enter' ) { //* Abrir
            chatDiv.innerHTML += `<p><strong>${senderName}:</strong> ${messageText}</p>`;

        } else if (messageType === 'history') { //* Historico Log
            messageData.data.forEach((message) => {
                chatDiv.innerHTML += formatMessage(message);
            });
        } else if (messageType === 'answer') { //* Clicar em uma carta
            //* Exibir resposta escolhida na div "escolhasPlayers"
            escolhasPlayersDiv.innerHTML = escolhasPlayersDiv.innerHTML;
            escolhasPlayersDiv.innerHTML += `<p>${senderName} escolheu: ${respostaText}</p>`;

        } else if (messageType === 'message'){ //* Digitar no Chat
            chatDiv.innerHTML += formatMessage({ sender: senderName, data: messageText });

        }else if (messageType === 'usuariosOnline') { //* Atualizar a lista de jogadores online
            const usuariosOnlineArray = messageData.data;
            const usuariosOnlineHTML = usuariosOnlineArray.map(user => `<h5 class="textoJogadoresOn">${user}</h5>`).join('');
            jogadoresOnlineDiv.innerHTML = usuariosOnlineHTML;

        }else if (messageType === 'quantidadeUsuariosOnline') {//* Atualizar a quantidade de usuários online
            const quantidadeUsuariosOnline = messageData.data;
            quantidadeUsuariosOnlineSpan.innerText = quantidadeUsuariosOnline;

        }else if (messageType === 'exit') {
            //* Remover o nome do jogador que saiu da página
            const jogadorSaiu = messageData.sender;
            const jogadoresOnlineDiv = document.getElementById('jogadoresOnline');
            console.log(jogadoresOnlineDiv);
    
            //* Remover o jogador da lista
            const jogadorElements = jogadoresOnlineDiv.getElementsByClassName('textoJogadoresOn');
            Array.from(jogadorElements).forEach((element) => {
                if (element.textContent.includes(jogadorSaiu)) {
                    element.remove();
                }
            });
    
            //* Atualizar a quantidade de jogadores online
            const quantidadeUsuariosOnlineSpan = document.getElementById('PlayersOn');
            quantidadeUsuariosOnlineSpan.innerText = messageData.data;
    
            chatDiv.innerHTML += `<p><strong>${senderName}:</strong> ${messageText}</p>`;

        }else if (messageType === 'novaRodada') { //* Rodada Pergunta
            const rodadaAtual = messageData.data.rodada;
            const pergunta = messageData.data.pergunta;
            const opcoes = messageData.data.opcoes;
    
            console.log(`Iniciando a rodada ${rodadaAtual}`);
            // console.log(`Pergunta: ${pergunta}`);
            // console.log(`Opções: ${opcoes.join(', ')}`);
    
            // Implemente a lógica para exibir a pergunta e opções no cliente
            const perguntaRodada = document.getElementById('question');
            perguntaRodada.innerText = pergunta;
            const numRodada = document.getElementById('numPergunta');
            numRodada.innerText = "PERGUNTA "+ rodadaAtual;

        }else if (messageType === 'erroSala') {
            console.log("Sala não encontrada");
         }else if (messageType === 'salaCriada') {
            alert("Bem vindo a sala: "+messageText);
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
document.addEventListener('click', (event) => {
    const selectedAnswer = event.target.closest('.answer');
    if (selectedAnswer) {
        const answerText = selectedAnswer.textContent.trim();
        socket.send(JSON.stringify({ type: 'answer', data: 'Respondeu', sender: username, resposta: answerText }));
    }
});

function CriaCartas(){
    var str = '';
    var dados = $("#resposta");

    for(let i = 1; i <= 10 ; i++){
        str += `<div class="cartas text-white cursorPointer" codigo="`+i+`">
                    <div class="carta-content answer">Resposta `+i+`</div>
                </div>`;
    }
    
    dados.append(str);
}
