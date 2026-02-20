// clientes.js - Tela de Exposição de Produtos para Clientes
console.log("🛒 Sistema PDV - Loja para Clientes");

import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    serverTimestamp,
    query,           
    where           
} from './firebase_config.js';

import { lojaServices } from './firebase_config.js';
import { getLojaConfig } from '/spdv/lojas.js';

// ============================================
// CONSTANTES GLOBAIS
// ============================================
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=";

// Placeholder de logo em SVG (caso a imagem não exista)
const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E🏪%3C/text%3E%3C/svg%3E";

let produtos = [];
let categorias = [];
let carrinho = [];
let clienteLogado = false;
let dadosCliente = null;
let swiperInstance = null;
let lojaIdAtual = null;

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID DA URL
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    console.log('📌 Pathname atual:', pathname);
    
    // Padrão: /spdv/lojas/[loja-id]/clientes.html
    const match = pathname.match(/\/spdv\/lojas\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    // Fallback: usar o lojaServices se disponível
    if (lojaServices && lojaServices.lojaId) {
        lojaIdAtual = lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// FUNÇÃO PARA OBTER PLACEHOLDER
// ============================================
function getPlaceholderIcon() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E🏪%3C/text%3E%3C/svg%3E";
}

// ============================================
// FUNÇÃO PARA ABRIR MODAL (CORRIGIDA)
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        // Garantir que o estilo display não interfira
        modal.style.display = '';
        console.log(`✅ Modal ${modalId} aberto`);
    } else {
        console.error(`❌ Modal ${modalId} não encontrado`);
    }
}

// ============================================
// FUNÇÃO PARA FECHAR MODAL (CORRIGIDA)
// ============================================
window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Garantir que o estilo display não interfira
        modal.style.display = '';
        console.log(`✅ Modal ${modalId} fechado`);
        
        // Se for o modal de consulta, desativar scan
        if (modalId === 'quickSearchModal' && window.gerenciadorCodigoBarrasClientes) {
            window.gerenciadorCodigoBarrasClientes.desativarModoScan();
        }
    }
};

// ============================================
// FUNÇÃO PARA ABRIR MODAL DE CONSULTA (CORRIGIDA)
// ============================================
function abrirModalConsulta() {
    const modal = document.getElementById('quickSearchModal');
    const searchInput = document.getElementById('searchProductInputModal');
    
    if (modal) {
        modal.classList.add('active');
        modal.style.display = '';
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        // Mostrar todos os produtos
        exibirTodosProdutosNoModal();
        console.log('✅ Modal de consulta aberto');
    } else {
        console.error('❌ Modal de consulta não encontrado');
    }
}

// ============================================
// FUNÇÃO PARA OBTER CAMINHO DA LOGO
// ============================================
function getCaminhoLogo(lojaId) {
    if (!lojaId) return LOGO_PLACEHOLDER;
    return `/spdv/imagens/${lojaId}/logo.png`;
}

