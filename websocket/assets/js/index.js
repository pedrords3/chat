// const socket = new WebSocket('ws://localhost:3000');
// const socket = new WebSocket('ws://26.8.200.242:3000');
const socket = new WebSocket('wss://chat-tqep.onrender.com');

    let username = sessionStorage.getItem('username') || ''; //* Obter o nome de usuário armazenado na sessionStorage
    let lastPageReloadTime = parseInt(sessionStorage.getItem('lastPageReloadTime')) || 0; //* Obter o último tempo de recarregamento da página
    

    var idUser = '';
    var ArrayPlayers = [];
    var idHostaRodada = '';
    var hostMandante = '';
    //!Add Load
    $("#loader").addClass("d-flex");
    $("#loader").css("display","block");
    $("#TextoLoad").text("Aguarde, estamos preparando a sala");

    //*  Event listener para quando a conexão é aberta
    socket.addEventListener('open', (event) => {
        console.log('Conectado ao servidor WebSocket');
        //! Remover Load
        $("#loader").css("display","none");
    	$("#loader").removeClass("d-flex"); 

        var url = new URL(window.location.href);
        
        // Lógica para permitir que o cliente escolha ou crie uma sala
        // const escolherSala = prompt('Digite o ID da sala para entrar ou deixe em branco para criar uma nova sala:');
        let escolherSala = url.searchParams.get('Sala');

        if (!escolherSala) { //* Recarregou pagina e nao tem mais na url
            escolherSala = sessionStorage.getItem('salaId');
        }else{ //* Pegou id pela url 1ª vez
            sessionStorage.setItem('salaId', escolherSala);
        }
        console.log("Nº da sala "+escolherSala);
        socket.send(JSON.stringify({ type: 'joinSala', salaId: escolherSala }));
        
        //* Se o nome de usuário ainda não estiver definido - pega da url
        if (!username) {
            // username = prompt('Digite seu nome de usuário:');           
            //* Obter o valor do parâmetro 'User'
            username = url.searchParams.get('User');
            // console.log("Nome usuario: "+username);
            sessionStorage.setItem('username', username); //* Armazenar o nome de usuário na sessionStorage
            
            url.searchParams.delete('User'); //* Pega nome do usuario da url
            url.searchParams.delete('Sala'); //* Pega numero da sala da url

            //* Atualizar a URL no histórico do navegador
            history.replaceState(null, '', url.href);

            // Criar uma nova instância do objeto Date
            const dataAtual = new Date();
            // Obter os componentes da data e hora
            const ano = dataAtual.getFullYear();
            const mes = dataAtual.getMonth() + 1; // Os meses são zero-indexed (janeiro é 0)
            const dia = dataAtual.getDate();
            const hora = dataAtual.getHours();
            const minutos = dataAtual.getMinutes();
            const segundos = dataAtual.getSeconds();

            // Exibir a data e hora atual
            // console.log(`Data e Hora Atuais: ${ano}-${mes}-${dia} ${hora}:${minutos}:${segundos}`);
            //! monta id do usuario que entrou (pela data e hora atual)
            idUser = ano+mes+dia+hora+minutos+segundos;

            // alert("idUsuario: "+idUser);

            let dados = [{
                jogador: username,
                idjogador: idUser,
            }]

            ArrayPlayers.push(dados);
            sessionStorage.setItem('listaJogadores', ArrayPlayers);
            sessionStorage.setItem('idUser', idUser); //* guarda id do usuario
            console.log(ArrayPlayers);

        }

        idUser = sessionStorage.getItem('idUser'); //* ID usuario salvo da session

        //* Enviar mensagem de entrada para o servidor
        socket.send(JSON.stringify({ type: 'enter', sender: username, idusuario: idUser}));

        //! Cria cartas runtime
        // console.log("Criando cartas");
        // CriaCartas();
    });

    //* Event listener para mensagens recebidas do servidor
    socket.addEventListener('message', (event) => {

        const chatDiv = document.getElementById('chat');
        const escolhasPlayersDiv = document.querySelector('.escolhasPlayers');
        const jogadoresOnlineDiv = document.getElementById('jogadoresOnline');
        const quantidadeUsuariosOnlineSpan = document.getElementById('PlayersOn'); 

    
        const messageData = JSON.parse(event.data); //* Json retorno do servidor
        // console.log(messageData);
        const messageType = messageData.type;
        const messageText = messageData.data;
        const senderName = messageData.sender;
        const respostaText = messageData.resposta;
        const quantidadeUsuarios = messageData.qtdusuarios;
        
    
        const isCurrentUser = senderName === username;
    
        // console.log("↓");
        // console.log(messageType);
        // console.log("↑");

        if (messageType === 'enter' ) { //* Abrir
            chatDiv.innerHTML += `<p><strong>${senderName}:</strong> ${messageText}</p>`;
            console.log("RETORNO AO USUARIO ENTRAR");
            console.log(messageData);
            const idUsu = messageData.iduser; //? PEGAR O ID DO USUARIO QUE NÃO REPITA

            console.log("Id do Usuario: "+idUsu);

            DesabilitarCartas();
            if(quantidadeUsuarios == 1){
                console.log("O host é: "+senderName+ " com id: "+idUsu);
                $("#iniciarPartida").css("display","block");
                $("#whoHost").css("display","block");
                //! enviar para o servidor, nome do host
                // socket.send(JSON.stringify({ type: 'host', nomeuser: senderName, iduser: idUsu }));

            }
            // alert("Usuarios online: "+quantidadeUsuarios)

        } else if (messageType === 'history') { //* Historico Log
            messageData.data.forEach((message) => {
                chatDiv.innerHTML += formatMessage(message);
            });
        } else if (messageType === 'answer') { //* Clicar em uma carta
            //* Exibir resposta escolhida na div "escolhasPlayers"
            // escolhasPlayersDiv.innerHTML = escolhasPlayersDiv.innerHTML;
            // escolhasPlayersDiv.innerHTML += `<p>${senderName} escolheu: ${respostaText}</p>`;
            console.log("RETORNO DA RESPOSTA -----"); 
            console.log(messageData);
            //? CRIPTOGRAFAR ID DO USUARIO ??
            if(idUser == hostMandante){//* verificar se usuario é o host para poder responder a pergunta
                var str = 
            `<div class="carta-resposta cursorPointer" onclick="responderPergunta(this)" idUsuario=${messageData.iduser}>
                <p class="respostaSelecionada"> ${respostaText}</p>
                <div class="escolherResposta" >Escolher essa</div>
            </div>`
            } else{
                var str = 
                `<div class="carta-resposta cursorPointer">
                    <p class="respostaSelecionada"> ${respostaText}</p>
                </div>`
            }
            escolhasPlayersDiv.innerHTML += str;

        } else if (messageType === 'message'){ //* Digitar no Chat
            chatDiv.innerHTML += formatMessage({ sender: senderName, data: messageText });

        }else if (messageType === 'usuariosOnline') { //* Atualizar a lista de jogadores online
            const usuariosOnlineArray = messageData.data;
            const IdUserOnline = messageData.idUser;
            
            // console.log("NOME E ID USUARIO ONLINE RETORNO");
            // console.log(usuariosOnlineArray);
            // console.log(IdUserOnline[0]);

            // const usuariosOnlineHTML = usuariosOnlineArray.map(user => `<h5 class="textoJogadoresOn" >${user}<span class="pontosUsuario" i=`+IdUserOnline+`>0</span></h5>`).join('');
            const usuariosOnlineHTML = usuariosOnlineArray.map((user, index) => `<h5 class="textoJogadoresOn" >${user}<span class="pontosUsuario" i="${IdUserOnline[index]}">0</span></h5>`).join('');
            
            jogadoresOnlineDiv.innerHTML = usuariosOnlineHTML;
            const quantidadeUsuariosOnline = messageData.qtdUsuarios;
            quantidadeUsuariosOnlineSpan.innerText = quantidadeUsuariosOnline;

            // console.log("JOGADORES");
            // console.log(messageData);

        }
        else if (messageType === 'quantidadeUsuariosOnline') {//* Atualizar a quantidade de usuários online
            const quantidadeUsuariosOnline = messageData.data;
            quantidadeUsuariosOnlineSpan.innerText = quantidadeUsuariosOnline;
            // console.log("quantidade de jogadores");
            // console.log(messageData);

            
        }
        else if (messageType === 'exit') {
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

        }else if (messageType === 'novaRodada') { 
            const rodadaAtual = messageData.data.rodada;
            const pergunta = messageData.data.pergunta;
            const idHost = messageData.data.host;

            hostMandante = idHost;

            socket.send(JSON.stringify({ type: 'cartasRespostas', idHostRodada: idHost })); //* Enviar comando para receber as cartas de respostas ??

            console.log(`Iniciando a rodada ${rodadaAtual}`);
            // alert("Seu id é "+idUser+" e o host é "+idHost);
            DesabilitarCartas();
            if(idUser == idHost){ 
                console.log("NOVA RODADA, você é o host: "+idHost);//* Se for o host

            }else{
                HabilitarCartas(); //* Se não for o host
                $("#whoHost").css("display","none");
                console.log("NOVA RODADA, o Host é "+idHost);
            }
           
    
            // Implemente a lógica para exibir a pergunta e opções no cliente
            const perguntaRodada = document.getElementById('question');
            perguntaRodada.innerText = pergunta;
            const numRodada = document.getElementById('numPergunta');
            numRodada.innerText = "PERGUNTA "+ rodadaAtual;
            

        }else if(messageType === 'finalizarRodada'){
            console.log("Rodada encerrada, selecionando o proximo host");
            console.log(messageData.data);
            $("#escolhas").empty(); //* Limpa respostas
            
            const idHost = messageData.data.host; 
            // idHostaRodada = idHost;
            //!pegar o proximo host e ativar o botão de iniciar partida
            // console.log("Seu id usuario: "+idUser); 
            // console.log("HOST DA RODADA "+idHost);
            DesabilitarCartas(); //* Desabilita cartas de resposta

            if(idUser == idHost){ 
                console.log("você é o host: "+idHost);//* Se for o host
                // $("#iniciarPartida").css("display","block"); //* Exibe botão de iniciar partida
                $("#whoHost").css("display","block");
                //!MOSTRAR QUE É O HOST DA RODADA - (EXIBIR UM TEXTO, ICONE)
                //! iniciar proxima rodada
                socket.send(JSON.stringify({ type: 'novaRodada', idUsuario: idHost }));
               
            }else{
                //* Se não for o host
                console.log("o Host é "+idHost);
            }

           

        }else if(messageType === 'retornoRespostas'){
            console.log("RETORNO RESPOSTAS");
            console.log(messageData.cartas);
            CriaCartas(messageData.cartas);
            console.log("RETORNO HOST: "+messageData.idHost + " HOST DA RODADA: "+idUser);
            //! DESABILITAR CARTAS DE RESPOSTAS QND FOR O HOST DA RODADA
            if(messageData.idHost == idUser){
                DesabilitarCartas();
            }

        }else if(messageType === 'pontuacaoJogador'){
            console.log("--------------------PONTUAÇÃO--------------------");
            console.log(messageData.thiss);
            const pontuador = messageData.pontuador; 
            const This = messageData.thiss; 
            var contaPontos = parseInt(This)+1;
            // alert(contaPontos);

            const usuariosOnlineArray = messageData.data;
            const IdUserOnline = messageData.idUser;
            
            // if (IdUserOnline.indexOf(pontuador) !== -1) { // voltaaqui
            //     console.log("TEM ESSE PONTUADOR, AGORA PONTUAR");
            // }
            
            const usuariosOnlinePontos = usuariosOnlineArray.map((user, index) => {
                const pontosAntigos = parseInt($(`.pontosUsuario[i="${IdUserOnline[index]}"]`).text(), 10) || 0;
                const pontos = IdUserOnline[index] === pontuador ? pontosAntigos + 1 : pontosAntigos;
                return `<h5 class="textoJogadoresOn">${user}<span class="pontosUsuario" i="${IdUserOnline[index]}">${pontos}</span></h5>`;
            }).join('');
            // const usuariosOnlinePontos = usuariosOnlineArray.map((user, index) => {
            //     const pontos = IdUserOnline[index] === pontuador ? contaPontos : 0;
            //     return `<h5 class="textoJogadoresOn">${user}<span class="pontosUsuario" i="${IdUserOnline[index]}">${pontos}</span></h5>`;
            // }).join('');
        
                        
            jogadoresOnlineDiv.innerHTML = usuariosOnlinePontos;


        }else if (messageType === 'erroSala') {
            console.log("Sala não encontrada");

         }else if (messageType === 'salaCriada') {
            console.log("Bem vindo a sala: "+messageText);

         }else if(messageType === 'iniciarPartida'){
            console.log("Partida iniciada");

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
        socket.send(JSON.stringify({ type: 'answer', data: 'Respondeu', sender: username, resposta: answerText, idusuario: idUser }));
        DesabilitarCartas(); //* ao responder, desabilita cartas 
    }
    
});

