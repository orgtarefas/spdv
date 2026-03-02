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
// BUSCAR PERFIL DO USUÁRIO (ADMIN, FUNCIONÁRIO OU CLIENTE)
// ============================================
async function buscarPerfilUsuario(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // 🔥 PRIMEIRO: VERIFICAR SE É ADMIN (acesso global)
        const adminCheck = await verificarAdmin(email);
        
        if (adminCheck.isAdmin) {
            console.log('✅ Usuário é ADMIN global');
            
            // Recarregar para pegar status de verificação
            await auth.currentUser.reload();
            
            return {
                encontrado: true,
                tipo: 'admin',
                perfil: 'admin',
                nome: adminCheck.dados.nome,
                email: email,
                ativo: adminCheck.dados.ativo,
                emailVerificado: auth.currentUser.emailVerified,
                dados: adminCheck.dados
            };
        }
        
        // 🔥 SEGUNDO: VERIFICAR SE É FUNCIONÁRIO DA LOJA
        const funcDoc = await loginDb.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            console.log('✅ Usuário é FUNCIONÁRIO da loja:', funcData.perfil);
            
            // Recarregar para pegar status de verificação
            await auth.currentUser.reload();
            
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: funcData.perfil, // 'gerente', 'supervisor', 'vendedor', 'admin'
                nome: funcData.nome,
                email: email,
                ativo: funcData.ativo,
                emailVerificado: auth.currentUser.emailVerified,
                dados: funcData
            };
        }
        
        // 🔥 TERCEIRO: VERIFICAR SE É CLIENTE
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            console.log('✅ Usuário é CLIENTE');
            
            // Recarregar para pegar status de verificação
            await auth.currentUser.reload();
            
            return {
                encontrado: true,
                tipo: 'cliente',
                perfil: 'cliente',
                nome: clienteData.nome,
                email: email,
                ativo: clienteData.ativo,
                emailVerificado: auth.currentUser.emailVerified,
                dados: clienteData
            };
        }
        
        console.log('❌ Usuário não encontrado em nenhuma categoria');
        return { encontrado: false };
        
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return { encontrado: false, erro: error.message };
    }
}

