 // agendamento.js - Sistema Completo de Gestão de Agendamentos
console.log("📅 Inicializando sistema de agendamentos...");

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
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ============================================
const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E📅%3C/text%3E%3C/svg%3E";

let lojaIdAtual = null;
let dadosUsuario = null;
let usuarioLogado = false;
let agendamentosAtivos = [];
let agendamentosFuturos = [];
let agendamentosHistorico = [];
let unsubscribeAgendamentos = null;
let unsubscribeFuturos = null;

// Configurações da loja
let configLoja = {
    horarioFuncionamento: {},
    maxClientesDia: 30,
    maxSimultaneos: 3,
    validacaoAutomatica: true,
    notificacoesAtivas: true,
    mensagemNotificacao: "Olá {cliente}, sua senha {senha} está como PRÓXIMO A ATENDER. Por favor, dirija-se ao estabelecimento."
};

// ============================================
// OBTER LOJA ID DA URL
// ============================================
function obterLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`📍 Loja ID: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (window.lojaServices && window.lojaServices.lojaId) {
        lojaIdAtual = window.lojaServices.lojaId;
        console.log(`📍 Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.error('❌ Não foi possível identificar a loja');
    return null;
}

// ============================================
// VERIFICAR PERMISSÃO DE ACESSO NO BANCO
// ============================================
async function verificarPermissaoAcesso() {
    console.log("🔒 Verificando permissão de acesso no banco de dados...");
    
    try {
        // Verificar se está logado no Firebase Auth
        if (!window.auth || !window.auth.currentUser) {
            console.log("❌ Usuário não está logado no Firebase Auth");
            return false;
        }
        
        const user = window.auth.currentUser;
        const email = user.email;
        
        if (!lojaIdAtual || !email) {
            console.log("❌ Loja ou email não identificado");
            return false;
        }
        
        console.log(`🔍 Verificando permissão para ${email} na loja ${lojaIdAtual}`);
        
        // 🔥 VERIFICAR SE É ADMIN GLOBAL (coleção admin)
        const adminDoc = await window.loginDb
            .collection('usuarios')
            .doc('admin')
            .get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData[email]) {
                console.log("✅ Usuário é ADMIN global - acesso permitido");
                
                // Salvar dados do usuário
                dadosUsuario = {
                    email: email,
                    nome: adminData[email].nome || 'Admin',
                    tipo: 'admin',
                    perfil: 'admin',
                    uid: user.uid
                };
                usuarioLogado = true;
                
                return true;
            }
        }
        
        // 🔥 VERIFICAR SE É FUNCIONÁRIO DA LOJA
        const funcDoc = await window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('funcionarios')
            .doc(email)
            .get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            
            if (funcData.ativo === false) {
                console.log("❌ Funcionário inativo");
                return false;
            }
            
            console.log(`✅ Funcionário ${funcData.perfil} - acesso permitido`);
            
            // Salvar dados do usuário
            dadosUsuario = {
                email: email,
                nome: funcData.nome,
                tipo: 'funcionario',
                perfil: funcData.perfil,
                uid: user.uid
            };
            usuarioLogado = true;
            
            return true;
        }
        
        // 🔥 VERIFICAR SE É CLIENTE (NEGAR ACESSO)
        const clienteDoc = await window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes')
            .doc(email)
            .get();
        
        if (clienteDoc.exists) {
            console.log("❌ Cliente não tem permissão para acessar");
            return false;
        }
        
        console.log("❌ Usuário não encontrado em nenhuma categoria");
        return false;
        
    } catch (error) {
        console.error("❌ Erro ao verificar permissão:", error);
        return false;
    }
}

// ============================================
// REDIRECIONAR PARA PÁGINA DE CLIENTES
// ============================================
function redirecionarParaClientes() {
    console.log("🔄 Redirecionando para página de clientes...");
    window.location.href = 'index.html';
}