// ============================================
// FUNÇÃO PARA RENDERIZAR CHAT
// ============================================
function renderizarChat() {
    const footerChat = document.querySelector('.footer-chat');
    if (!footerChat) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `/spdv/imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    footerChat.innerHTML = `
        <div class="chat-container">
            <div class="chat-icon-large">
                <img src="${basePath}chat.png" alt="Chat" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="chat-button" id="chatButton">
                Chat Online
            </div>
        </div>
    `;
    
    configurarChat();
}

// ============================================
// INICIALIZAR CARROSSEL DE CATEGORIAS
// ============================================
function inicializarCarrosselCategorias() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    const categoriesSwiper = new Swiper('.categories-swiper', {
        slidesPerView: 2,
        spaceBetween: 10,
        loop: true,
        navigation: {
            prevEl: '#categoriesPrev',
            nextEl: '#categoriesNext',
        },
        breakpoints: {
            480: {
                slidesPerView: 3,
                spaceBetween: 12,
            },
            640: {
                slidesPerView: 4,
                spaceBetween: 15,
            },
            768: {
                slidesPerView: 5,
                spaceBetween: 15,
            },
            1024: {
                slidesPerView: 6,
                spaceBetween: 18,
            },
            1280: {
                slidesPerView: 7,
                spaceBetween: 20,
            }
        }
    });
    
    console.log('✅ Carrossel de categorias inicializado');
    return categoriesSwiper;
}

// ============================================
// FUNÇÃO PARA CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) {
        console.log('ℹ️ Usando logo placeholder (loja não identificada)');
        logoImg.src = getPlaceholderIcon();
        return;
    }
    
    const logoPath = `/spdv/imagens/${lojaId}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
        
        const footerLogo = document.getElementById('footerLogo');
        if (footerLogo) footerLogo.src = logoPath;
    };
    
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada em ${logoPath}, usando placeholder`);
        logoImg.src = getPlaceholderIcon();
        
        const footerLogo = document.getElementById('footerLogo');
        if (footerLogo) footerLogo.src = getPlaceholderIcon();
    };
    
    testImg.src = logoPath;
}

// ============================================
// CLASSE: GerenciadorCodigoBarrasClientes
// ============================================
class GerenciadorCodigoBarrasClientes {
    iniciarEscuta() {
        console.log('📷 Iniciando sistema de código de barras para clientes');
        
        const searchInput = document.getElementById('searchProductInput');
        if (!searchInput) return;
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') {
                if (searchInput.value.length === 13) {
                    searchInput.value = '';
                }
            }
        });
        
        searchInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            
            if (this.value.length > 13) {
                this.value = this.value.slice(0, 13);
            }
            
            if (this.value.length === 13) {
                console.log('🎯 13 dígitos! Buscando produto...');
                buscarProdutoPorCodigo(this.value);
            }
            
            if (this.value.length > 2) {
                filtrarProdutosPorBusca(this.value);
            } else if (this.value.length === 0) {
                carregarProdutosDestaque();
            }
        });
        
        searchInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const texto = e.clipboardData.getData('text');
            let apenasNumeros = texto.replace(/[^0-9]/g, '');
            
            if (apenasNumeros.length > 13) {
                apenasNumeros = apenasNumeros.slice(0, 13);
            }
            
            searchInput.value = apenasNumeros;
            
            if (apenasNumeros.length === 13) {
                buscarProdutoPorCodigo(searchInput.value);
            } else if (apenasNumeros.length > 2) {
                filtrarProdutosPorBusca(apenasNumeros);
            }
        });
        
        console.log('✅ Sistema de código de barras com controle total!');
    }

    ativarModoScan() {
        const modal = document.getElementById('quickSearchModal');
        const searchInput = document.getElementById('searchProductInputModal');
        
        if (!modal || !modal.classList.contains('active') || !searchInput) {
            mostrarMensagem('📷 Abra a consulta rápida para ler códigos', 'info', 3000);
            return;
        }
        
        searchInput.value = '';
        searchInput.focus();
        searchInput.placeholder = '📷 Aguardando código de barras...';
        searchInput.style.borderColor = '#e74c3c';
        searchInput.style.backgroundColor = '#fff5f5';
        
        const scanIndicator = document.getElementById('scanIndicatorModal');
        if (scanIndicator) scanIndicator.style.display = 'flex';
        
        const btnScan = document.getElementById('btnScanCodeModal');
        if (btnScan) btnScan.classList.add('active');
        
        mostrarMensagem('📷 Modo scan ativado!', 'info', 2000);
    }

    desativarModoScan() {
        const searchInput = document.getElementById('searchProductInputModal');
        
        if (searchInput) {
            searchInput.placeholder = 'Código, nome ou categoria do produto';
            searchInput.style.borderColor = '';
            searchInput.style.backgroundColor = '';
        }
        
        const scanIndicator = document.getElementById('scanIndicatorModal');
        if (scanIndicator) scanIndicator.style.display = 'none';
        
        const btnScan = document.getElementById('btnScanCodeModal');
        if (btnScan) btnScan.classList.remove('active');
    }
}

let gerenciadorCodigoBarrasClientes = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página clientes carregada");
    
    mostrarLoading('Carregando loja...');
    
    try {
        extrairLojaIdDaURL();
        
        const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
        
        if (!lojaId) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            setTimeout(() => {
                window.location.href = '../../../login.html';
            }, 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaId}`);
        
        await carregarDadosLojaFirebase();
        carregarLogoLoja();
        carregarConfigLoja();
        
        gerenciadorCodigoBarrasClientes = new GerenciadorCodigoBarrasClientes();
        window.gerenciadorCodigoBarrasClientes = gerenciadorCodigoBarrasClientes;
        gerenciadorCodigoBarrasClientes.iniciarEscuta();
        
        await verificarSessaoCliente();
        configurarEventos();
        
        await carregarProdutos();
        await carregarCategorias();
        await carregarProdutosDestaque();
        
        carregarCarrinhoStorage();
        
        esconderLoading();
        console.log("✅ Loja clientes pronta!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar loja', 'error');
        esconderLoading();
    }
});

// ============================================
// CARREGAR CONFIGURAÇÃO DA LOJA
// ============================================
function carregarConfigLoja() {
    try {
        const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
        
        if (!lojaId) {
            console.warn('⚠️ ID da loja não disponível para carregar configuração');
            return;
        }
        
        const config = getLojaConfig(lojaId);
        console.log(`📋 Configuração da loja ${lojaId}:`, config);
        
    } catch (error) {
        console.error('❌ Erro ao carregar config da loja:', error);
    }
}

// ============================================
// VERIFICAR SESSÃO DO CLIENTE
// ============================================
async function verificarSessaoCliente() {
    const sessao = sessionStorage.getItem('cliente_logado');
    
    if (sessao) {
        try {
            const dados = JSON.parse(sessao);
            
            clienteLogado = true;
            dadosCliente = dados;
            
            const userName = document.getElementById('userName');
            const btnLogout = document.getElementById('btnLogout');
            const btnLogin = document.getElementById('btnLogin');
            
            if (userName) userName.textContent = dados.nome || dados.login || 'Cliente';
            if (btnLogout) btnLogout.style.display = 'inline-flex';
            if (btnLogin) btnLogin.style.display = 'none';
            
            console.log('✅ Cliente logado:', dados.nome || dados.login);
            
        } catch (e) {
            console.error('Erro ao ler sessão:', e);
            sessionStorage.removeItem('cliente_logado');
        }
    }
}