// ============================================
// FUNÇÃO AUXILIAR PARA VERIFICAR PERFIL SIMPLES
// ============================================
async function verificarPerfilSimples(email, lojaId) {
    try {
        // Verificar admin global
        const adminDoc = await loginDb.collection('usuarios').doc('admin').get();
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData[email]) {
                return { encontrado: true, tipo: 'admin' };
            }
        }
        
        // Verificar funcionário
        const funcDoc = await loginDb.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        if (funcDoc.exists) {
            return { encontrado: true, tipo: 'funcionario' };
        }
        
        // Verificar cliente
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        if (clienteDoc.exists) {
            return { encontrado: true, tipo: 'cliente' };
        }
        
        return { encontrado: false };
        
    } catch (error) {
        console.error('Erro na verificação simples:', error);
        return { encontrado: false };
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
            // REENVIAR EMAIL AUTOMATICAMENTE
            try {
                await user.sendEmailVerification();
                console.log('📧 Novo email de verificação enviado para:', email);
                
                // ATUALIZAR O TIMESTAMP NO FIRESTORE (se for cliente)
                const lojaAtual = getLojaDaURL();
                
                // Só atualizar timestamp se for cliente (funcionários e admin não têm esse campo)
                const perfilTemp = await verificarPerfilSimples(email, lojaAtual);
                if (perfilTemp.tipo === 'cliente') {
                    await loginDb.collection('usuarios').doc(lojaAtual)
                           .collection('clientes').doc(email)
                           .update({
                               ultimo_envio_email_valida: firebase.firestore.FieldValue.serverTimestamp()
                           });
                }
                
            } catch (sendError) {
                console.error('Erro ao reenviar email:', sendError);
            }
            
            await auth.signOut();
            
            return {
                sucesso: false,
                tipo: 'email_nao_verificado',
                email: email,
                erro: `❌ Login não realizado: o e-mail ${email} ainda não foi verificado.\n\n📧 Enviamos um novo link de verificação para este e-mail.\nPor favor, verifique sua caixa de entrada (e spam) e clique no link antes de tentar logar novamente.`
            };
        }
        
        // SE CHEGOU AQUI, EMAIL ESTÁ VERIFICADO
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
            };
        }
        
        // BUSCAR PERFIL DO USUÁRIO (ADMIN, FUNCIONÁRIO OU CLIENTE)
        const perfil = await buscarPerfilUsuario(email, lojaAtual);
        
        if (!perfil.encontrado) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: `❌ Usuário ${email} não tem permissão para acessar esta loja.`
            };
        }
        
        if (perfil.ativo === false) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: `❌ Usuário ${email} está inativo. Entre em contato com o suporte.`
            };
        }
        
        // ATUALIZAR ÚLTIMO ACESSO (apenas para clientes e funcionários)
        if (perfil.tipo !== 'admin') {
            const collection = perfil.tipo === 'funcionario' ? 'funcionarios' : 'clientes';
            await loginDb.collection('usuarios').doc(lojaAtual)
                   .collection(collection).doc(email)
                   .update({
                       ultimo_acesso: firebase.firestore.FieldValue.serverTimestamp()
                   });
        }
        
        // DEFINIR PERMISSÕES BASEADAS NO PERFIL
        let permissoes = {
            visualizar_produtos: true,
            fazer_compras: true
        };
        
        if (perfil.tipo === 'admin') {
            permissoes = {
                todas: true,
                admin: true,
                visualizar_produtos: true,
                fazer_compras: true,
                editar_produtos: true,
                gerenciar_estoque: true,
                ver_relatorios: true,
                gerenciar_funcionarios: true,
                gerenciar_loja: true
            };
        } else if (perfil.tipo === 'funcionario') {
            switch(perfil.perfil) {
                case 'admin': // admin da loja (não confundir com admin global)
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
                    permissoes = { ...permissoes };
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
                emailVerificado: true,
                dados: perfil.dados
            },
            permissoes: permissoes
        };
        
    } catch (error) {
        console.error('Erro no login:', error);
        
        // TRATAMENTO PARA CREDENCIAIS INVÁLIDAS (EMAIL OU SENHA INCORRETOS)
        if (error.code === 'auth/invalid-credential') {
            
            // Verificar se o email existe em alguma categoria
            try {
                const lojaAtual = getLojaDaURL();
                const perfilTemp = await verificarPerfilSimples(email, lojaAtual);
                
                if (!perfilTemp.encontrado) {
                    // EMAIL NÃO EXISTE EM NENHUMA CATEGORIA
                    return {
                        sucesso: false,
                        tipo: 'email_nao_cadastrado',
                        email: email,
                        erro: `❌ O e-mail "${email}" não está cadastrado em nossa loja.\n\nDeseja realizar um cadastro?`
                    };
                } else {
                    // EMAIL EXISTE, ENTÃO A SENHA ESTÁ ERRADA
                    return {
                        sucesso: false,
                        tipo: 'senha_incorreta',
                        email: email,
                        erro: `❌ Senha incorreta para o e-mail "${email}".\n\nDeseja receber um link no e-mail para redefinir sua senha?`
                    };
                }
            } catch (firestoreError) {
                console.error('Erro ao verificar Firestore:', firestoreError);
                return {
                    sucesso: false,
                    erro: `❌ Erro ao verificar o e-mail "${email}". Tente novamente.`
                };
            }
        }
        
        // OUTROS ERROS
        if (error.code === 'auth/invalid-email') {
            return {
                sucesso: false,
                erro: `❌ O formato do e-mail "${email}" é inválido.`
            };
        }
        
        if (error.code === 'auth/too-many-requests') {
            return {
                sucesso: false,
                erro: '❌ Muitas tentativas de login. Tente novamente mais tarde.'
            };
        }
        
        return {
            sucesso: false,
            erro: `❌ Erro inesperado: ${error.message}`
        };
    }
}

// ============================================
// CADASTRO DE CLIENTE COM CAMPOS SOLICITADOS
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
        
        // 1. CRIAR USUÁRIO NO AUTHENTICATION
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // 2. Atualizar perfil com nome
        await user.updateProfile({ displayName: nome });
        
        // 3. ENVIAR EMAIL DE VERIFICAÇÃO
        await user.sendEmailVerification();
        
        // 4. SALVAR NO FIRESTORE COM OS DOIS CAMPOS
        const dadosCliente = {
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
            ultimo_envio_email_valida: firebase.firestore.FieldValue.serverTimestamp(),
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            uid: user.uid
        };
        
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set(dadosCliente);
        
        // 5. FAZER LOGOUT (não queremos usuário logado sem verificação)
        await auth.signOut();
        
        return {
            sucesso: true,
            precisaVerificar: true,
            email: email,
            mensagem: `✅ Cadastro realizado! Enviamos um e-mail para ${email}.\n\nVocê tem 30 minutos para verificar seu e-mail.\nApós verificar, faça o login normalmente.`
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
// FUNÇÃO PARA RECUPERAR SENHA
// ============================================
async function recuperarSenha(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return {
            sucesso: true,
            mensagem: `✅ Link de redefinição enviado para ${email}`
        };
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        
        let mensagem = '❌ Erro ao enviar link de redefinição.';
        if (error.code === 'auth/user-not-found') {
            mensagem = '❌ E-mail não encontrado.';
        } else if (error.code === 'auth/invalid-email') {
            mensagem = '❌ E-mail inválido.';
        }
        
        return {
            sucesso: false,
            erro: mensagem
        };
    }
}

