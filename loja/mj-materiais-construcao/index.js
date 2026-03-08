// index.js - Tela de Exposição de Produtos e Agendamentos* para Clientes
console.log("🛒 Sistema PDV - Loja para Clientes (Nova Autenticação)");

// VERIFICAR SE AS FUNÇÕES DE LOGIN ESTÃO DISPONÍVEIS
if (typeof window.fazerLogin !== 'function') {
    console.error('❌ CRÍTICO: funções de login não disponíveis!');
    console.log('Verifique se login_firebase.js foi carregado antes deste script');
}

// ============================================
// IMPORTAÇÕES
// ============================================
import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    serverTimestamp,
    lojaServices,
    obterURLImagem,
    formatarMoeda,
    gerarImagemPlaceholderBase64
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES GLOBAIS
// ============================================
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=";

const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E🏪%3C/text%3E%3C/svg%3E";

let produtos = [];
let categorias = [];
let carrinho = [];
let usuarioLogado = false;
let dadosUsuario = null;
let swiperInstance = null;
let lojaIdAtual = null;

// ============================================
// VARIÁVEL GLOBAL PARA AGENDAMENTO
// ============================================
let agendamentoHabilitado = false;
let agendamentosAtivos = [];
let unsubscribeAgendamentos = null;
let intervaloAtualizacaoAgendamento = null;

// ============================================
// VERIFICAR LOJA ID E CONFIG
// ============================================
if (!lojaIdAtual) {
    lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
    console.log(`📍 Loja ID no clientes.js: ${lojaIdAtual}`);
}

// Aguardar getLojaConfig estar disponível
if (typeof window.getLojaConfig !== 'function') {
    console.log('⏳ Aguardando getLojaConfig...');
    // Criar um intervalo para verificar
    const checkInterval = setInterval(() => {
        if (typeof window.getLojaConfig === 'function') {
            console.log('✅ getLojaConfig disponível');
            clearInterval(checkInterval);
            // Se precisar, pode chamar alguma função aqui
        }
    }, 100);
}

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID DA URL
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (lojaServices && lojaServices.lojaId) {
        lojaIdAtual = lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// VERIFICAR SE AGENDAMENTO ESTÁ HABILITADO (DO FIRESTORE)
// ============================================
async function verificarAgendamentoHabilitado() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return false;
    
    try {
        // Buscar no Firestore do projeto de login (coleção 'lojas')
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaId)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                const habilitado = dados.habilitar_agendamento === true;
                console.log(`📅 Agendamento habilitado no Firestore: ${habilitado ? 'SIM' : 'NÃO'}`);
                return habilitado;
            } else {
                console.log(`⚠️ Documento da loja não encontrado no Firestore: ${lojaId}`);
                return false;
            }
        } else {
            console.log('📅 loginDb não disponível, agendamento desabilitado');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar agendamento:', error);
        return false;
    }
}

// ============================================
// MOSTRAR/ESCONDER CONTAINER DE AGENDAMENTO
// ============================================
function toggleAgendamentoContainer(mostrar) {
    const container = document.getElementById('agendamentoContainer');
    if (container) {
        container.style.display = mostrar ? 'block' : 'none';
        console.log(`📅 Container de agendamento ${mostrar ? 'exibido' : 'ocultado'}`);
    }
}