function CriaCartas(arrayCartas) {

    var str = '';
    var dados = $("#resposta");
    

    for (let i = 0; i < arrayCartas.length; i++) {
        const resposta = arrayCartas[i].resposta;
        // console.log(resposta);
    
        str += `<div class="cartas text-white cursorPointer" codigo="${i + 1}">
                    <div class="carta-content answer">${resposta}</div>
                </div>`;
    }

    dados.append(str);

    //* Adiciona um identificador à div resposta para referência fácil
    dados.attr("id", "respostaContainer");
}
// function CriaCartas() {
//     var str = '';
//     var dados = $("#resposta");

//     for (let i = 1; i <= 10; i++) {
//         str += `<div class="cartas text-white cursorPointer" codigo="` + i + `">
//                     <div class="carta-content answer">Resposta ` + i + `</div>
//                 </div>`;
//     }

//     dados.append(str);

//     //* Adiciona um identificador à div resposta para referência fácil
//     dados.attr("id", "respostaContainer");
// }

// Função para desabilitar os elementos dentro da div resposta
function DesabilitarCartas() {
    // Adiciona uma classe para desabilitar os elementos
    $("#respostaContainer .cartas").addClass("cartas-desabilitadas");

    // Desabilita a interação do mouse usando pointer-events
    $("#respostaContainer .cartas-desabilitadas").css("pointer-events", "none");
}