// ============================================
// FUNÇÃO PARA REENVIAR EMAIL DE VERIFICAÇÃO
// ============================================
async function reenviarEmailVerificacao(email) {
    try {
        const lojaAtual = getLojaDaURL();
        
        console.log(`📧 Solicitando reenvio para: ${email}`);
        
        // Verificar se o e-mail existe no Firestore
        const clienteQuery = await loginDb.collection('usuarios').doc(lojaAtual)
            .collection('clientes')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (clienteQuery.empty) {
            return { 
                sucesso: false, 
                erro: '❌ E-mail não encontrado. Faça um novo cadastro.' 
            };
        }
        
        const clienteData = clienteQuery.docs[0].data();
        
        // Se já estiver verificado, não precisa reenviar
        if (clienteData.emailVerificado) {
            return { 
                sucesso: false, 
                erro: '✅ Este e-mail já foi verificado. Faça o login.' 
            };
        }
        
        // Retornar instrução clara para o usuário
        return { 
            sucesso: false, 
            redirecionarLogin: true,
            email: email,
            erro: '📧 Para receber um novo link de verificação, faça o login com sua senha. O sistema enviará automaticamente um novo e-mail.'
        };
        
    } catch (error) {
        console.error('Erro:', error);
        return { 
            sucesso: false, 
            erro: error.message 
        };
    }
}

// ============================================
// FUNÇÃO PARA VERIFICAR TEMPO RESTANTE
// ============================================
async function verificarTempoRestante(email) {
    try {
        const lojaAtual = getLojaDaURL();
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaAtual)
                               .collection('clientes').doc(email).get();
        
        if (!clienteDoc.exists) {
            return { encontrado: false };
        }
        
        const dados = clienteDoc.data();
        const ultimoEnvio = dados.ultimo_envio_email_valida?.toDate?.() || new Date();
        const agora = new Date();
        const minutosPassados = Math.round((agora - ultimoEnvio) / (1000 * 60));
        const minutosRestantes = Math.max(0, 30 - minutosPassados);
        
        return {
            encontrado: true,
            emailVerificado: dados.emailVerificado,
            minutosPassados,
            minutosRestantes,
            expirado: minutosPassados > 30 && !dados.emailVerificado
        };
        
    } catch (error) {
        console.error('Erro ao verificar tempo:', error);
        return { encontrado: false, erro: error.message };
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
// LISTENER DE AUTENTICAÇÃO (MODIFICADO)
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('👤 Usuário autenticado:', user.email);
        console.log('📧 Email verificado:', user.emailVerified);
        
        if (!user.emailVerified) {
            console.log('⚠️ Email não verificado');
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
            const perfil = await buscarPerfilUsuario(user.email, lojaAtual);
            
            if (perfil.encontrado && perfil.ativo) {
                console.log(`✅ ${perfil.tipo.toUpperCase()} logado:`, perfil.nome);
                
                let permissoes = {
                    visualizar_produtos: true,
                    fazer_compras: true
                };
                
                if (perfil.tipo === 'admin') {
                    permissoes = { todas: true };
                } else if (perfil.tipo === 'funcionario') {
                    permissoes = {
                        ...permissoes,
                        editar_produtos: perfil.perfil !== 'vendedor',
                        gerenciar_estoque: perfil.perfil !== 'vendedor'
                    };
                }
                
                // 🔥 SALVAR DADOS DO USUÁRIO GLOBALMENTE
                window.dadosUsuario = perfil;
                window.usuarioLogado = true;
                
                // 🔥 SALVAR NO SESSIONSTORAGE PARA COMPARTILHAR ENTRE PÁGINAS
                try {
                    sessionStorage.setItem('dadosUsuario', JSON.stringify(perfil));
                    console.log('✅ Dados do usuário salvos no sessionStorage');
                } catch (e) {
                    console.warn('⚠️ Erro ao salvar no sessionStorage:', e);
                }
                
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: { 
                        usuario: perfil,
                        permissoes: permissoes
                    }
                }));
            } else {
                console.log('❌ Perfil não encontrado ou inativo');
                await auth.signOut();
                window.dispatchEvent(new CustomEvent('usuarioNaoAutorizado', { 
                    detail: { erro: 'Perfil não encontrado' }
                }));
            }
        } catch (error) {
            console.error('Erro no auth state:', error);
            await auth.signOut();
        }
        
    } else {
        console.log('👤 Nenhum usuário logado');
        
        // 🔥 LIMPAR DADOS DO USUÁRIO
        window.dadosUsuario = null;
        window.usuarioLogado = false;
        sessionStorage.removeItem('dadosUsuario');
        
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
window.verificarTempoRestante = verificarTempoRestante;
window.recuperarSenha = recuperarSenha;
window.auth = auth;    
window.loginDb = loginDb;    

console.log('✅ Sistema de login carregado com campos de verificação');
console.log('📋 Funções disponíveis:', {
    fazerLogin: typeof fazerLogin,
    cadastrarCliente: typeof cadastrarCliente,
    recuperarSenha: typeof recuperarSenha,
    reenviarEmailVerificacao: typeof reenviarEmailVerificacao
});