// ============================================
// VALIDAR LOGIN DO CLIENTE NO FIREBASE
// ============================================
async function validarLoginCliente(login, senha) {
    try {
        console.log(`🔍 Validando login do cliente: ${login} na loja ${lojaServices.lojaId}`);
        
        if (!db) {
            throw new Error('Banco de dados não inicializado');
        }
        
        const loginLojaRef = doc(db, "logins", lojaServices.lojaId);
        const loginLojaDoc = await getDoc(loginLojaRef);
        
        if (!loginLojaDoc.exists()) {
            console.log(`❌ Documento de login da loja não encontrado: ${lojaServices.lojaId}`);
            return { success: false, message: "Loja não configurada para clientes" };
        }
        
        const clientesRef = collection(db, "logins", lojaServices.lojaId, "clientes");
        const clientesSnapshot = await getDocs(clientesRef);
        
        let clienteEncontrado = null;
        let clienteId = null;
        
        clientesSnapshot.forEach((doc) => {
            const dados = doc.data();
            if (dados.login === login) {
                clienteEncontrado = dados;
                clienteId = doc.id;
            }
        });
        
        if (!clienteEncontrado) {
            console.log(`❌ Cliente não encontrado: ${login}`);
            return { success: false, message: "Login ou senha incorretos" };
        }
        
        if (clienteEncontrado.ativo === false) {
            console.log(`❌ Cliente inativo: ${login}`);
            return { success: false, message: "Cliente inativo. Entre em contato com a loja." };
        }
        
        if (clienteEncontrado.senha !== senha) {
            console.log(`❌ Senha incorreta para: ${login}`);
            return { success: false, message: "Login ou senha incorretos" };
        }
        
        const dadosCliente = {
            id: clienteId,
            login: clienteEncontrado.login,
            nome: clienteEncontrado.nome || clienteEncontrado.login,
            email: clienteEncontrado.email || '',
            telefone: clienteEncontrado.telefone || '',
            cpf: clienteEncontrado.cpf || '',
            endereco: clienteEncontrado.endereco || '',
            cidade: clienteEncontrado.cidade || '',
            cep: clienteEncontrado.cep || '',
            data_login: new Date().toISOString()
        };
        
        return { 
            success: true, 
            data: dadosCliente
        };
        
    } catch (error) {
        console.error("❌ Erro ao validar login do cliente:", error);
        return { 
            success: false, 
            message: "Erro de conexão com o servidor" 
        };
    }
}

// ============================================
// CADASTRAR NOVO CLIENTE
// ============================================
async function cadastrarCliente(dados) {
    try {
        console.log(`📝 Cadastrando novo cliente: ${dados.login}`);
        
        if (!db) {
            throw new Error('Banco de dados não inicializado');
        }
        
        const clientesRef = collection(db, "logins", lojaServices.lojaId, "clientes");
        const clientesSnapshot = await getDocs(clientesRef);
        let loginExiste = false;
        
        clientesSnapshot.forEach((doc) => {
            const dadosCliente = doc.data();
            if (dadosCliente.login === dados.login) {
                loginExiste = true;
            }
        });
        
        if (loginExiste) {
            return { success: false, message: "Este login já está em uso" };
        }
        
        if (dados.cpf) {
            let cpfExiste = false;
            clientesSnapshot.forEach((doc) => {
                const dadosCliente = doc.data();
                if (dadosCliente.cpf === dados.cpf) {
                    cpfExiste = true;
                }
            });
            
            if (cpfExiste) {
                return { success: false, message: "Este CPF já está cadastrado" };
            }
        }
        
        if (dados.email) {
            let emailExiste = false;
            clientesSnapshot.forEach((doc) => {
                const dadosCliente = doc.data();
                if (dadosCliente.email === dados.email) {
                    emailExiste = true;
                }
            });
            
            if (emailExiste) {
                return { success: false, message: "Este e-mail já está cadastrado" };
            }
        }
        
        const novoClienteRef = doc(clientesRef);
        
        const dadosCliente = {
            ...dados,
            id: novoClienteRef.id,
            ativo: true,
            data_cadastro: serverTimestamp(),
            data_atualizacao: serverTimestamp(),
            data_validade: new Date('2030-12-31'),
            perfil: 'cliente'
        };
        
        await setDoc(novoClienteRef, dadosCliente);
        
        console.log(`✅ Cliente cadastrado com ID: ${novoClienteRef.id}`);
        
        return { 
            success: true, 
            data: { ...dadosCliente, id: novoClienteRef.id } 
        };
        
    } catch (error) {
        console.error("❌ Erro ao cadastrar cliente:", error);
        return { 
            success: false, 
            message: "Erro ao cadastrar. Tente novamente." 
        };
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            abrirModal('loginModal');
        });
    }
    
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Deseja realmente sair?')) {
                sessionStorage.removeItem('cliente_logado');
                clienteLogado = false;
                dadosCliente = null;
                
                const userName = document.getElementById('userName');
                if (userName) userName.textContent = 'Visitante';
                
                btnLogout.style.display = 'none';
                if (btnLogin) btnLogin.style.display = 'inline-flex';
                
                mostrarMensagem('Você saiu da sua conta', 'info');
            }
        });
    }
    
    const btnGoToCart = document.getElementById('btnGoToCart');
    if (btnGoToCart) {
        btnGoToCart.addEventListener('click', () => {
            if (!clienteLogado) {
                mostrarMensagem('Você precisa estar logado para ir ao carrinho', 'warning');
                abrirModal('loginModal');
                return;
            }
            window.location.href = 'venda.html';
        });
    }
    
    const btnScanCode = document.getElementById('btnScanCode');
    if (btnScanCode) {
        btnScanCode.addEventListener('click', () => {
            abrirModalConsulta();
        });
    }
    
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (swiperInstance) {
                swiperInstance.slidePrev();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (swiperInstance) {
                swiperInstance.slideNext();
            }
        });
    }
    
    const btnConfirmarLogin = document.getElementById('btnConfirmarLogin');
    if (btnConfirmarLogin) {
        btnConfirmarLogin.addEventListener('click', fazerLoginCliente);
    }
    
    const loginSenha = document.getElementById('loginSenha');
    if (loginSenha) {
        loginSenha.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fazerLoginCliente();
            }
        });
    }
    
    const forgotPassword = document.getElementById('forgotPasswordCliente');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarMensagem('Entre em contato com a loja para recuperar sua senha', 'info');
        });
    }
    
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        const cadastroLink = document.createElement('div');
        cadastroLink.className = 'cadastro-link';
        cadastroLink.innerHTML = `
            <p>Não tem uma conta? 
                <a href="#" id="btnIrCadastro">Cadastre-se</a>
            </p>
        `;
        loginForm.appendChild(cadastroLink);
        
        document.getElementById('btnIrCadastro').addEventListener('click', (e) => {
            e.preventDefault();
            fecharModal('loginModal');
            abrirModal('cadastroModal');
        });
    }
    
    const btnConfirmarCadastro = document.getElementById('btnConfirmarCadastro');
    if (btnConfirmarCadastro) {
        btnConfirmarCadastro.addEventListener('click', fazerCadastroCliente);
    }
    
    const cadastroTelefone = document.getElementById('cadastroTelefone');
    if (cadastroTelefone) {
        cadastroTelefone.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .slice(0, 15);
        });
    }
    
    const cadastroCpf = document.getElementById('cadastroCpf');
    if (cadastroCpf) {
        cadastroCpf.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '')
                .replace(/^(\d{3})(\d)/g, '$1.$2')
                .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1-$2')
                .slice(0, 14);
        });
    }
    
    const cadastroCep = document.getElementById('cadastroCep');
    if (cadastroCep) {
        cadastroCep.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '')
                .replace(/^(\d{5})(\d)/g, '$1-$2')
                .slice(0, 9);
        });
    }
    
    configurarModalConsulta();
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            abrirModalConsulta();
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('quickSearchModal');
            if (modal && modal.classList.contains('active')) {
                fecharModal('quickSearchModal');
            }
        }
    });
    
    window.addEventListener('resize', () => {
        if (swiperInstance) {
            swiperInstance.update();
        }
    });
    
    console.log("✅ Eventos configurados");
}