// Função para habilitar os elementos dentro da div resposta
function HabilitarCartas() {
    // Remove a classe de desabilitar
    $("#respostaContainer .cartas").removeClass("cartas-desabilitadas");

    // Habilita a interação do mouse
    $("#respostaContainer .cartas").css("pointer-events", "auto");
}


$("#iniciarPartida").on("click",function(){
    // alert("Partida iniciada");
    //! PRECISA: PEGAR TODOS OS JOGADORES ONLINES (NOME E ID) 
    //! ENVIAR PARA O SERVIDOR FAZER A SELEÇÃO DE HOSTS,
    //! TODO HOST DEVE TER O BOTÃO DE INICIAR A RODADA,
    //! HOST NÃO PODE ENVIAR SUAS RESPOSTAS

    $("#iniciarPartida").css("display","none");

    // console.log("jogadores ao iniciar");
    console.log("partida iniciada");

    //!RECEBER AS CARTAS DE RESOPOSTAS ALEATORIAS
    console.log("enviando sinal para criar cartas de resposta");

    socket.send(JSON.stringify({ type: 'novaRodada', idUsuario: idUser })); //* Enviar comando para iniciar a rodada
})

function responderPergunta(element) {
    var idUsuario = $(element).attr("idUsuario");
    var textoParagrafo = $(element).find(".respostaSelecionada").text();
    

    console.log("ID do Usuário:"+ idUsuario);
    console.log("Texto do Parágrafo:"+ textoParagrafo);
    console.log("Ponto para: " + idUsuario);

    var thiss = $(".pontosUsuario[i='"+idUsuario+"']");
    console.log(thiss);

    var PontoAtual = thiss.text();
    console.log(PontoAtual);

    //! enviar pontuação para o usuario
    socket.send(JSON.stringify({ type: 'pontuacaoUsuario', idUsu: idUsuario, thiss: PontoAtual}));

    //! Encerra a Rodada
    socket.send(JSON.stringify({ type: 'finalizarRodada' }));
     
    //? aguardar finalizar a rodada para iniciar a proxima
    //!inicia proxima rodada 
    //  socket.send(JSON.stringify({ type: 'novaRodada', idUsuario: idHostaRodada }));


}



