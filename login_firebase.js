// ============================================
// login_firebase.js
// CONFIGURAÇÃO DO FIREBASE DE LOGIN - Projeto: lojasite-ba36f
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

// ============================================
// ATIVAR APP CHECK - VERSÃO CRÍTICA
// ============================================
console.log('🔒 Inicializando App Check (modo crítico)...');

// Verificar se o SDK do App Check foi carregado
if (typeof firebase.appCheck === 'undefined') {
    console.error('❌ Firebase App Check SDK não está carregado!');
    console.error('Verifique se o script firebase-app-check-compat.js foi incluído na página');
    
    const errorMessage = `
        ═══════════════════════════════════════
        🔴 ERRO DE SEGURANÇA - APP CHECK FALHOU
        ═══════════════════════════════════════
        
        📍 Erro: Firebase App Check SDK não carregado
        📍 Hora: ${new Date().toLocaleString()}
        📍 Página: ${window.location.href}
        
        O SDK do App Check não foi encontrado.
        Verifique se o script foi incluído corretamente:
        
        <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check-compat.js"></script>
        
        ⚠️ O sistema será interrompido por segurança.
    `;
    
    console.error(errorMessage);
    alert('🔒 ERRO DE SEGURANÇA: App Check SDK não carregado');
    
    // Interromper
    throw new Error('App Check SDK não carregado');
}

