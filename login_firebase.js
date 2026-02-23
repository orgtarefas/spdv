// ============================================
// CONFIGURAÇÃO CENTRALIZADA DO FIREBASE
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAYPjEB8cT-mOmLaXJMXAsoP2l3YotY2WQ",
    authDomain: "lojasite-ba36f.firebaseapp.com",
    projectId: "lojasite-ba36f",
    storageBucket: "lojasite-ba36f.firebasestorage.app",
    messagingSenderId: "1083157739430",
    appId: "1:1083157739430:web:5ed2d4261434c73a9e4167"
};

// Inicializar Firebase (apenas uma vez)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado pelo login_firebase.js');
}

// Ativar App Check com reCAPTCHA Enterprise
try {
    const appCheck = firebase.appCheck();
    appCheck.activate(
        new firebase.appCheck.ReCaptchaEnterpriseProvider(
            "6LdqQnUsAAAAAOnjtu0Avi_0WubZw0iYS20DjL6b"  // Chave do site
        ),
        true // Auto-refresh do token
    );
    console.log('✅ App Check ativado com reCAPTCHA Enterprise');
} catch (error) {
    console.error('❌ Erro ao ativar App Check:', error);
}

// Referências globais
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para extrair loja da URL
function getLojaDaURL() {
    const path = window.location.pathname;
    const match = path.match(/\/lojas\/([^\/]+)\//);
    if (match && match[1]) {
        return match[1];
    }
    const parts = path.split('/');
    const lojaFolder = parts[parts.length - 2];
    return lojaFolder || null;
}

// ============================================
// FUNÇÕES DA COLEÇÃO LOJAS
// ============================================

// Verificar se a loja está ativa
async function verificarLojaAtiva(lojaId) {
    try {
        const lojaDoc = await db.collection('lojas').doc(lojaId).get();
        
        if (!lojaDoc.exists) {
            return { 
                ativa: false, 
                erro: 'Loja não encontrada no Firebase'
            };
        }
        
        const lojaData = lojaDoc.data();
        const agora = new Date();
        const dataAtivacao = lojaData.data_ativacao?.toDate();
        const dataValidade = lojaData.data_validade?.toDate();
        
        if (lojaData.ativo === false) {
            return { ativa: false, erro: 'Loja inativa', dados: lojaData };
        }
        
        if (dataAtivacao && agora < dataAtivacao) {
            return { ativa: false, erro: 'Loja ainda não ativada', dados: lojaData };
        }
        
        if (dataValidade && agora > dataValidade) {
            return { ativa: false, erro: 'Período de acesso expirado', dados: lojaData };
        }
        
        return { ativa: true, dados: lojaData };
    } catch (error) {
        console.error('Erro ao verificar loja:', error);
        return { ativa: false, erro: 'Erro ao verificar loja' };
    }
}

// ============================================
// FUNÇÕES DA COLEÇÃO USUARIOS
// ============================================

// Verificar se é ADMIN
async function verificarAdmin(email) {
    if (!auth.currentUser) {
        return { isAdmin: false };
    }
    
    try {
        const adminDoc = await db.collection('usuarios').doc('admin').get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData[email]) {
                return {
                    isAdmin: true,
                    dados: adminData[email]
                };
            }
        }
        
        return { isAdmin: false };
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        return { isAdmin: false };
    }
}

// Buscar perfil do usuário na loja
async function buscarPerfilNaLoja(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // Buscar funcionários
        const userDoc = await db.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: userData.perfil,
                nome: userData.nome,
                email: email,
                ativo: userData.ativo,
                dados: userData
            };
        }
        
        // Buscar clientes
        const clienteDoc = await db.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            return {
                encontrado: true,
                tipo: 'cliente',
                perfil: 'cliente',
                nome: clienteData.nome,
                email: email,
                ativo: clienteData.ativo,
                dados: clienteData
            };
        }
        
        return { encontrado: false };
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return { encontrado: false, erro: error.message };
    }
}

// ============================================
// FUNÇÕES DE LOGIN
// ============================================

