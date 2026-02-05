// firebase_login.js - Configuração do Firebase para autenticação
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
    authDomain: "spdv-3872a.firebaseapp.com",
    projectId: "spdv-3872a",
    storageBucket: "spdv-3872a.firebasestorage.app",
    messagingSenderId: "552499245950",
    appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Inicializar Firebase
let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Tentar habilitar persistência offline
    enableIndexedDbPersistence(db)
        .then(() => {
            console.log('✅ Persistência offline habilitada');
        })
        .catch((err) => {
            console.warn('⚠️ Persistência offline não disponível:', err.code);
        });
    
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    // Criar objetos vazios para evitar erros
    db = {
        // Métodos dummy para evitar erros
        collection: () => ({ getDocs: async () => [] }),
        doc: () => ({ getDoc: async () => null })
    };
}

// Função para testar conexão
async function testarConexaoFirebase() {
    try {
        const testRef = collection(db, "teste_conexao");
        await getDocs(testRef);
        return { success: true, message: "Conectado ao Firebase" };
    } catch (error) {
        console.warn('⚠️ Firebase offline ou com problemas:', error.message);
        return { 
            success: false, 
            message: "Modo offline - Usando dados locais",
            error: error.message 
        };
    }
}

// Exportar para uso em login.js
export { 
    db, 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    testarConexaoFirebase 
};
