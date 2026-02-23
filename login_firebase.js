// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAYPjEB8cT-mOmLaXJMXAsoP2l3YotY2WQ",
    authDomain: "lojasite-ba36f.firebaseapp.com",
    projectId: "lojasite-ba36f",
    storageBucket: "lojasite-ba36f.firebasestorage.app",
    messagingSenderId: "1083157739430",
    appId: "1:1083157739430:web:5ed2d4261434c73a9e4167"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Função para extrair loja da URL
function getLojaDaURL() {
    const path = window.location.pathname;
    const match = path.match(/\/lojas\/([^\/]+)\//);
    if (match && match[1]) {
        return match[1];
    }
    // Fallback para desenvolvimento local ou página direta
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('loja') || null;
}

// Função para verificar se a loja está ativa e dentro da validade (dados do Firebase)
async function verificarLojaAtiva(lojaId) {
    try {
        const lojaDoc = await db.collection('lojas').doc(lojaId).get();
        
        if (!lojaDoc.exists) {
            return { 
                ativa: false, 
                erro: 'Loja não encontrada no Firebase',
                dadosPublicos: getLojaConfig(lojaId) // Pega dados públicos do novo_lojas.js
            };
        }
        
        const lojaData = lojaDoc.data();
        const agora = new Date();
        const dataAtivacao = lojaData.data_ativacao?.toDate();
        const dataValidade = lojaData.data_validade?.toDate();
        
        // Verificar se está ativa
        if (!lojaData.ativo) {
            return { 
                ativa: false, 
                erro: 'Loja inativa',
                dados: lojaData,
                dadosPublicos: getLojaConfig(lojaId)
            };
        }
        
        // Verificar data de ativação
        if (dataAtivacao && agora < dataAtivacao) {
            return { 
                ativa: false, 
                erro: 'Loja ainda não ativada',
                dados: lojaData,
                dadosPublicos: getLojaConfig(lojaId)
            };
        }
        
        // Verificar data de validade
        if (dataValidade && agora > dataValidade) {
            return { 
                ativa: false, 
                erro: 'Período de acesso expirado',
                dados: lojaData,
                dadosPublicos: getLojaConfig(lojaId)
            };
        }
        
        return { 
            ativa: true, 
            dados: lojaData,
            dadosPublicos: getLojaConfig(lojaId)
        };
    } catch (error) {
        console.error('Erro ao verificar loja:', error);
        return { 
            ativa: false, 
            erro: 'Erro ao verificar loja',
            dadosPublicos: getLojaConfig(lojaId)
        };
    }
}

// Função para verificar se usuário tem acesso à loja
async function verificarAcessoLoja(userId, lojaId) {
    try {
        // Primeiro verificar se é ADMIN (acesso global)
        const adminDoc = await db.collection('configuracoes').doc('administradores').get();
        const admins = adminDoc.exists ? adminDoc.data().usuarios || [] : [];
        
        if (admins.includes(userId)) {
            const userDoc = await db.collection('usuarios').doc(userId).get();
            return { 
                permitido: true, 
                nivel: 'admin',
                dados: userDoc.exists ? userDoc.data() : { email: (await auth.currentUser)?.email }
            };
        }
        
        // Verificar se a loja existe e está ativa no Firebase
        const lojaStatus = await verificarLojaAtiva(lojaId);
        if (!lojaStatus.ativa) {
            return { 
                permitido: false, 
                nivel: null,
                erro: lojaStatus.erro,
                lojaInfo: lojaStatus
            };
        }
        
        // Verificar se é funcionário da loja específica
        const funcionarioDoc = await db.collection('lojas').doc(lojaId).collection('funcionarios').doc(userId).get();
        
        if (funcionarioDoc.exists) {
            const funcionarioData = funcionarioDoc.data();
            
            // Verificar se funcionário está ativo
            if (funcionarioData.status === 'inativo') {
                return { 
                    permitido: false, 
                    nivel: null,
                    erro: 'Funcionário inativo',
                    lojaInfo: lojaStatus
                };
            }
            
            return { 
                permitido: true, 
                nivel: funcionarioData.nivel,
                dados: {
                    ...funcionarioData,
                    loja_nome: lojaStatus.dadosPublicos?.nome || lojaStatus.dados?.nome || lojaId,
                    loja_contato: lojaStatus.dadosPublicos?.contato
                },
                lojaInfo: lojaStatus
            };
        }
        
        // Verificar se é cliente da loja específica
        const clienteDoc = await db.collection('lojas').doc(lojaId).collection('clientes').doc(userId).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            
            // Verificar se cliente está ativo
            if (clienteData.status === 'inativo') {
                return { 
                    permitido: false, 
                    nivel: null,
                    erro: 'Cliente inativo',
                    lojaInfo: lojaStatus
                };
            }
            
            return { 
                permitido: true, 
                nivel: 'cliente',
                dados: {
                    ...clienteData,
                    loja_nome: lojaStatus.dadosPublicos?.nome || lojaStatus.dados?.nome || lojaId,
                    loja_contato: lojaStatus.dadosPublicos?.contato
                },
                lojaInfo: lojaStatus
            };
        }
        
        return { 
            permitido: false, 
            nivel: null, 
            erro: 'Usuário não cadastrado nesta loja',
            lojaInfo: lojaStatus
        };
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return { permitido: false, nivel: null, erro: error.message };
    }
}