// ============================================
// VERIFICAÇÃO BLOQUEANTE - EXECUTA IMEDIATAMENTE
// ============================================
(async function() {
    console.log("🔒 Verificação bloqueante de acesso ao agendamento...");
    
    // MOSTRAR LOADING IMEDIATAMENTE
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'flex';
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = 'Verificando permissões...';
    }
    
    try {
        // Obter loja ID
        lojaIdAtual = obterLojaIdDaURL();
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // AGUARDAR FIREBASE AUTH INICIALIZAR (até 5 segundos)
        let tentativas = 0;
        const maxTentativas = 10;
        
        while (tentativas < maxTentativas) {
            if (window.auth && window.auth.currentUser) {
                console.log('✅ Firebase Auth inicializado:', window.auth.currentUser.email);
                break;
            }
            console.log(`⏳ Aguardando Firebase Auth... tentativa ${tentativas + 1}/${maxTentativas}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            tentativas++;
        }
        
        // Verificar se conseguiu obter o usuário
        if (!window.auth || !window.auth.currentUser) {
            console.log('❌ Firebase Auth não inicializado após timeout');
            mostrarMensagem('Faça login para acessar esta página', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // Verificar permissão no banco
        const acessoPermitido = await verificarPermissaoAcesso();
        
        if (!acessoPermitido) {
            console.log("🚫 Acesso negado - Redirecionando...");
            mostrarMensagem('Acesso restrito a funcionários', 'error', 3000);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // ✅ ACESSO PERMITIDO
        console.log("✅ Acesso permitido, carregando sistema...");
        console.log("👤 Usuário:", dadosUsuario);
        
        // Atualizar nome na interface
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            let tipoDisplay = '';
            if (dadosUsuario.tipo === 'admin') {
                tipoDisplay = ' (Admin)';
            } else if (dadosUsuario.tipo === 'funcionario') {
                const perfilFormatado = dadosUsuario.perfil.charAt(0).toUpperCase() + dadosUsuario.perfil.slice(1);
                tipoDisplay = ` (${perfilFormatado})`;
            }
            userNameElement.textContent = (dadosUsuario.nome || 'Usuário') + tipoDisplay;
        }
        
        // Configurar favicon e logo
        configurarFavicon();
        carregarLogoLoja();
        
        // Carregar configurações
        await carregarConfiguracoesLoja();
        await carregarHorariosFuncionamento();
        
        // Configurar eventos
        configurarEventos();
        
        // Iniciar escuta de agendamentos
        iniciarEscutaAgendamentos();
        
        // Esconder loading
        if (loading) {
            loading.style.display = 'none';
        }
        
        console.log("✅ Sistema de agendamentos pronto!");
        
    } catch (error) {
        console.error("❌ Erro na verificação:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
})();

// ============================================
// CONFIGURAR FAVICON
// ============================================
function configurarFavicon() {
    if (lojaIdAtual) {
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = `../../imagens/${lojaIdAtual}/icone.ico`;
            console.log(`✅ Favicon configurado para loja: ${lojaIdAtual}`);
        }
    }
}

// ============================================
// CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    if (!lojaIdAtual) {
        logoImg.src = LOGO_PLACEHOLDER;
        return;
    }
    
    const logoPath = `../../imagens/${lojaIdAtual}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
    };
    
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada, usando placeholder`);
        logoImg.src = LOGO_PLACEHOLDER;
    };
    
    testImg.src = logoPath;
}

// ============================================
// CARREGAR CONFIGURAÇÕES DA LOJA
// ============================================
async function carregarConfiguracoesLoja() {
    if (!lojaIdAtual || !window.loginDb) return;
    
    try {
        const configRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('config');
        
        const configDoc = await configRef.get();
        
        if (configDoc.exists) {
            configLoja = {
                ...configLoja,
                ...configDoc.data()
            };
            console.log('✅ Configurações carregadas:', configLoja);
        } else {
            // Criar configurações padrão
            await configRef.set(configLoja);
            console.log('✅ Configurações padrão criadas');
        }
        
        return configLoja;
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        return configLoja;
    }
}

// ============================================
// CARREGAR HORÁRIOS DE FUNCIONAMENTO
// ============================================
async function carregarHorariosFuncionamento() {
    if (!lojaIdAtual || !window.loginDb) return;
    
    try {
        const horariosRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('horarios');
        
        const horariosDoc = await horariosRef.get();
        
        if (horariosDoc.exists) {
            const dados = horariosDoc.data();
            
            // Dias da semana
            const diasSemana = [
                { id: 'segunda', nome: 'Segunda-feira' },
                { id: 'terca', nome: 'Terça-feira' },
                { id: 'quarta', nome: 'Quarta-feira' },
                { id: 'quinta', nome: 'Quinta-feira' },
                { id: 'sexta', nome: 'Sexta-feira' },
                { id: 'sabado', nome: 'Sábado' },
                { id: 'domingo', nome: 'Domingo' }
            ];
            
            let html = '';
            diasSemana.forEach(dia => {
                const configDia = dados[dia.id] || {
                    aberto: dia.id !== 'domingo',
                    abertura: '10:00',
                    fechamento: '18:00',
                    intervaloInicio: '13:00',
                    intervaloFim: '14:00',
                    maxClientes: 30
                };
                
                html += `
                    <div class="horario-card" data-dia="${dia.id}">
                        <div class="dia-header">
                            <span class="dia-nome">${dia.nome}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" class="toggle-dia" ${configDia.aberto ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="horario-inputs" ${!configDia.aberto ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                            <div class="input-group">
                                <label>Abertura</label>
                                <input type="time" class="abertura" value="${configDia.abertura}">
                            </div>
                            <div class="input-group">
                                <label>Fechamento</label>
                                <input type="time" class="fechamento" value="${configDia.fechamento}">
                            </div>
                            
                            <div class="input-group intervalo">
                                <label>Intervalo</label>
                                <div class="intervalo-inputs">
                                    <input type="time" class="intervalo-inicio" value="${configDia.intervaloInicio}">
                                    <span>às</span>
                                    <input type="time" class="intervalo-fim" value="${configDia.intervaloFim}">
                                </div>
                            </div>
                            
                            <div class="input-group">
                                <label>Máx. Clientes</label>
                                <input type="number" class="max-clientes" value="${configDia.maxClientes}" min="0" max="100">
                            </div>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('horariosSemana').innerHTML = html;
            
            // Carregar exceções
            const excecoesRef = window.loginDb
                .collection('configuracoes')
                .doc(lojaIdAtual)
                .collection('agendamento')
                .doc('excecoes');
            
            const excecoesDoc = await excecoesRef.get();
            
            if (excecoesDoc.exists) {
                renderizarExcecoes(excecoesDoc.data().lista || []);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
    }
}

// ============================================
// INICIAR ESCUTA DE AGENDAMENTOS
// ============================================
function iniciarEscutaAgendamentos() {
    if (!lojaIdAtual || !window.loginDb) {
        console.error('❌ Não foi possível iniciar escuta');
        return;
    }
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos...');
    
    try {
        // Agendamentos Ativos (hoje)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        
        const hojeStr = hoje.toISOString().split('T')[0];
        const amanhaStr = amanha.toISOString().split('T')[0];
        
        const ativosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .where('data', '>=', hojeStr)
            .where('data', '<', amanhaStr)
            .orderBy('senha', 'asc');
        
        unsubscribeAgendamentos = ativosRef.onSnapshot((snapshot) => {
            const agendamentos = [];
            snapshot.forEach(doc => {
                agendamentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            agendamentosAtivos = agendamentos;
            renderizarPainelFila();
            
        }, (error) => {
            console.error('❌ Erro na escuta de ativos:', error);
        });
        
        // Agendamentos Futuros
        const futurosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('futuros')
            .where('data', '>=', amanhaStr)
            .orderBy('data', 'asc')
            .orderBy('horario', 'asc');
        
        unsubscribeFuturos = futurosRef.onSnapshot((snapshot) => {
            const futuros = [];
            snapshot.forEach(doc => {
                futuros.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            agendamentosFuturos = futuros;
            renderizarAgendamentosFuturos();
            
        }, (error) => {
            console.error('❌ Erro na escuta de futuros:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// RENDERIZAR PAINEL DE FILA (3 COLUNAS)
// ============================================
function renderizarPainelFila() {
    // Filtrar por status
    const emAtendimento = agendamentosAtivos.filter(a => a.status === 'chamando');
    const proximos = agendamentosAtivos.filter(a => a.status === 'aguardando' && a.validado === true);
    const outros = agendamentosAtivos.filter(a => a.status === 'aguardando' && a.validado !== true);
    
    // Atualizar badges
    document.getElementById('emAtendimentoBadge').textContent = emAtendimento.length;
    document.getElementById('proximosBadge').textContent = proximos.length;
    document.getElementById('outrosBadge').textContent = outros.length;
    document.getElementById('filaTotalBadge').textContent = proximos.length + outros.length;
    
    // Renderizar EM ATENDIMENTO
    const emAtendimentoLista = document.getElementById('emAtendimentoLista');
    if (emAtendimento.length > 0) {
        let html = '';
        emAtendimento.forEach(item => {
            html += `
                <div class="card-atendimento" data-id="${item.id}">
                    <div class="info">
                        <h4>${item.cliente_nome}</h4>
                        <div>
                            <span class="senha">${item.senha}</span>
                            <span class="servico">${item.servico}</span>
                        </div>
                    </div>
                    <div class="acoes">
                        <button class="btn-acao-card" onclick="concluirAtendimento('${item.id}')" title="Concluir">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        emAtendimentoLista.innerHTML = html;
    } else {
        emAtendimentoLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-clock"></i>
                <p>Nenhum atendimento no momento</p>
            </div>
        `;
    }
    
    // Renderizar PRÓXIMOS A ATENDER
    const proximosLista = document.getElementById('proximosLista');
    if (proximos.length > 0) {
        let html = '';
        proximos.forEach((item, index) => {
            html += `
                <div class="card-aguardando ${index === 0 ? 'proximo' : ''}" data-id="${item.id}">
                    <span class="senha-numero">${item.senha}</span>
                    <div class="info">
                        <span class="cliente">${item.cliente_nome}</span>
                        <span class="servico">
                            <i class="fas fa-cut"></i> ${item.servico}
                        </span>
                    </div>
                    <div class="acoes">
                        <button class="btn-acao-card" onclick="chamarCliente('${item.id}')" title="Chamar">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        proximosLista.innerHTML = html;
        
        // Habilitar botão chamar próximo
        document.getElementById('btnChamarProximo').disabled = false;
    } else {
        proximosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-smile"></i>
                <p>Fila vazia</p>
            </div>
        `;
        document.getElementById('btnChamarProximo').disabled = true;
    }
    
    // Renderizar OUTROS NA FILA
    const outrosLista = document.getElementById('outrosLista');
    if (outros.length > 0) {
        let html = '';
        outros.forEach(item => {
            html += `
                <div class="card-aguardando pendente" data-id="${item.id}">
                    <span class="senha-numero">${item.senha}</span>
                    <div class="info">
                        <span class="cliente">${item.cliente_nome}</span>
                        <span class="servico">
                            <i class="fas fa-cut"></i> ${item.servico}
                        </span>
                        ${!item.validado ? '<span class="badge-validar">Aguardando validação</span>' : ''}
                    </div>
                    <div class="acoes">
                        <button class="btn-acao-card" onclick="editarAgendamento('${item.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!item.validado ? `
                            <button class="btn-acao-card success" onclick="validarAgendamento('${item.id}')" title="Validar">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        outrosLista.innerHTML = html;
    } else {
        outrosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-smile"></i>
                <p>Fila vazia</p>
            </div>
        `;
    }
}

// ============================================
// RENDERIZAR AGENDAMENTOS FUTUROS
// ============================================
function renderizarAgendamentosFuturos() {
    const grid = document.getElementById('futurosGrid');
    document.getElementById('futurosBadge').textContent = agendamentosFuturos.length;
    
    if (agendamentosFuturos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>Nenhum agendamento futuro</p>
            </div>
        `;
        return;
    }
    
    // Agrupar por data
    const porData = {};
    agendamentosFuturos.forEach(ag => {
        if (!porData[ag.data]) {
            porData[ag.data] = [];
        }
        porData[ag.data].push(ag);
    });
    
    let html = '';
    for (const [data, agendamentos] of Object.entries(porData)) {
        const dataObj = new Date(data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Verificar limite do dia
        const totalDia = agendamentos.length;
        const limiteDia = configLoja.maxClientesDia;
        const corLimite = totalDia >= limiteDia ? '#dc3545' : '#28a745';
        
        html += `
            <div class="data-group">
                <div class="data-header">
                    <h4>${dataFormatada}</h4>
                    <span class="limite-dia" style="color: ${corLimite}">
                        ${totalDia}/${limiteDia} agendamentos
                    </span>
                </div>
                <div class="agendamentos-data">
        `;
        
        agendamentos.forEach(ag => {
            const validado = ag.validado ? 'validado' : 'pendente';
            const temWhatsApp = ag.cliente_whatsapp ? '✅' : '❌';
            
            html += `
                <div class="futuro-card ${validado}" data-id="${ag.id}">
                    <div class="futuro-horario">${ag.horario}</div>
                    <div class="futuro-info">
                        <strong>${ag.cliente_nome}</strong>
                        <span>${ag.servico}</span>
                        <small>Whats: ${temWhatsApp} | Email: ${ag.cliente_email || '---'}</small>
                    </div>
                    <div class="futuro-status">
                        ${!ag.validado ? 
                            '<span class="badge-pendente">Pendente</span>' : 
                            '<span class="badge-validado">Validado</span>'
                        }
                    </div>
                    <div class="futuro-acoes">
                        ${!ag.validado ? `
                            <button class="btn-validar" onclick="validarAgendamentoFuturo('${ag.id}')">
                                <i class="fas fa-check"></i> Validar
                            </button>
                        ` : ''}
                        <button class="btn-editar" onclick="editarAgendamentoFuturo('${ag.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-excluir" onclick="excluirAgendamentoFuturo('${ag.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

// ============================================
// CHAMAR PRÓXIMO CLIENTE
// ============================================
async function chamarProximo() {
    if (!window.loginDb || !lojaIdAtual) return;
    
    // Encontrar próximo aguardando validado
    const proximo = agendamentosAtivos.find(a => 
        a.status === 'aguardando' && a.validado === true
    );
    
    if (!proximo) {
        mostrarMensagem('Não há próximo na fila', 'warning');
        return;
    }
    
    try {
        mostrarLoading('Chamando próximo...');
        
        // Atualizar status para 'chamando'
        const agRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .doc(proximo.id);
        
        await updateDoc(agRef, {
            status: 'chamando',
            data_chamada: serverTimestamp()
        });
        
        // Enviar notificação se configurado
        if (configLoja.notificacoesAtivas && proximo.cliente_whatsapp) {
            await enviarNotificacaoProximo(proximo);
        }
        
        mostrarMensagem(`Chamando ${proximo.cliente_nome} - Senha ${proximo.senha}`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao chamar próximo:', error);
        mostrarMensagem('Erro ao chamar cliente', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CONCLUIR ATENDIMENTO
// ============================================
async function concluirAtendimento(id) {
    if (!window.loginDb || !lojaIdAtual) return;
    
    try {
        mostrarLoading('Concluindo atendimento...');
        
        const agRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .doc(id);
        
        // Mover para histórico
        const agDoc = await agRef.get();
        const dados = agDoc.data();
        
        const historicoRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('historico')
            .doc(id);
        
        await setDoc(historicoRef, {
            ...dados,
            status: 'concluido',
            data_conclusao: serverTimestamp()
        });
        
        // Remover dos ativos
        await deleteDoc(agRef);
        
        mostrarMensagem('Atendimento concluído com sucesso!', 'success');
        
        // Chamar próximo automaticamente
        setTimeout(() => {
            chamarProximo();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao concluir:', error);
        mostrarMensagem('Erro ao concluir atendimento', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// VALIDAR AGENDAMENTO
// ============================================
async function validarAgendamento(id) {
    if (!window.loginDb || !lojaIdAtual) return;
    
    try {
        const agRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .doc(id);
        
        await updateDoc(agRef, {
            validado: true,
            data_validacao: serverTimestamp(),
            validado_por: dadosUsuario?.email || 'sistema'
        });
        
        mostrarMensagem('Agendamento validado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao validar:', error);
        mostrarMensagem('Erro ao validar agendamento', 'error');
    }
}

// ============================================
// VALIDAR TODOS OS AGENDAMENTOS FUTUROS
// ============================================
async function validarTodosFuturos() {
    if (!window.loginDb || !lojaIdAtual) return;
    
    const pendentes = agendamentosFuturos.filter(a => !a.validado);
    
    if (pendentes.length === 0) {
        mostrarMensagem('Não há agendamentos pendentes', 'info');
        return;
    }
    
    if (!confirm(`Deseja validar ${pendentes.length} agendamento(s)?`)) return;
    
    try {
        mostrarLoading('Validando todos...');
        
        const batch = [];
        pendentes.forEach(ag => {
            batch.push(
                updateDoc(
                    window.loginDb
                        .collection('agendamentos')
                        .doc(lojaIdAtual)
                        .collection('futuros')
                        .doc(ag.id),
                    {
                        validado: true,
                        data_validacao: serverTimestamp(),
                        validado_por: dadosUsuario?.email || 'sistema'
                    }
                )
            );
        });
        
        await Promise.all(batch);
        
        mostrarMensagem(`${pendentes.length} agendamentos validados!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao validar todos:', error);
        mostrarMensagem('Erro ao validar agendamentos', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// ENVIAR NOTIFICAÇÃO WHATSAPP
// ============================================
async function enviarNotificacaoProximo(agendamento) {
    if (!agendamento.cliente_whatsapp) return;
    
    try {
        const mensagem = configLoja.mensagemNotificacao
            .replace('{cliente}', agendamento.cliente_nome)
            .replace('{senha}', agendamento.senha)
            .replace('{servico}', agendamento.servico)
            .replace('{loja}', document.getElementById('lojaNomeHeader')?.textContent || 'Estabelecimento');
        
        // Aqui você integraria com API de WhatsApp
        console.log('📱 Enviando WhatsApp para:', agendamento.cliente_whatsapp);
        console.log('📝 Mensagem:', mensagem);
        
        // Registrar notificação enviada
        const notificacaoRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('notificacoes')
            .doc();
        
        await setDoc(notificacaoRef, {
            agendamento_id: agendamento.id,
            cliente: agendamento.cliente_nome,
            telefone: agendamento.cliente_whatsapp,
            mensagem: mensagem,
            tipo: 'whatsapp',
            data_envio: serverTimestamp(),
            status: 'enviado'
        });
        
        console.log('✅ Notificação registrada');
        
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
    }
}

// ============================================
// PAUSAR ATENDIMENTO
// ============================================
async function pausarAtendimento(modo, tempo) {
    if (!window.loginDb || !lojaIdAtual) return;
    
    try {
        mostrarLoading('Aplicando pausa...');
        
        const pausaRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('pausa');
        
        const fimPausa = tempo > 0 ? new Date(Date.now() + tempo * 60000) : null;
        
        await setDoc(pausaRef, {
            ativo: true,
            modo: modo,
            tempo: tempo,
            data_inicio: serverTimestamp(),
            data_fim: fimPausa,
            pausado_por: dadosUsuario?.email || 'sistema'
        });
        
        // Aplicar regras baseadas no modo
        if (modo === 'apenas_atendimento') {
            // Finaliza apenas quem está em atendimento? Não, só pausa novos chamados
            console.log('Modo: apenas atendimento - pode continuar chamando?', false);
            
        } else if (modo === 'todos') {
            // Pausa todos, finaliza apenas quem está em atendimento
            const emAtendimento = agendamentosAtivos.filter(a => a.status === 'chamando');
            
            for (const ag of emAtendimento) {
                await concluirAtendimento(ag.id);
            }
            
        } else if (modo === 'ate_proximos') {
            // Marca OUTROS como pausados
            const outros = agendamentosAtivos.filter(a => 
                a.status === 'aguardando' && a.validado === true && a.senha > '002'
            );
            
            for (const ag of outros) {
                await updateDoc(
                    window.loginDb
                        .collection('agendamentos')
                        .doc(lojaIdAtual)
                        .collection('ativos')
                        .doc(ag.id),
                    {
                        status: 'pausado',
                        data_pausa: serverTimestamp()
                    }
                );
            }
        }
        
        // Atualizar interface
        document.getElementById('statusFuncionamento').style.display = 'none';
        document.getElementById('statusPausa').style.display = 'flex';
        
        if (tempo > 0) {
            iniciarContadorPausa(tempo);
        } else {
            document.getElementById('tempoPausaRestante').textContent = 'Indeterminado';
        }
        
        fecharModal('pausaModal');
        mostrarMensagem('Atendimento pausado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao pausar:', error);
        mostrarMensagem('Erro ao pausar atendimento', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CONTADOR DE PAUSA
// ============================================
let intervaloPausa = null;

function iniciarContadorPausa(minutos) {
    if (intervaloPausa) clearInterval(intervaloPausa);
    
    const fim = new Date(Date.now() + minutos * 60000);
    
    intervaloPausa = setInterval(() => {
        const agora = new Date();
        const diff = fim - agora;
        
        if (diff <= 0) {
            clearInterval(intervaloPausa);
            intervaloPausa = null;
            retomarAtendimento();
            return;
        }
        
        const minutosRest = Math.floor(diff / 60000);
        const segundosRest = Math.floor((diff % 60000) / 1000);
        
        document.getElementById('tempoPausaRestante').textContent = 
            `${minutosRest}:${segundosRest.toString().padStart(2, '0')}`;
    }, 1000);
}

// ============================================
// RETOMAR ATENDIMENTO
// ============================================
async function retomarAtendimento() {
    if (!window.loginDb || !lojaIdAtual) return;
    
    try {
        const pausaRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('pausa');
        
        await updateDoc(pausaRef, {
            ativo: false,
            data_retomada: serverTimestamp()
        });
        
        document.getElementById('statusFuncionamento').style.display = 'flex';
        document.getElementById('statusPausa').style.display = 'none';
        
        mostrarMensagem('Atendimento retomado!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao retomar:', error);
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Botão chamar próximo
    document.getElementById('btnChamarProximo')?.addEventListener('click', chamarProximo);
    
    // Botão novo agendamento
    document.getElementById('btnNovoAgendamento')?.addEventListener('click', () => {
        abrirModalAgendamento();
    });
    
    // Botão pausar
    document.getElementById('btnPausarAtendimento')?.addEventListener('click', () => {
        abrirModal('pausaModal');
    });
    
    // Confirmar pausa
    document.getElementById('btnConfirmarPausa')?.addEventListener('click', () => {
        const modo = document.querySelector('input[name="modoPausa"]:checked').value;
        const tempo = parseInt(document.getElementById('tempoPausa').value);
        pausarAtendimento(modo, tempo);
    });
    
    // Botão validar todos
    document.getElementById('btnValidarTodos')?.addEventListener('click', validarTodosFuturos);
    
    // Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
    
    // Salvar configurações de funcionamento
    document.getElementById('btnSalvarFuncionamento')?.addEventListener('click', salvarConfigFuncionamento);
    
    // Adicionar exceção
    document.getElementById('btnAddExcecao')?.addEventListener('click', () => {
        abrirModal('excecaoModal');
    });
    
    // Salvar exceção
    document.getElementById('btnSalvarExcecao')?.addEventListener('click', salvarExcecao);
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

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

// ============================================
// EVENTOS DE LOGIN (do Firebase Auth)
// ============================================
window.addEventListener('usuarioLogado', async (event) => {
    const { usuario } = event.detail;
    
    console.log('✅ EVENTO: usuário logado no agendamento');
    console.log('📧 Email:', usuario.email);
    
    // Já estamos na página, apenas atualizar se necessário
    if (!dadosUsuario) {
        // Recarregar a página para aplicar as permissões
        window.location.reload();
    }
});

window.addEventListener('usuarioDeslogado', () => {
    console.log('👤 EVENTO: usuário deslogado');
    
    // Redirecionar para index
    window.location.href = 'index.html';
});

// ============================================
// FUNÇÕES AUXILIARES (a serem implementadas)
// ============================================
function renderizarExcecoes(excecoes) {
    console.log('Renderizar exceções:', excecoes);
}

function abrirModalAgendamento() {
    console.log('Abrir modal de agendamento');
}

function salvarConfigFuncionamento() {
    console.log('Salvar configurações de funcionamento');
}

function salvarExcecao() {
    console.log('Salvar exceção');
}

function editarExcecao(data) {
    console.log('Editar exceção:', data);
}

function excluirExcecao(data) {
    console.log('Excluir exceção:', data);
}

function validarAgendamentoFuturo(id) {
    console.log('Validar agendamento futuro:', id);
}

function editarAgendamentoFuturo(id) {
    console.log('Editar agendamento futuro:', id);
}

function excluirAgendamentoFuturo(id) {
    console.log('Excluir agendamento futuro:', id);
}

function chamarCliente(id) {
    console.log('Chamar cliente:', id);
}

function editarAgendamento(id) {
    console.log('Editar agendamento:', id);
}

// Limpar ao sair
window.addEventListener('beforeunload', () => {
    if (unsubscribeAgendamentos) unsubscribeAgendamentos();
    if (unsubscribeFuturos) unsubscribeFuturos();
    if (intervaloPausa) clearInterval(intervaloPausa);
});
