// ============================================
// programas_aprimoramento.js - VERSÃO CORRIGIDA
// Compatível com login_firebase.js
// ============================================

console.log('🚀 Inicializando Programas de Aprimoramento...');

// Estado global
let lojaId = null;
let usuarioAtual = null;
let db = null;
let loginDb = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM carregado, iniciando programas_aprimoramento.html...');
    
    mostrarLoading('Carregando...');
    
    try {
        // 1. Aguardar Firebase e serviços
        await aguardarFirebase();
        
        // 2. Carregar dados do usuário (compatível com login_firebase.js)
        await carregarDadosUsuario();
        
        // 3. Verificar se o usuário está logado
        if (!usuarioAtual || !usuarioAtual.email) {
            console.error('❌ Usuário não identificado. Redirecionando para login...');
            console.log('🔍 Debug: window.dadosUsuario =', window.dadosUsuario);
            console.log('🔍 Debug: sessionStorage usuarioInfo =', sessionStorage.getItem('usuarioInfo'));
            
            mostrarMensagem('Faça login para acessar os programas de aprimoramento', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            esconderLoading();
            return;
        }
        
        // 4. Verificar se programas de aprimoramento está habilitado
        await verificarHabilitacao();
        
        // 5. Configurar interface
        configurarEventListeners();
        
        // 6. Inicializar dados no Firebase
        await inicializarDadosUsuarioFirebase();
        
        esconderLoading();
        
        console.log('✅ Programas de Aprimoramento inicializado com sucesso!');
        console.log(`📍 Loja: ${lojaId}`);
        console.log(`👤 Usuário: ${usuarioAtual.email} (${usuarioAtual.perfil})`);
        console.log(`📁 Firebase db: ${db ? 'Conectado' : 'Não conectado'}`);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        esconderLoading();
        mostrarMensagem('Erro ao carregar programas de aprimoramento', 'error');
    }
});