// Função de login
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
        
        // Verificar acesso à loja
        const acesso = await verificarAcessoLoja(user.uid, lojaAtual);
        
        if (acesso.permitido) {
            // Atualizar último acesso
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            if (acesso.nivel === 'admin') {
                await db.collection('usuarios').doc(user.uid).set({
                    email: user.email,
                    nome: user.displayName || 'Administrador',
                    nivel: 'admin',
                    ultimoAcesso: timestamp,
                    loja_atual: lojaAtual
                }, { merge: true });
            } else {
                const collection = acesso.nivel === 'cliente' ? 'clientes' : 'funcionarios';
                await db.collection('lojas').doc(lojaAtual).collection(collection).doc(user.uid).update({
                    ultimoAcesso: timestamp
                });
            }
            
            return {
                sucesso: true,
                usuario: {
                    uid: user.uid,
                    email: user.email,
                    nome: user.displayName || acesso.dados?.nome,
                    nivel: acesso.nivel,
                    loja: lojaAtual,
                    loja_nome: acesso.dados?.loja_nome,
                    loja_contato: acesso.dados?.loja_contato,
                    dados: acesso.dados
                },
                lojaInfo: acesso.lojaInfo
            };
        } else {
            // Se não tem acesso, fazer logout
            await auth.signOut();
            return {
                sucesso: false,
                erro: acesso.erro || 'Usuário não tem permissão para acessar esta loja',
                lojaInfo: acesso.lojaInfo
            };
        }
    } catch (error) {
        console.error('Erro no login:', error);
        
        // Tratar erros específicos do Firebase Auth
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

// Função de cadastro de cliente
async function cadastrarCliente(nome, email, senha, telefone) {
    try {
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            return {
                sucesso: false,
                erro: 'URL inválida - Loja não identificada'
            };
        }
        
        // Verificar se a loja está ativa para permitir cadastro
        const lojaStatus = await verificarLojaAtiva(lojaAtual);
        if (!lojaStatus.ativa) {
            return {
                sucesso: false,
                erro: `Não é possível cadastrar: ${lojaStatus.erro}`
            };
        }
        
        // Buscar imgbb_api_key do Firebase (dado sensível)
        const imgbbKey = lojaStatus.dados?.imgbb_api_key || null;
        
        // Criar usuário no Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // Atualizar perfil com nome
        await user.updateProfile({
            displayName: nome
        });
        
        // Salvar dados no Firestore dentro da coleção clientes da loja específica
        await db.collection('lojas').doc(lojaAtual).collection('clientes').doc(user.uid).set({
            nome: nome,
            email: email,
            telefone: telefone,
            nivel: 'cliente',
            loja: lojaAtual,
            dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
            ultimoAcesso: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'ativo'
        });
        
        return {
            sucesso: true,
            usuario: {
                uid: user.uid,
                email: user.email,
                nome: nome,
                nivel: 'cliente',
                loja: lojaAtual,
                loja_nome: lojaStatus.dadosPublicos?.nome || lojaAtual,
                loja_contato: lojaStatus.dadosPublicos?.contato
            },
            imgbb_api_key: imgbbKey // Retorna a chave se disponível (para uso posterior)
        };
    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        // Tratar erros específicos
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

// Função para buscar permissões do usuário no Firebase
async function buscarPermissoesUsuario(usuario) {
    try {
        if (usuario.nivel === 'admin') {
            // Admin tem todas as permissões
            const permissoesDoc = await db.collection('configuracoes').doc('permissoes_admin').get();
            return permissoesDoc.exists ? permissoesDoc.data() : { todas: true };
        }
        
        // Buscar permissões baseadas no nível do usuário
        const permissoesDoc = await db.collection('configuracoes').doc('permissoes_niveis').get();
        
        if (permissoesDoc.exists) {
            const permissoes = permissoesDoc.data();
            return permissoes[usuario.nivel] || {};
        }
        
        return {};
    } catch (error) {
        console.error('Erro ao buscar permissões:', error);
        return {};
    }
}

// Função para fazer logout
async function fazerLogout() {
    try {
        await auth.signOut();
        return { sucesso: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return { sucesso: false, erro: error.message };
    }
}

// Listener para mudanças no estado de autenticação
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const lojaAtual = getLojaDaURL();
        
        if (!lojaAtual) {
            await auth.signOut();
            const evento = new CustomEvent('erroLoja', { 
                detail: { erro: 'URL inválida - Loja não identificada' }
            });
            window.dispatchEvent(evento);
            return;
        }
        
        const acesso = await verificarAcessoLoja(user.uid, lojaAtual);
        
        if (acesso.permitido) {
            const usuarioInfo = {
                uid: user.uid,
                email: user.email,
                nome: user.displayName || acesso.dados?.nome,
                nivel: acesso.nivel,
                loja: lojaAtual,
                loja_nome: acesso.dados?.loja_nome,
                loja_contato: acesso.dados?.loja_contato,
                dados: acesso.dados
            };
            
            // Buscar permissões
            const permissoes = await buscarPermissoesUsuario(usuarioInfo);
            
            // Disparar evento personalizado com dados do usuário e permissões
            const evento = new CustomEvent('usuarioLogado', { 
                detail: {
                    usuario: usuarioInfo,
                    permissoes: permissoes,
                    lojaInfo: acesso.lojaInfo
                }
            });
            window.dispatchEvent(evento);
        } else {
            await auth.signOut();
            const evento = new CustomEvent('usuarioNaoAutorizado', { 
                detail: { 
                    erro: acesso.erro,
                    lojaInfo: acesso.lojaInfo
                }
            });
            window.dispatchEvent(evento);
        }
    } else {
        const evento = new CustomEvent('usuarioDeslogado');
        window.dispatchEvent(evento);
    }
});