// ============================================
// CONFIGURAR MODAL DE CONSULTA (CORRIGIDO)
// ============================================
function configurarModalConsulta() {
    const modalConsulta = document.getElementById('quickSearchModal');
    if (!modalConsulta) return;
    
    const modalClose = modalConsulta.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            fecharModal('quickSearchModal');
        });
    }
    
    modalConsulta.addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModal('quickSearchModal');
        }
    });
    
    const searchClearModal = document.getElementById('searchClearModal');
    if (searchClearModal) {
        searchClearModal.addEventListener('click', () => {
            const input = document.getElementById('searchProductInputModal');
            if (input) {
                input.value = '';
                input.focus();
                document.getElementById('searchResultsModal').innerHTML = `
                    <div class="empty-results">
                        <i class="fas fa-search"></i>
                        <p>Digite para buscar um produto</p>
                        <small>Busque por código, nome ou categoria</small>
                    </div>
                `;
            }
        });
    }
    
    const btnScanCodeModal = document.getElementById('btnScanCodeModal');
    if (btnScanCodeModal) {
        btnScanCodeModal.addEventListener('click', function() {
            const searchInput = document.getElementById('searchProductInputModal');
            if (searchInput) searchInput.value = '';
            
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                if (window.gerenciadorCodigoBarrasClientes) {
                    window.gerenciadorCodigoBarrasClientes.ativarModoScan();
                }
            } else {
                if (window.gerenciadorCodigoBarrasClientes) {
                    window.gerenciadorCodigoBarrasClientes.desativarModoScan();
                }
            }
        });
    }
    
    const searchProductInputModal = document.getElementById('searchProductInputModal');
    if (searchProductInputModal) {
        searchProductInputModal.addEventListener('input', function() {
            const termo = this.value.trim();
            buscarNoModal(termo);
        });
        
        searchProductInputModal.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const termo = this.value.trim();
                if (termo) buscarNoModal(termo);
            }
        });
    }
    
    const filterBtns = modalConsulta.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const input = document.getElementById('searchProductInputModal');
            if (input) {
                buscarNoModal(input.value.trim());
            }
        });
    });
}

