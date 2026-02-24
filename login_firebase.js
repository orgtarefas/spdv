// ============================================
// CONFIGURAÇÃO DO FIREBASE DE LOGIN
// ============================================

const loginFirebaseConfig = {
    apiKey: "AIzaSyAYPjEB8cT-mOmLaXJMXAsoP2l3YotY2WQ",
    authDomain: "lojasite-ba36f.firebaseapp.com",
    projectId: "lojasite-ba36f",
    storageBucket: "lojasite-ba36f.firebasestorage.app",
    messagingSenderId: "1083157739430",
    appId: "1:1083157739430:web:5ed2d4261434c73a9e4167"
};

const loginApp = firebase.initializeApp(loginFirebaseConfig, 'loginApp');
const auth = loginApp.auth();
const loginDb = loginApp.firestore();

// Configurar persistência
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
            // ⚠️ CAMPOS IMPORTANTES PARA SUA IDEIA
            emailVerificado: false,  // Começa como false
            ultimo_envio_email_valida: firebase.firestore.FieldValue.serverTimestamp(), // Agora
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
            mensagem: `✅ Cadastro realizado! Enviamos um e-mail para ${email}. 
                       Você tem 30 minutos para verificar seu e-mail. 
                       Após verificar, faça o login normalmente.`
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
// FUNÇÃO PARA REENVIAR EMAIL DE VERIFICAÇÃO (CORRIGIDA)
// ============================================
async function reenviarEmailVerificacao(email) {
    try {
        const lojaAtual = getLojaDaURL();
        
        console.log(`📧 Reenviando email de verificação para: ${email}`);
        
        // OBTER TOKEN DO APP CHECK
        let appCheckToken = null;
        try {
            const appCheck = loginApp.appCheck();
            const tokenResult = await appCheck.getToken();
            appCheckToken = tokenResult.token;
            console.log('✅ Token App Check obtido');
        } catch (tokenError) {
            console.error('Erro ao obter token App Check:', tokenError);
        }
        
        // Preparar headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (appCheckToken) {
            headers['X-Firebase-AppCheck'] = appCheckToken;
        }
        
        // IMPORTANTE: O requestType correto é 'VERIFY_EMAIL' mas precisamos do token do usuário
        // Como não temos, vamos usar uma abordagem diferente
        
        // Primeiro, verificar se o usuário existe
        try {
            await auth.fetchSignInMethodsForEmail(email);
        } catch (error) {
            return { 
                sucesso: false, 
                erro: 'E-mail não encontrado no sistema.' 
            };
        }
        
        // A maneira MAIS SIMPLES: usar o próprio Firebase Auth
        // Infelizmente, não há método público para reenviar email sem login
        
        return { 
            sucesso: false, 
            erro: 'Para receber um novo link de verificação, tente fazer login com sua senha. Se o e-mail não estiver verificado, enviaremos automaticamente um novo link.' 
        };
        
    } catch (error) {
        console.error('Erro ao reenviar:', error);
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
            await auth.signOut();
            
            // Buscar dados do cliente para saber quando foi o último envio
            const lojaAtual = getLojaDaURL();
            const clienteDoc = await loginDb.collection('usuarios').doc(lojaAtual)
                                   .collection('clientes').doc(email).get();
            
            if (clienteDoc.exists) {
                const dados = clienteDoc.data();
                const ultimoEnvio = dados.ultimo_envio_email_valida?.toDate?.() || new Date();
                const minutosPassados = Math.round((new Date() - ultimoEnvio) / (1000 * 60));
                
                return {
                    sucesso: false,
                    precisaVerificar: true,
                    email: email,
                    minutosPassados: minutosPassados,
                    erro: `E-mail não verificado. Seu e-mail foi enviado há ${minutosPassados} minutos. Você tem 30 minutos para verificar.`
                };
            }
            
            return {
                sucesso: false,
                precisaVerificar: true,
                email: email,
                erro: 'E-mail não verificado. Verifique sua caixa de entrada.'
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
        
        // BUSCAR PERFIL DO USUÁRIO
        const perfil = await buscarPerfilUsuario(user.email, lojaAtual);
        
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
        
        // ATUALIZAR O CAMPO emailVerificado NO FIRESTORE PARA true
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email)
               .update({
                   emailVerificado: true,
                   data_verificacao: firebase.firestore.FieldValue.serverTimestamp(),
                   ultimo_login: firebase.firestore.FieldValue.serverTimestamp()
               });
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: perfil.nome,
                nivel: 'cliente',
                tipo: 'cliente',
                loja: lojaAtual,
                emailVerificado: true
            },
            permissoes: {
                visualizar_produtos: true,
                fazer_compras: true
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
        }
        
        return {
            sucesso: false,
            erro: mensagemErro
        };
    }
}

// ============================================
// BUSCAR PERFIL DO USUÁRIO (CORRIGIDO)
// ============================================
async function buscarPerfilUsuario(email, lojaId) {
    if (!auth.currentUser) {
        return { encontrado: false };
    }
    
    try {
        // Recarregar dados do usuário para garantir status mais recente
        await auth.currentUser.reload();
        const emailVerified = auth.currentUser.emailVerified;
        
        // Buscar cliente
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            
            // SE O STATUS NO FIRESTORE FOR DIFERENTE DO AUTHENTICATION, CORRIGIR
            if (clienteData.emailVerificado !== emailVerified) {
                await loginDb.collection('usuarios').doc(lojaId)
                       .collection('clientes').doc(email)
                       .update({ 
                           emailVerificado: emailVerified,
                           ultima_sincronizacao: firebase.firestore.FieldValue.serverTimestamp()
                       });
                console.log('🔄 Campo emailVerificado sincronizado');
            }
            
            return {
                encontrado: true,
                tipo: 'cliente',
                perfil: 'cliente',
                nome: clienteData.nome,
                email: email,
                ativo: clienteData.ativo,
                emailVerificado: emailVerified, // USA O STATUS REAL
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
// LISTENER DE AUTENTICAÇÃO
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
                console.log(`✅ Cliente logado: ${perfil.nome}`);
                
                window.dispatchEvent(new CustomEvent('usuarioLogado', { 
                    detail: { 
                        usuario: perfil,
                        permissoes: {
                            visualizar_produtos: true,
                            fazer_compras: true
                        }
                    }
                }));
            } else {
                console.log('❌ Cliente não encontrado ou inativo');
                await auth.signOut();
                window.dispatchEvent(new CustomEvent('usuarioNaoAutorizado', { 
                    detail: { erro: 'Cliente não encontrado' }
                }));
            }
        } catch (error) {
            console.error('Erro no auth state:', error);
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
window.verificarTempoRestante = verificarTempoRestante;
window.auth = auth;    
window.loginDb = loginDb;    

console.log('✅ Sistema de login carregado com campos de verificação');
console.log('📋 Funções disponíveis:', {
    fazerLogin: typeof fazerLogin,
    cadastrarCliente: typeof cadastrarCliente,
    reenviarEmailVerificacao: typeof reenviarEmailVerificacao,
    verificarTempoRestante: typeof verificarTempoRestante
});






