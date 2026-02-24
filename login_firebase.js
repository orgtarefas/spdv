// ============================================
// CONFIGURAÇÃO DO FIREBASE DE LOGIN
// Projeto: lojasite-ba36f
// ============================================

const loginFirebaseConfig = {
    apiKey: "AIzaSyAYPjEB8cT-mOmLaXJMXAsoP2l3YotY2WQ",
    authDomain: "lojasite-ba36f.firebaseapp.com",
    projectId: "lojasite-ba36f",
    storageBucket: "lojasite-ba36f.firebasestorage.app",
    messagingSenderId: "1083157739430",
    appId: "1:1083157739430:web:5ed2d4261434c73a9e4167"
};

// Inicializar Firebase de login
const loginApp = firebase.initializeApp(loginFirebaseConfig, 'loginApp');
const auth = loginApp.auth();
const loginDb = loginApp.firestore();

// Ativar App Check
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
// VERIFICAR SE É ADMIN (coleção admin)
// ============================================
async function verificarAdmin(email) {
    if (!auth.currentUser) {
        return { isAdmin: false };
    }
    
    try {
        // Buscar documento admin na raiz da coleção usuarios
        const adminDoc = await loginDb.collection('usuarios').doc('admin').get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            // Verificar se o email está no mapa de admins
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

// ============================================
// BUSCAR PERFIL DO USUÁRIO (FUNCIONÁRIO OU CLIENTE)
// ============================================
async function buscarPerfilUsuario(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // 1️⃣ VERIFICAR SE É FUNCIONÁRIO
        const funcDoc = await loginDb.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            console.log('✅ Usuário é FUNCIONÁRIO:', funcData.perfil);
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: funcData.perfil, // 'gerente', 'supervisor', 'vendedor'
                nome: funcData.nome,
                email: email,
                ativo: funcData.ativo,
                dados: funcData
            };
        }
        
        // 2️⃣ VERIFICAR SE É CLIENTE
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            console.log('✅ Usuário é CLIENTE');
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
        
        console.log('❌ Usuário não encontrado');
        return { encontrado: false };
        
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return { encontrado: false, erro: error.message };
    }
}

