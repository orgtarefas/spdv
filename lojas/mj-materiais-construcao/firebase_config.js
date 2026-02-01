// firebase_config.js - Configuração específica para MJ Materiais de Construção
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const app = initializeApp(firebaseConfig, 'mj-materiais-app');

// Inicializar serviços
const db = getFirestore(app);
const auth = getAuth(app);

// Funções de autenticação
const firebaseAuth = {
    // Login com email/senha (se necessário no futuro)
    login: async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Logout
    logout: async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Verificar estado de autenticação
    onAuthStateChanged: (callback) => {
        return onAuthStateChanged(auth, callback);
    }
};

// Funções do Firestore para esta loja específica
const firestore = {
    // Coleções específicas desta loja
    colecoes: {
        vendas: () => collection(db, 'lojas', 'mj-materiais-construcao', 'vendas'),
        produtos: () => collection(db, 'lojas', 'mj-materiais-construcao', 'produtos'),
        clientes: () => collection(db, 'lojas', 'mj-materiais-construcao', 'clientes'),
        caixa: () => collection(db, 'lojas', 'mj-materiais-construcao', 'caixa'),
        configuracoes: () => collection(db, 'lojas', 'mj-materiais-construcao', 'configuracoes')
    },
    
    // Operações CRUD genéricas
    getDocument: async (collectionPath, docId) => {
        try {
            const docRef = doc(db, collectionPath, docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
            } else {
                return { success: false, error: 'Documento não encontrado' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    setDocument: async (collectionPath, docId, data) => {
        try {
            const docRef = doc(db, collectionPath, docId);
            await setDoc(docRef, data, { merge: true });
            return { success: true, id: docId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    updateDocument: async (collectionPath, docId, data) => {
        try {
            const docRef = doc(db, collectionPath, docId);
            await updateDoc(docRef, data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    deleteDocument: async (collectionPath, docId) => {
        try {
            const docRef = doc(db, collectionPath, docId);
            await deleteDoc(docRef);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    queryCollection: async (collectionPath, conditions = [], order = null, limitCount = null) => {
        try {
            let collectionRef = collection(db, collectionPath);
            
            // Aplicar condições where
            conditions.forEach(condition => {
                collectionRef = query(collectionRef, where(...condition));
            });
            
            // Aplicar ordenação
            if (order) {
                collectionRef = query(collectionRef, orderBy(...order));
            }
            
            // Aplicar limite
            if (limitCount) {
                collectionRef = query(collectionRef, limit(limitCount));
            }
            
            const querySnapshot = await getDocs(collectionRef);
            const results = [];
            
            querySnapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Listeners em tempo real
    onCollectionUpdate: (collectionPath, callback, conditions = [], order = null) => {
        try {
            let collectionRef = collection(db, collectionPath);
            
            // Aplicar condições where
            conditions.forEach(condition => {
                collectionRef = query(collectionRef, where(...condition));
            });
            
            // Aplicar ordenação
            if (order) {
                collectionRef = query(collectionRef, orderBy(...order));
            }
            
            return onSnapshot(collectionRef, (snapshot) => {
                const results = [];
                snapshot.forEach(doc => {
                    results.push({ id: doc.id, ...doc.data() });
                });
                callback({ success: true, data: results });
            }, (error) => {
                callback({ success: false, error: error.message });
            });
            
        } catch (error) {
            callback({ success: false, error: error.message });
            return () => {}; // Retorna função vazia para unsubscribe
        }
    }
};

// Funções específicas para esta loja
const lojaServices = {
    // Buscar informações da loja
    getLojaInfo: async () => {
        try {
            // Buscar na coleção "lojas" onde banco_login = "mj-materiais-construcao"
            const lojasRef = collection(db, 'lojas');
            const q = query(lojasRef, where('banco_login', '==', 'mj-materiais-construcao'));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { success: true, data: { id: doc.id, ...doc.data() } };
            } else {
                return { success: false, error: 'Loja não encontrada' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Buscar estatísticas da loja
    getEstatisticas: async () => {
        try {
            // Simular estatísticas (substituir por dados reais depois)
            const hoje = new Date();
            const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            
            // Buscar vendas de hoje
            const vendasRef = collection(db, 'lojas', 'mj-materiais-construcao', 'vendas');
            const q = query(vendasRef, 
                where('data', '>=', inicioDia),
                where('data', '<=', hoje)
            );
            
            const vendasSnapshot = await getDocs(q);
            const totalVendas = vendasSnapshot.docs.reduce((total, doc) => {
                return total + (doc.data().total || 0);
            }, 0);
            
            // Buscar contagem de produtos
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'produtos');
            const produtosSnapshot = await getDocs(query(produtosRef, where('ativo', '==', true)));
            
            // Buscar contagem de clientes
            const clientesRef = collection(db, 'lojas', 'mj-materiais-construcao', 'clientes');
            const clientesSnapshot = await getDocs(query(clientesRef, where('ativo', '==', true)));
            
            return {
                success: true,
                data: {
                    vendasHoje: totalVendas,
                    totalProdutos: produtosSnapshot.size,
                    totalClientes: clientesSnapshot.size,
                    metaMensal: 75 // Exemplo fixo
                }
            };
            
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return {
                success: true,
                data: {
                    vendasHoje: 0,
                    totalProdutos: 0,
                    totalClientes: 0,
                    metaMensal: 0
                }
            };
        }
    },
    
    // Criar nova venda
    criarVenda: async (dadosVenda) => {
        try {
            const vendasRef = collection(db, 'lojas', 'mj-materiais-construcao', 'vendas');
            const novaVendaRef = doc(vendasRef);
            
            const vendaData = {
                ...dadosVenda,
                id: novaVendaRef.id,
                loja: 'mj-materiais-construcao',
                data: new Date(),
                status: 'concluida',
                sincronizado: true
            };
            
            await setDoc(novaVendaRef, vendaData);
            
            return { 
                success: true, 
                data: { 
                    id: novaVendaRef.id,
                    ...vendaData 
                } 
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Buscar produtos
    buscarProdutos: async (filtro = '') => {
        try {
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'produtos');
            let q;
            
            if (filtro) {
                q = query(
                    produtosRef,
                    where('ativo', '==', true),
                    where('nome', '>=', filtro),
                    where('nome', '<=', filtro + '\uf8ff')
                );
            } else {
                q = query(produtosRef, where('ativo', '==', true));
            }
            
            const snapshot = await getDocs(q);
            const produtos = [];
            
            snapshot.forEach(doc => {
                produtos.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data: produtos };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Exportar tudo
export { 
    db, 
    auth, 
    firebaseAuth, 
    firestore, 
    lojaServices,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot
};

// Inicialização automática
console.log('✅ Firebase configurado para MJ Materiais de Construção');