// ============================================
// CARREGAR AGENDAMENTOS ATIVOS (TEMPO REAL)
// ============================================
function iniciarEscutaAgendamentos() {
    if (!agendamentoHabilitado || !lojaIdAtual) return;
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos...');
    
    try {
        // Verificar se loginDb está disponível
        if (!window.loginDb) {
            console.error('❌ loginDb não disponível para escuta de agendamentos');
            return;
        }
        
        // Referência para a coleção de agendamentos no Firestore
        const agendamentosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .orderBy('senha', 'asc');
        
        // Escutar mudanças em tempo real
        unsubscribeAgendamentos = agendamentosRef.onSnapshot((snapshot) => {
            const agendamentos = [];
            snapshot.forEach(doc => {
                agendamentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            agendamentosAtivos = agendamentos;
            renderizarPainelAgendamento();
            // Inicializar carrossel após renderizar
            setTimeout(() => {
                inicializarCarrosselAgendamento();
            }, 100);
            
        }, (error) => {
            console.error('❌ Erro na escuta de agendamentos:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// RENDERIZAR PAINEL DE AGENDAMENTO
// ============================================
function renderizarPainelAgendamento() {
    if (!agendamentoHabilitado) return;
    
    console.log('📅 Renderizando painel de agendamento...');
    console.log('Agendamentos ativos:', agendamentosAtivos);
    
    // Encontrar quem está sendo chamado agora
    const chamandoAgora = agendamentosAtivos.find(a => a.status === 'chamando');
    
    // Filtrar os que estão aguardando (próximos a atender)
    const proximos = agendamentosAtivos
        .filter(a => a.status === 'aguardando')
        .sort((a, b) => (a.senha || '').localeCompare(b.senha || ''));
    
    console.log('Chamando agora:', chamandoAgora);
    console.log('Próximos a atender:', proximos);
    
    // Atualizar badge do total na fila
    const totalFilaBadge = document.getElementById('totalFilaBadge');
    if (totalFilaBadge) {
        totalFilaBadge.textContent = proximos.length;
    }
    
    const totalFilaTexto = document.getElementById('totalFilaTexto');
    if (totalFilaTexto) {
        totalFilaTexto.textContent = proximos.length;
    }
    
    // Atualizar última hora chamada
    const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
    if (ultimoChamadoHora && chamandoAgora) {
        const agora = new Date();
        ultimoChamadoHora.textContent = agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Renderizar "EM ATENDIMENTO"
    const chamandoEl = document.getElementById('chamandoAgoraCard');
    if (chamandoEl) {
        if (chamandoAgora) {
            chamandoEl.innerHTML = `
                <div class="card-chamando-destaque">
                    <div class="senha-grande">${chamandoAgora.senha || '---'}</div>
                    <div class="cliente-nome">${chamandoAgora.cliente_nome || 'Cliente'}</div>
                    <div class="servico-nome">
                        <i class="fas fa-cut"></i> ${chamandoAgora.servico || 'Serviço'}
                    </div>
                </div>
            `;
        } else {
            chamandoEl.innerHTML = `
                <div class="empty-agendamento">
                    <i class="fas fa-check-circle"></i>
                    <p>Nenhum chamado no momento</p>
                </div>
            `;
        }
    }
    
    // Renderizar "PRÓXIMOS A ATENDER" (lista vertical)
    const proximosEl = document.getElementById('proximosFilaCard');
    if (proximosEl) {
        if (proximos.length > 0) {
            let html = '';
            proximos.forEach((item, index) => {
                const isUrgente = index === 0 ? 'urgente' : '';
                html += `
                    <div class="item-fila-vertical ${isUrgente}">
                        <span class="senha-numero">${item.senha || '---'}</span>
                        <div class="senha-info">
                            <span class="senha-cliente">${item.cliente_nome || 'Cliente'}</span>
                            <span class="senha-servico">
                                <i class="fas fa-cut"></i> ${item.servico || 'Serviço'}
                            </span>
                        </div>
                    </div>
                `;
            });
            proximosEl.innerHTML = html;
        } else {
            proximosEl.innerHTML = `
                <div class="empty-agendamento">
                    <i class="fas fa-users"></i>
                    <p>Fila vazia</p>
                </div>
            `;
        }
    }
    
    // Renderizar "Outros na Fila" (carrossel horizontal)
    const proximosTrack = document.getElementById('proximasSenhasTrack');
    if (proximosTrack) {
        if (proximos.length > 0) {
            let html = '';
            proximos.forEach((item, index) => {
                const posicao = index + 1;
                const classeUrgente = index === 0 ? 'urgente' : '';
                
                html += `
                    <div class="proximo-card ${classeUrgente}">
                        <div class="senha-numero">${item.senha || '---'}</div>
                        <div class="senha-cliente">${item.cliente_nome || 'Cliente'}</div>
                        <div class="senha-servico">
                            <i class="fas fa-cut"></i> ${item.servico || 'Serviço'}
                        </div>
                        <span class="senha-posicao">${posicao}° na fila</span>
                    </div>
                `;
            });
            proximosTrack.innerHTML = html;
            
            // Atualizar dots do carrossel
            atualizarDotsScroll(proximos.length);
        } else {
            // Manter placeholders quando não há dados
            let placeholders = '';
            for (let i = 0; i < 4; i++) {
                placeholders += `
                    <div class="proximo-card-placeholder">
                        <div class="senha-numero">--</div>
                        <div class="senha-info">
                            <span class="senha-cliente">Aguardando...</span>
                            <span class="senha-servico">---</span>
                        </div>
                    </div>
                `;
            }
            proximosTrack.innerHTML = placeholders;
        }
    }
    
    // Renderizar "Minha Senha" (se usuário logado)
    const minhaSenhaContainer = document.getElementById('minhaSenhaContainer');
    if (minhaSenhaContainer && usuarioLogado && dadosUsuario) {
        const minhaSenha = agendamentosAtivos.find(a => 
            a.cliente_email === dadosUsuario.email && 
            (a.status === 'aguardando' || a.status === 'chamando')
        );
        
        if (minhaSenha) {
            const statusTexto = minhaSenha.status === 'chamando' ? 'SUA VEZ!' : 'Aguardando';
            const statusClass = minhaSenha.status === 'chamando' ? 'chamando' : '';
            
            document.getElementById('minhaSenhaNumero').textContent = minhaSenha.senha || '---';
            document.getElementById('minhaSenhaStatus').textContent = statusTexto;
            document.getElementById('minhaSenhaStatus').className = `minha-senha-status ${statusClass}`;
            minhaSenhaContainer.style.display = 'block';
        } else {
            minhaSenhaContainer.style.display = 'none';
        }
    } else if (minhaSenhaContainer) {
        minhaSenhaContainer.style.display = 'none';
    }
    
    // Inicializar scroll horizontal após renderizar
    setTimeout(() => {
        inicializarScrollHorizontal();
    }, 100);
}

// ============================================
// FUNÇÃO PARA ATUALIZAR DOTS DO SCROLL
// ============================================
function atualizarDotsScroll(totalItens) {
    const dotsContainer = document.getElementById('scrollDots');
    if (!dotsContainer) return;
    
    // Calcular número de dots baseado na quantidade de itens
    const numDots = Math.min(totalItens, 5); // Máximo 5 dots
    
    let dotsHtml = '';
    for (let i = 0; i < numDots; i++) {
        dotsHtml += `<span class="dot ${i === 0 ? 'active' : ''}"></span>`;
    }
    
    dotsContainer.innerHTML = dotsHtml;
}

// ============================================
// FUNÇÃO ÚNICA E CORRIGIDA PARA INICIALIZAR SCROLL HORIZONTAL
// ============================================
function inicializarScrollHorizontal() {
    const track = document.getElementById('proximasSenhasTrack');
    const scrollContainer = document.getElementById('proximasSenhasScroll');
    const prevBtn = document.getElementById('proximasSenhasPrev');
    const nextBtn = document.getElementById('proximasSenhasNext');
    
    if (!track || !scrollContainer) return;
    
    const scrollAmount = 200; // Quantidade de pixels para scrollar
    
    // Clonar e substituir botões para remover listeners antigos
    if (prevBtn) {
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        
        newPrevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });
    }
    
    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        
        newNextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
    
    // Clonar e substituir o scrollContainer para remover listeners antigos
    const newScrollContainer = scrollContainer.cloneNode(true);
    scrollContainer.parentNode.replaceChild(newScrollContainer, scrollContainer);
    
    // Adicionar event listener de scroll
    newScrollContainer.addEventListener('scroll', () => {
        const scrollLeft = newScrollContainer.scrollLeft;
        const maxScroll = newScrollContainer.scrollWidth - newScrollContainer.clientWidth;
        
        // Atualizar dots baseado na posição
        const dots = document.querySelectorAll('.scroll-indicator-dots .dot');
        if (dots.length > 0 && maxScroll > 0) {
            const scrollPercent = scrollLeft / maxScroll;
            const activeDot = Math.floor(scrollPercent * dots.length);
            
            dots.forEach((dot, index) => {
                if (index === activeDot) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        // Habilitar/desabilitar botões
        const currentPrevBtn = document.getElementById('proximasSenhasPrev');
        const currentNextBtn = document.getElementById('proximasSenhasNext');
        
        if (currentPrevBtn) {
            currentPrevBtn.disabled = scrollLeft <= 0;
        }
        if (currentNextBtn) {
            currentNextBtn.disabled = scrollLeft >= maxScroll - 5;
        }
    });
    
    // Trigger scroll event para inicializar estado dos botões
    setTimeout(() => {
        newScrollContainer.dispatchEvent(new Event('scroll'));
    }, 100);
    
    console.log('✅ Scroll horizontal inicializado');
}

// ============================================
// PARAR ESCUTA DE AGENDAMENTOS
// ============================================
function pararEscutaAgendamentos() {
    if (unsubscribeAgendamentos) {
        unsubscribeAgendamentos();
        unsubscribeAgendamentos = null;
        console.log('📅 Escuta de agendamentos parada');
    }
    
    if (intervaloAtualizacaoAgendamento) {
        clearInterval(intervaloAtualizacaoAgendamento);
        intervaloAtualizacaoAgendamento = null;
    }
}

// ============================================
// INICIALIZAR CARROSSEL DE AGENDAMENTO
// ============================================
let agendamentoSwiper = null;

function inicializarCarrosselAgendamento() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    if (agendamentoSwiper) {
        agendamentoSwiper.destroy(true, true);
    }
    
    agendamentoSwiper = new Swiper('.agendamento-swiper', {
        slidesPerView: 1,
        spaceBetween: 15,
        loop: false,
        autoplay: false,
        pagination: {
            el: '.agendamento-pagination',
            clickable: true,
        },
        navigation: {
            prevEl: '#agendamentoPrev',
            nextEl: '#agendamentoNext',
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
        },
    });
    
    console.log('✅ Carrossel de agendamento inicializado');
}

// ============================================
// ABRIR MODAL DE AGENDAMENTO PARA CLIENTES
// ============================================
function abrirModalAgendamento() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para fazer um agendamento', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('Abrir modal de agendamento para cliente');
    
    const modal = document.getElementById('agendamentoRapidoModal');
    if (!modal) {
        console.error('❌ Modal de agendamento não encontrado');
        mostrarMensagem('Erro ao abrir agendamento', 'error');
        return;
    }
    
    // Limpar formulário
    const form = document.querySelector('.agendamento-rapido-form');
    if (form) {
        const selects = form.querySelectorAll('select');
        selects.forEach(s => s.value = '');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(i => i.value = '');
    }
    
    // Se for funcionário/admin, mostrar campo de seleção de cliente
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    const tipo = dadosUsuario.tipo;
    
    const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                          perfil === 'admin' || perfil === 'gerente' || 
                          perfil === 'supervisor' || perfil === 'vendedor');
    
    // Verificar se já existe campo de cliente no modal
    let clienteField = document.getElementById('clienteSelectField');
    
    if (isFuncionario) {
        // Se não existir, criar campo de seleção de cliente
        if (!clienteField) {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.id = 'clienteSelectField';
            formGroup.innerHTML = `
                <label><i class="fas fa-user"></i> Cliente</label>
                <select id="clienteSelect" class="form-select">
                    <option value="">Selecionar cliente...</option>
                </select>
                <small>Funcionário pode agendar para clientes</small>
            `;
            
            // Inserir antes do serviço
            const servicoGroup = document.querySelector('#servicoSelect')?.closest('.form-group');
            if (servicoGroup) {
                servicoGroup.parentNode.insertBefore(formGroup, servicoGroup);
            }
        }
        
        // Carregar lista de clientes
        carregarClientesParaSelect();
    } else {
        // Se for cliente, remover campo se existir
        if (clienteField) {
            clienteField.remove();
        }
    }
    
    // Carregar serviços
    carregarServicosCliente();
    
    // Configurar data mínima (hoje)
    const dataInput = document.getElementById('agendamentoData');
    if (dataInput) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.min = `${ano}-${mes}-${dia}`;
        dataInput.value = `${ano}-${mes}-${dia}`;
        
        // Carregar horários para a data selecionada
        setTimeout(() => carregarHorariosCliente(), 100);
    }
    
    modal.classList.add('active');
}

// ============================================
// CARREGAR CLIENTES PARA SELECT (funcionários)
// ============================================
async function carregarClientesParaSelect() {
    const select = document.getElementById('clienteSelect');
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Carregando clientes...</option>';
        
        const clientesRef = window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes');
        
        const snapshot = await clientesRef.get();
        
        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            select.innerHTML += `<option value="${doc.id}">${data.nome} (${data.email})</option>`;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

// ============================================
// CARREGAR SERVIÇOS PARA CLIENTE (CORRIGIDO)
// ============================================
async function carregarServicosCliente() {
    const select = document.getElementById('servicoSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando serviços...</option>';
    select.disabled = true;
    
    try {
        // 🔥 BUSCAR DO PROJETO CORRETO (spdv-3872a) - MESMO ONDE FOI SALVO
        const configRef = doc(
            db,  // 👈 Projeto spdv-3872a (dados operacionais)
            'configuracoes', 
            lojaIdAtual, 
            'servico_agendamento', 
            'config'  // 👈 Documento 'config' (como foi salvo)
        );
        
        const configDoc = await getDoc(configRef);
        
        // Verificar se existe configuração
        if (!configDoc.exists()) {
            console.log('📋 Nenhum serviço encontrado em:', configRef.path);
            select.innerHTML = '<option value="">📋 Nenhum serviço cadastrado</option>';
            select.disabled = true;
            return;
        }
        
        const dados = configDoc.data();
        console.log('📋 Dados do serviço carregados:', dados);
        
        // Verificar se tem nome (campo obrigatório)
        if (!dados.nome) {
            select.innerHTML = '<option value="">📋 Configuração incompleta</option>';
            select.disabled = true;
            return;
        }
        
        // Preencher select com os dados da configuração
        select.innerHTML = '<option value="">Selecione um serviço...</option>';
        
        // Adicionar o serviço (único por enquanto)
        select.innerHTML += `<option value="${dados.nome}">${dados.nome}${dados.duracao ? ` (${dados.duracao}min)` : ''}</option>`;
        
        select.disabled = false;
        console.log(`✅ Serviço carregado: ${dados.nome}`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        select.innerHTML = '<option value="">❌ Erro ao carregar serviços</option>';
        select.disabled = true;
    }
}

// ============================================
// CARREGAR HORÁRIOS PARA CLIENTE
// ============================================
async function carregarHorariosCliente() {
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    
    if (!dataInput || !horarioSelect) return;
    
    const dataSelecionada = dataInput.value;
    if (!dataSelecionada) return;
    
    console.log(`🔍 Buscando horários para data: ${dataSelecionada}`);
    
    horarioSelect.innerHTML = '<option value="">Verificando horários...</option>';
    horarioSelect.disabled = true;
    
    try {
        const dataObj = new Date(dataSelecionada + 'T12:00:00');
        const diaSemana = dataObj.getDay();
        
        const diasMap = {
            0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
            4: 'quinta', 5: 'sexta', 6: 'sabado'
        };
        
        const diaId = diasMap[diaSemana];
        
        // ✅ CORRETO: Usar db (spdv-3872a) para dados operacionais
        const horariosRef = doc(
            db,  // 👈 PROJETO DE DADOS
            'configuracoes', 
            lojaIdAtual, 
            'agendamento', 
            'horarios'
        );
        
        const horariosDoc = await getDoc(horariosRef);
        
        if (!horariosDoc.exists()) {
            console.log('❌ Documento de horários não encontrado em:', horariosRef.path);
            horarioSelect.innerHTML = '<option value="">⏳ Horários não configurados</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        const dados = horariosDoc.data();
        console.log('📋 Dados de horários:', dados);
        
        const configDia = dados[diaId];
        
        if (!configDia) {
            console.log(`❌ Configuração para ${diaId} não encontrada`);
            horarioSelect.innerHTML = '<option value="">⏳ Horários não configurados para este dia</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        if (!configDia.aberto) {
            horarioSelect.innerHTML = '<option value="">🔒 Estabelecimento fechado neste dia</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        if (!configDia.abertura || !configDia.fechamento) {
            horarioSelect.innerHTML = '<option value="">⚠️ Horários incompletos</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        // Gerar horários...
        const horarios = [];
        const [hA, mA] = configDia.abertura.split(':').map(Number);
        const [hF, mF] = configDia.fechamento.split(':').map(Number);
        
        let inicioIntervalo = null;
        let fimIntervalo = null;
        
        if (configDia.intervaloInicio && configDia.intervaloFim) {
            const [hII, mII] = configDia.intervaloInicio.split(':').map(Number);
            const [hIF, mIF] = configDia.intervaloFim.split(':').map(Number);
            
            inicioIntervalo = new Date();
            inicioIntervalo.setHours(hII, mII, 0);
            
            fimIntervalo = new Date();
            fimIntervalo.setHours(hIF, mIF, 0);
        }
        
        let atual = new Date();
        atual.setHours(hA, mA, 0);
        
        let fim = new Date();
        fim.setHours(hF, mF, 0);
        
        while (atual <= fim) {
            if (inicioIntervalo && fimIntervalo && 
                atual >= inicioIntervalo && atual < fimIntervalo) {
                atual = new Date(fimIntervalo);
                continue;
            }
            
            const hora = String(atual.getHours()).padStart(2, '0');
            const min = String(atual.getMinutes()).padStart(2, '0');
            horarios.push(`${hora}:${min}`);
            
            atual.setMinutes(atual.getMinutes() + 30);
        }
        
        if (horarios.length === 0) {
            horarioSelect.innerHTML = '<option value="">⏰ Nenhum horário disponível</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horarios.forEach(h => {
            horarioSelect.innerHTML += `<option value="${h}">${h}</option>`;
        });
        horarioSelect.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
        horarioSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        horarioSelect.disabled = true;
    }
}

// ============================================
// CONFIRMAR AGENDAMENTO (CLIENTE)
// ============================================
document.getElementById('btnConfirmarAgendamento')?.addEventListener('click', async function() {
    try {
        // Validar campos
        const servicoSelect = document.getElementById('servicoSelect');
        const dataInput = document.getElementById('agendamentoData');
        const horarioSelect = document.getElementById('agendamentoHorario');
        
        const servico = servicoSelect?.value;
        const servicoText = servicoSelect?.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const data = dataInput?.value;
        const horario = horarioSelect?.value;
        
        // Validações
        if (!servico) {
            mostrarMensagem('Selecione um serviço', 'warning');
            return;
        }
        
        if (!data) {
            mostrarMensagem('Selecione uma data', 'warning');
            return;
        }
        
        if (!horario) {
            mostrarMensagem('Selecione um horário', 'warning');
            return;
        }
        
        // Verificar login
        if (!usuarioLogado || !dadosUsuario) {
            mostrarMensagem('Faça login para agendar', 'warning');
            fecharModal('agendamentoRapidoModal');
            abrirModal('loginModal');
            return;
        }
        
        mostrarLoading('Confirmando agendamento...');
        
        // Determinar cliente (se for funcionário, pode agendar para outro)
        let clienteEmail = dadosUsuario.email;
        let clienteNome = dadosUsuario.nome;
        let clienteTelefone = dadosUsuario.telefone || '';
        
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const tipo = dadosUsuario.tipo;
        const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        // Se for funcionário, verificar se selecionou um cliente
        if (isFuncionario) {
            const clienteSelect = document.getElementById('clienteSelect');
            if (clienteSelect && clienteSelect.value) {
                clienteEmail = clienteSelect.value;
                
                // Buscar dados completos do cliente
                try {
                    const clienteDoc = await window.loginDb
                        .collection('usuarios')
                        .doc(lojaIdAtual)
                        .collection('clientes')
                        .doc(clienteEmail)
                        .get();
                    
                    if (clienteDoc.exists) {
                        const clienteData = clienteDoc.data();
                        clienteNome = clienteData.nome || clienteEmail;
                        clienteTelefone = clienteData.telefone || '';
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar dados do cliente:', e);
                }
            }
        }
        
        // Verificar configuração de validação da loja
        let precisaValidar = true;
        try {
            const configRef = window.loginDb
                .collection('configuracoes')
                .doc(lojaIdAtual)
                .collection('agendamento')
                .doc('config');
            
            const configDoc = await configRef.get();
            if (configDoc.exists) {
                const config = configDoc.data();
                // Se validação automática para todos, já entra validado
                if (config.validacao === 'automatico_todos') {
                    precisaValidar = false;
                }
                // Se for agendamento para hoje e config for 'automatico_dia'
                else if (config.validacao === 'automatico_dia') {
                    const hoje = new Date().toISOString().split('T')[0];
                    if (data === hoje) {
                        precisaValidar = false;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao verificar configuração:', e);
        }
        
        // Criar objeto do agendamento
        const agendamentoData = {
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            servico: servicoText,
            servico_id: servico,
            data: data,
            horario: horario,
            status: 'agendado',
            validado: !precisaValidar, // false = precisa validar, true = já validado
            criado_por: dadosUsuario.email,
            criado_por_nome: dadosUsuario.nome,
            criado_em: serverTimestamp(),
            data_criacao: new Date().toISOString(),
            loja_id: lojaIdAtual
        };
        
        // Salvar no Firestore (coleção 'futuros')
        const agendamentoRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('futuros')
            .doc();
        
        await setDoc(agendamentoRef, agendamentoData);
        
        // Mensagem de sucesso conforme validação
        if (precisaValidar) {
            mostrarMensagem('✅ Agendamento solicitado! Aguarde confirmação da loja.', 'success', 5000);
        } else {
            mostrarMensagem('✅ Agendamento confirmado! Você já está na fila.', 'success');
        }
        
        // Fechar modal
        fecharModal('agendamentoRapidoModal');
        
        // Se for cliente, mostrar mensagem sobre "Minha Senha"
        if (!isFuncionario && !precisaValidar) {
            setTimeout(() => {
                mostrarMensagem('🔔 Acompanhe sua posição na fila acima', 'info', 4000);
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Erro ao confirmar agendamento:', error);
        mostrarMensagem('Erro ao fazer agendamento: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
});

// ============================================
// CONFIGURAR FAVICON DA LOJA
// ============================================
function configurarFavicon() {
    const lojaId = extrairLojaIdDaURL();
    if (lojaId) {
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = `../../imagens/${lojaId}/icone.ico`;
            console.log(`✅ Favicon configurado para loja: ${lojaId}`);
        }
    }
}

// ============================================
// FUNÇÕES DE MODAL
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log(`✅ Modal ${modalId} aberto`);
    } else {
        console.error(`❌ Modal ${modalId} não encontrado`);
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        console.log(`✅ Modal ${modalId} fechado`);
    }
};

// ============================================
// MENU DE PERFIL - CONTROLE DE PERMISSÕES
// ============================================

// Configurar menu de perfil
function configurarMenuPerfil() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (menuBtn && dropdown) {
        // Abrir/fechar menu ao clicar no botão
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Fechar menu ao clicar em um item
        dropdown.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        });
    }
    
    // Configurar botões do menu
    document.getElementById('menuRelatorios')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Página de relatórios em desenvolvimento', 'info');
    });
    
    document.getElementById('menuGestaoLogins')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Gestão de logins em desenvolvimento', 'info');
    });
    
    document.getElementById('menuEstoque')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (dadosUsuario) {
            // Passar o perfil como parâmetro na URL
            window.location.href = `estoque.html?perfil=${dadosUsuario.nivel || dadosUsuario.tipo}`;
        }
    });
    
    // 🔥 NOVO: Gestão de Agendamento
    document.getElementById('menuGestaoAgendamento')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'agendamento.html?modo=gestao';
    });
    
    document.getElementById('menuLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        fazerLogoutCliente();
    });
}

// Atualizar menu baseado no perfil
function atualizarMenuPerfil() {
    if (!dadosUsuario) return;
    
    // 🔥 CORREÇÃO: usar perfil, nivel ou tipo
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    console.log('🔍 Atualizando menu para perfil:', perfil);
    console.log('📅 Agendamento habilitado?', agendamentoHabilitado);
    
    // Mapear quais itens devem aparecer para cada perfil
    const permissoes = {
        'admin': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'gerente': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'supervisor': ['menuEstoque'],
        'vendedor': ['menuEstoque'],
        'cliente': [] // Cliente não vê nenhum
    };
    
    // Itens que devem aparecer para este perfil
    const itensPermitidos = permissoes[perfil] || [];
    
    console.log('📋 Itens permitidos:', itensPermitidos);
    
    // Mostrar/esconder itens padrão
    const menuItems = {
        menuRelatorios: document.getElementById('menuRelatorios'),
        menuGestaoLogins: document.getElementById('menuGestaoLogins'),
        menuEstoque: document.getElementById('menuEstoque'),
        // 🔥 NOVO: Gestão de Agendamento
        menuGestaoAgendamento: document.getElementById('menuGestaoAgendamento')
    };
    
    for (const [id, element] of Object.entries(menuItems)) {
        if (element) {
            // Gestão de Agendamento tem regra especial: só aparece se habilitado E perfil for funcionário/admin
            if (id === 'menuGestaoAgendamento') {
                if (agendamentoHabilitado && perfil !== 'cliente') {
                    element.style.display = 'flex';
                    console.log(`✅ Mostrando item: ${id} (agendamento habilitado)`);
                } else {
                    element.style.display = 'none';
                    console.log(`❌ Escondendo item: ${id} (agendamento: ${agendamentoHabilitado}, perfil: ${perfil})`);
                }
            } else {
                // Itens normais seguem as permissões
                if (itensPermitidos.includes(id)) {
                    element.style.display = 'flex';
                    console.log(`✅ Mostrando item: ${id}`);
                } else {
                    element.style.display = 'none';
                    console.log(`❌ Escondendo item: ${id}`);
                }
            }
        }
    }
    
    // Mostrar/esconder divisor (mostra se houver algum item visível além do logout)
    const divisor = document.querySelector('.menu-divider');
    if (divisor) {
        const itensVisiveis = Object.values(menuItems).filter(el => el && el.style.display === 'flex').length;
        divisor.style.display = itensVisiveis > 0 ? 'block' : 'none';
    }
    
    // Sempre mostrar o logout quando logado
    const menuLogout = document.getElementById('menuLogout');
    if (menuLogout) {
        menuLogout.style.display = 'flex';
    }
}

// ============================================
// EVENTOS DO LOGIN
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario, permissoes } = event.detail;
    
    usuarioLogado = true;
    dadosUsuario = usuario;
    
    console.log('✅ Usuário logado no clientes.js:', usuario);
    console.log('🔑 Perfil:', usuario.perfil || usuario.nivel || usuario.tipo);

    // 🔥 NOVO: Re-renderizar agendamento para mostrar "Minha Senha"
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    
    if (userName) {
        let tipoDisplay = '';
        
        // 🔥 CORREÇÃO AQUI: usar perfil, nivel ou tipo conforme disponível
        const perfilExibicao = usuario.perfil || usuario.nivel || usuario.tipo;
        
        if (usuario.tipo === 'admin') {
            tipoDisplay = ' (Admin)';
        } else if (usuario.tipo === 'funcionario') {
            // Capitalizar primeira letra do perfil
            const perfilFormatado = perfilExibicao.charAt(0).toUpperCase() + perfilExibicao.slice(1);
            tipoDisplay = ` (${perfilFormatado})`;
        } else if (usuario.tipo === 'cliente') {
            tipoDisplay = ' (Cliente)';
        }
        
        userName.textContent = usuario.nome + tipoDisplay;
    }
    
    // Esconder botões antigos
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'none';
    
    // Mostrar menu de perfil
    if (profileMenuBtn) profileMenuBtn.style.display = 'flex';
    
    // Atualizar menu baseado no perfil
    atualizarMenuPerfil();
    
    fecharModal('loginModal');
});

