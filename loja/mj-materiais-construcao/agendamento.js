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
let intervaloPausa = null;

// Variáveis para gerenciar agendamentos
let todosAgendamentos = [];
let paginaAtual = 1;
const itensPorPagina = 10;

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
        
        // 🔥 DEFINIR DIAS DA SEMANA AQUI (ANTES DE USAR)
        const diasSemana = [
            { id: 'segunda', nome: 'Segunda-feira' },
            { id: 'terca', nome: 'Terça-feira' },
            { id: 'quarta', nome: 'Quarta-feira' },
            { id: 'quinta', nome: 'Quinta-feira' },
            { id: 'sexta', nome: 'Sexta-feira' },
            { id: 'sabado', nome: 'Sábado' },
            { id: 'domingo', nome: 'Domingo' }
        ];
        
        if (horariosDoc.exists) {
            const dados = horariosDoc.data();
            
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
            
            const horariosSemana = document.getElementById('horariosSemana');
            if (horariosSemana) {
                horariosSemana.innerHTML = html;
            }
            
            // Carregar exceções
            const excecoesRef = window.loginDb
                .collection('configuracoes')
                .doc(lojaIdAtual)
                .collection('agendamento')
                .doc('excecoes');
            
            const excecoesDoc = await excecoesRef.get();
            
            if (excecoesDoc.exists) {
                renderizarExcecoes(excecoesDoc.data().lista || []);
            } else {
                // Criar lista vazia se não existir
                await excecoesRef.set({ lista: [] });
                renderizarExcecoes([]);
            }
        } else {
            // Criar horários padrão se não existir
            console.log('📅 Criando horários padrão...');
            const horariosPadrao = {};
            diasSemana.forEach(dia => {
                horariosPadrao[dia.id] = {
                    aberto: dia.id !== 'domingo',
                    abertura: '10:00',
                    fechamento: '18:00',
                    intervaloInicio: '13:00',
                    intervaloFim: '14:00',
                    maxClientes: 30
                };
            });
            
            await horariosRef.set(horariosPadrao);
            console.log('✅ Horários padrão criados');
            
            // Renderizar com os dados padrão
            let html = '';
            diasSemana.forEach(dia => {
                html += `
                    <div class="horario-card" data-dia="${dia.id}">
                        <div class="dia-header">
                            <span class="dia-nome">${dia.nome}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" class="toggle-dia" ${dia.id !== 'domingo' ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="horario-inputs" ${dia.id === 'domingo' ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                            <div class="input-group">
                                <label>Abertura</label>
                                <input type="time" class="abertura" value="10:00">
                            </div>
                            <div class="input-group">
                                <label>Fechamento</label>
                                <input type="time" class="fechamento" value="18:00">
                            </div>
                            
                            <div class="input-group intervalo">
                                <label>Intervalo</label>
                                <div class="intervalo-inputs">
                                    <input type="time" class="intervalo-inicio" value="13:00">
                                    <span>às</span>
                                    <input type="time" class="intervalo-fim" value="14:00">
                                </div>
                            </div>
                            
                            <div class="input-group">
                                <label>Máx. Clientes</label>
                                <input type="number" class="max-clientes" value="30" min="0" max="100">
                            </div>
                        </div>
                    </div>
                `;
            });
            
            const horariosSemana = document.getElementById('horariosSemana');
            if (horariosSemana) {
                horariosSemana.innerHTML = html;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
    }
}