// ============================================
// FUNÇÃO PRINCIPAL DE LOGIN
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
        
        // 1️⃣ VERIFICAR SE É ADMIN (acesso global)
        const adminCheck = await verificarAdmin(email);
        
        if (adminCheck.isAdmin) {
            console.log('✅ Acesso ADMIN concedido para:', email);
            
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
                    admin: true,
                    visualizar_produtos: true,
                    fazer_compras: true,
                    editar_produtos: true,
                    gerenciar_estoque: true,
                    ver_relatorios: true,
                    gerenciar_funcionarios: true,
                    gerenciar_loja: true
                }
            };
        }
        
        // 2️⃣ BUSCAR PERFIL (funcionário ou cliente)
        const perfil = await buscarPerfilUsuario(email, lojaAtual);
        
        if (!perfil.encontrado) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Usuário não cadastrado nesta loja'
            };
        }
        
        if (perfil.ativo === false) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'Usuário inativo'
            };
        }
        
        // 3️⃣ ATUALIZAR ÚLTIMO ACESSO
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const collection = perfil.tipo === 'funcionario' ? 'funcionarios' : 'clientes';
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection(collection).doc(email)
               .update({ ultimo_acesso: timestamp });
        
        // 4️⃣ DEFINIR PERMISSÕES BASEADAS NO PERFIL
        let permissoes = {
            // Todos têm acesso básico à loja
            visualizar_produtos: true,
            fazer_compras: true
        };
        
        if (perfil.tipo === 'funcionario') {
            // Funcionários têm permissões adicionais
            switch(perfil.perfil) {
                case 'gerente':
                    permissoes = {
                        ...permissoes,
                        editar_produtos: true,
                        gerenciar_estoque: true,
                        ver_relatorios: true,
                        gerenciar_funcionarios: true,
                        gerenciar_loja: true
                    };
                    break;
                case 'supervisor':
                    permissoes = {
                        ...permissoes,
                        editar_produtos: true,
                        gerenciar_estoque: true,
                        ver_relatorios: true
                    };
                    break;
                case 'vendedor':
                    permissoes = {
                        ...permissoes,
                        editar_produtos: false,
                        gerenciar_estoque: false,
                        ver_relatorios: false
                    };
                    break;
                default:
                    permissoes = {
                        ...permissoes,
                        editar_produtos: false,
                        gerenciar_estoque: false
                    };
            }
        }
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: perfil.nome,
                nivel: perfil.perfil,
                tipo: perfil.tipo,
                loja: lojaAtual,
                dados: perfil.dados
            },
            permissoes: permissoes
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
async function cadastrarCliente(nome, email, senha, telefone, cpf, endereco, cidade, cep) {
    try {
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
            };
        }
        
        console.log(`📝 Cadastrando cliente: ${email} na loja ${lojaAtual}`);
        
        // 1. CRIAR USUÁRIO
        console.log('📝 Criando usuário no Authentication...');
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        console.log(`✅ Usuário criado: ${user.uid}`);
        
        // 2. Atualizar perfil com nome
        await user.updateProfile({ displayName: nome });
        
        // 3. SALVAR NO FIRESTORE ANTES QUE O onAuthStateChanged DISPARE
        console.log('📝 Salvando dados do cliente no Firestore...');
        
        // Criar o documento do cliente
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set({
            nome: nome,
            email: email,
            telefone: telefone || '',
            cpf: cpf || '',
            endereco: endereco || '',
            cidade: cidade || '',
            cep: cep || '',
            perfil: 'cliente',
            ativo: true,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            ultimo_acesso: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Cliente ${email} cadastrado com sucesso!`);
        
        // 4. AGORA SIM, DISPARAR EVENTO MANUALMENTE
        setTimeout(() => {
            // Disparar evento de login manualmente
            window.dispatchEvent(new CustomEvent('usuarioLogado', {
                detail: {
                    usuario: {
                        uid: user.uid,
                        email: user.email,
                        nome: nome,
                        nivel: 'cliente',
                        tipo: 'cliente',
                        loja: lojaAtual,
                        dados: {
                            nome: nome,
                            email: email,
                            telefone: telefone
                        }
                    },
                    permissoes: {
                        visualizar_produtos: true,
                        fazer_compras: true
                    }
                }
            }));
        }, 500);
        
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
        console.error('❌ Erro no cadastro:', error);
        
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
        console.log('👤 Usuário autenticado:', user.email);
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            console.log('Loja não identificada na URL');
            return;
        }
        
        // VERIFICAR SE É UM CADASTRO RECENTE
        const metadata = user.metadata;
        const creationTime = new Date(metadata.creationTime).getTime();
        const now = Date.now();
        const isRecentSignUp = (now - creationTime) < 3000;
        
        if (isRecentSignUp) {
            console.log('🕒 Cadastro recente detectado, aguardando criação do perfil...');
            
            setTimeout(async () => {
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
                                permissoes: { todas: true }
                            }
                        }));
                        return;
                    }
                    
                    const perfil = await buscarPerfilUsuario(user.email, lojaAtual);
                    
                    if (perfil.encontrado) {
                        window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                            detail: { usuario: perfil }
                        }));
                    }
                } catch (error) {
                    console.error('Erro ao buscar perfil após cadastro:', error);
                }
            }, 2000);
            
            return;
        }
        
        // FLUXO NORMAL
        try {
            const adminCheck = await verificarAdmin(user.email);
            
            if (adminCheck.isAdmin) {
                console.log('✅ ADMIN logado');
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
                        permissoes: { todas: true }
                    }
                }));
                return;
            }
            
            const perfil = await buscarPerfilUsuario(user.email, lojaAtual);
            
            if (perfil.encontrado && perfil.ativo) {
                console.log(`✅ ${perfil.tipo.toUpperCase()} logado:`, perfil.nome);
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: { usuario: perfil }
                }));
            } else {
                console.log('❌ Usuário não tem perfil nesta loja');
                await auth.signOut();
                window.dispatchEvent(new CustomEvent('usuarioNaoAutorizado', { 
                    detail: { erro: 'Usuário não cadastrado' }
                }));
            }
        } catch (error) {
            console.error('Erro no auth state changed:', error);
            await auth.signOut();
        }
    } else {
        console.log('👤 Nenhum usuário logado');
        window.dispatchEvent(new CustomEvent('usuarioDeslogado'));
    }
});

// ============================================
// EXPOR FUNÇÕES E VARIÁVEIS GLOBALMENTE
// ============================================
window.fazerLogin = fazerLogin;
window.cadastrarCliente = cadastrarCliente;
window.fazerLogout = fazerLogout;
window.getLojaDaURL = getLojaDaURL;

window.auth = auth;
window.loginDb = loginDb;

console.log('✅ Sistema de login carregado com sucesso!');



