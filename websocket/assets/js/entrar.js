$("#Rules").on("click",function(){
    $("#myModal").show();
});
$(".closeModal").on("click",function(){
    $("#myModal").hide();
})

$(".Sala1").on("click",function(){
    let nomePlayer = $("#nomePlayer").val();
    if(nomePlayer.length > 2){
        $("#modalIdade").show();
    }else{
        alert("Escolha seu nick, com mais de 2 caracteres")
    }
})

$(".confirmarIdade").on("click",function(){
    let contador = $("#mensagemConfirmacao").attr("contador");
    let tamanho = 15+(parseInt(contador)+6);
    
    $("#mensagemConfirmacao").css("font-size",""+tamanho+"px")
    switch (parseInt(contador)) {
        case 0:
            $("#mensagemConfirmacao").text("Esse jogo não é para mimimi");
        break;
        case 1:
            $("#mensagemConfirmacao").text("Tem certeza que você quer jogar?");
        break;
        case 2:
            $("#mensagemConfirmacao").text("Você leu as regras?");
        break;
    
        default:
            break;
    }

    contador = parseInt(contador) +1;
    $("#mensagemConfirmacao").attr("contador", contador);
    
    if(contador == 4){
        $("#modalIdade").hide();
        window.location.replace("entrar.html?User="+$("#nomePlayer").val()+"&&Sala="+1);
    }
})

$(".recusarIdade").on("click",function(){
    alert("Cai fora! Isso não é pra você!")
    $("#modalIdade").hide();
    window.location.replace("https://www.clickjogos.com.br/");
})