// ============================================
// INICIAR ESCUTA DE AGENDAMENTOS (SEM ÍNDICES)
// ============================================
function iniciarEscutaAgendamentos() {
    if (!lojaIdAtual || !window.loginDb) {
        console.error('❌ Não foi possível iniciar escuta');
        return;
    }
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos (sem índices)...');
    
    try {
        // 🔥 ATIVOS: Buscar sem orderBy ou apenas com um campo
        const ativosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos');
        
        unsubscribeAgendamentos = ativosRef.onSnapshot((snapshot) => {
            const agendamentos = [];
            snapshot.forEach(doc => {
                agendamentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // 🔥 ORDENAR MANUALMENTE no JavaScript
            agendamentos.sort((a, b) => {
                // Primeiro por status (chamando > aguardando)
                if (a.status === 'chamando' && b.status !== 'chamando') return -1;
                if (a.status !== 'chamando' && b.status === 'chamando') return 1;
                
                // Depois por senha (numérica)
                const senhaA = parseInt(a.senha) || 0;
                const senhaB = parseInt(b.senha) || 0;
                return senhaA - senhaB;
            });
            
            agendamentosAtivos = agendamentos;
            renderizarPainelFila();
            
        }, (error) => {
            console.error('❌ Erro na escuta de ativos:', error);
        });
        
        // 🔥 FUTUROS: Buscar sem orderBy ou apenas com um campo
        const futurosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('futuros');
        
        unsubscribeFuturos = futurosRef.onSnapshot((snapshot) => {
            const futuros = [];
            snapshot.forEach(doc => {
                futuros.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // 🔥 ORDENAR MANUALMENTE no JavaScript
            futuros.sort((a, b) => {
                // Por data
                if (a.data < b.data) return -1;
                if (a.data > b.data) return 1;
                
                // Mesma data, por horário
                if (a.horario < b.horario) return -1;
                if (a.horario > b.horario) return 1;
                
                return 0;
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
// RENDERIZAR PAINEL DE FILA (COM CHECKBOX)
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
    
    // Renderizar EM ATENDIMENTO (COM CHECKBOX)
    const emAtendimentoLista = document.getElementById('emAtendimentoLista');
    if (emAtendimento.length > 0) {
        let html = '';
        emAtendimento.forEach(item => {
            html += `
                <div class="card-atendimento" data-id="${item.id}">
                    <div class="card-checkbox">
                        <input type="checkbox" class="checkbox-atendimento" data-id="${item.id}">
                    </div>
                    <div class="info">
                        <h4>${item.cliente_nome}</h4>
                        <div>
                            <span class="senha">${item.senha}</span>
                            <span class="servico">${item.servico}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        emAtendimentoLista.innerHTML = html;
        
        // Configurar eventos dos checkboxes
        configurarCheckboxesAtendimento();
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
                        <button class="btn-acao-card" onclick="editarAgendamento('${item.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        proximosLista.innerHTML = html;
    } else {
        proximosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-smile"></i>
                <p>Fila vazia</p>
            </div>
        `;
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
            console.log('Modo: apenas atendimento');
            
        } else if (modo === 'todos') {
            const emAtendimento = agendamentosAtivos.filter(a => a.status === 'chamando');
            for (const ag of emAtendimento) {
                await concluirMultiplosAtendimentos([ag.id]);
            }
            
        } else if (modo === 'ate_proximos') {
            const outros = agendamentosAtivos.filter(a => 
                a.status === 'aguardando' && a.validado === true
            );
            for (const ag of outros.slice(1)) { // Pula o primeiro (próximo)
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
// CONFIGURAR CHECKBOXES DE ATENDIMENTO
// ============================================
function configurarCheckboxesAtendimento() {
    const checkboxes = document.querySelectorAll('.checkbox-atendimento');
    const btnConcluir = document.getElementById('btnConcluirSelecionados');
    const btnSelecionarTodos = document.getElementById('btnSelecionarTodosAtendimento');
    
    if (!checkboxes.length || !btnConcluir) return;
    
    // Atualizar estado do botão conforme checkboxes
    function atualizarBotaoConcluir() {
        const selecionados = document.querySelectorAll('.checkbox-atendimento:checked');
        btnConcluir.disabled = selecionados.length === 0;
        
        if (selecionados.length > 0) {
            btnConcluir.innerHTML = `<i class="fas fa-check-circle"></i> Concluir ${selecionados.length} selecionado(s)`;
        } else {
            btnConcluir.innerHTML = `<i class="fas fa-check-circle"></i> Concluir Selecionados`;
        }
    }
    
    // Evento de cada checkbox
    checkboxes.forEach(cb => {
        cb.addEventListener('change', atualizarBotaoConcluir);
    });
    
    // Botão selecionar todos
    if (btnSelecionarTodos) {
        btnSelecionarTodos.addEventListener('click', () => {
            const todosSelecionados = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !todosSelecionados);
            atualizarBotaoConcluir();
            
            btnSelecionarTodos.innerHTML = todosSelecionados ? 
                '<i class="fas fa-check-double"></i> Selecionar Todos' : 
                '<i class="fas fa-times"></i> Desmarcar Todos';
        });
    }
    
    // Botão concluir selecionados
    btnConcluir.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.checkbox-atendimento:checked'))
            .map(cb => cb.dataset.id);
        
        if (selecionados.length === 0) return;
        
        if (confirm(`Concluir ${selecionados.length} atendimento(s)?`)) {
            await concluirMultiplosAtendimentos(selecionados);
        }
    });
}

// ============================================
// CONCLUIR MÚLTIPLOS ATENDIMENTOS
// ============================================
async function concluirMultiplosAtendimentos(ids) {
    if (!window.loginDb || !lojaIdAtual || !ids || ids.length === 0) {
        mostrarMensagem('Nenhum atendimento selecionado', 'warning');
        return;
    }
    
    try {
        mostrarLoading(`Concluindo ${ids.length} atendimento(s)...`);
        
        let concluidos = 0;
        let erros = 0;
        
        for (const id of ids) {
            try {
                const agRef = window.loginDb
                    .collection('agendamentos')
                    .doc(lojaIdAtual)
                    .collection('ativos')
                    .doc(id);
                
                const agDoc = await agRef.get();
                
                if (!agDoc.exists) {
                    console.warn(`⚠️ Agendamento ${id} não encontrado`);
                    erros++;
                    continue;
                }
                
                const dados = agDoc.data();
                
                // Mover para histórico
                const historicoRef = window.loginDb
                    .collection('agendamentos')
                    .doc(lojaIdAtual)
                    .collection('historico')
                    .doc(id);
                
                await setDoc(historicoRef, {
                    ...dados,
                    status: 'concluido',
                    data_conclusao: serverTimestamp(),
                    concluido_por: dadosUsuario?.email || 'sistema',
                    concluido_em: new Date().toISOString()
                });
                
                // Remover dos ativos
                await deleteDoc(agRef);
                
                concluidos++;
                
            } catch (itemError) {
                console.error(`❌ Erro ao concluir agendamento ${id}:`, itemError);
                erros++;
            }
        }
        
        // Mensagem de resultado
        if (concluidos > 0) {
            mostrarMensagem(`${concluidos} atendimento(s) concluído(s) com sucesso!${erros > 0 ? ` (${erros} erro(s))` : ''}`, 'success');
        } else {
            mostrarMensagem('Nenhum atendimento foi concluído', 'error');
        }
        
        // Chamar próximo automaticamente (o primeiro da fila)
        setTimeout(() => {
            const proximo = agendamentosAtivos.find(a => 
                a.status === 'aguardando' && a.validado === true
            );
            if (proximo) {
                chamarProximo(proximo.id);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao concluir múltiplos atendimentos:', error);
        mostrarMensagem('Erro ao concluir atendimentos: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CHAMAR PRÓXIMO (AUTOMÁTICO)
// ============================================
async function chamarProximo(id) {
    if (!window.loginDb || !lojaIdAtual || !id) {
        console.error('❌ Dados insuficientes para chamar próximo');
        return;
    }
    
    try {
        console.log(`🔔 Chamando agendamento ID: ${id}`);
        
        const agRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .doc(id);
        
        await updateDoc(agRef, {
            status: 'chamando',
            data_chamada: serverTimestamp()
        });
        
        // Buscar dados do agendamento para mostrar mensagem
        const agendamento = agendamentosAtivos.find(a => a.id === id);
        
        if (agendamento) {
            mostrarMensagem(`🔔 Chamando ${agendamento.cliente_nome} - Senha ${agendamento.senha}`, 'success');
            
            // Enviar notificação se configurado
            if (configLoja.notificacoesAtivas && agendamento.cliente_whatsapp) {
                await enviarNotificacaoProximo(agendamento);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao chamar próximo:', error);
        mostrarMensagem('Erro ao chamar próximo cliente', 'error');
    }
}

// ============================================
// SALVAR EXCEÇÃO
// ============================================
async function salvarExcecao() {
    try {
        // Validar campos
        const data = document.getElementById('excecaoData').value;
        const tipo = document.getElementById('excecaoTipo').value;
        const abertura = document.getElementById('excecaoAbertura')?.value;
        const fechamento = document.getElementById('excecaoFechamento')?.value;
        const maxClientes = parseInt(document.getElementById('excecaoMaxClientes')?.value) || 0;
        const observacao = document.getElementById('excecaoObs')?.value || '';
        
        if (!data || !tipo) {
            mostrarMensagem('Preencha os campos obrigatórios', 'warning');
            return;
        }
        
        mostrarLoading('Salvando exceção...');
        
        // Buscar exceções existentes
        const excecoesRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('excecoes');
        
        const excecoesDoc = await excecoesRef.get();
        let excecoes = [];
        
        if (excecoesDoc.exists) {
            excecoes = excecoesDoc.data().lista || [];
        }
        
        // Verificar se já existe exceção para esta data
        const indexExistente = excecoes.findIndex(e => e.data === data);
        
        const novaExcecao = {
            data: data,
            tipo: tipo,
            abertura: abertura,
            fechamento: fechamento,
            maxClientes: maxClientes,
            observacao: observacao,
            criado_por: dadosUsuario?.email || 'sistema',
            criado_em: new Date().toISOString()
        };
        
        if (indexExistente >= 0) {
            // Atualizar existente
            excecoes[indexExistente] = novaExcecao;
            mostrarMensagem('Exceção atualizada com sucesso!', 'success');
        } else {
            // Adicionar nova
            excecoes.push(novaExcecao);
            mostrarMensagem('Exceção adicionada com sucesso!', 'success');
        }
        
        // Salvar no Firestore
        await setDoc(excecoesRef, { lista: excecoes });
        
        // Fechar modal
        fecharModal('excecaoModal');
        
        // Recarregar lista de exceções
        renderizarExcecoes(excecoes);
        
    } catch (error) {
        console.error('❌ Erro ao salvar exceção:', error);
        mostrarMensagem('Erro ao salvar exceção: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// ABRIR MODAL DE AGENDAMENTO PARA FUNCIONÁRIOS/ADMIN
// ============================================
function abrirModalAgendamentoFuncionarios() {
    console.log('Abrir modal de agendamento para funcionários');
    
    const modal = document.getElementById('criarAgendamentoModal');
    if (!modal) {
        console.error('❌ Modal criarAgendamentoModal não encontrado');
        mostrarMensagem('Erro ao abrir modal', 'error');
        return;
    }
    
    // Limpar formulário - com verificações
    const form = document.getElementById('criarAgendamentoForm');
    if (form) form.reset();
    
    // 🔥 CONFIGURAR EVENTOS DOS BOTÕES DE DIAS
    configurarEventosDias();
    
    // Limpar busca de cliente
    const buscaCliente = document.getElementById('buscaClienteAdmin');
    if (buscaCliente) {
        buscaCliente.value = '';
        buscaCliente.classList.remove('cliente-selecionado');
    }
    
    // Limpar resultados
    const resultados = document.getElementById('resultadosBuscaAdmin');
    if (resultados) {
        resultados.innerHTML = '';
        resultados.style.display = 'none';
    }
    
    // ✅ VERIFICAR SE O ELEMENTO EXISTE ANTES DE USAR
    const agendamentoIdInput = document.getElementById('agendamentoIdAdmin');
    if (agendamentoIdInput) {
        agendamentoIdInput.value = '';
    } else {
        console.warn('⚠️ Elemento agendamentoIdAdmin não encontrado');
    }
    
    // Carregar serviços
    carregarServicosAdmin();
    
    // Configurar data mínima
    const dataInput = document.getElementById('agendamentoDataAdmin');
    if (dataInput) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.min = `${ano}-${mes}-${dia}`;
        dataInput.value = `${ano}-${mes}-${dia}`;
        
        // Carregar horários
        setTimeout(() => carregarHorariosAdmin(), 100);
    }
    
    // Configurar busca de cliente
    if (buscaCliente) {
        buscaCliente.removeEventListener('input', buscarClientesAdmin);
        buscaCliente.addEventListener('input', buscarClientesAdmin);
    }
    
    modal.classList.add('active');
}

// ============================================
// CARREGAR SERVIÇOS (ADMIN)
// ============================================
function carregarServicosAdmin() {
    const select = document.getElementById('servicoAdminSelect');
    if (!select) return;
    
    const servicos = [
        { id: 'corte', nome: 'Corte de Cabelo' },
        { id: 'barba', nome: 'Barba' },
        { id: 'combo', nome: 'Corte + Barba' },
        { id: 'sobrancelha', nome: 'Sobrancelha' },
        { id: 'pigmentacao', nome: 'Pigmentação' }
    ];
    
    select.innerHTML = '<option value="">Selecione...</option>';
    servicos.forEach(serv => {
        select.innerHTML += `<option value="${serv.id}">${serv.nome}</option>`;
    });
}

// ============================================
// BUSCAR CLIENTES (ADMIN)
// ============================================
async function buscarClientesAdmin(e) {
    const termo = e.target.value.trim();
    const resultadosDiv = document.getElementById('resultadosBuscaAdmin');
    
    if (!resultadosDiv) return;
    
    if (termo.length < 3) {
        resultadosDiv.style.display = 'none';
        resultadosDiv.innerHTML = '';
        return;
    }
    
    try {
        const clientesRef = window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes');
        
        const snapshot = await clientesRef.get();
        
        const clientes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const nome = data.nome || '';
            if (nome.toLowerCase().includes(termo.toLowerCase())) {
                clientes.push({
                    email: doc.id,
                    nome: nome,
                    telefone: data.telefone || ''
                });
            }
        });
        
        if (clientes.length === 0) {
            resultadosDiv.innerHTML = `<div class="resultado-item" onclick="selecionarNovoClienteAdmin('${termo}')">
                <i class="fas fa-plus"></i> Criar novo: "${termo}"
            </div>`;
            resultadosDiv.style.display = 'block';
            return;
        }
        
        let html = '';
        clientes.forEach(cliente => {
            html += `<div class="resultado-item" onclick="selecionarClienteAdmin('${cliente.nome}', '${cliente.telefone}')">
                <strong>${cliente.nome}</strong>
                <small>${cliente.telefone || 'Sem telefone'}</small>
            </div>`;
        });
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// ============================================
// SELECIONAR CLIENTE (ADMIN)
// ============================================
window.selecionarClienteAdmin = function(nome, telefone) {
    const input = document.getElementById('buscaClienteAdmin');
    const resultados = document.getElementById('resultadosBuscaAdmin');
    
    if (input) {
        input.value = nome;
        input.setAttribute('data-telefone', telefone);
        input.classList.add('cliente-selecionado');
    }
    
    if (resultados) {
        resultados.style.display = 'none';
        resultados.innerHTML = '';
    }
};

// ============================================
// SELECIONAR NOVO CLIENTE (ADMIN)
// ============================================
window.selecionarNovoClienteAdmin = function(nome) {
    const input = document.getElementById('buscaClienteAdmin');
    const resultados = document.getElementById('resultadosBuscaAdmin');
    
    if (input) {
        input.value = nome;
        input.removeAttribute('data-telefone');
        input.classList.add('cliente-selecionado');
    }
    
    if (resultados) {
        resultados.style.display = 'none';
        resultados.innerHTML = '';
    }
};

// ============================================
// CARREGAR HORÁRIOS (ADMIN)
// ============================================
async function carregarHorariosAdmin() {
    const dataInput = document.getElementById('agendamentoDataAdmin');
    const horarioSelect = document.getElementById('agendamentoHorarioAdmin');
    
    if (!dataInput || !horarioSelect) return;
    
    const dataSelecionada = dataInput.value;
    if (!dataSelecionada) return;
    
    horarioSelect.innerHTML = '<option value="">Carregando...</option>';
    horarioSelect.disabled = true;
    
    try {
        const dataObj = new Date(dataSelecionada + 'T12:00:00');
        const diaSemana = dataObj.getDay();
        
        const diasMap = {
            0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
            4: 'quinta', 5: 'sexta', 6: 'sabado'
        };
        
        const diaId = diasMap[diaSemana];
        
        // Buscar configuração
        let configDia = {
            aberto: true,
            abertura: '08:00',
            fechamento: '18:00',
            intervaloInicio: '12:00',
            intervaloFim: '13:00'
        };
        
        try {
            const horariosRef = window.loginDb
                .collection('configuracoes')
                .doc(lojaIdAtual)
                .collection('agendamento')
                .doc('horarios');
            
            const horariosDoc = await horariosRef.get();
            if (horariosDoc.exists && horariosDoc.data()[diaId]) {
                configDia = horariosDoc.data()[diaId];
            }
        } catch (e) {
            console.warn('⚠️ Usando configuração padrão');
        }
        
        if (!configDia.aberto) {
            horarioSelect.innerHTML = '<option value="">Fechado neste dia</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        // Gerar horários
        const horarios = [];
        const [hA, mA] = configDia.abertura.split(':').map(Number);
        const [hF, mF] = configDia.fechamento.split(':').map(Number);
        const [hII, mII] = configDia.intervaloInicio.split(':').map(Number);
        const [hIF, mIF] = configDia.intervaloFim.split(':').map(Number);
        
        let atual = new Date();
        atual.setHours(hA, mA, 0);
        
        let fim = new Date();
        fim.setHours(hF, mF, 0);
        
        let inicioIntervalo = new Date();
        inicioIntervalo.setHours(hII, mII, 0);
        
        let fimIntervalo = new Date();
        fimIntervalo.setHours(hIF, mIF, 0);
        
        while (atual <= fim) {
            if (atual >= inicioIntervalo && atual < fimIntervalo) {
                atual = new Date(fimIntervalo);
                continue;
            }
            
            const hora = String(atual.getHours()).padStart(2, '0');
            const min = String(atual.getMinutes()).padStart(2, '0');
            horarios.push(`${hora}:${min}`);
            
            atual.setMinutes(atual.getMinutes() + 30);
        }
        
        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horarios.forEach(h => {
            horarioSelect.innerHTML += `<option value="${h}">${h}</option>`;
        });
        horarioSelect.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
        horarioSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        horarioSelect.disabled = true;
    }
}

// ============================================
// SALVAR NOVO AGENDAMENTO (FUNCIONÁRIOS)
// ============================================
async function salvarCriarAgendamento() {
    try {
        const cliente = document.getElementById('buscaClienteAdmin').value;
        const servicoSelect = document.getElementById('servicoAdminSelect');
        const servico = servicoSelect.value;
        const servicoText = servicoSelect.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const data = document.getElementById('agendamentoDataAdmin').value;
        const horario = document.getElementById('agendamentoHorarioAdmin').value;
        const status = document.getElementById('statusAdmin').value;
        const obs = document.getElementById('observacoesAdmin').value;
        
        if (!cliente || !servico || !data || !horario) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        mostrarLoading('Salvando agendamento...');
        
        const agendamentoData = {
            cliente_nome: cliente,
            servico: servicoText,
            servico_id: servico,
            data: data,
            horario: horario,
            status: status,
            validado: status === 'validado',
            observacoes: obs,
            criado_por: dadosUsuario?.email || 'sistema',
            criado_por_nome: dadosUsuario?.nome || 'Sistema',
            criado_em: serverTimestamp(),
            data_criacao: new Date().toISOString(),
            loja_id: lojaIdAtual
        };
        
        // Salvar no Firestore
        const agendamentoRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('futuros')
            .doc();
        
        await setDoc(agendamentoRef, agendamentoData);
        
        mostrarMensagem('Agendamento criado com sucesso!', 'success');
        fecharModal('criarAgendamentoModal');
        
    } catch (error) {
        console.error('❌ Erro ao salvar agendamento:', error);
        mostrarMensagem('Erro ao salvar agendamento: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FUNÇÕES DO MODAL GERENCIAR AGENDAMENTOS
// ============================================

// ============================================
// ABRIR MODAL GERENCIAR AGENDAMENTOS
// ============================================
function abrirModalGerenciarAgendamentos() {
    console.log('Abrir modal gerenciar agendamentos');
    
    const modal = document.getElementById('gerenciarAgendamentosModal');
    if (!modal) {
        console.error('❌ Modal gerenciarAgendamentosModal não encontrado');
        mostrarMensagem('Erro ao abrir gerenciador', 'error');
        return;
    }
    
    // Carregar lista
    carregarListaGerenciar();
    
    modal.classList.add('active');
}

// ============================================
// CARREGAR LISTA GERENCIAR
// ============================================
async function carregarListaGerenciar() {
    try {
        const lista = document.getElementById('gerenciarLista');
        if (!lista) return;
        
        lista.innerHTML = '<tr><td colspan="6" class="empty-row">Carregando...</td></tr>';
        
        // Buscar futuros e ativos
        const futurosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('futuros');
        
        const ativosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos');
        
        const [futurosSnap, ativosSnap] = await Promise.all([
            futurosRef.get(),
            ativosRef.get()
        ]);
        
        todosAgendamentos = [];
        
        futurosSnap.forEach(doc => {
            todosAgendamentos.push({ 
                id: doc.id, 
                ...doc.data(), 
                origem: 'futuros' 
            });
        });
        
        ativosSnap.forEach(doc => {
            todosAgendamentos.push({ 
                id: doc.id, 
                ...doc.data(), 
                origem: 'ativos' 
            });
        });
        
        // Ordenar por data
        todosAgendamentos.sort((a, b) => {
            if (a.data < b.data) return -1;
            if (a.data > b.data) return 1;
            if (a.horario < b.horario) return -1;
            if (a.horario > b.horario) return 1;
            return 0;
        });
        
        paginaAtual = 1;
        renderizarListaGerenciar();
        
    } catch (error) {
        console.error('❌ Erro ao carregar lista:', error);
        const lista = document.getElementById('gerenciarLista');
        if (lista) {
            lista.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar</td></tr>';
        }
    }
}

// ============================================
// RENDERIZAR LISTA GERENCIAR
// ============================================
function renderizarListaGerenciar() {
    const lista = document.getElementById('gerenciarLista');
    const busca = document.getElementById('buscaGerenciar')?.value.toLowerCase() || '';
    const filtroStatus = document.getElementById('filtroStatusGerenciar')?.value || 'todos';
    
    let filtrados = todosAgendamentos.filter(item => {
        if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;
        if (busca) {
            const cliente = (item.cliente_nome || '').toLowerCase();
            const servico = (item.servico || '').toLowerCase();
            const data = (item.data || '').toLowerCase();
            return cliente.includes(busca) || servico.includes(busca) || data.includes(busca);
        }
        return true;
    });
    
    const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const paginados = filtrados.slice(inicio, inicio + itensPorPagina);
    
    if (paginados.length === 0) {
        lista.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum agendamento encontrado</td></tr>';
        document.getElementById('paginaInfo').textContent = 'Página 1 de 1';
        document.getElementById('paginaAnterior').disabled = true;
        document.getElementById('proximaPagina').disabled = true;
        return;
    }
    
    let html = '';
    paginados.forEach(item => {
        let statusClass = '';
        let statusText = item.status || 'agendado';
        
        switch(statusText) {
            case 'agendado':
                statusClass = 'agendado';
                break;
            case 'validado':
                statusClass = 'validado';
                break;
            case 'concluido':
                statusClass = 'concluido';
                break;
            case 'cancelado':
                statusClass = 'cancelado';
                break;
            case 'chamando':
                statusClass = 'chamando';
                statusText = 'Em Atendimento';
                break;
            default:
                statusClass = 'agendado';
        }
        
        html += `
            <tr data-id="${item.id}" data-origem="${item.origem}">
                <td>${item.cliente_nome || '---'}</td>
                <td>${item.servico || '---'}</td>
                <td>${item.data || '---'}</td>
                <td>${item.horario || '---'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="acoes-gerenciar">
                        <button class="btn-gerenciar btn-editar-gerenciar" onclick="editarAgendamentoGerenciar('${item.id}', '${item.origem}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-gerenciar btn-excluir-gerenciar" onclick="excluirAgendamentoGerenciar('${item.id}', '${item.origem}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    lista.innerHTML = html;
    
    document.getElementById('paginaInfo').textContent = `Página ${paginaAtual} de ${totalPaginas || 1}`;
    document.getElementById('paginaAnterior').disabled = paginaAtual <= 1;
    document.getElementById('proximaPagina').disabled = paginaAtual >= totalPaginas;
}

// ============================================
// FILTRAR GERENCIAR
// ============================================
function filtrarGerenciar() {
    paginaAtual = 1;
    renderizarListaGerenciar();
}

// ============================================
// PAGINAÇÃO
// ============================================
function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarListaGerenciar();
    }
}

function proximaPagina() {
    const totalPaginas = Math.ceil(todosAgendamentos.length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarListaGerenciar();
    }
}

// ============================================
// EDITAR AGENDAMENTO (GERENCIAR)
// ============================================
window.editarAgendamentoGerenciar = function(id, origem) {
    console.log('Editar agendamento:', id, origem);
    mostrarMensagem('Função de edição em desenvolvimento', 'info');
};

// ============================================
// EXCLUIR AGENDAMENTO (GERENCIAR)
// ============================================
window.excluirAgendamentoGerenciar = async function(id, origem) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    
    try {
        mostrarLoading('Excluindo agendamento...');
        
        await deleteDoc(
            window.loginDb
                .collection('agendamentos')
                .doc(lojaIdAtual)
                .collection(origem)
                .doc(id)
        );
        
        mostrarMensagem('Agendamento excluído com sucesso!', 'success');
        
        // Recarregar lista
        carregarListaGerenciar();
        
    } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir agendamento', 'error');
    } finally {
        esconderLoading();
    }
};

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
// RENDERIZAR EXCEÇÕES
// ============================================
function renderizarExcecoes(excecoes) {
    console.log('Renderizar exceções:', excecoes);
    
    const container = document.getElementById('excecoesLista');
    if (!container) return;
    
    if (!excecoes || excecoes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhuma exceção cadastrada</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por data
    excecoes.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let html = '';
    excecoes.forEach(exc => {
        const dataObj = new Date(exc.data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        
        let tipoTexto = '';
        let tipoClasse = '';
        
        switch(exc.tipo) {
            case 'feriado':
                tipoTexto = '🔴 Feriado';
                tipoClasse = 'feriado';
                break;
            case 'horario_especial':
                tipoTexto = '🟡 Horário Especial';
                tipoClasse = 'horario_especial';
                break;
            case 'capacidade_extra':
                tipoTexto = '🟢 Capacidade Extra';
                tipoClasse = 'capacidade_extra';
                break;
            case 'capacidade_reduzida':
                tipoTexto = '🟠 Capacidade Reduzida';
                tipoClasse = 'capacidade_reduzida';
                break;
        }
        
        html += `
            <div class="excecao-item" data-data="${exc.data}">
                <div class="excecao-info">
                    <span class="excecao-data">${dataFormatada}</span>
                    <span class="excecao-tipo ${tipoClasse}">${tipoTexto}</span>
                    <span class="excecao-desc">${exc.observacao || ''}</span>
                </div>
                <div class="excecao-acoes">
                    <button class="btn-editar-excecao" onclick="editarExcecao('${exc.data}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-excluir-excecao" onclick="excluirExcecao('${exc.data}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // ✅ FUNCIONÁRIOS/ADMIN: Abre modal para funcionários
    document.getElementById('btnCriarAgendamento')?.addEventListener('click', () => {
        abrirModalAgendamentoFuncionarios();
    });
    
    // Botão gerenciar agendamentos
    document.getElementById('btnGerenciarAgendamentos')?.addEventListener('click', () => {
        abrirModalGerenciarAgendamentos();
    });
    
    // Botão pausar
    document.getElementById('btnPausarAtendimento')?.addEventListener('click', () => {
        abrirModal('pausaModal');
    });
    
    // Confirmar pausa
    document.getElementById('btnConfirmarPausa')?.addEventListener('click', () => {
        const modo = document.querySelector('input[name="modoPausa"]:checked')?.value;
        const tempo = parseInt(document.getElementById('tempoPausa').value);
        if (modo) {
            pausarAtendimento(modo, tempo);
        }
    });
    
    // Botão validar todos
    document.getElementById('btnValidarTodos')?.addEventListener('click', validarTodosFuturos);
    
    // Botão histórico clientes
    document.getElementById('btnHistoricoClientes')?.addEventListener('click', () => {
        abrirModal('clienteHistoricoModal');
    });
    
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
    
    // Salvar configurações de funcionamento (aba horários)
    document.getElementById('btnSalvarFuncionamento')?.addEventListener('click', salvarConfigFuncionamento);
    
    // Adicionar exceção
    document.getElementById('btnAddExcecao')?.addEventListener('click', () => {
        abrirModal('excecaoModal');
    });
    
    // Salvar exceção
    document.getElementById('btnSalvarExcecao')?.addEventListener('click', salvarExcecao);
    
    // Botões do modal novo agendamento
    document.getElementById('btnSalvarAgendamentoAdmin')?.addEventListener('click', salvarCriarAgendamento);
    
    // Botões do modal gerenciar
    document.getElementById('buscaGerenciar')?.addEventListener('input', filtrarGerenciar);
    document.getElementById('filtroStatusGerenciar')?.addEventListener('change', filtrarGerenciar);
    document.getElementById('paginaAnterior')?.addEventListener('click', paginaAnterior);
    document.getElementById('proximaPagina')?.addEventListener('click', proximaPagina);
}

// ============================================
// CONFIGURAR EVENTOS DOS DIAS (SELECIONAR/LIMPAR TODOS)
// ============================================
function configurarEventosDias() {
    const btnSelecionarTodos = document.getElementById('selecionarTodosDias');
    const btnLimparTodos = document.getElementById('limparTodosDias');
    
    if (btnSelecionarTodos) {
        btnSelecionarTodos.addEventListener('click', () => {
            document.querySelectorAll('.dia-semana').forEach(cb => {
                cb.checked = true;
            });
            console.log('✅ Todos os dias selecionados');
        });
    }
    
    if (btnLimparTodos) {
        btnLimparTodos.addEventListener('click', () => {
            document.querySelectorAll('.dia-semana').forEach(cb => {
                cb.checked = false;
            });
            console.log('✅ Todos os dias desmarcados');
        });
    }
}

// ============================================
// SALVAR CONFIGURAÇÕES DE FUNCIONAMENTO
// ============================================
async function salvarConfigFuncionamento() {
    try {
        mostrarLoading('Salvando configurações...');
        
        const horarios = {};
        document.querySelectorAll('.horario-card').forEach(card => {
            const dia = card.dataset.dia;
            const aberto = card.querySelector('.toggle-dia')?.checked || false;
            
            horarios[dia] = {
                aberto: aberto,
                abertura: card.querySelector('.abertura')?.value || '10:00',
                fechamento: card.querySelector('.fechamento')?.value || '18:00',
                intervaloInicio: card.querySelector('.intervalo-inicio')?.value || '13:00',
                intervaloFim: card.querySelector('.intervalo-fim')?.value || '14:00',
                maxClientes: parseInt(card.querySelector('.max-clientes')?.value) || 30
            };
        });
        
        // Salvar horários no Firestore
        const horariosRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('horarios');
        
        await setDoc(horariosRef, horarios);
        
        // Salvar limites
        const maxClientesDia = document.getElementById('maxClientesDia')?.value || 30;
        const maxSimultaneos = document.getElementById('maxSimultaneos')?.value || 3;
        
        const configRef = window.loginDb
            .collection('configuracoes')
            .doc(lojaIdAtual)
            .collection('agendamento')
            .doc('config');
        
        await setDoc(configRef, {
            maxClientesDia: parseInt(maxClientesDia),
            maxSimultaneos: parseInt(maxSimultaneos)
        }, { merge: true });
        
        // Atualizar configuração local
        configLoja.maxClientesDia = parseInt(maxClientesDia);
        configLoja.maxSimultaneos = parseInt(maxSimultaneos);
        configLoja.horarioFuncionamento = horarios;
        
        mostrarMensagem('Configurações salvas com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        mostrarMensagem('Erro ao salvar configurações: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

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
// FUNÇÕES AUXILIARES (placeholders)
// ============================================
function editarExcecao(data) {
    console.log('Editar exceção:', data);
    mostrarMensagem('Função em desenvolvimento', 'info');
}

function excluirExcecao(data) {
    console.log('Excluir exceção:', data);
    if (confirm(`Excluir exceção do dia ${data}?`)) {
        mostrarMensagem('Função em desenvolvimento', 'info');
    }
}

function validarAgendamentoFuturo(id) {
    console.log('Validar agendamento futuro:', id);
    mostrarMensagem('Função em desenvolvimento', 'info');
}

function editarAgendamentoFuturo(id) {
    console.log('Editar agendamento futuro:', id);
    mostrarMensagem('Função em desenvolvimento', 'info');
}

function excluirAgendamentoFuturo(id) {
    console.log('Excluir agendamento futuro:', id);
    if (confirm('Excluir este agendamento?')) {
        mostrarMensagem('Função em desenvolvimento', 'info');
    }
}

function editarAgendamento(id) {
    console.log('Editar agendamento:', id);
    mostrarMensagem('Função em desenvolvimento', 'info');
}

// ============================================
// LIMPAR AO SAIR
// ============================================
window.addEventListener('beforeunload', () => {
    if (unsubscribeAgendamentos) unsubscribeAgendamentos();
    if (unsubscribeFuturos) unsubscribeFuturos();
    if (intervaloPausa) clearInterval(intervaloPausa);
});
