// ============================================
// CONFIGURAÇÃO DO FIREBASE DE LOGIN
// Projeto: lojasite-ba36f (APENAS AUTENTICAÇÃO)
// ============================================

const loginFirebaseConfig = {
    apiKey: "AIzaSyAYPjEB8cT-mOmLaXJMXAsoP2l3YotY2WQ",
    authDomain: "lojasite-ba36f.firebaseapp.com",
    projectId: "lojasite-ba36f",
    storageBucket: "lojasite-ba36f.firebasestorage.app",
    messagingSenderId: "1083157739430",
    appId: "1:1083157739430:web:5ed2d4261434c73a9e4167"
};

// Inicializar Firebase de login (com nome diferente para não conflitar)
const loginApp = firebase.initializeApp(loginFirebaseConfig, 'loginApp');
const auth = loginApp.auth();
const loginDb = loginApp.firestore();

// Ativar App Check no projeto de login
try {
    const appCheck = loginApp.appCheck();
    appCheck.activate(
        new firebase.appCheck.ReCaptchaEnterpriseProvider(
            "6LdqQnUsAAAAAOnjtu0Avi_0WubZw0iYS20DjL6b"
        ),
        true
    );
    console.log('✅ App Check ativado no projeto de login');
} catch (error) {
    console.error('❌ Erro ao ativar App Check no login:', error);
}

// ============================================
// FUNÇÕES DE LOGIN
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

// Verificar se é ADMIN
async function verificarAdmin(email) {
    if (!auth.currentUser) {
        return { isAdmin: false };
    }
    
    try {
        const adminDoc = await loginDb.collection('usuarios').doc('admin').get();
        
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

// Buscar perfil do cliente na loja
async function buscarPerfilCliente(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // Buscar apenas clientes (funcionários não acessam área de clientes)
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            return {
                encontrado: true,
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

// FUNÇÃO PRINCIPAL DE LOGIN
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
        
        // Verificar se é admin
        const adminCheck = await verificarAdmin(email);
        
        if (adminCheck.isAdmin) {
            console.log('✅ Acesso admin concedido para:', email);
            
            return {
                sucesso: true,
                usuario: {
                    uid: user.uid,
                    email: user.email,
                    nome: adminCheck.dados.nome,
                    nivel: 'admin',
                    tipo: 'admin',
                    loja: lojaAtual
                },
                permissoes: { 
                    todas: true, 
                    admin: true
                }
            };
        }
        
        // Buscar perfil do cliente
        const perfil = await buscarPerfilCliente(email, lojaAtual);
        
        if (!perfil.encontrado) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Cliente não cadastrado nesta loja'
            };
        }
        
        if (perfil.ativo === false) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Cliente inativo'
            };
        }
        
        // Atualizar último acesso
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email)
               .update({ ultimo_acesso: timestamp });
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: perfil.nome,
                nivel: 'cliente',
                tipo: 'cliente',
                loja: lojaAtual,
                dados: perfil.dados
            },
            permissoes: {
                visualizar_produtos: true,
                fazer_compras: true,
                consultar_pedidos: true
            }
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

// CADASTRO DE CLIENTE
async function cadastrarCliente(nome, email, senha, telefone, cpf, endereco, cidade, cep) {
    try {
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
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
        
        // Salvar na coleção de clientes
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set({
            nome: nome,
            email: email,
            telefone: telefone,
            cpf: cpf,
            endereco: endereco || '',
            cidade: cidade || '',
            cep: cep || '',
            perfil: 'cliente',
            ativo: true,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            ultimo_acesso: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: nome,
                nivel: 'cliente',
                loja: lojaAtual
            }
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

// LOGOUT
async function fazerLogout() {
    try {
        await auth.signOut();
        return { sucesso: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { sucesso: false, erro: error.message };
    }
}

// LISTENER DE AUTENTICAÇÃO
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('👤 Cliente autenticado no login:', user.email);
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            console.log('Loja não identificada na URL');
            return;
        }
        
        try {
            const adminCheck = await verificarAdmin(user.email);
            
            if (adminCheck.isAdmin) {
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: {
                        usuario: {
                            uid: user.uid,
                            email: user.email,
                            nome: adminCheck.dados.nome,
                            nivel: 'admin',
                            tipo: 'admin',
                            loja: lojaAtual
                        },
                        permissoes: { todas: true, admin: true }
                    }
                }));
                return;
            }
            
            const perfil = await buscarPerfilCliente(user.email, lojaAtual);
            
            if (perfil.encontrado && perfil.ativo) {
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: {
                        usuario: {
                            uid: user.uid,
                            email: user.email,
                            nome: perfil.nome,
                            nivel: 'cliente',
                            tipo: 'cliente',
                            loja: lojaAtual,
                            dados: perfil.dados
                        },
                        permissoes: {
                            visualizar_produtos: true,
                            fazer_compras: true,
                            consultar_pedidos: true
                        }
                    }
                }));
            } else {
                await auth.signOut();
                window.dispatchEvent(new CustomEvent('usuarioNaoAutorizado', { 
                    detail: { erro: 'Cliente não cadastrado' }
                }));
            }
        } catch (error) {
            console.error('Erro no auth state changed:', error);
            await auth.signOut();
        }
    } else {
        console.log('Nenhum cliente logado');
        window.dispatchEvent(new CustomEvent('usuarioDeslogado'));
    }
});

// EXPOR FUNÇÕES
window.fazerLogin = fazerLogin;
window.cadastrarCliente = cadastrarCliente;
window.fazerLogout = fazerLogout;
window.getLojaDaURL = getLojaDaURL;

console.log('✅ Sistema de login carregado (projeto lojasite-ba36f)');