window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = false;
    dadosUsuario = null;
    
    console.log('👤 Usuário deslogado');

    // 🔥 NOVO: Re-renderizar agendamento para esconder "Minha Senha"
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (userName) userName.textContent = 'Visitante';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    
    // Esconder menu de perfil
    if (profileMenuBtn) profileMenuBtn.style.display = 'none';
    if (dropdown) dropdown.classList.remove('show');
    
    // Esconder todos os itens do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.display = 'none';
    });
    document.querySelector('.menu-divider').style.display = 'none';
});

window.addEventListener('usuarioNaoAutorizado', (event) => {
    const erro = event.detail?.erro || 'Acesso negado';
    mostrarMensagem(erro, 'error');
    console.error('❌ Acesso negado:', erro);
});

// NOVA FUNÇÃO: Mostrar tempo restante no modal de verificação
async function atualizarTempoRestante() {
    const email = document.getElementById('verificacaoEmail').textContent;
    
    if (!email || email === 'email@exemplo.com') return;
    
    const resultado = await window.verificarTempoRestante(email);
    
    if (resultado.encontrado && !resultado.emailVerificado) {
        const tempoElement = document.getElementById('tempoRestante');
        const avisoElement = document.getElementById('avisoExpiracao');
        
        if (tempoElement) {
            if (resultado.expirado) {
                tempoElement.innerHTML = `<span style="color: #dc3545; font-weight: bold;">
                    ⚠️ EXPIRADO! Faça um novo cadastro.
                </span>`;
                if (avisoElement) avisoElement.style.display = 'block';
            } else {
                tempoElement.innerHTML = `⏳ Tempo restante: <strong>${resultado.minutosRestantes} minutos</strong>`;
            }
        }
    }
}

