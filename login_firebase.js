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
    // Ex: /spdv/lojas/mj-materiais-construcao/
    const match = path.match(/\/lojas\/([^\/]+)\//);
    if (match && match[1]) {
        return match[1];
    }
    // Fallback para o nome da pasta atual
    const parts = path.split('/');
    const lojaFolder = parts[parts.length - 2];
    return lojaFolder || null;
}

// Verificar se a loja está ativa
async function verificarLojaAtiva(lojaId) {
    try {
        const lojaDoc = await db.collection('usuarios').doc(lojaId).get();
        
        if (!lojaDoc.exists) {
            return { 
                ativa: false, 
                erro: 'Loja não encontrada',
                dadosPublicos: getLojaConfig(lojaId)
            };
        }
        
        const lojaData = lojaDoc.data();
        const agora = new Date();
        const dataAtivacao = lojaData.data_ativacao?.toDate();
        const dataValidade = lojaData.data_validade?.toDate();
        
        // Verificar se está ativa
        if (lojaData.ativo === false) {
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

// Verificar se é ADMIN (documento na raiz da coleção usuarios)
async function verificarAdmin(email) {
    try {
        // Buscar documento 'admin' na coleção usuarios
        const adminDoc = await db.collection('usuarios').doc('admin').get();
        
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

// Função para buscar perfil do usuário na loja específica (usando EMAIL como ID)
async function buscarPerfilNaLoja(email, lojaId) {
    try {
        // Buscar na coleção de funcionários da loja usando EMAIL como ID do documento
        const userDoc = await db.collection('usuarios').doc(lojaId)
                               .collection('funcionarios').doc(email).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return {
                encontrado: true,
                tipo: 'funcionario',
                perfil: userData.perfil,
                nome: userData.nome,
                email: userData.email,
                ativo: userData.ativo,
                dados: userData
            };
        }
        
        // Se não for funcionário, buscar na coleção de clientes
        const clienteDoc = await db.collection('usuarios').doc(lojaId)
                                  .collection('clientes').doc(email).get();
        
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            return {
                encontrado: true,
                tipo: 'cliente',
                perfil: 'cliente',
                nome: clienteData.nome,
                email: clienteData.email,
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

// Função de login ATUALIZADA
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
        
        // PRIMEIRO: Verificar se é ADMIN (documento admin na raiz)
        const adminCheck = await verificarAdmin(email);
        
        if (adminCheck.isAdmin) {
            console.log('✅ Acesso admin concedido para:', email);
            
            // Admin tem acesso mesmo se a loja estiver inativa
            const lojaStatus = await verificarLojaAtiva(lojaAtual);
            
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
                lojaInfo: lojaStatus
            };
        }
        
        // Se não é admin, verificar status da loja
        const lojaStatus = await verificarLojaAtiva(lojaAtual);
        
        if (!lojaStatus.ativa) {
            await auth.signOut();
            return {
                sucesso: false,
                erro: lojaStatus.erro || 'Loja indisponível',
                lojaInfo: lojaStatus
            };
        }
        
        // Buscar perfil do usuário na loja específica (usando EMAIL)
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
        
        // Buscar permissões baseadas no perfil
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
            lojaInfo: lojaStatus
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
        
        // Verificar se a loja está ativa
        const lojaStatus = await verificarLojaAtiva(lojaAtual);
        if (!lojaStatus.ativa) {
            return {
                sucesso: false,
                erro: `Não é possível cadastrar: ${lojaStatus.erro}`
            };
        }
        
        // Criar usuário no Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const user = userCredential.user;
        
        // Atualizar perfil com nome
        await user.updateProfile({
            displayName: nome
        });
        
        // Salvar dados na coleção clientes da loja específica usando EMAIL como ID
        await db.collection('usuarios').doc(lojaAtual)
               .collection('clientes').doc(email).set({
            nome: nome,
            email: email,
            telefone: telefone,
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

// Buscar permissões por perfil
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
        
        // Permissões padrão baseadas no perfil
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
        
        // Verificar se é admin pelo email
        const adminCheck = await verificarAdmin(user.email);
        
        if (adminCheck.isAdmin) {
            const evento = new CustomEvent('usuarioLogado', { 
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
                    }
                }
            });
            window.dispatchEvent(evento);
            return;
        }
        
        // Verificar perfil na loja pelo email
        const perfil = await buscarPerfilNaLoja(user.email, lojaAtual);
        
        if (perfil.encontrado && perfil.ativo) {
            const permissoes = await buscarPermissoesPorPerfil(perfil.perfil);
            
            const evento = new CustomEvent('usuarioLogado', { 
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
                    permissoes: permissoes
                }
            });
            window.dispatchEvent(evento);
        } else {
            await auth.signOut();
            const evento = new CustomEvent('usuarioNaoAutorizado');
            window.dispatchEvent(evento);
        }
    } else {
        const evento = new CustomEvent('usuarioDeslogado');
        window.dispatchEvent(evento);
    }
});
