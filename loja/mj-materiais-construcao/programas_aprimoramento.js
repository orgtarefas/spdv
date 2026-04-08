// ============================================
// programas_aprimoramento.js
// Programas de Aprimoramento
// ============================================

console.log("📚 Inicializando sistema de Programas de Aprimoramento...");

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
    serverTimestamp,
    onSnapshot
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ============================================
const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E📚%3C/text%3E%3C/svg%3E";

let lojaIdAtual = null;
let dadosUsuario = null;
let usuarioLogado = false;
let programasAprimoramentoHabilitado = false;
let userProgresso = null;
let unsubscribeProgresso = null;

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
// VERIFICAR PERMISSÃO DE ACESSO (igual ao agendamento)
// ============================================
async function verificarPermissaoAcesso() {
    console.log("🔒 Verificando permissão de acesso...");
    
    try {
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
        
        // Verificar ADMIN global
        const adminDoc = await window.loginDb
            .collection('usuarios')
            .doc('admin')
            .get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData[email]) {
                console.log("✅ Usuário é ADMIN global - acesso permitido");
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
        
        // Verificar FUNCIONÁRIO da loja
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
        
        // CLIENTES NÃO TÊM ACESSO
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
// VERIFICAR SE PROGRAMA DE APRIMORAMENTO ESTÁ HABILITADO
// ============================================
async function verificarProgramaHabilitado() {
    if (!lojaIdAtual || !window.loginDb) return false;
    
    try {
        console.log(`🔍 Verificando se Programa de Aprimoramento está habilitado para loja: ${lojaIdAtual}`);
        
        const lojaDoc = await window.loginDb
            .collection('lojas')
            .doc(lojaIdAtual)
            .get();
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            const habilitado = dados.habilitar_programas_aprimoramento === true;
            console.log(`📚 Programa de Aprimoramento habilitado: ${habilitado ? 'SIM' : 'NÃO'}`);
            return habilitado;
        } else {
            console.log(`⚠️ Documento da loja não encontrado`);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar programa:', error);
        return false;
    }
}

// ============================================
// INICIAR ESCUTA DO PROGRESSO DO USUÁRIO (igual ao agendamento)
// ============================================
function iniciarEscutaProgresso() {
    if (!programasAprimoramentoHabilitado || !lojaIdAtual || !dadosUsuario?.email) return;
    
    console.log('📚 Iniciando escuta em tempo real do progresso...');
    
    try {
        const colecaoAprimoramento = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const usuarioRef = doc(db, colecaoAprimoramento, dadosUsuario.email);
        
        unsubscribeProgresso = onSnapshot(usuarioRef, (docSnap) => {
            console.log(`📨 Atualização no progresso do usuário`);
            
            if (docSnap.exists()) {
                userProgresso = docSnap.data();
                console.log('✅ Progresso carregado:', userProgresso);
                atualizarInterfaceProgresso();
            } else {
                console.log('📭 Nenhum progresso encontrado, criando novo...');
                criarProgressoInicial();
            }
        }, (error) => {
            console.error('❌ Erro na escuta:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// CRIAR PROGRESSO INICIAL DO USUÁRIO
// ============================================
async function criarProgressoInicial() {
    if (!db || !lojaIdAtual || !dadosUsuario?.email) return;
    
    try {
        const colecaoAprimoramento = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const usuarioRef = doc(db, colecaoAprimoramento, dadosUsuario.email);
        
        const dadosIniciais = {
            email: dadosUsuario.email,
            nome: dadosUsuario.nome,
            perfil: dadosUsuario.perfil,
            loja_id: lojaIdAtual,
            data_inicio: new Date().toISOString(),
            pontos_totais: 0,
            treinamentos_concluidos: [],
            videos_assistidos: [],
            testes_realizados: [],
            conquistas: [],
            ultimo_acesso: new Date().toISOString()
        };
        
        await setDoc(usuarioRef, dadosIniciais);
        console.log('✅ Progresso inicial criado');
        
    } catch (error) {
        console.error('❌ Erro ao criar progresso inicial:', error);
    }
}

// ============================================
// ATUALIZAR INTERFACE COM O PROGRESSO
// ============================================
function atualizarInterfaceProgresso() {
    if (!userProgresso) return;
    
    // Atualizar nome do usuário no header
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = userProgresso.nome || dadosUsuario?.nome || 'Usuário';
    }
    
    // Aqui você pode atualizar mais elementos da interface
    console.log('📊 Pontos totais:', userProgresso.pontos_totais);
    console.log('📚 Treinamentos concluídos:', userProgresso.treinamentos_concluidos?.length || 0);
    console.log('🎬 Vídeos assistidos:', userProgresso.videos_assistidos?.length || 0);
    console.log('📝 Testes realizados:', userProgresso.testes_realizados?.length || 0);
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log('⚙️ Configurando eventos...');
    
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Botão back (alternativo)
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPane = document.getElementById(`tab-${tab}`);
            if (targetPane) targetPane.classList.add('active');
            
            console.log(`📑 Tab ativada: ${tab}`);
        });
    });
    
    console.log('✅ Eventos configurados');
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
        console.log(`✅ Modal ${modalId} aberto`);
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
// CONFIGURAR FAVICON E LOGO
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
// VERIFICAÇÃO BLOQUEANTE - EXECUTA IMEDIATAMENTE (igual ao agendamento)
// ============================================
(async function() {
    console.log("🔒 Verificação bloqueante de acesso aos Programas de Aprimoramento...");
    
    // Mostrar loading imediatamente
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
        
        // Verificar se o programa está habilitado para a loja
        programasAprimoramentoHabilitado = await verificarProgramaHabilitado();
        
        if (!programasAprimoramentoHabilitado) {
            console.log("🚫 Programa de Aprimoramento não habilitado para esta loja");
            mostrarMensagem('Programa de Aprimoramento não está habilitado para esta loja.', 'warning', 3000);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // ✅ ACESSO PERMITIDO
        console.log("✅ Acesso permitido, carregando sistema...");
        console.log("👤 Usuário:", dadosUsuario);
        
        // Configurar favicon e logo
        configurarFavicon();
        carregarLogoLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Iniciar escuta do progresso
        iniciarEscutaProgresso();
        
        // Esconder loading
        if (loading) {
            loading.style.display = 'none';
        }
        
        console.log("✅ Sistema de Programas de Aprimoramento pronto!");
        
    } catch (error) {
        console.error("❌ Erro na verificação:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
})();

// ============================================
// LIMPAR AO SAIR
// ============================================
window.addEventListener('beforeunload', () => {
    if (unsubscribeProgresso) unsubscribeProgresso();
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS PARA DEBUG
// ============================================
window.debugAprimoramento = {
    getUsuario: () => dadosUsuario,
    getLoja: () => lojaIdAtual,
    getProgresso: () => userProgresso,
    getHabilitado: () => programasAprimoramentoHabilitado
};

console.log("✅ programas_aprimoramento.js carregado com sucesso!");