// ============================================
// FUNÇÕES DE LOGIN (usam window.fazerLogin do login_firebase.js)
// ============================================
async function fazerLoginCliente() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const lembrar = document.getElementById('loginLembrar').checked;
    
    if (!email || !senha) {
        mostrarMensagem('Preencha e-mail e senha', 'warning');
        return;
    }
    
    mostrarLoading('Validando login...');
    
    try {
        const resultado = await window.fazerLogin(email, senha);
        
        if (resultado && resultado.sucesso) {
            // LOGIN BEM SUCEDIDO
            if (lembrar) {
                localStorage.setItem('cliente_ultimo_email', email);
            } else {
                localStorage.removeItem('cliente_ultimo_email');
            }
            
            mostrarMensagem(`Bem-vindo(a) ${resultado.usuario.nome || email}!`, 'success');
            
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginSenha').value = '';
            
            fecharModal('loginModal');
            
        } else {
            // TRATAR OS DIFERENTES TIPOS DE ERRO
            
            // CASO 1: EMAIL NÃO VERIFICADO
            if (resultado.tipo === 'email_nao_verificado') {
                mostrarMensagem(resultado.erro, 'warning', 6000);
                document.getElementById('loginSenha').value = '';
                
            // CASO 2: EMAIL NÃO CADASTRADO
            } else if (resultado.tipo === 'email_nao_cadastrado') {
                // Mostrar mensagem com opção de cadastro
                if (confirm(resultado.erro + ' Clique OK para se cadastrar.')) {
                    fecharModal('loginModal');
                    abrirModal('cadastroModal');
                    document.getElementById('cadastroEmail').value = email;
                }
                document.getElementById('loginSenha').value = '';
                
            // CASO 3: SENHA INCORRETA
            } else if (resultado.tipo === 'senha_incorreta') {
                // Perguntar se quer redefinir senha
                if (confirm(resultado.erro + ' Clique OK para receber o link de redefinição.')) {
                    // Chamar função de recuperar senha
                    mostrarLoading('Enviando link de redefinição...');
                    try {
                        await auth.sendPasswordResetEmail(resultado.email);
                        mostrarMensagem(`Link de redefinição enviado para ${resultado.email}. Verifique sua caixa de entrada.`, 'success', 6000);
                    } catch (resetError) {
                        mostrarMensagem('Erro ao enviar link. Tente novamente.', 'error');
                    } finally {
                        esconderLoading();
                    }
                }
                document.getElementById('loginSenha').value = '';
                
            // OUTROS ERROS
            } else {
                mostrarMensagem(resultado.erro, 'error');
                document.getElementById('loginSenha').value = '';
            }
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem('Erro ao fazer login', 'error');
    } finally {
        esconderLoading();
    }
}

