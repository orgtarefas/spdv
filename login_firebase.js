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
// FUNÇÃO PARA RECUPERAR SENHA
// ============================================
async function recuperarSenha(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return {
            sucesso: true,
            mensagem: `Link de redefinição enviado para ${email}`
        };
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        
        let mensagem = 'Erro ao enviar link de redefinição.';
        if (error.code === 'auth/user-not-found') {
            mensagem = 'E-mail não encontrado.';
        } else if (error.code === 'auth/invalid-email') {
            mensagem = 'E-mail inválido.';
        }
        
        return {
            sucesso: false,
            erro: mensagem
        };
    }
}

// ============================================
// FUNÇÃO PARA REENVIAR EMAIL DE VERIFICAÇÃO (SEM LOGIN)
// ============================================
async function reenviarEmailVerificacao(email) {
    try {
        const lojaAtual = getLojaDaURL();
        
        console.log(`📧 Reenviando email de verificação para: ${email}`);
        
        // 1️⃣ BUSCAR O UID DO USUÁRIO NO FIRESTORE
        const clienteQuery = await loginDb.collection('usuarios').doc(lojaAtual)
            .collection('clientes')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (clienteQuery.empty) {
            return { 
                sucesso: false, 
                erro: 'E-mail não encontrado. Faça um novo cadastro.' 
            };
        }
        
        const clienteData = clienteQuery.docs[0].data();
        const uid = clienteData.uid;
        
        if (!uid) {
            return { 
                sucesso: false, 
                erro: 'UID do usuário não encontrado.' 
            };
        }
        
        console.log(`✅ UID encontrado: ${uid}`);
        
        // 2️⃣ OBTER TOKEN DO APP CHECK
        let appCheckToken = null;
        try {
            const appCheck = loginApp.appCheck();
            const tokenResult = await appCheck.getToken();
            appCheckToken = tokenResult.token;
            console.log('✅ Token App Check obtido');
        } catch (tokenError) {
            console.error('Erro ao obter token App Check:', tokenError);
        }
        
        // 3️⃣ CHAMAR A API REST DO FIREBASE
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (appCheckToken) {
            headers['X-Firebase-AppCheck'] = appCheckToken;
        }
        
        // IMPORTANTE: Para reenviar email de verificação sem estar logado,
        // precisamos usar o endpoint com o localId (UID)
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${loginFirebaseConfig.apiKey}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                requestType: 'VERIFY_EMAIL',
                email: email,
                continueUrl: window.location.href
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Erro na API:', data);
            
            if (data.error?.message === 'EMAIL_NOT_FOUND') {
                return { 
                    sucesso: false, 
                    erro: 'E-mail não encontrado no sistema.' 
                };
            }
            
            if (data.error?.message === 'INVALID_EMAIL') {
                return { 
                    sucesso: false, 
                    erro: 'E-mail inválido.' 
                };
            }
            
            return { 
                sucesso: false, 
                erro: data.error?.message || 'Erro ao reenviar e-mail' 
            };
        }
        
        // 4️⃣ ATUALIZAR O TIMESTAMP NO FIRESTORE
        await clienteQuery.docs[0].ref.update({
            ultimo_envio_email_valida: firebase.firestore.FieldValue.serverTimestamp(),
            contador_envios: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log('✅ Email reenviado e timestamp atualizado');
        
        return { 
            sucesso: true,
            mensagem: 'E-mail de verificação reenviado! Verifique sua caixa de entrada e spam.'
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
            // REENVIAR EMAIL AUTOMATICAMENTE
            try {
                await user.sendEmailVerification();
                console.log('📧 Novo email de verificação enviado para:', email);
                
                // ATUALIZAR O TIMESTAMP NO FIRESTORE
                const lojaAtual = getLojaDaURL();
                await loginDb.collection('usuarios').doc(lojaAtual)
                       .collection('clientes').doc(email)
                       .update({
                           ultimo_envio_email_valida: firebase.firestore.FieldValue.serverTimestamp()
                       });
                
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
        
        // BUSCAR PERFIL DO USUÁRIO NO FIRESTORE
        const clienteDoc = await loginDb.collection('usuarios').doc(lojaAtual)
                               .collection('clientes').doc(email).get();
        
        if (!clienteDoc.exists) {
            // ISSO NÃO DEVERIA ACONTECER SE O FLUXO ESTIVER CORRETO
            // MAS VAMOS TRATAR COMO ERRO GENÉRICO
            await auth.signOut();
            return {
                sucesso: false,
                erro: `❌ Erro inesperado. Por favor, faça um novo cadastro.`
            };
        }
        
        const clienteData = clienteDoc.data();
        
        if (clienteData.ativo === false) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: `❌ Usuário ${email} está inativo. Entre em contato com o suporte.`
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
                nome: clienteData.nome,
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
        
        // TRATAMENTO PARA CREDENCIAIS INVÁLIDAS (EMAIL OU SENHA INCORRETOS)
        if (error.code === 'auth/invalid-credential') {
            
            // Verificar se o email existe no Firestore
            try {
                const lojaAtual = getLojaDaURL();
                const clienteQuery = await loginDb.collection('usuarios').doc(lojaAtual)
                    .collection('clientes')
                    .where('email', '==', email)
                    .limit(1)
                    .get();
                
                if (clienteQuery.empty) {
                    // EMAIL NÃO EXISTE NO FIRESTORE
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











