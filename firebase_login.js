// firebase_login.js - Configuração do Firebase para autenticação (AJUSTADO)
console.log("🔥 Firebase Login - Configurando...");

// Configuração global do Firebase
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
    authDomain: "spdv-3872a.firebaseapp.com",
    projectId: "spdv-3872a",
    storageBucket: "spdv-3872a.firebasestorage.app",
    messagingSenderId: "552499245950",
    appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Verificar se o sistema de lojas está disponível
let configLojaAtual = null;

// Inicializar Firebase com configuração específica da loja
function inicializarFirebaseParaLoja(lojaId) {
    try {
        console.log(`🔥 Inicializando Firebase para loja: ${lojaId}`);
        
        // Verificar se já existe uma app com esse nome
        const appName = `app-${lojaId}`;
        
        // Destruir app existente se houver
        try {
            if (firebase.apps.length > 0) {
                // Encontrar app existente para esta loja
                const appExistente = firebase.apps.find(app => app.name === appName);
                if (appExistente) {
                    appExistente.delete();
                    console.log(`♻️ App Firebase anterior removido para ${lojaId}`);
                }
            }
        } catch (e) {
            console.log("Nenhum app anterior para remover");
        }
        
        // Usar configuração comum ou específica se disponível
        let configUsar = FIREBASE_CONFIG;
        
        if (typeof SISTEMA_LOJAS !== 'undefined') {
            const loja = SISTEMA_LOJAS.obterLoja(lojaId);
            if (loja && loja.config && loja.config.firebaseConfig) {
                configUsar = loja.config.firebaseConfig;
                console.log(`✅ Usando configuração específica da loja ${lojaId}`);
            }
        }
        
        // Inicializar Firebase com nome único para a loja
        const app = firebase.initializeApp(configUsar, appName);
        const db = firebase.firestore(app);
        
        console.log(`✅ Firebase inicializado para ${lojaId}`);
        return { app, db };
        
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        
        // Tentar usar app padrão se existir
        if (firebase.apps.length > 0) {
            console.log("⚠️ Usando app Firebase existente");
            const app = firebase.app();
            const db = firebase.firestore();
            return { app, db };
        }
        
        throw error;
    }
}

// Carregar configuração da loja atual
function carregarConfiguracaoLoja() {
    try {
        // Tentar carregar da sessão
        const sessaoString = sessionStorage.getItem('pdv_sessao_temporaria') || 
                           localStorage.getItem('pdv_sessao_backup');
        
        if (sessaoString) {
            const sessao = JSON.parse(sessaoString);
            configLojaAtual = sessao.loja?.config || null;
            
            if (configLojaAtual) {
                console.log("✅ Configuração da loja carregada da sessão");
            }
        }
        
        // Se não encontrou na sessão, tentar do localStorage
        if (!configLojaAtual) {
            const configString = localStorage.getItem('config_loja_pdv');
            if (configString) {
                configLojaAtual = JSON.parse(configString);
                console.log("✅ Configuração da loja carregada do localStorage");
            }
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar configuração da loja:", error);
        configLojaAtual = null;
    }
}

// Inicializar quando o script carregar
carregarConfiguracaoLoja();

// Exportar funções úteis
window.inicializarFirebaseParaLoja = inicializarFirebaseParaLoja;
window.carregarConfiguracaoLoja = carregarConfiguracaoLoja;

console.log("✅ Firebase Login configurado");