async function fazerCadastroCliente() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    const cpf = document.getElementById('cadastroCpf').value.trim();
    const senha = document.getElementById('cadastroSenha').value.trim();
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value.trim();
    const endereco = document.getElementById('cadastroEndereco').value.trim();
    const cidade = document.getElementById('cadastroCidade').value.trim();
    const cep = document.getElementById('cadastroCep').value.trim();
    const termos = document.getElementById('cadastroTermos').checked;
    
    if (!nome || !email || !telefone || !cpf || !senha || !confirmarSenha) {
        mostrarMensagem('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    if (!termos) {
        mostrarMensagem('Você precisa aceitar os termos de uso', 'warning');
        return;
    }
    
    if (senha !== confirmarSenha) {
        mostrarMensagem('As senhas não coincidem', 'warning');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensagem('E-mail inválido', 'warning');
        return;
    }
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        mostrarMensagem('CPF inválido', 'warning');
        return;
    }
    
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('Telefone inválido', 'warning');
        return;
    }
    
    mostrarLoading('Cadastrando...');
    
    try {
        const resultado = await window.cadastrarCliente(
            nome, email, senha, telefoneLimpo, cpfLimpo, endereco, cidade, cep
        );
        
        if (resultado.sucesso) {
            if (resultado.precisaVerificar) {
                // Mostrar modal de verificação
                document.getElementById('verificacaoEmail').textContent = resultado.email;
                abrirModal('verificacaoEmailModal');
                
                mostrarMensagem(resultado.mensagem, 'success', 6000);
            } else {
                mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            }
            
            fecharModal('cadastroModal');
            
            // Limpar formulário
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroTelefone').value = '';
            document.getElementById('cadastroCpf').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmarSenha').value = '';
            document.getElementById('cadastroEndereco').value = '';
            document.getElementById('cadastroCidade').value = '';
            document.getElementById('cadastroCep').value = '';
            document.getElementById('cadastroTermos').checked = false;
            
        } else {
            mostrarMensagem(resultado.erro, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        mostrarMensagem('Erro ao realizar cadastro', 'error');
    } finally {
        esconderLoading();
    }
}

async function fazerLogoutCliente() {
    if (confirm('Deseja realmente sair?')) {
        mostrarLoading('Saindo...');
        await window.fazerLogout();
        esconderLoading();
    }
}

// ============================================
// FUNÇÃO PARA CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) {
        logoImg.src = getPlaceholderIcon();
        return;
    }
    
    const logoPath = `../../imagens/${lojaId}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
    };
    
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada, usando placeholder`);
        logoImg.src = getPlaceholderIcon();
    };
    
    testImg.src = logoPath;
}

