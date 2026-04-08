// ============================================
// programas_aprimoramento.js - VERSÃO SIMPLIFICADA
// Apenas estrutura com mensagem "Em desenvolvimento"
// Já conectado ao Firebase para futura implementação
// ============================================

console.log('🚀 Inicializando Programas de Aprimoramento (Versão Simplificada)...');

// Estado global
let lojaId = null;
let usuarioAtual = null;
let db = null;
let unsubscribe = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM carregado, iniciando...');
    
    mostrarLoading('Carregando...');
    
    try {
        // Aguardar serviços carregarem
        await aguardarServicos();
        
        // Carregar dados do usuário e loja
        await carregarDadosUsuario();
        
        // Verificar se programas de aprimoramento está habilitado
        await verificarHabilitacao();
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Configurar conexão com Firebase
        await configurarFirebase();
        
        // Inicializar/Carregar dados do usuário no Firebase
        await inicializarDadosUsuarioFirebase();
        
        esconderLoading();
        
        console.log('✅ Programas de Aprimoramento inicializado com sucesso!');
        console.log(`📍 Loja: ${lojaId}`);
        console.log(`👤 Usuário: ${usuarioAtual?.email} (${usuarioAtual?.perfil})`);
        console.log(`📁 Firebase: ${db ? 'Conectado' : 'Não conectado'}`);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        esconderLoading();
        mostrarMensagem('Erro ao carregar programas de aprimoramento', 'error');
    }
});

