const topicoElement = document.getElementById("topico");
const listaTopicosElement = document.getElementById("lista-topicos");

const topicoMensagemElement = document.getElementById("topico-mensagem");
const mensagemElement = document.getElementById("mensagem");
const botaoEnviarMensagem = document.getElementById("enviar-mensagem");
const botaoLimparMensagens = document.getElementById("limpar-mensagens");
const conteudoMqttElement = document.getElementById("mqtt-content");
const overlayConexaoElement = document.getElementById("connection-overlay");
const mensagemConexaoElement = document.getElementById("connection-message");
const botaoTentarConectar = document.getElementById("retry-connection");

const listaTopicos = [];
const listaMensagens = [];
let conectado = false;

// Cria um identificador único para conexão com MQTT
const id = `Esp32${Math.floor(Math.random() * 900)}`

// Configura a conexão com Broker MQTT
const url = 'broker.hivemq.com'
const porta = 8884
const web = new Paho.MQTT.Client(url, porta, id)

// Quando chegar uma mensagem (subscribe)
web.onMessageArrived = function(mensagem) {
    const topico = mensagem.destinationName;
    const conteudo = mensagem.payloadString;

    listaMensagens.push({ topico, mensagem: conteudo });
    renderizarMensagens();
}

function exibirStatusConexao(mensagem, erro = false) {
    overlayConexaoElement.hidden = false;
    overlayConexaoElement.classList.toggle('has-error', erro);
    mensagemConexaoElement.textContent = mensagem;
    botaoTentarConectar.hidden = !erro;
    conteudoMqttElement.inert = true;
    conteudoMqttElement.setAttribute('aria-busy', 'true');
}

function conectar() {
    exibirStatusConexao('Conectando ao Broker MQTT...');
    web.connect({
        timeout: 2,
        useSSL: true,
        onSuccess: function() {
            conectado = true;
            conteudoMqttElement.inert = false;
            conteudoMqttElement.setAttribute('aria-busy', 'false');
            overlayConexaoElement.hidden = true;
            listaTopicos.forEach(inscreverTopico);
        },
        onFailure: function(erro) {
            conectado = false;
            exibirStatusConexao(
                `Não foi possível conectar ao Broker MQTT: ${erro.errorMessage || 'falha desconhecida'}`,
                true
            );
        }
    });
}

web.onConnectionLost = function(resposta) {
    if (!resposta || resposta.errorCode === 0) return;

    conectado = false;
    exibirStatusConexao(
        `Conexão com o Broker MQTT perdida: ${resposta.errorMessage || 'falha desconhecida'}`,
        true
    );
}

botaoTentarConectar.addEventListener('click', conectar);
conectar();

function adicionarTopicoLista() {
    const topico = topicoElement.value.trim();
    if (topico === '' || listaTopicos.includes(topico)) return;

    listaTopicos.push(topico);
    if (conectado) inscreverTopico(topico);

    renderizarTopicos();
    topicoElement.value = '';
}

function inscreverTopico(topico) {
    web.subscribe(topico, {
        onFailure: function(erro) {
            alert(`Erro ao se inscrever no tópico "${topico}": ${erro.errorMessage || 'falha desconhecida'}`);
        }
    });
}

function removerTopicoLista(topico) {
    const indice = listaTopicos.indexOf(topico);
    if (indice === -1) return;

    listaTopicos.splice(indice, 1);
    if (conectado) {
        web.unsubscribe(topico, {
            onFailure: function(erro) {
                alert(`Erro ao cancelar inscrição do tópico "${topico}": ${erro.errorMessage || 'falha desconhecida'}`);
            }
        });
    }

    renderizarTopicos();
}

function renderizarTopicos() {
    listaTopicosElement.innerHTML = '';

    listaTopicos.forEach((topico) => {
        if (topico.trim() === '') return; // Ignorar tópicos vazios
        if (listaTopicos.filter(t => t === topico).length > 1) return; // Ignorar tópicos duplicados
        
        const li = document.createElement('li');
        li.className = 'collection-item';

        const nomeTopico = document.createElement('span');
        nomeTopico.textContent = topico;
        li.appendChild(nomeTopico);

        const botaoRemover = document.createElement('button');
        botaoRemover.type = 'button';
        botaoRemover.className = 'secondary-content topic-remove';
        botaoRemover.setAttribute('aria-label', `Remover tópico ${topico}`);
        botaoRemover.addEventListener('click', () => removerTopicoLista(topico));

        const iconeFechar = document.createElement('i');
        iconeFechar.className = 'material-icons';
        iconeFechar.setAttribute('aria-hidden', 'true');
        iconeFechar.textContent = 'close';
        botaoRemover.appendChild(iconeFechar);
        li.appendChild(botaoRemover);

        listaTopicosElement.appendChild(li);
    });
}

function enviarMensagem() {
    const topico = topicoMensagemElement.value;
    const mensagem = mensagemElement.value;

    if (topico.trim() === '' || mensagem.trim() === '') {
        alert('Por favor, preencha o tópico e a mensagem antes de enviar.');
        return;
    }

    if (!conectado) {
        alert('Não foi possível enviar: conexão com o Broker indisponível.');
        return;
    }

    const msg = new Paho.MQTT.Message("")
    msg.destinationName = topico
    msg.payloadString = mensagem
    web.send(msg)

    mensagemElement.value = '';
}

function renderizarMensagens() {
    const listaMensagensElement = document.getElementById("lista-mensagens");
    listaMensagensElement.innerHTML = '';

    listaMensagens.forEach(({ topico, mensagem }) => {
        const li = document.createElement('li');
        li.className = 'collection-item';

        const identificacaoTopico = document.createElement('span');
        identificacaoTopico.textContent = '';
        li.appendChild(identificacaoTopico);

        const badgeTopico = document.createElement('span');
        badgeTopico.className = 'new badge';
        badgeTopico.setAttribute('data-badge-caption', '');
        badgeTopico.textContent = topico;
        li.appendChild(badgeTopico);

        const textoMensagem = document.createElement('span');
        textoMensagem.textContent = `Mensagem: ${mensagem}`;
        li.appendChild(textoMensagem);

        listaMensagensElement.appendChild(li);
    });
}

function limparMensagens() {
    listaMensagens.length = 0;
    renderizarMensagens();
}

botaoEnviarMensagem.addEventListener('click', enviarMensagem);
botaoLimparMensagens.addEventListener('click', limparMensagens);