function getPlaceholderIcon() {
    return LOGO_PLACEHOLDER;
}

// ============================================
// CARREGAR DADOS DA LOJA (COM RETRY)
// ============================================
async function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    // Aguardar getLojaConfig com retry
    let tentativas = 0;
    while (typeof window.getLojaConfig !== 'function' && tentativas < 30) {
        console.log(`⏳ Aguardando getLojaConfig... tentativa ${tentativas + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
    }
    
    if (typeof window.getLojaConfig !== 'function') {
        console.error('❌ getLojaConfig não disponível');
        return;
    }
    
    try {
        const config = window.getLojaConfig(lojaId);
        console.log(`📋 Configuração da loja ${lojaId}:`, config);
        
        if (config) {
            const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const lojaNomeHeader = document.getElementById('lojaNomeHeader');
            if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
            
            document.title = `${nomeLoja} - Loja Online`;
            
            if (config.contato) {
                renderizarContatos(config);
            }
            
            if (config.contato?.endereco) {
                renderizarEndereco(config);
            }
        }
        
        renderizarChat();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
        renderizarChat();
    }
}

// ============================================
// RENDERIZAR CONTATOS
// ============================================
function renderizarContatos(dadosLoja) {
    const contactGrid = document.getElementById('contactGrid');
    if (!contactGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato) {
        contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
        return;
    }
    
    const contato = dadosLoja.contato;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    let html = '';
    
    if (contato.whatsapp && contato.whatsapp.trim() !== '') {
        const numero = contato.whatsapp.replace(/\D/g, '');
        html += `
            <a href="https://wa.me/${numero}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}whatsapp.png" alt="WhatsApp" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">WhatsApp</div>
                        <div class="contact-value">${contato.whatsapp}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.email && contato.email.trim() !== '') {
        html += `
            <a href="mailto:${contato.email}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}email.png" alt="E-mail" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">E-mail</div>
                        <div class="contact-value">${contato.email}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.instagram && contato.instagram.trim() !== '') {
        const usuario = contato.instagram.replace('@', '');
        html += `
            <a href="https://instagram.com/${usuario}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}instagram.png" alt="Instagram" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">Instagram</div>
                        <div class="contact-value">${contato.instagram}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (html === '') {
        html = '<p class="no-contacts">Nenhum contato disponível</p>';
    }
    
    contactGrid.innerHTML = html;
    console.log('📞 Contatos renderizados');
}

// ============================================
// RENDERIZAR ENDEREÇO
// ============================================
function renderizarEndereco(dadosLoja) {
    const addressGrid = document.getElementById('addressGrid');
    if (!addressGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato?.endereco) {
        addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
        return;
    }
    
    const endereco = dadosLoja.contato.endereco;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    const ruaNumeroBairro = [];
    if (endereco.rua) ruaNumeroBairro.push(endereco.rua);
    if (endereco.numero) ruaNumeroBairro.push(`nº ${endereco.numero}`);
    if (endereco.bairro) ruaNumeroBairro.push(endereco.bairro);
    const ruaNumeroBairroStr = ruaNumeroBairro.join(' ');
    
    const cidadeUfCep = [];
    if (endereco.cidade) cidadeUfCep.push(endereco.cidade);
    if (endereco.uf) cidadeUfCep.push(endereco.uf);
    if (endereco.cep) cidadeUfCep.push(`CEP: ${endereco.cep}`);
    const cidadeUfCepStr = cidadeUfCep.join(' - ');
    
    const enderecoCompleto = `${ruaNumeroBairroStr} ${cidadeUfCepStr}`.trim();
    const query = encodeURIComponent(enderecoCompleto);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    let html = `
        <a href="${mapsUrl}" target="_blank" class="address-item">
            <div class="address-icon">
                <img src="${basePath}endereco.png" alt="Endereço" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="address-content">
                <div class="address-label">Endereço</div>
                <div class="address-text">
                    <span class="rua-numero">${ruaNumeroBairroStr}</span>
                    <span class="cidade-uf-cep">${cidadeUfCepStr}</span>
                </div>
            </div>
        </a>
    `;
    
    addressGrid.innerHTML = html;
    console.log('📍 Endereço renderizado');
}

// ============================================
// RENDERIZAR CHAT
// ============================================
function renderizarChat() {
    const footerChat = document.querySelector('.footer-chat');
    if (!footerChat) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    footerChat.innerHTML = `
        <div class="chat-container">
            <div class="chat-icon-large">
                <img src="${basePath}chat.png" alt="Chat" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="chat-button" id="chatButton">
                Chat Online
            </div>
        </div>
    `;
    
    const chatButton = document.getElementById('chatButton');
    if (chatButton) {
        chatButton.addEventListener('click', () => {
            alert('Chat em desenvolvimento. Breve estaremos disponíveis 😉');
        });
    }
    
    console.log('💬 Chat configurado');
}

// ============================================
// FUNÇÕES DE PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            console.log(`✅ ${produtos.length} produtos carregados`);
        } else {
            produtos = [];
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
async function carregarCategorias() {
    console.log('🔍 INICIANDO carregarCategorias()');
    
    try {
        if (!lojaServices || typeof lojaServices.buscarCategorias !== 'function') {
            console.error('❌ lojaServices.buscarCategorias não disponível');
            return;
        }
        
        const resultado = await lojaServices.buscarCategorias();
        
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        let categoriasList = resultado.success ? resultado.data : [];
        
        if (categoriasList.length === 0 && produtos.length > 0) {
            const categoriasSet = new Set();
            produtos.forEach(p => {
                if (p.categoria) categoriasSet.add(p.categoria);
            });
            categoriasList = Array.from(categoriasSet).sort();
        }
        
        if (categoriasList.length === 0) {
            categoriasList = ['Todos os Produtos'];
        }
        
        categorias = categoriasList;
        
        let slidesHtml = `
            <div class="swiper-slide">
                <div class="categoria-card" onclick="filtrarPorCategoria('todos')">
                    <div class="categoria-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="categoria-info">
                        <h4>Todos</h4>
                        <p>${produtos.length} produtos</p>
                    </div>
                </div>
            </div>
        `;
        
        categoriasList.forEach(categoria => {
            if (categoria !== 'Todos os Produtos') {
                const count = produtos.filter(p => p.categoria === categoria).length;
                slidesHtml += `
                    <div class="swiper-slide">
                        <div class="categoria-card" onclick="filtrarPorCategoria('${categoria.replace(/'/g, "\\'")}')">
                            <div class="categoria-icon">
                                <i class="fas fa-tag"></i>
                            </div>
                            <div class="categoria-info">
                                <h4>${categoria}</h4>
                                <p>${count} produtos</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        categoriesGrid.innerHTML = slidesHtml;
        
        setTimeout(() => {
            inicializarCarrosselCategorias();
        }, 100);
        
    } catch (error) {
        console.error("❌ Erro ao carregar categorias:", error);
    }
}

function inicializarCarrosselCategorias() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    const categoriesSwiper = new Swiper('.categories-swiper', {
        slidesPerView: 2,
        spaceBetween: 10,
        loop: true,
        navigation: {
            prevEl: '#categoriesPrev',
            nextEl: '#categoriesNext',
        },
        breakpoints: {
            480: { slidesPerView: 3, spaceBetween: 12 },
            640: { slidesPerView: 4, spaceBetween: 15 },
            768: { slidesPerView: 5, spaceBetween: 15 },
            1024: { slidesPerView: 6, spaceBetween: 18 },
            1280: { slidesPerView: 7, spaceBetween: 20 }
        }
    });
    
    console.log('✅ Carrossel de categorias inicializado');
}

async function carregarProdutosDestaque() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    if (produtos.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto disponível</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    produtos.slice(0, 20).forEach(produto => {
        const imagem = obterURLImagem(produto, 'thumb');
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        inicializarSwiper();
    }, 100);
}

function inicializarSwiper() {
    if (typeof Swiper === 'undefined') return;
    
    if (swiperInstance) {
        swiperInstance.destroy(true, true);
    }
    
    swiperInstance = new Swiper('.featured-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: produtos.length > 1,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
            1440: { slidesPerView: 5, spaceBetween: 25 }
        },
        navigation: {
            prevEl: '#carouselPrev',
            nextEl: '#carouselNext',
        },
    });
    
    console.log('✅ Swiper inicializado');
}

// ============================================
// FUNÇÕES DE INTERAÇÃO COM PRODUTOS
// ============================================
window.verProdutoDetalhe = function(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const modalBody = document.getElementById('produtoModalBody');
    if (!modalBody) return;
    
    const imagem = obterURLImagem(produto, 'principal');
    const precoFormatado = formatarMoeda(produto.preco);
    const temEstoque = (produto.quantidade || 0) > 0;
    
    modalBody.innerHTML = `
        <div class="produto-detalhe">
            <div class="produto-imagem-grande">
                <img src="${imagem}" alt="${produto.nome}" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
            </div>
            <div class="produto-info-detalhe">
                <h2>${produto.nome}</h2>
                <p class="produto-codigo">Código: ${produto.codigo || '---'}</p>
                <p class="produto-categoria">Categoria: ${produto.categoria || 'Sem categoria'}</p>
                <p class="produto-preco">${precoFormatado}</p>
                <p class="produto-estoque ${temEstoque ? 'disponivel' : 'indisponivel'}">
                    ${temEstoque ? '✅ Em estoque' : '❌ Indisponível'}
                </p>
                ${produto.descricao ? `<p class="produto-descricao">${produto.descricao}</p>` : ''}
                <div class="produto-acoes-detalhe">
                    <button class="btn-add-cart-large" onclick="adicionarAoCarrinho('${produto.id}'); fecharModal('produtoModal');" ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `;
    
    abrirModal('produtoModal');
};

// ============================================
// ADICIONAR AO CARRINHO (CORRIGIDO)
// ============================================
window.adicionarAoCarrinho = async function(produtoId) {
    // Verificar se usuário está logado
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para adicionar produtos ao carrinho', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    // Verificar se tem email
    if (!dadosUsuario.email) {
        console.error('❌ Usuário sem email:', dadosUsuario);
        mostrarMensagem('Erro: usuário sem email', 'error');
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
        mostrarMensagem('Produto não encontrado', 'error');
        return;
    }
    
    if ((produto.quantidade || 0) <= 0) {
        mostrarMensagem('Produto sem estoque', 'warning');
        return;
    }
    
    mostrarLoading('Adicionando ao carrinho...');
    
    try {
        // Preparar item para o carrinho
        const item = {
            id: produto.id,
            codigo: produto.codigo,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: 1,
            imagem: produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64,
            unidade: produto.unidade_venda || produto.unidade || 'UN',
            desconto: 0,
            desconto_valor: 0
        };
        
        console.log('🛒 Adicionando item:', item);
        console.log('👤 Usuário email:', dadosUsuario.email);
        
        // Verificar se o método existe
        if (typeof lojaServices.adicionarItemAoCarrinho !== 'function') {
            console.error('❌ Método adicionarItemAoCarrinho não encontrado');
            throw new Error('Função de carrinho não disponível');
        }
        
        // Adicionar no Firebase
        const resultado = await lojaServices.adicionarItemAoCarrinho(dadosUsuario.email, item);
        
        console.log('📦 Resultado:', resultado);
        
        if (resultado && resultado.success) {
            // Calcular total de itens
            const totalItens = resultado.data ? 
                resultado.data.reduce((acc, item) => acc + item.quantidade, 0) : 1;
            
            // Atualizar badge do carrinho
            const badge = document.getElementById('cartBadge');
            if (badge) {
                badge.textContent = totalItens;
                badge.style.display = totalItens > 0 ? 'flex' : 'none';
            }
            
            mostrarMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
        } else {
            mostrarMensagem(resultado?.error || 'Erro ao adicionar ao carrinho', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro detalhado:', error);
        mostrarMensagem(`Erro: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
};

window.filtrarPorCategoria = function(categoria) {
    console.log(`Filtrando por categoria: ${categoria}`);
    
    let produtosFiltrados;
    
    if (categoria === 'todos') {
        produtosFiltrados = produtos;
        exibirProdutosFiltrados(produtosFiltrados, 'Todos os Produtos');
    } else {
        produtosFiltrados = produtos.filter(p => p.categoria === categoria);
        exibirProdutosFiltrados(produtosFiltrados, `Categoria: ${categoria}`);
    }
};

// ============================================
// FUNÇÃO DE DIAGNÓSTICO
// ============================================
window.diagnosticarLogin = function() {
    console.log('🔍 DIAGNÓSTICO DE LOGIN:');
    console.log('usuarioLogado flag:', usuarioLogado);
    console.log('dadosUsuario:', dadosUsuario);
    console.log('dadosUsuario?.email:', dadosUsuario?.email);
    console.log('lojaServices disponível?', !!lojaServices);
    console.log('lojaServices.adicionarItemAoCarrinho?', typeof lojaServices?.adicionarItemAoCarrinho);
    console.log('lojaServices.carregarCarrinhoUsuario?', typeof lojaServices?.carregarCarrinhoUsuario);
};

function exibirProdutosFiltrados(produtosFiltrados, titulo) {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    const tituloElement = document.querySelector('.featured-products h2');
    if (tituloElement) {
        tituloElement.innerHTML = `<i class="fas fa-search"></i> ${titulo}`;
    }
    
    if (produtosFiltrados.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto encontrado</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    produtosFiltrados.forEach(produto => {
        const imagem = obterURLImagem(produto, 'thumb');
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        inicializarSwiper();
    }, 100);
}

function filtrarProdutosPorBusca(termo) {
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        carregarProdutosDestaque();
        return;
    }
    
    const resultados = produtos.filter(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const codigo = (produto.codigo || '').toLowerCase();
        const categoria = (produto.categoria || '').toLowerCase();
        const codigoBarras = (produto.codigo_barras || '').toLowerCase();
        
        return nome.includes(termoLimpo) || 
               codigo.includes(termoLimpo) || 
               categoria.includes(termoLimpo) ||
               codigoBarras.includes(termoLimpo);
    });
    
    exibirProdutosFiltrados(resultados, `Resultados para: "${termo}"`);
}

function buscarProdutoPorCodigo(codigo) {
    const produto = produtos.find(p => 
        p.codigo_barras === codigo || p.codigo === codigo
    );
    
    if (produto) {
        verProdutoDetalhe(produto.id);
    } else {
        mostrarMensagem(`Produto com código ${codigo} não encontrado`, 'warning');
    }
}

// ============================================
// CONFIGURAR EVENTOS DE INTERFACE
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    // Botões principais
    document.getElementById('btnLogin')?.addEventListener('click', () => abrirModal('loginModal'));
    document.getElementById('btnLogout')?.addEventListener('click', fazerLogoutCliente);
    document.getElementById('btnGoToCart')?.addEventListener('click', () => {
        if (!usuarioLogado) {
            mostrarMensagem('Faça login para ir ao carrinho', 'warning');
            abrirModal('loginModal');
            return;
        }
        window.location.href = 'carrinho.html';
    });
    
    // Eventos de login
    document.getElementById('btnConfirmarLogin')?.addEventListener('click', fazerLoginCliente);
    document.getElementById('loginSenha')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLoginCliente();
    });
    
    // Links entre modais
    document.getElementById('btnIrCadastro')?.addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal('loginModal');
        abrirModal('cadastroModal');
    });
    
    document.getElementById('btnConfirmarCadastro')?.addEventListener('click', fazerCadastroCliente);
    
    // Formatação de campos
    document.getElementById('cadastroTelefone')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    });
    
    document.getElementById('cadastroCpf')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{3})(\d)/g, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .slice(0, 14);
    });
    
    document.getElementById('cadastroCep')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/g, '$1-$2')
            .slice(0, 9);
    });
    
    // Carregar último e-mail
    const ultimoEmail = localStorage.getItem('cliente_ultimo_email');
    if (ultimoEmail) {
        document.getElementById('loginEmail').value = ultimoEmail;
    }
    
    // Eventos de teclado globais
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            abrirModal('quickSearchModal');
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('quickSearchModal');
            if (modal && modal.classList.contains('active')) {
                fecharModal('quickSearchModal');
            }
        }
    });

    // Evento para quando usuário não verificou email
    window.addEventListener('usuarioNaoVerificado', (event) => {
        const { email } = event.detail;
        
        document.getElementById('verificacaoEmail').textContent = email;
        abrirModal('verificacaoEmailModal');
        
        // Atualizar tempo restante
        atualizarTempoRestante();
        
        // Atualizar a cada 30 segundos
        const interval = setInterval(() => {
            if (!document.getElementById('verificacaoEmailModal').classList.contains('active')) {
                clearInterval(interval);
                return;
            }
            atualizarTempoRestante();
        }, 30000);
    });

    
    // Reenviar email de verificação
    document.getElementById('btnReenviarVerificacao')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Reenviando e-mail...');
        
        try {
            const resultado = await window.reenviarEmailVerificacao(email);
            
            if (resultado.sucesso) {
                mostrarMensagem('E-mail reenviado! Você tem mais 30 minutos.', 'success');
                atualizarTempoRestante();
            } else {
                mostrarMensagem('Erro: ' + resultado.erro, 'error');
            }
        } catch (error) {
            mostrarMensagem('Erro ao reenviar', 'error');
        } finally {
            esconderLoading();
        }
    });
    
    // Verificar se já verificou o email
    document.getElementById('btnVerificarAgora')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Verificando...');
        
        try {
            // Tentar fazer login para verificar status
            // Nota: O usuário precisa fazer login novamente
            fecharModal('verificacaoEmailModal');
            abrirModal('loginModal');
            
            mostrarMensagem('Faça o login novamente após verificar seu e-mail', 'info');
        } catch (error) {
            mostrarMensagem('Erro ao verificar', 'error');
        } finally {
            esconderLoading();
        }
    });

    configurarMenuPerfil();
    
    // ============================================
    // 🔥 EVENTOS DE AGENDAMENTO
    // ============================================
    
    // Botão "Fazer Agendamento"
    document.getElementById('btnAbrirAgendamento')?.addEventListener('click', () => {
        if (!usuarioLogado) {
            mostrarMensagem('Faça login para fazer um agendamento', 'warning');
            abrirModal('loginModal');
            return;
        }
        abrirModalAgendamento();
    });
    
    // Botão "Ver Fila Completa"
    document.getElementById('btnVerAgendamento')?.addEventListener('click', () => {
        window.location.href = 'agendamento.html';
    });
    
    console.log("✅ Eventos configurados");
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loading) {
        if (loadingMessage) loadingMessage.textContent = mensagem;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    const textEl = alert.querySelector('.message-text');
    if (textEl) textEl.textContent = texto;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

// ============================================
// INICIALIZAÇÃO (CORRIGIDA - EXECUTA IMEDIATAMENTE)
// ============================================
(async function() {
    console.log("📄 Inicializando clientes.js imediatamente...");
    
    mostrarLoading('Carregando loja...');
    
    try {
        // Garantir que temos o lojaId
        if (!lojaIdAtual) {
            lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
        }
        
        console.log(`📍 Loja ID: ${lojaIdAtual}`);
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            return;
        }
        
        // Configurar favicon
        configurarFavicon();
        
        // Carregar logo
        carregarLogoLoja();
        
        // Carregar dados da loja (com retry)
        await carregarDadosLoja();
        
        // 🔥 NOVO: Verificar se agendamento está habilitado
        agendamentoHabilitado = await verificarAgendamentoHabilitado();
        console.log(`📅 Agendamento habilitado para esta loja? ${agendamentoHabilitado ? 'SIM' : 'NÃO'}`);
        toggleAgendamentoContainer(agendamentoHabilitado);

        if (agendamentoHabilitado) {
            iniciarEscutaAgendamentos();
        }
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar produtos e categorias
        await carregarProdutos();
        await carregarCategorias();
        await carregarProdutosDestaque();
        
        esconderLoading();
        console.log("✅ Loja clientes pronta!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar loja', 'error');
        esconderLoading();
    }
})();

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.verProdutoDetalhe = verProdutoDetalhe;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.filtrarPorCategoria = filtrarPorCategoria;
window.fecharModal = fecharModal;

console.log("✅ index.js carregado com sucesso!");