async function fazerLogin(email, senha) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
            };
        }
        
        // Verificar admin
        const adminCheck = await verificarAdmin(email);
        
        if (adminCheck.isAdmin) {
            console.log('✅ Acesso admin concedido para:', email);
            
            const lojaStatus = await verificarLojaAtiva(lojaAtual);
            
            const dadosPublicos = typeof LOJAS_CONFIG !== 'undefined' ? 
                LOJAS_CONFIG[lojaAtual] : null;
            
            return {
                sucesso: true,
                usuario: {
                    uid: user.uid,
                    email: user.email,
                    nome: adminCheck.dados.nome,
                    nivel: 'admin',
                    tipo_perfil: 'admin',
                    loja: lojaAtual,
                    dados: adminCheck.dados
                },
                permissoes: { 
                    todas: true, 
                    admin: true,
                    acessar_todas_lojas: true 
                },
                lojaInfo: lojaStatus,
                dadosPublicos: dadosPublicos
            };
        }
        
        // Verificar status da loja
        const lojaStatus = await verificarLojaAtiva(lojaAtual);
        
        if (!lojaStatus.ativa) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: lojaStatus.erro || 'Loja indisponível',
                lojaInfo: lojaStatus
            };
        }
        
        // Buscar perfil
        const perfil = await buscarPerfilNaLoja(email, lojaAtual);
        
        if (!perfil.encontrado) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Usuário não cadastrado nesta loja',
                lojaInfo: lojaStatus
            };
        }
        
        if (perfil.ativo === false) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Usuário inativo',
                lojaInfo: lojaStatus
            };
        }
        
        // Atualizar último acesso
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const collection = perfil.tipo === 'funcionario' ? 'funcionarios' : 'clientes';
        
        await db.collection('usuarios').doc(lojaAtual)
               .collection(collection).doc(email)
               .update({ ultimo_acesso: timestamp });
        
        const dadosPublicos = typeof LOJAS_CONFIG !== 'undefined' ? 
            LOJAS_CONFIG[lojaAtual] : null;
        
        const permissoes = await buscarPermissoesPorPerfil(perfil.perfil);
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: perfil.nome,
                nivel: perfil.perfil,
                tipo_perfil: perfil.tipo,
                loja: lojaAtual,
                dados: perfil.dados
            },
            permissoes: permissoes,
            lojaInfo: lojaStatus,
            dadosPublicos: dadosPublicos
        };
        
    } catch (error) {
        console.error('Erro no login:', error);
        
        let mensagemErro = error.message;
        if (error.code === 'auth/user-not-found') {
            mensagemErro = 'Usuário não encontrado';
        } else if (error.code === 'auth/wrong-password') {
            mensagemErro = 'Senha incorreta';
        } else if (error.code === 'auth/invalid-email') {
            mensagemErro = 'E-mail inválido';
        } else if (error.code === 'auth/too-many-requests') {
            mensagemErro = 'Muitas tentativas. Tente novamente mais tarde';
        } else if (error.code === 'auth/firebase-app-check-token-is-invalid') {
            mensagemErro = 'Erro de segurança. Recarregue a página.';
        }
        
        return {
            sucesso: false,
            erro: mensagemErro
        };
    }
}

// ============================================
// CADASTRO DE CLIENTE
// ============================================

async function cadastrarCliente(nome, email, senha, telefone) {
    try {
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
            };
        }
        
        // Verificar se a loja está ativa
        const lojaStatus = await verificarLojaAtiva(lojaAtual);
        if (!lojaStatus.ativa) {
            return {
                sucesso: false,
                erro: `Não é possível cadastrar: ${lojaStatus.erro}`
            };
        }
        
        // Verificar se já existe um admin
        const adminCheck = await verificarAdmin(email);
        if (adminCheck.isAdmin) {
            return {
                sucesso: false,
                erro: 'Email reservado para administrador'
            };
        }
        
        // Criar usuário
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: nome });
        
        // Salvar na coleção usuarios
        await db.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set({
            nome: nome,
            telefone: telefone,
            perfil: 'cliente',
            ativo: true,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            ultimo_acesso: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const dadosPublicos = typeof LOJAS_CONFIG !== 'undefined' ? 
            LOJAS_CONFIG[lojaAtual] : null;
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: nome,
                nivel: 'cliente',
                loja: lojaAtual
            },
            dadosPublicos: dadosPublicos
        };
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        let mensagemErro = error.message;
        if (error.code === 'auth/email-already-in-use') {
            mensagemErro = 'E-mail já está em uso';
        } else if (error.code === 'auth/weak-password') {
            mensagemErro = 'Senha muito fraca. Use pelo menos 6 caracteres';
        } else if (error.code === 'auth/invalid-email') {
            mensagemErro = 'E-mail inválido';
        }
        
        return {
            sucesso: false,
            erro: mensagemErro
        };
    }
}