// ============================================
// AGUARDAR FIREBASE
// ============================================
async function aguardarFirebase() {
    let tentativas = 0;
    const maxTentativas = 30;
    
    console.log('⏳ Aguardando Firebase...');
    
    while (tentativas < maxTentativas) {
        // Tentar obter db do window (do novo_firebase_config.js)
        if (window.db) {
            db = window.db;
            console.log('✅ Firebase db disponível via window.db');
        }
        
        // Tentar via lojaServices
        if (!db && window.lojaServices && window.lojaServices.db) {
            db = window.lojaServices.db;
            console.log('✅ Firebase db disponível via lojaServices');
        }
        
        // Tentar obter loginDb (do login_firebase.js)
        if (window.loginDb) {
            loginDb = window.loginDb;
            console.log('✅ loginDb disponível via window.loginDb');
        }
        
        if (db && loginDb) {
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        tentativas++;
    }
    
    if (!db) {
        console.warn('⚠️ Firebase db não encontrado após', tentativas, 'tentativas');
    }
    
    if (!loginDb) {
        console.warn('⚠️ loginDb não encontrado após', tentativas, 'tentativas');
    }
    
    console.log('✅ Firebase aguardado por', tentativas, 'tentativas');
}

// ============================================
// CARREGAR DADOS DO USUÁRIO - COMPATÍVEL COM LOGIN_FIREBASE.JS
// ============================================
async function carregarDadosUsuario() {
    console.log('🔍 Buscando dados do usuário logado...');
    
    // FONTE 1: window.dadosUsuario (definido pelo login_firebase.js no onAuthStateChanged)
    if (window.dadosUsuario && window.dadosUsuario.email) {
        usuarioAtual = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente',
            tipo: window.dadosUsuario.tipo || 'cliente',
            uid: window.dadosUsuario.uid || null,
            ativo: window.dadosUsuario.ativo !== false
        };
        console.log('✅ Usuário carregado de window.dadosUsuario:', usuarioAtual.email);
        console.log('   Perfil:', usuarioAtual.perfil);
        console.log('   Tipo:', usuarioAtual.tipo);
    }
    
    // FONTE 2: sessionStorage (usuarioInfo - salvo pelo login_firebase.js)
    if (!usuarioAtual?.email) {
        const infoBasica = sessionStorage.getItem('usuarioInfo');
        if (infoBasica) {
            try {
                const dados = JSON.parse(infoBasica);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || 'cliente',
                    tipo: dados.tipo || 'cliente',
                    loja: dados.loja
                };
                console.log('✅ Usuário carregado de sessionStorage usuarioInfo:', usuarioAtual.email);
            } catch (e) {
                console.warn('Erro ao parsear sessionStorage usuarioInfo:', e);
            }
        }
    }
    
    // FONTE 3: sessionStorage (pdv_sessao_temporaria - legado)
    if (!usuarioAtual?.email) {
        const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
        if (sessao) {
            try {
                const dados = JSON.parse(sessao);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel || 'cliente',
                    tipo: dados.tipo || 'cliente',
                    uid: dados.uid || null
                };
                console.log('✅ Usuário carregado de sessionStorage pdv_sessao_temporaria:', usuarioAtual.email);
            } catch (e) {
                console.warn('Erro ao parsear sessionStorage:', e);
            }
        }
    }
    
    // FONTE 4: localStorage (backup)
    if (!usuarioAtual?.email) {
        const backup = localStorage.getItem('pdv_sessao_backup');
        if (backup) {
            try {
                const dados = JSON.parse(backup);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel || 'cliente',
                    tipo: dados.tipo || 'cliente',
                    uid: dados.uid || null
                };
                console.log('✅ Usuário carregado de localStorage:', usuarioAtual.email);
            } catch (e) {
                console.warn('Erro ao parsear localStorage:', e);
            }
        }
    }
    
    // FONTE 5: Firebase Auth (se disponível)
    if (!usuarioAtual?.email && window.auth && window.auth.currentUser) {
        const user = window.auth.currentUser;
        if (user && user.email) {
            usuarioAtual = {
                email: user.email,
                nome: user.displayName || user.email.split('@')[0],
                perfil: 'cliente',
                tipo: 'cliente',
                uid: user.uid
            };
            console.log('✅ Usuário carregado do Firebase Auth:', usuarioAtual.email);
        }
    }
    
    // Extrair loja da URL
    if (window.getLojaDaURL) {
        lojaId = window.getLojaDaURL();
        console.log('📍 Loja via getLojaDaURL():', lojaId);
    }
    
    if (!lojaId) {
        const pathParts = window.location.pathname.split('/');
        const lojaIndex = pathParts.indexOf('loja');
        if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
            lojaId = pathParts[lojaIndex + 1];
            console.log('📍 Loja extraída da URL:', lojaId);
        }
    }
    
    if (!lojaId && window.lojaIdAtual) {
        lojaId = window.lojaIdAtual;
        console.log('📍 Loja via window.lojaIdAtual:', lojaId);
    }
    
    if (!lojaId && window.lojaServices?.lojaId) {
        lojaId = window.lojaServices.lojaId;
        console.log('📍 Loja via lojaServices:', lojaId);
    }
    
    // Atualizar display do nome do usuário
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && usuarioAtual) {
        const nomeExibicao = usuarioAtual.nome || usuarioAtual.email?.split('@')[0] || 'Usuário';
        userNameDisplay.textContent = nomeExibicao;
        
        // Adicionar perfil no tooltip
        const perfilExibicao = usuarioAtual.perfil || usuarioAtual.tipo || 'cliente';
        userNameDisplay.title = `${nomeExibicao} (${perfilExibicao})`;
    }
    
    if (!usuarioAtual?.email) {
        console.error('❌ NÃO FOI POSSÍVEL IDENTIFICAR O USUÁRIO LOGADO');
        console.log('📋 window.dadosUsuario:', window.dadosUsuario);
        console.log('📋 sessionStorage usuarioInfo:', sessionStorage.getItem('usuarioInfo'));
        console.log('📋 sessionStorage pdv_sessao_temporaria:', sessionStorage.getItem('pdv_sessao_temporaria'));
        console.log('📋 window.auth?.currentUser:', window.auth?.currentUser);
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
    
    if (!loginDb) {
        console.warn('⚠️ loginDb não disponível para verificar habilitação');
        return;
    }
    
    try {
        console.log(`🔍 Verificando habilitação para loja: ${lojaId}`);
        
        const lojaDoc = await loginDb.collection('lojas').doc(lojaId).get();
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            const habilitado = dados.habilitar_programas_aprimoramento === true;
            
            console.log(`📚 Programas de Aprimoramento habilitado: ${habilitado ? 'SIM' : 'NÃO'}`);
            console.log('📋 Configurações da loja:', {
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
    }
}

// ============================================
// INICIALIZAR DADOS DO USUÁRIO NO FIREBASE
// ============================================
async function inicializarDadosUsuarioFirebase() {
    if (!db || !lojaId || !usuarioAtual?.email) {
        console.warn('⚠️ Dados insuficientes para inicializar no Firebase');
        console.log('   db:', !!db, 'lojaId:', lojaId, 'email:', usuarioAtual?.email);
        return;
    }
    
    console.log('💾 Inicializando dados do usuário no Firebase...');
    
    try {
        const colecaoAprimoramento = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        console.log(`📁 Coleção: ${colecaoAprimoramento}`);
        console.log(`📄 Documento: ${usuarioAtual.email}`);
        
        const usuarioRef = doc(db, colecaoAprimoramento, usuarioAtual.email);
        const usuarioDoc = await getDoc(usuarioRef);
        
        let dadosUsuario = {};
        
        if (usuarioDoc.exists()) {
            dadosUsuario = usuarioDoc.data();
            console.log('✅ Dados do usuário ENCONTRADOS no Firebase:');
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
            console.log('✅ Documento CRIADO para o usuário no Firebase:', dadosUsuario.email);
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

// Expor funções globalmente para debug
window.debugAprimoramento = {
    getUsuario: () => usuarioAtual,
    getLoja: () => lojaId,
    getDb: () => db,
    getLoginDb: () => loginDb,
    getWindowDadosUsuario: () => window.dadosUsuario,
    getSessionStorage: () => sessionStorage.getItem('usuarioInfo')
};

console.log('✅ programas_aprimoramento.js carregado');
console.log('📖 Para debug, use window.debugAprimoramento.getUsuario()');
