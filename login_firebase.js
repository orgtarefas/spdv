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
// FUNÇÃO PRINCIPAL DE LOGIN (MODIFICADA)
// ============================================
async function fazerLogin(email, senha) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // VERIFICAR SE O EMAIL FOI VERIFICADO
        if (!user.emailVerified) {
            // REENVIAR EMAIL AUTOMATICAMENTE
            let emailReenviado = false;
            try {
                await user.sendEmailVerification();
                emailReenviado = true;
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
            
            // MENSAGEM PERSONALIZADA
            const mensagem = emailReenviado 
                ? `❌ Login não realizado: e-mail ainda não verificado.\n\n📧 Reenviamos um novo e-mail de validação para:\n${email}\n\nPor favor, verifique sua caixa de entrada (e spam) e clique no link de verificação antes de tentar logar novamente.`
                : `❌ Login não realizado: e-mail ainda não verificado.\n\nEntre em contato com o suporte para reenviar o link de verificação.`;
            
            return {
                sucesso: false,
                precisaVerificar: true,
                email: email,
                emailReenviado: emailReenviado,
                erro: mensagem
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