// ============================================
// FUNÇÃO PARA RENDERIZAR ENDEREÇO
// ============================================
function renderizarEndereco(dadosLoja) {
    const addressGrid = document.getElementById('addressGrid');
    if (!addressGrid) return;
    
    if (!dadosLoja || !dadosLoja.endereco) {
        addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
        return;
    }
    
    const endereco = dadosLoja.endereco;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `/spdv/imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    // Primeira linha: rua, número e bairro
    const ruaNumeroBairro = [];
    if (endereco.rua) ruaNumeroBairro.push(endereco.rua);
    if (endereco.numero) ruaNumeroBairro.push(`nº ${endereco.numero}`);
    if (endereco.bairro) ruaNumeroBairro.push(endereco.bairro);
    const ruaNumeroBairroStr = ruaNumeroBairro.join(' ');
    
    // Segunda linha: cidade, UF e CEP (sempre juntos)
    const cidadeUfCep = [];
    if (endereco.cidade) cidadeUfCep.push(endereco.cidade);
    if (endereco.uf) cidadeUfCep.push(endereco.uf);
    if (endereco.cep) cidadeUfCep.push(`CEP: ${endereco.cep}`);
    const cidadeUfCepStr = cidadeUfCep.join(' - ');
    
    // Endereço completo para URL do Maps
    const enderecoCompleto = `${ruaNumeroBairroStr} ${cidadeUfCepStr}`.trim();
    const query = encodeURIComponent(enderecoCompleto);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    let html = `
        <a href="${mapsUrl}" target="_blank" class="address-item">
            <div class="address-icon">
                <img src="${basePath}endereco.png" alt="Endereço" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="address-content">
                <div class="address-label">Endereço</div>
                <div class="address-text">
                    <span class="rua-numero">${ruaNumeroBairroStr}</span>
                    <span class="cidade-uf-cep">${cidadeUfCepStr}</span>
                </div>
            </div>
        </a>
    `;
    
    addressGrid.innerHTML = html;
    console.log('📍 Endereço renderizado:', enderecoCompleto);
}

// ============================================
// CONFIGURAR CHAT
// ============================================
function configurarChat() {
    const chatButton = document.getElementById('chatButton');
    if (!chatButton) return;
    
    const novoBotao = chatButton.cloneNode(true);
    chatButton.parentNode.replaceChild(novoBotao, chatButton);
    
    novoBotao.addEventListener('click', () => {
        alert('Chat em desenvolvimento. Breve estaremos disponíveis 😉');
    });
    
    console.log('💬 Chat configurado com ícone separado');
}

// ============================================
// RENDERIZAR CONTATOS
// ============================================
function renderizarContatos(dadosLoja) {
    const contactGrid = document.getElementById('contactGrid');
    if (!contactGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato) {
        contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
        return;
    }
    
    const contato = dadosLoja.contato;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `/spdv/imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    let html = '';
    
    if (contato.whatsapp && contato.whatsapp.trim() !== '') {
        const numero = contato.whatsapp.replace(/\D/g, '');
        html += `
            <a href="https://wa.me/${numero}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}whatsapp.png" alt="WhatsApp" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">WhatsApp</div>
                        <div class="contact-value">${contato.whatsapp}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.email && contato.email.trim() !== '') {
        html += `
            <a href="mailto:${contato.email}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}email.png" alt="E-mail" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">E-mail</div>
                        <div class="contact-value">${contato.email}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.instagram && contato.instagram.trim() !== '') {
        const usuario = contato.instagram.replace('@', '');
        html += `
            <a href="https://instagram.com/${usuario}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}instagram.png" alt="Instagram" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">Instagram</div>
                        <div class="contact-value">${contato.instagram}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (html === '') {
        html = '<p class="no-contacts">Nenhum contato disponível</p>';
    }
    
    contactGrid.innerHTML = html;
    
    console.log('📞 Contatos renderizados:', {
        whatsapp: contato.whatsapp || 'não',
        email: contato.email || 'não',
        instagram: contato.instagram || 'não'
    });
}

// ============================================
// CARREGAR DADOS DA LOJA DO FIREBASE
// ============================================
async function carregarDadosLojaFirebase() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) {
        console.warn('⚠️ ID da loja não disponível para carregar dados');
        return;
    }
    
    try {
        console.log(`🔍 Buscando dados da loja no Firebase para: ${lojaId}`);
        
        const lojasRef = collection(db, "lojas");
        const q = query(lojasRef, where("banco_login", "==", lojaId));
        const querySnapshot = await getDocs(q);
        
        let dadosLoja = null;
        let documentoId = null;
        
        querySnapshot.forEach((doc) => {
            dadosLoja = doc.data();
            documentoId = doc.id;
            console.log(`✅ Loja encontrada! Documento ID: ${documentoId}`);
        });
        
        if (dadosLoja) {
            console.log('✅ Dados completos da loja:', dadosLoja);
            
            const nomeLoja = dadosLoja.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const elementosNome = [
                'lojaNomeHeader',
                'lojaNomeFooter',
                'lojaNomeCopyright'
            ];
            
            elementosNome.forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = nomeLoja;
            });
            
            document.title = `${nomeLoja} - Loja Online`;
            console.log(`🏪 Nome da loja: ${nomeLoja}`);
            
            const lojaLocal = document.getElementById('lojaLocal');
            if (lojaLocal && dadosLoja.local) {
                lojaLocal.textContent = dadosLoja.local;
                console.log(`📍 Local: ${dadosLoja.local}`);
            }
            
            if (dadosLoja.contato) {
                console.log('📞 Contato encontrado:', dadosLoja.contato);
                renderizarContatos(dadosLoja);
            } else {
                console.log('ℹ️ Nenhum contato encontrado no Firebase');
                const contactGrid = document.getElementById('contactGrid');
                if (contactGrid) {
                    contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
                }
            }
            
            if (dadosLoja.endereco) {
                console.log('📍 Endereço encontrado:', dadosLoja.endereco);
                renderizarEndereco(dadosLoja);
            } else {
                console.log('ℹ️ Nenhum endereço encontrado no Firebase');
                const addressGrid = document.getElementById('addressGrid');
                if (addressGrid) {
                    addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
                }
            }
            
            renderizarChat();
            
            if (dadosLoja.ativo !== undefined) {
                console.log(`🔵 Loja ativa: ${dadosLoja.ativo ? 'Sim' : 'Não'}`);
            }
            
            console.log(`✅ Loja ${nomeLoja} configurada com sucesso!`);
            
        } else {
            console.warn(`⚠️ Nenhuma loja encontrada com banco_login = ${lojaId}`);
            
            const nomeFallback = lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const elementosNome = ['lojaNomeHeader', 'lojaNomeFooter', 'lojaNomeCopyright'];
            elementosNome.forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = nomeFallback;
            });
            
            document.title = `${nomeFallback} - Loja Online`;
            
            const contactGrid = document.getElementById('contactGrid');
            if (contactGrid) {
                contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
            }
            
            const addressGrid = document.getElementById('addressGrid');
            if (addressGrid) {
                addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
            }
            
            renderizarChat();
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja do Firebase:', error);
        
        const nomeFallback = lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const elementosNome = ['lojaNomeHeader', 'lojaNomeFooter', 'lojaNomeCopyright'];
        elementosNome.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = nomeFallback;
        });
        
        renderizarChat();
        mostrarMensagem('Erro ao carregar dados da loja', 'error');
    }
}

// ============================================
// FAZER LOGIN DO CLIENTE
// ============================================
async function fazerLoginCliente() {
    const login = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const lembrar = document.getElementById('loginLembrar').checked;
    
    if (!login || !senha) {
        mostrarMensagem('Preencha login e senha', 'warning');
        return;
    }
    
    mostrarLoading('Validando login...');
    
    try {
        const resultado = await validarLoginCliente(login, senha);
        
        if (resultado.success) {
            dadosCliente = resultado.data;
            clienteLogado = true;
            
            sessionStorage.setItem('cliente_logado', JSON.stringify(dadosCliente));
            
            if (lembrar) {
                localStorage.setItem('cliente_ultimo_login', login);
            } else {
                localStorage.removeItem('cliente_ultimo_login');
            }
            
            const userName = document.getElementById('userName');
            const btnLogout = document.getElementById('btnLogout');
            const btnLogin = document.getElementById('btnLogin');
            
            if (userName) userName.textContent = dadosCliente.nome;
            if (btnLogout) btnLogout.style.display = 'inline-flex';
            if (btnLogin) btnLogin.style.display = 'none';
            
            fecharModal('loginModal');
            mostrarMensagem(`Bem-vindo(a) ${dadosCliente.nome}!`, 'success');
            
            document.getElementById('loginUsuario').value = '';
            document.getElementById('loginSenha').value = '';
            
        } else {
            mostrarMensagem(resultado.message, 'error');
            document.getElementById('loginSenha').value = '';
            document.getElementById('loginSenha').focus();
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem('Erro ao fazer login', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FAZER CADASTRO DO CLIENTE
// ============================================
async function fazerCadastroCliente() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    const cpf = document.getElementById('cadastroCpf').value.trim();
    const login = document.getElementById('cadastroLogin').value.trim();
    const senha = document.getElementById('cadastroSenha').value.trim();
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value.trim();
    const endereco = document.getElementById('cadastroEndereco').value.trim();
    const cidade = document.getElementById('cadastroCidade').value.trim();
    const cep = document.getElementById('cadastroCep').value.trim();
    const termos = document.getElementById('cadastroTermos').checked;
    
    if (!nome || !email || !telefone || !cpf || !login || !senha || !confirmarSenha) {
        mostrarMensagem('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    if (!termos) {
        mostrarMensagem('Você precisa aceitar os termos de uso', 'warning');
        return;
    }
    
    if (senha !== confirmarSenha) {
        mostrarMensagem('As senhas não coincidem', 'warning');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensagem('E-mail inválido', 'warning');
        return;
    }
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        mostrarMensagem('CPF inválido', 'warning');
        return;
    }
    
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('Telefone inválido', 'warning');
        return;
    }
    
    mostrarLoading('Cadastrando...');
    
    try {
        const dadosCadastro = {
            nome,
            email,
            telefone: telefoneLimpo,
            cpf: cpfLimpo,
            login,
            senha,
            endereco: endereco || '',
            cidade: cidade || '',
            cep: cep.replace(/\D/g, '') || '',
            data_cadastro: new Date().toISOString()
        };
        
        const resultado = await cadastrarCliente(dadosCadastro);
        
        if (resultado.success) {
            mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            fecharModal('cadastroModal');
            
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroTelefone').value = '';
            document.getElementById('cadastroCpf').value = '';
            document.getElementById('cadastroLogin').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmarSenha').value = '';
            document.getElementById('cadastroEndereco').value = '';
            document.getElementById('cadastroCidade').value = '';
            document.getElementById('cadastroCep').value = '';
            document.getElementById('cadastroTermos').checked = false;
            
            setTimeout(() => {
                abrirModal('loginModal');
            }, 500);
            
        } else {
            mostrarMensagem(resultado.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        mostrarMensagem('Erro ao realizar cadastro', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            console.log(`✅ ${produtos.length} produtos carregados`);
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            produtos = [];
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        let categoriasList = [];
        
        if (resultado.success) {
            categoriasList = resultado.data;
        }
        
        if (categoriasList.length === 0 && produtos.length > 0) {
            const categoriasSet = new Set();
            produtos.forEach(p => {
                if (p.categoria) categoriasSet.add(p.categoria);
            });
            categoriasList = Array.from(categoriasSet).sort();
        }
        
        if (categoriasList.length === 0) {
            categoriasList = ['Eletrônicos', 'Informática', 'Celulares', 'Acessórios', 'Games', 'Áudio'];
        }
        
        categorias = categoriasList;
        
        let slidesHtml = '';
        
        const totalProdutos = produtos.length;
        slidesHtml += `
            <div class="swiper-slide">
                <div class="categoria-card" onclick="filtrarPorCategoria('todos')">
                    <div class="categoria-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="categoria-info">
                        <h4>Todos</h4>
                        <p>${totalProdutos} produto${totalProdutos !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>
        `;
        
        categoriasList.forEach(categoria => {
            const count = produtos.filter(p => p.categoria === categoria).length;
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="categoria-card" onclick="filtrarPorCategoria('${categoria}')">
                        <div class="categoria-icon">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div class="categoria-info">
                            <h4>${categoria}</h4>
                            <p>${count} produto${count !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        categoriesGrid.innerHTML = slidesHtml;
        
        setTimeout(() => {
            inicializarCarrosselCategorias();
        }, 100);
        
    } catch (error) {
        console.error("❌ Erro ao carregar categorias:", error);
    }
}

// ============================================
// CARREGAR PRODUTOS EM DESTAQUE
// ============================================
async function carregarProdutosDestaque() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    const todosProdutos = produtos;
    
    if (todosProdutos.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-slide">
                <div class="empty-products">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto disponível</p>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    todosProdutos.forEach(produto => {
        const imagem = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        if (swiperInstance) {
            swiperInstance.destroy(true, true);
        }
        
        swiperInstance = new Swiper('.featured-swiper', {
            slidesPerView: 1,
            spaceBetween: 10,
            loop: todosProdutos.length > 1,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            breakpoints: {
                480: {
                    slidesPerView: 2,
                    spaceBetween: 15,
                },
                768: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 20,
                },
                1440: {
                    slidesPerView: 5,
                    spaceBetween: 25,
                }
            },
            navigation: {
                prevEl: '#carouselPrev',
                nextEl: '#carouselNext',
            },
        });
    }, 100);
}

// ============================================
// VER PRODUTO DETALHADO
// ============================================
window.verProdutoDetalhe = function(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const modalBody = document.getElementById('produtoModalBody');
    if (!modalBody) return;
    
    const imagem = produto.imagens?.principal || produto.imagens?.thumbnail || IMAGEM_PADRAO_BASE64;
    const precoFormatado = formatarMoeda(produto.preco);
    const temEstoque = (produto.quantidade || 0) > 0;
    
    modalBody.innerHTML = `
        <div class="produto-detalhe">
            <div class="produto-imagem-grande">
                <img src="${imagem}" alt="${produto.nome}" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
            </div>
            <div class="produto-info-detalhe">
                <h2>${produto.nome}</h2>
                <p class="produto-codigo">Código: ${produto.codigo || '---'}</p>
                <p class="produto-categoria">Categoria: ${produto.categoria || 'Sem categoria'}</p>
                <p class="produto-preco">${precoFormatado}</p>
                <p class="produto-estoque ${temEstoque ? 'disponivel' : 'indisponivel'}">
                    ${temEstoque ? '✅ Em estoque' : '❌ Indisponível'}
                </p>
                ${produto.descricao ? `<p class="produto-descricao">${produto.descricao}</p>` : ''}
                <div class="produto-acoes-detalhe">
                    <button class="btn-add-cart-large" onclick="adicionarAoCarrinho('${produto.id}'); fecharModal('produtoModal');" ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `;
    
    abrirModal('produtoModal');
};

// ============================================
// ADICIONAR AO CARRINHO
// ============================================
window.adicionarAoCarrinho = function(produtoId) {
    if (!clienteLogado) {
        mostrarMensagem('Faça login para adicionar produtos ao carrinho', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    if ((produto.quantidade || 0) <= 0) {
        mostrarMensagem('Produto sem estoque', 'warning');
        return;
    }
    
    const itemExistente = carrinho.find(item => item.id === produtoId);
    
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1,
            imagem: produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64
        });
    }
    
    sessionStorage.setItem('carrinho_cliente', JSON.stringify(carrinho));
    
    atualizarBadgeCarrinho();
    mostrarMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
};

// ============================================
// ATUALIZAR BADGE DO CARRINHO
// ============================================
function atualizarBadgeCarrinho() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const total = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// ============================================
// CARREGAR CARRINHO DO STORAGE
// ============================================
function carregarCarrinhoStorage() {
    const carrinhoSalvo = sessionStorage.getItem('carrinho_cliente');
    if (carrinhoSalvo) {
        try {
            carrinho = JSON.parse(carrinhoSalvo);
            atualizarBadgeCarrinho();
        } catch (e) {
            console.error('Erro ao carregar carrinho:', e);
        }
    }
}

// ============================================
// FILTRAR POR CATEGORIA
// ============================================
window.filtrarPorCategoria = function(categoria) {
    console.log(`Filtrando por categoria: ${categoria}`);
    
    let produtosFiltrados;
    
    if (categoria === 'todos') {
        produtosFiltrados = produtos;
        exibirProdutosFiltrados(produtosFiltrados, 'Todos os Produtos');
    } else {
        produtosFiltrados = produtos.filter(p => p.categoria === categoria);
        exibirProdutosFiltrados(produtosFiltrados, `Categoria: ${categoria}`);
    }
};

// ============================================
// FILTRAR PRODUTOS POR BUSCA
// ============================================
function filtrarProdutosPorBusca(termo) {
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        carregarProdutosDestaque();
        return;
    }
    
    const resultados = produtos.filter(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const codigo = (produto.codigo || '').toLowerCase();
        const categoria = (produto.categoria || '').toLowerCase();
        const codigoBarras = (produto.codigo_barras || '').toLowerCase();
        
        return nome.includes(termoLimpo) || 
               codigo.includes(termoLimpo) || 
               categoria.includes(termoLimpo) ||
               codigoBarras.includes(termoLimpo);
    });
    
    exibirProdutosFiltrados(resultados, `Resultados para: "${termo}"`);
}

// ============================================
// EXIBIR PRODUTOS FILTRADOS
// ============================================
function exibirProdutosFiltrados(produtosFiltrados, titulo) {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    const tituloElement = document.querySelector('.featured-products h2');
    if (tituloElement) {
        tituloElement.innerHTML = `<i class="fas fa-search"></i> ${titulo}`;
    }
    
    if (produtosFiltrados.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto encontrado</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    produtosFiltrados.forEach(produto => {
        const imagem = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        if (swiperInstance) {
            swiperInstance.destroy(true, true);
        }
        
        swiperInstance = new Swiper('.featured-swiper', {
            slidesPerView: 1,
            spaceBetween: 10,
            loop: produtosFiltrados.length > 1,
            breakpoints: {
                480: {
                    slidesPerView: 2,
                    spaceBetween: 15,
                },
                768: {
                    slidesPerView: 3,
                    spaceBetween: 20,
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 20,
                },
                1440: {
                    slidesPerView: 5,
                    spaceBetween: 25,
                }
            },
            navigation: {
                prevEl: '#carouselPrev',
                nextEl: '#carouselNext',
            },
        });
    }, 100);
}

// ============================================
// BUSCAR NO MODAL
// ============================================
function buscarNoModal(termo) {
    const resultsModal = document.getElementById('searchResultsModal');
    if (!resultsModal) return;
    
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        exibirTodosProdutosNoModal();
        return;
    }
    
    const filtroAtivo = document.querySelector('#quickSearchModal .filter-btn.active');
    const tipoFiltro = filtroAtivo ? filtroAtivo.dataset.filter : 'all';
    
    let resultados = produtos.filter(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const codigo = (produto.codigo || '').toLowerCase();
        const categoria = (produto.categoria || '').toLowerCase();
        const codigoBarras = (produto.codigo_barras || '').toLowerCase();
        
        return nome.includes(termoLimpo) || 
               codigo.includes(termoLimpo) || 
               categoria.includes(termoLimpo) ||
               codigoBarras.includes(termoLimpo);
    });
    
    if (tipoFiltro === 'estoque') {
        resultados = resultados.filter(p => p.quantidade > 0);
    } else if (tipoFiltro === 'destaque') {
        resultados = resultados.slice(0, 10);
    }
    
    if (resultados.length === 0) {
        resultsModal.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado para "${termo}"</p>
            </div>
        `;
        return;
    }
    
    exibirResultadosNoModal(resultados);
}

// ============================================
// EXIBIR TODOS OS PRODUTOS NO MODAL
// ============================================
function exibirTodosProdutosNoModal() {
    const resultsModal = document.getElementById('searchResultsModal');
    if (!resultsModal) return;
    
    if (produtos.length === 0) {
        resultsModal.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto disponível</p>
            </div>
        `;
        return;
    }
    
    exibirResultadosNoModal(produtos.slice(0, 20));
}

// ============================================
// EXIBIR RESULTADOS NO MODAL
// ============================================
function exibirResultadosNoModal(resultados) {
    const resultsModal = document.getElementById('searchResultsModal');
    if (!resultsModal) return;
    
    let html = '<div class="modal-results-grid">';
    
    resultados.forEach(produto => {
        const imagem = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        html += `
            <div class="modal-product-card" onclick="verProdutoDetalhe('${produto.id}'); fecharModal('quickSearchModal');">
                <div class="modal-product-image">
                    <img src="${imagem}" alt="${produto.nome}" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                </div>
                <div class="modal-product-info">
                    <h4>${produto.nome}</h4>
                    <p class="modal-product-code">${produto.codigo || '---'}</p>
                    <p class="modal-product-price">${precoFormatado}</p>
                    <p class="modal-product-stock ${temEstoque ? 'in' : 'out'}">
                        ${temEstoque ? 'Em estoque' : 'Indisponível'}
                    </p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsModal.innerHTML = html;
}

// ============================================
// BUSCAR PRODUTO POR CÓDIGO
// ============================================
function buscarProdutoPorCodigo(codigo) {
    const produto = produtos.find(p => 
        p.codigo_barras === codigo || p.codigo === codigo
    );
    
    if (produto) {
        verProdutoDetalhe(produto.id);
    } else {
        mostrarMensagem(`Produto com código ${codigo} não encontrado`, 'warning');
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loading) {
        if (loadingMessage) loadingMessage.textContent = mensagem;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    const textEl = alert.querySelector('.message-text');
    if (textEl) textEl.textContent = texto;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.verProdutoDetalhe = verProdutoDetalhe;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.filtrarPorCategoria = filtrarPorCategoria;
window.fecharModal = fecharModal;

console.log("✅ clientes.js carregado com sucesso!");