// ============================================
// AGUARDAR SERVIÇOS
// ============================================
async function aguardarServicos() {
    let tentativas = 0;
    const maxTentativas = 30;
    
    console.log('⏳ Aguardando serviços...');
    
    while (tentativas < maxTentativas) {
        // Verificar se temos o banco de dados do Firebase
        if (window.db) {
            db = window.db;
            console.log('✅ Firebase db disponível via window.db');
            break;
        }
        
        // Verificar via lojaServices
        if (window.lojaServices && window.lojaServices.db) {
            db = window.lojaServices.db;
            console.log('✅ Firebase db disponível via lojaServices');
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        tentativas++;
    }
    
    if (!db) {
        console.warn('⚠️ Firebase db não encontrado após', tentativas, 'tentativas');
    }
    
    console.log('✅ Serviços carregados após', tentativas, 'tentativas');
}

// ============================================
// CARREGAR DADOS DO USUÁRIO
// ============================================
async function carregarDadosUsuario() {
    console.log('🔍 Carregando dados do usuário...');
    
    // Tentativa 1: window.dadosUsuario
    if (window.dadosUsuario && window.dadosUsuario.email) {
        usuarioAtual = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || window.dadosUsuario.tipo || 'cliente',
            tipo: window.dadosUsuario.tipo || 'cliente'
        };
        console.log('✅ Usuário carregado de window.dadosUsuario:', usuarioAtual.email);
    }
    
    // Tentativa 2: sessionStorage
    if (!usuarioAtual?.email) {
        const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
        if (sessao) {
            try {
                const dados = JSON.parse(sessao);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel || 'cliente',
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário carregado de sessionStorage:', usuarioAtual.email);
            } catch (e) {
                console.warn('Erro ao parsear sessionStorage:', e);
            }
        }
    }
    
    // Tentativa 3: localStorage
    if (!usuarioAtual?.email) {
        const backup = localStorage.getItem('pdv_sessao_backup');
        if (backup) {
            try {
                const dados = JSON.parse(backup);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel || 'cliente',
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário carregado de localStorage:', usuarioAtual.email);
            } catch (e) {
                console.warn('Erro ao parsear localStorage:', e);
            }
        }
    }
    
    // Extrair loja da URL
    const pathParts = window.location.pathname.split('/');
    const lojaIndex = pathParts.indexOf('loja');
    if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
        lojaId = pathParts[lojaIndex + 1];
        console.log('📍 Loja extraída da URL:', lojaId);
    } else if (window.lojaIdAtual) {
        lojaId = window.lojaIdAtual;
        console.log('📍 Loja via window.lojaIdAtual:', lojaId);
    } else if (window.lojaServices?.lojaId) {
        lojaId = window.lojaServices.lojaId;
        console.log('📍 Loja via lojaServices:', lojaId);
    }
    
    // Atualizar display
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && usuarioAtual) {
        const nomeExibicao = usuarioAtual.nome || usuarioAtual.email?.split('@')[0] || 'Usuário';
        userNameDisplay.textContent = nomeExibicao;
        
        // Adicionar perfil no tooltip
        const perfilExibicao = usuarioAtual.perfil || usuarioAtual.tipo || 'cliente';
        userNameDisplay.title = `${nomeExibicao} (${perfilExibicao})`;
    }
    
    if (!usuarioAtual?.email) {
        console.error('❌ Não foi possível identificar o usuário logado');
        mostrarMensagem('Faça login para acessar os programas de aprimoramento', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

// ============================================
// VERIFICAR HABILITAÇÃO
// ============================================
async function verificarHabilitacao() {
    if (!lojaId) {
        console.warn('⚠️ Loja não identificada para verificar habilitação');
        return;
    }
    
    try {
        // Tentar obter loginDb
        const loginDb = window.loginDb || (window.firebaseLoginDb ? window.firebaseLoginDb : null);
        
        if (!loginDb) {
            console.warn('⚠️ loginDb não disponível, tentando novamente em 1 segundo...');
            setTimeout(() => verificarHabilitacao(), 1000);
            return;
        }
        
        const lojaDoc = await loginDb.collection('lojas').doc(lojaId).get();
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            const habilitado = dados.habilitar_programas_aprimoramento === true;
            
            console.log(`📚 Programas de Aprimoramento habilitado: ${habilitado ? 'SIM' : 'NÃO'}`);
            console.log('📋 Dados da loja:', {
                nome: dados.nome,
                habilitar_agendamento: dados.habilitar_agendamento,
                habilitar_programas_aprimoramento: dados.habilitar_programas_aprimoramento
            });
            
            if (!habilitado) {
                console.warn('⚠️ Programa não habilitado para esta loja');
                mostrarMensagem('Programa de Aprimoramento não está habilitado para esta loja.', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            console.warn('⚠️ Documento da loja não encontrado no Firestore');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar habilitação:', error);
        // Não redirecionar em caso de erro, apenas logar
    }
}

// ============================================
// CONFIGURAR FIREBASE
// ============================================
async function configurarFirebase() {
    if (!db) {
        console.warn('⚠️ db não disponível para configurar Firebase');
        return;
    }
    
    if (!lojaId) {
        console.warn('⚠️ lojaId não disponível para configurar Firebase');
        return;
    }
    
    console.log('🔧 Configurando Firebase para aprimoramento...');
    
    try {
        // Nome da coleção baseado na loja
        const colecaoAprimoramento = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        console.log(`📁 Coleção de aprimoramento: ${colecaoAprimoramento}`);
        
        // Verificar se a coleção existe (tentativa de leitura)
        const testRef = collection(db, colecaoAprimoramento);
        console.log(`✅ Firebase configurado para coleção: ${colecaoAprimoramento}`);
        
    } catch (error) {
        console.error('❌ Erro ao configurar Firebase:', error);
    }
}

// ============================================
// INICIALIZAR DADOS DO USUÁRIO NO FIREBASE
// ============================================
async function inicializarDadosUsuarioFirebase() {
    if (!db || !lojaId || !usuarioAtual?.email) {
        console.warn('⚠️ Dados insuficientes para inicializar no Firebase');
        return;
    }
    
    console.log('💾 Inicializando/Carregando dados do usuário no Firebase...');
    
    try {
        const colecaoAprimoramento = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const usuarioRef = doc(db, colecaoAprimoramento, usuarioAtual.email);
        const usuarioDoc = await getDoc(usuarioRef);
        
        let dadosUsuario = {};
        
        if (usuarioDoc.exists()) {
            dadosUsuario = usuarioDoc.data();
            console.log('✅ Dados do usuário encontrados no Firebase:', dadosUsuario);
            console.log(`   📊 Pontos totais: ${dadosUsuario.pontos_totais || 0}`);
            console.log(`   📚 Treinamentos: ${dadosUsuario.treinamentos_concluidos?.length || 0}`);
            console.log(`   🎬 Vídeos assistidos: ${dadosUsuario.videos_assistidos?.length || 0}`);
            console.log(`   📝 Testes realizados: ${dadosUsuario.testes_realizados?.length || 0}`);
        } else {
            // Criar documento inicial para o usuário
            dadosUsuario = {
                email: usuarioAtual.email,
                nome: usuarioAtual.nome || usuarioAtual.email.split('@')[0],
                perfil: usuarioAtual.perfil || 'cliente',
                loja_id: lojaId,
                data_inicio: new Date().toISOString(),
                pontos_totais: 0,
                treinamentos_concluidos: [],
                videos_assistidos: [],
                testes_realizados: [],
                conquistas: [],
                ultimo_acesso: new Date().toISOString()
            };
            
            await setDoc(usuarioRef, dadosUsuario);
            console.log('✅ Documento criado para o usuário no Firebase:', dadosUsuario.email);
        }
        
        // Atualizar último acesso
        await updateDoc(usuarioRef, {
            ultimo_acesso: new Date().toISOString()
        });
        
        console.log('✅ Dados do usuário sincronizados com Firebase');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar dados no Firebase:', error);
    }
}

// ============================================
// CONFIGURAR EVENT LISTENERS
// ============================================
function configurarEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Botão voltar
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('🔙 Voltando para loja');
            window.location.href = 'index.html';
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            console.log(`📑 Mudando para tab: ${tabId}`);
            mudarTab(tabId);
        });
    });
    
    console.log('✅ Event listeners configurados');
}

// ============================================
// MUDAR TAB
// ============================================
function mudarTab(tabId) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
        targetPane.classList.add('active');
        console.log(`✅ Tab ativada: ${tabId}`);
        
        // Mostrar mensagem de desenvolvimento no console
        console.log(`📢 [${tabId.toUpperCase()}] Funcionalidade em desenvolvimento`);
    }
}

// ============================================
// UTILITÁRIOS
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

function mostrarMensagem(texto, tipo = 'info') {
    console.log(`[${tipo.toUpperCase()}] ${texto}`);
    
    // Criar toast temporário
    const toast = document.createElement('div');
    toast.className = `message-toast ${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${texto}</span>
    `;
    
    // Estilos do toast
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
}

// Adicionar estilos de animação se não existirem
if (!document.querySelector('#toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ programas_aprimoramento.js carregado (versão simplificada)');