try {
    // Obter instância do App Check
    const appCheck = firebase.appCheck(loginApp);
    
    if (!appCheck) {
        throw new Error('Não foi possível obter instância do App Check');
    }
    
    // Verificar provedor
    if (typeof firebase.appCheck.ReCaptchaEnterpriseProvider !== 'function') {
        throw new Error('ReCaptchaEnterpriseProvider não disponível');
    }
    
    // Criar provedor
    const provider = new firebase.appCheck.ReCaptchaEnterpriseProvider(
        "6LdqQnUsAAAAAOnjtu0Avi_0WubZw0iYS20DjL6b"
    );
    
    // Ativar
    appCheck.activate(provider, true);
    
    console.log('✅ App Check ativado com sucesso!');
    
    // Testar token (opcional)
    setTimeout(async () => {
        try {
            const token = await appCheck.getToken();
            if (token && token.token) {
                console.log('✅ Token App Check obtido com sucesso');
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível obter token (pode ser normal no início)');
        }
    }, 2000);
    
} catch (error) {
    console.error('❌ ERRO FATAL NO APP CHECK:', error);
    
    const errorDetails = `
        ═══════════════════════════════════════
        🔴 ERRO DE SEGURANÇA - APP CHECK FALHOU
        ═══════════════════════════════════════
        
        📍 Erro: ${error.message}
        📍 Hora: ${new Date().toLocaleString()}
        📍 Página: ${window.location.href}
        
        O App Check é obrigatório para proteger o sistema
        contra acessos não autorizados.
        
        ⚠️ O sistema será interrompido por segurança.
    `;
    
    console.error(errorDetails);
    alert(errorDetails);
    
    // Interromper completamente
    throw error;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para extrair loja da URL
function getLojaDaURL() {
    const path = window.location.pathname;
    const match = path.match(/\/loja\/([^\/]+)\//);
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
            
            return {
                encontrado: true,
                tipo: 'admin',
                perfil: 'admin',
                nome: adminCheck.dados.nome,
                email: email,
                ativo: adminCheck.dados.ativo,
                emailVerificado: true, // Sempre true para admin
                dados: adminCheck.dados
            };
        }
        
        // 🔥 SEGUNDO: VERIFICAR SE É FUNCIONÁRIO DA LOJA
        const funcDoc = await loginDb.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            console.log('✅ Usuário é FUNCIONÁRIO da loja:', funcData.perfil);
            
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: funcData.perfil, // 'gerente', 'supervisor', 'vendedor', 'admin'
                nome: funcData.nome,
                email: email,
                ativo: funcData.ativo,
                emailVerificado: true, // Sempre true para funcionários
                dados: funcData
            };
        }
        
        // 🔥 TERCEIRO: VERIFICAR SE É CLIENTE
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
                emailVerificado: true, // Sempre true - não precisa mais verificar
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
// FUNÇÃO PRINCIPAL DE LOGIN (SEM VALIDAÇÃO DE E-MAIL)
// ============================================
async function fazerLogin(email, senha) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // 🔥 REMOVIDA A VERIFICAÇÃO DE E-MAIL - LOGIN PERMITIDO DIRETAMENTE
        
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
                emailVerificado: true, // Sempre true
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
// CADASTRO DE CLIENTE (SEM ENVIO DE E-MAIL DE VERIFICAÇÃO)
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
        
        // 🔥 REMOVIDO O ENVIO DE E-MAIL DE VERIFICAÇÃO
        
        // 3. SALVAR NO FIRESTORE
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
            emailVerificado: true, // Sempre true agora
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            uid: user.uid
        };
        
        await loginDb.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set(dadosCliente);
        
        // 🔥 NÃO FAZER LOGOUT - usuário já pode acessar
        
        return {
            sucesso: true,
            precisaVerificar: false, // Não precisa mais verificar
            email: email,
            mensagem: `✅ Cadastro realizado com sucesso! Você já pode fazer login.`
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
// FUNÇÃO REENVIAR EMAIL (DESATIVADA - RETORNA ERRO CLARO)
// ============================================
async function reenviarEmailVerificacao(email) {
    // Função mantida para compatibilidade, mas não faz mais nada
    return { 
        sucesso: false, 
        erro: '⚠️ A verificação de e-mail não é mais necessária. Faça login diretamente.' 
    };
}

// ============================================
// FUNÇÃO VERIFICAR TEMPO RESTANTE (DESATIVADA)
// ============================================
async function verificarTempoRestante(email) {
    // Retorna que não precisa mais verificar
    return { 
        encontrado: true, 
        emailVerificado: true, 
        minutosRestantes: 0,
        expirado: false 
    };
}

// ============================================
// LOGOUT
// ============================================
async function fazerLogout() {
    try {
        // Limpar sessionStorage ao sair
        sessionStorage.removeItem('usuarioInfo');
        sessionStorage.removeItem('dadosUsuario'); // remover também o antigo por segurança
        
        await auth.signOut();
        return { sucesso: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { sucesso: false, erro: error.message };
    }
}

// ============================================
// FUNÇÃO PARA RECUPERAR INFORMAÇÕES BÁSICAS DO SESSIONSTORAGE
// ============================================
function getUsuarioInfo() {
    try {
        const info = sessionStorage.getItem('usuarioInfo');
        return info ? JSON.parse(info) : null;
    } catch (e) {
        console.warn('⚠️ Erro ao recuperar info do sessionStorage:', e);
        return null;
    }
}

// ============================================
// FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM PERMISSÃO (sempre verifica no Firebase)
// ============================================
async function verificarPermissao(acao, email, lojaId) {
    try {
        // Sempre buscar perfil atualizado no Firebase
        const perfil = await buscarPerfilUsuario(email, lojaId);
        
        if (!perfil.encontrado || !perfil.ativo) return false;
        
        // Lógica de permissões baseada no perfil
        if (acao === 'estoque') {
            return ['admin', 'gerente', 'supervisor', 'vendedor'].includes(perfil.perfil);
        }
        
        if (acao === 'relatorios') {
            return ['admin', 'gerente'].includes(perfil.perfil);
        }
        
        if (acao === 'gestao_logins') {
            return ['admin', 'gerente'].includes(perfil.perfil);
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
}

// ============================================
// LISTENER DE AUTENTICAÇÃO (SEM VALIDAÇÃO DE E-MAIL)
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('👤 Usuário autenticado:', user.email);
        
        // 🔥 REMOVIDA A VERIFICAÇÃO DE E-MAIL
        
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
                
                // 🔥 SALVAR DADOS DO USUÁRIO GLOBALMENTE (APENAS NA MEMÓRIA)
                window.dadosUsuario = perfil;
                window.usuarioLogado = true;
                
                // 🔥 ARMAZENAR APENAS INFORMAÇÕES NÃO SENSÍVEIS NO SESSIONSTORAGE
                try {
                    const infoBasica = {
                        nome: perfil.nome,
                        email: perfil.email,
                        tipo: perfil.tipo,
                        perfil: perfil.perfil,
                        loja: lojaAtual
                        // ⚠️ NÃO INCLUIR: uid, dados do Firebase, tokens, etc
                    };
                    sessionStorage.setItem('usuarioInfo', JSON.stringify(infoBasica));
                    
                    // Remover dados completos do sessionStorage por segurança
                    sessionStorage.removeItem('dadosUsuario');
                    
                    console.log('✅ Informações básicas salvas no sessionStorage');
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
        sessionStorage.removeItem('usuarioInfo');
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
window.getUsuarioInfo = getUsuarioInfo;
window.verificarPermissao = verificarPermissao;
window.auth = auth;    
window.loginDb = loginDb;    

console.log('✅ Sistema de login carregado (sem validação de e-mail)');
console.log('📋 Funções disponíveis:', {
    fazerLogin: typeof fazerLogin,
    cadastrarCliente: typeof cadastrarCliente,
    recuperarSenha: typeof recuperarSenha,
    reenviarEmailVerificacao: typeof reenviarEmailVerificacao,
    verificarPermissao: typeof verificarPermissao
});
