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

// Configurar persistência para lembrar login
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

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

// ============================================
// BUSCAR PERFIL DO USUÁRIO
// ============================================
async function buscarPerfilUsuario(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // Verificar se é funcionário
        const funcDoc = await loginDb.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: funcData.perfil,
                nome: funcData.nome,
                email: email,
                ativo: funcData.ativo,
                emailVerificado: auth.currentUser?.emailVerified || false,
                dados: funcData
            };
        }
        
        // Verificar se é cliente
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
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
                emailVerificado: auth.currentUser?.emailVerified || false,
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
// FUNÇÃO PARA REENVIAR EMAIL DE VERIFICAÇÃO
// ============================================
async function reenviarEmailVerificacao(email) {
    try {
        const user = auth.currentUser;
        
        if (user && user.email === email) {
            await user.sendEmailVerification();
            return { 
                sucesso: true,
                mensagem: 'E-mail de verificação reenviado! Verifique sua caixa de entrada.'
            };
        } else {
            return { 
                sucesso: false, 
                erro: 'Usuário não está logado. Faça o login primeiro.' 
            };
        }
    } catch (error) {
        console.error('Erro ao reenviar verificação:', error);
        return { 
            sucesso: false, 
            erro: error.message 
        };
    }
}

// ============================================
// FUNÇÃO PRINCIPAL DE LOGIN
// ============================================
async function fazerLogin(email, senha) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // VERIFICAR SE O EMAIL FOI VERIFICADO
        if (!user.emailVerified) {
            // Manter o usuário logado apenas para poder reenviar o email
            return {
                sucesso: false,
                precisaVerificar: true,
                email: email,
                uid: user.uid,
                erro: 'E-mail não verificado. Por favor, verifique sua caixa de entrada e confirme seu e-mail.'
            };
        }
        
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
            return {
                sucesso: true,
                usuario: {
                    uid: user.uid,
                    email: user.email,
                    nome: adminCheck.dados.nome,
                    nivel: 'admin',
                    tipo: 'admin',
                    loja: lojaAtual,
                    emailVerificado: user.emailVerified
                },
                permissoes: { 
                    todas: true,
                    admin: true
                }
            };
        }
        
        // Buscar perfil (funcionário ou cliente)
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
        
        // Atualizar último acesso
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const collection = perfil.tipo === 'funcionario' ? 'funcionarios' : 'clientes';
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection(collection).doc(email)
               .update({ ultimo_acesso: timestamp });
        
        // Definir permissões
        let permissoes = {
            visualizar_produtos: true,
            fazer_compras: true
        };
        
        if (perfil.tipo === 'funcionario') {
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
                emailVerificado: user.emailVerified,
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
        }
        
        return {
            sucesso: false,
            erro: mensagemErro
        };
    }
}

// ============================================
// CADASTRO DE CLIENTE COM VERIFICAÇÃO DE EMAIL
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
        
        // 3. ENVIAR EMAIL DE VERIFICAÇÃO (SEM URL PERSONALIZADA)
        console.log('📧 Enviando email de verificação...');
        await user.sendEmailVerification(); // Sem parâmetros = usa domínio padrão do Firebase
        
        // 4. SALVAR NO FIRESTORE
        console.log('📝 Salvando dados do cliente no Firestore...');
        
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
            emailVerificado: false,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            ultimo_acesso: null
        });
        
        console.log(`✅ Cliente ${email} cadastrado com sucesso!`);
        
        // 5. FAZER LOGOUT PARA NÃO FICAR LOGADO
        await auth.signOut();
        
        return {
            sucesso: true,
            precisaVerificar: true,
            email: email,
            mensagem: '✅ Cadastro realizado! Enviamos um e-mail de confirmação pelo email valida_login@lojasite... Por favor, verifique sua caixa de entrada (incluindo spam) e clique no link para verificar seu e-mail antes de fazer login.'
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
        } else if (error.code === 'auth/unauthorized-continue-uri') {
            mensagemErro = 'Erro de configuração do domínio. O e-mail ainda será enviado.';
            
            // Fallback: tentar enviar sem URL personalizada
            try {
                const user = auth.currentUser;
                if (user) {
                    await user.sendEmailVerification();
                    await auth.signOut();
                    return {
                        sucesso: true,
                        precisaVerificar: true,
                        email: email,
                        mensagem: '✅ Cadastro realizado! Verifique seu e-mail (incluindo spam) para confirmar.'
                    };
                }
            } catch (fallbackError) {
                console.error('Fallback também falhou:', fallbackError);
            }
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
// VERIFICAR STATUS DE VERIFICAÇÃO DE EMAIL
// ============================================
async function verificarStatusEmail(email) {
    try {
        const user = auth.currentUser;
        if (user && user.email === email) {
            await user.reload();
            return {
                verificado: user.emailVerified,
                email: user.email
            };
        }
        return { verificado: false };
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        return { verificado: false, erro: error.message };
    }
}

// ============================================
// LISTENER DE AUTENTICAÇÃO
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('👤 Usuário autenticado:', user.email);
        console.log('📧 Email verificado:', user.emailVerified);
        
        // SÓ PROSSEGUIR SE O EMAIL ESTIVER VERIFICADO
        if (!user.emailVerified) {
            console.log('⚠️ Email não verificado. Aguardando verificação...');
            window.dispatchEvent(new CustomEvent('usuarioNaoVerificado', { 
                detail: { 
                    email: user.email,
                    uid: user.uid
                }
            }));
            return;
        }
        
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            console.log('Loja não identificada na URL');
            return;
        }
        
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
                            loja: lojaAtual,
                            emailVerificado: true
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
                    detail: { 
                        usuario: perfil,
                        permissoes: perfil.tipo === 'funcionario' ? {
                            visualizar_produtos: true,
                            fazer_compras: true,
                            editar_produtos: perfil.perfil !== 'vendedor',
                            gerenciar_estoque: perfil.perfil !== 'vendedor'
                        } : {
                            visualizar_produtos: true,
                            fazer_compras: true
                        }
                    }
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
// EXPOR FUNÇÕES
// ============================================
window.fazerLogin = fazerLogin;
window.cadastrarCliente = cadastrarCliente;
window.fazerLogout = fazerLogout;
window.getLojaDaURL = getLojaDaURL;
window.reenviarEmailVerificacao = reenviarEmailVerificacao;
window.verificarStatusEmail = verificarStatusEmail;
window.auth = auth;    
window.loginDb = loginDb;    

console.log('✅ Sistema de login carregado');
console.log('📋 Funções disponíveis:', {
    fazerLogin: typeof fazerLogin,
    cadastrarCliente: typeof cadastrarCliente,
    fazerLogout: typeof fazerLogout,
    reenviarEmailVerificacao: typeof reenviarEmailVerificacao
});