//TODO -------------------------------------------------------------------------------------------------------------------------------------------------------
/*
-----------JOGABILIDADE-----------
- ID DE CADA USUARIO (não pode repetir, nem mudar) [✅]
- SELECIONAR HOST [✅]
- TROCAR HOST APOS ENCERRAR A RODADA [✅]
- HOST NÃO PODE ENVIAR AS CARTAS DE RESPOSTAS [✅]
- HOST DEVE ESCOLHER A CARTA DE RESPOSTA [✅]
- CARTA DE RESPOSTA DEVE TER O ID DO USUARIO [✅]
- SISTEMA DE PONTUAÇÃO, AO ESCOLHER A CARTA DE RESPOSTA [✅]
- CRIAR CARTAS DE RESPOSTAS []
- CRIAR RANDOMIZAÇÃO SEM REPETIR RESPOSTAS []
- APOS RESPONDER: RECEBER PROXIMA CARTA []
- TER NO MINIMO 3 JOGADORES PARA INICIAR A PARTIDA []


-----------CORREÇÃO DE BUGS-----------
- CORRIGIR BUG QUANDO NOVO USUARIO CONECTAR NO MEIO DA PARTIDA []
- CORRIGIR BUG QUANDO USUARIO SE RECONECTAR (F5 - recarregar pagina) E QUANDO FOR O HOST []
- BUG AO SAIR USUARIO COM MESMO NOME (os dois são removidos - deve remover por ID) [] 
- BUG MENSAGEM DE 'RESPONDEU' AO ENVIAR A RESPOSTA (so aparece quando recarrega, ou outro usuario entra) []
- BUG AO USUARIO DESCONECTAR, PONTUAÇÃO ESTA ZERANDO []


-----------MELHORIAS-----------
- TEMPORIZADOR PARA ENVIAR RESPOSTAS AUTOMATICAMENTE(caso jogador nem envie) []
- HOST, SOMENTE VOTAR APOS TODOS ENVIAREM AS RESPOSTAS []
- ENVIAR RESPOSTAS 'OCULTAS' E O HOST VIRAR UMA A UMA (ou todas de uma vez) []
- SISTEMAS DE SALAS []
- SALAS PRIVADAS(senha) []
- RESPONSIVIDADE DO INDEX.HTML E ENTRAR.HTML (p/ rodar no celular )
- SE TENTAR ENTRAR PELO ENTRAR.HTML SEM ESCOLHER NOME DE USUARIO E SALA - REDIRECIONAR PARA PRIMEIRA PAGINA []


*/
//TODO -------------------------------------------------------------------------------------------------------------------------------------------------------