// ============================================
// PERMISSÕES
// ============================================

async function buscarPermissoesPorPerfil(perfil) {
    try {
        if (perfil === 'admin') {
            return { todas: true, admin: true };
        }
        
        const permissoesDoc = await db.collection('configuracoes').doc('permissoes_niveis').get();
        
        if (permissoesDoc.exists) {
            const permissoes = permissoesDoc.data();
            return permissoes[perfil] || {};
        }
        
        const permissoesPadrao = {
            'gerente': {
                visualizar_vendas: true,
                realizar_venda: true,
                consultar_estoque: true,
                alterar_estoque: true,
                ver_relatorios: true,
                gerenciar_funcionarios: true
            },
            'supervisor': {
                visualizar_vendas: true,
                realizar_venda: true,
                consultar_estoque: true,
                alterar_estoque: true
            },
            'vendedor': {
                visualizar_vendas: true,
                realizar_venda: true,
                consultar_estoque: true
            },
            'cliente': {
                visualizar_produtos: true,
                fazer_compras: true,
                consultar_pedidos: true
            }
        };
        
        return permissoesPadrao[perfil] || {};
        
    } catch (error) {
        console.error('Erro ao buscar permissões:', error);
        return {};
    }
}

// ============================================
// LOGOUT
// ============================================

async function fazerLogout() {
    try {
        await auth.signOut();
        return { sucesso: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { sucesso: false, erro: error.message };
    }
}

// ============================================
// LISTENER DE AUTENTICAÇÃO
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('Usuário autenticado:', user.email);
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            console.log('Loja não identificada na URL');
            return;
        }
        
        try {
            const adminCheck = await verificarAdmin(user.email);
            
            if (adminCheck.isAdmin) {
                console.log('Admin detectado');
                const dadosPublicos = typeof LOJAS_CONFIG !== 'undefined' ? 
                    LOJAS_CONFIG[lojaAtual] : null;
                    
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: {
                        usuario: {
                            uid: user.uid,
                            email: user.email,
                            nome: adminCheck.dados.nome,
                            nivel: 'admin',
                            tipo_perfil: 'admin',
                            loja: lojaAtual
                        },
                        permissoes: { 
                            todas: true, 
                            admin: true,
                            acessar_todas_lojas: true 
                        },
                        dadosPublicos: dadosPublicos
                    }
                }));
                return;
            }
            
            const perfil = await buscarPerfilNaLoja(user.email, lojaAtual);
            
            if (perfil.encontrado && perfil.ativo) {
                const permissoes = await buscarPermissoesPorPerfil(perfil.perfil);
                const dadosPublicos = typeof LOJAS_CONFIG !== 'undefined' ? 
                    LOJAS_CONFIG[lojaAtual] : null;
                
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: {
                        usuario: {
                            uid: user.uid,
                            email: user.email,
                            nome: perfil.nome,
                            nivel: perfil.perfil,
                            tipo_perfil: perfil.tipo,
                            loja: lojaAtual,
                            dados: perfil.dados
                        },
                        permissoes: permissoes,
                        dadosPublicos: dadosPublicos
                    }
                }));
            } else {
                await auth.signOut();
                window.dispatchEvent(new CustomEvent('usuarioNaoAutorizado', { 
                    detail: { erro: 'Usuário não cadastrado nesta loja' }
                }));
            }
        } catch (error) {
            console.error('Erro no auth state changed:', error);
            await auth.signOut();
        }
    } else {
        console.log('Usuário não autenticado');
        window.dispatchEvent(new CustomEvent('usuarioDeslogado'));
    }
});

// ============================================
// EXPOR FUNÇÕES GLOBALMENTE
// ============================================

window.fazerLogin = fazerLogin;
window.cadastrarCliente = cadastrarCliente;
window.fazerLogout = fazerLogout;
window.verificarLojaAtiva = verificarLojaAtiva;
window.getLojaDaURL = getLojaDaURL;
window.auth = auth;
window.db = db;

console.log('✅ login_firebase.js carregado com todas as configurações');
