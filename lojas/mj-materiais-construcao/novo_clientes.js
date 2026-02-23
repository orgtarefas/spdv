// novo_clientes.js - Tela de Exposição de Produtos para Clientes
console.log("🛒 Sistema PDV - Loja para Clientes");

// Importar APENAS do novo_firebase_config.js (estoque/vendas)
import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    serverTimestamp,
    lojaServices,
    obterURLImagem,
    formatarMoeda,
    gerarImagemPlaceholderBase64
} from './novo_firebase_config.js';

import { getLojaConfig } from '/spdv/lojas.js';

// ============================================
// CONSTANTES GLOBAIS
// ============================================
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=";

// Placeholder de logo em SVG
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
    const match = pathname.match(/\/spdv\/lojas\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (lojaServices && lojaServices.lojaId) {
        lojaIdAtual = lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// FUNÇÕES DE MODAL
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log(`✅ Modal ${modalId} aberto`);
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        console.log(`✅ Modal ${modalId} fechado`);
    }
};

// ============================================
// VERIFICAR SESSÃO DO CLIENTE (via eventos do login_firebase.js)
// ============================================
function verificarSessaoCliente() {
    // O login_firebase.js já dispara eventos, só precisamos ouvir
}

// ============================================
// EVENTOS DO LOGIN
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario, permissoes } = event.detail;
    
    clienteLogado = true;
    dadosCliente = usuario;
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    
    if (userName) userName.textContent = usuario.nome || usuario.email;
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (btnLogin) btnLogin.style.display = 'none';
    
    console.log('✅ Cliente logado:', usuario.nome || usuario.email);
});

window.addEventListener('usuarioDeslogado', () => {
    clienteLogado = false;
    dadosCliente = null;
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    
    if (userName) userName.textContent = 'Visitante';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    
    console.log('👤 Cliente deslogado');
});

window.addEventListener('usuarioNaoAutorizado', (event) => {
    const erro = event.detail?.erro || 'Acesso negado';
    mostrarMensagem(erro, 'error');
});

// ============================================
// FUNÇÃO PARA CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) {
        logoImg.src = getPlaceholderIcon();
        return;
    }
    
    const logoPath = `/spdv/imagens/${lojaId}/logo.png`;
    
    const testImg = new Image();
    testImg.onload = function() {
        logoImg.src = logoPath;
    };
    
    testImg.onerror = function() {
        logoImg.src = getPlaceholderIcon();
    };
    
    testImg.src = logoPath;
}

function getPlaceholderIcon() {
    return LOGO_PLACEHOLDER;
}

// ============================================
// CARREGAR DADOS DA LOJA
// ============================================
function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    try {
        const config = getLojaConfig(lojaId);
        
        if (config) {
            const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const lojaNomeHeader = document.getElementById('lojaNomeHeader');
            if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
            
            document.title = `${nomeLoja} - Loja Online`;
            
            if (config.contato) {
                renderizarContatos(config);
            }
            
            if (config.contato?.endereco) {
                renderizarEndereco(config);
            }
        }
        
        renderizarChat();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
    }
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
}

// ============================================
// RENDERIZAR ENDEREÇO
// ============================================
function renderizarEndereco(dadosLoja) {
    const addressGrid = document.getElementById('addressGrid');
    if (!addressGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato?.endereco) {
        addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
        return;
    }
    
    const endereco = dadosLoja.contato.endereco;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `/spdv/imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    const ruaNumeroBairro = [];
    if (endereco.rua) ruaNumeroBairro.push(endereco.rua);
    if (endereco.numero) ruaNumeroBairro.push(`nº ${endereco.numero}`);
    if (endereco.bairro) ruaNumeroBairro.push(endereco.bairro);
    const ruaNumeroBairroStr = ruaNumeroBairro.join(' ');
    
    const cidadeUfCep = [];
    if (endereco.cidade) cidadeUfCep.push(endereco.cidade);
    if (endereco.uf) cidadeUfCep.push(endereco.uf);
    if (endereco.cep) cidadeUfCep.push(`CEP: ${endereco.cep}`);
    const cidadeUfCepStr = cidadeUfCep.join(' - ');
    
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
}

// ============================================
// RENDERIZAR CHAT
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
    
    const chatButton = document.getElementById('chatButton');
    if (chatButton) {
        chatButton.addEventListener('click', () => {
            alert('Chat em desenvolvimento. Breve estaremos disponíveis 😉');
        });
    }
}

// ============================================
// FUNÇÕES DE LOGIN/LOGOUT (usam window.fazerLogin do login_firebase.js)
// ============================================
async function fazerLoginCliente() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const lembrar = document.getElementById('loginLembrar').checked;
    
    if (!email || !senha) {
        mostrarMensagem('Preencha e-mail e senha', 'warning');
        return;
    }
    
    mostrarLoading('Validando login...');
    
    try {
        const resultado = await window.fazerLogin(email, senha);
        
        if (resultado && resultado.sucesso) {
            if (lembrar) {
                localStorage.setItem('cliente_ultimo_email', email);
            } else {
                localStorage.removeItem('cliente_ultimo_email');
            }
            
            fecharModal('loginModal');
            mostrarMensagem(`Bem-vindo(a) ${resultado.usuario.nome || email}!`, 'success');
            
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginSenha').value = '';
            
        } else {
            const mensagem = resultado?.erro || 'E-mail ou senha incorretos';
            mostrarMensagem(mensagem, 'error');
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

async function fazerCadastroCliente() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    const cpf = document.getElementById('cadastroCpf').value.trim();
    const senha = document.getElementById('cadastroSenha').value.trim();
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value.trim();
    const endereco = document.getElementById('cadastroEndereco').value.trim();
    const cidade = document.getElementById('cadastroCidade').value.trim();
    const cep = document.getElementById('cadastroCep').value.trim();
    const termos = document.getElementById('cadastroTermos').checked;
    
    if (!nome || !email || !telefone || !cpf || !senha || !confirmarSenha) {
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
        const resultado = await window.cadastrarCliente(
            nome, email, senha, telefoneLimpo, cpfLimpo, endereco, cidade, cep
        );
        
        if (resultado.success) {
            mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            fecharModal('cadastroModal');
            
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroTelefone').value = '';
            document.getElementById('cadastroCpf').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmarSenha').value = '';
            document.getElementById('cadastroEndereco').value = '';
            document.getElementById('cadastroCidade').value = '';
            document.getElementById('cadastroCep').value = '';
            document.getElementById('cadastroTermos').checked = false;
            
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) loginEmail.value = email;
            
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

async function fazerLogoutCliente() {
    if (confirm('Deseja realmente sair?')) {
        await window.fazerLogout();
    }
}

// ============================================
// FUNÇÕES DE PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            console.log(`✅ ${produtos.length} produtos carregados`);
        } else {
            produtos = [];
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        let categoriasList = resultado.success ? resultado.data : [];
        
        if (categoriasList.length === 0 && produtos.length > 0) {
            const categoriasSet = new Set();
            produtos.forEach(p => {
                if (p.categoria) categoriasSet.add(p.categoria);
            });
            categoriasList = Array.from(categoriasSet).sort();
        }
        
        if (categoriasList.length === 0) {
            categoriasList = ['Todos os Produtos'];
        }
        
        categorias = categoriasList;
        
        let slidesHtml = `
            <div class="swiper-slide">
                <div class="categoria-card" onclick="filtrarPorCategoria('todos')">
                    <div class="categoria-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="categoria-info">
                        <h4>Todos</h4>
                        <p>${produtos.length} produtos</p>
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
                            <p>${count} produtos</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        categoriesGrid.innerHTML = slidesHtml;
        
    } catch (error) {
        console.error("❌ Erro ao carregar categorias:", error);
    }
}

async function carregarProdutosDestaque() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    const todosProdutos = produtos;
    
    if (todosProdutos.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto disponível</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    todosProdutos.slice(0, 20).forEach(produto => {
        const imagem = obterURLImagem(produto, 'thumb');
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
    
    setTimeout(inicializarSwiper, 100);
}

function inicializarSwiper() {
    if (typeof Swiper === 'undefined') return;
    
    if (swiperInstance) {
        swiperInstance.destroy(true, true);
    }
    
    swiperInstance = new Swiper('.featured-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: produtos.length > 1,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
            1440: { slidesPerView: 5, spaceBetween: 25 }
        },
        navigation: {
            prevEl: '#carouselPrev',
            nextEl: '#carouselNext',
        },
    });
}

window.verProdutoDetalhe = function(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const modalBody = document.getElementById('produtoModalBody');
    if (!modalBody) return;
    
    const imagem = obterURLImagem(produto, 'principal');
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
            imagem: obterURLImagem(produto, 'thumb')
        });
    }
    
    sessionStorage.setItem('carrinho_cliente', JSON.stringify(carrinho));
    atualizarBadgeCarrinho();
    mostrarMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
};

function atualizarBadgeCarrinho() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const total = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

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
        const imagem = obterURLImagem(produto, 'thumb');
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
    
    setTimeout(inicializarSwiper, 100);
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
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

function configurarEventos() {
    document.getElementById('btnLogin')?.addEventListener('click', () => abrirModal('loginModal'));
    document.getElementById('btnLogout')?.addEventListener('click', fazerLogoutCliente);
    document.getElementById('btnGoToCart')?.addEventListener('click', () => {
        if (!clienteLogado) {
            mostrarMensagem('Faça login para ir ao carrinho', 'warning');
            abrirModal('loginModal');
            return;
        }
        window.location.href = 'venda.html';
    });
    
    document.getElementById('btnConfirmarLogin')?.addEventListener('click', fazerLoginCliente);
    document.getElementById('loginSenha')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLoginCliente();
    });
    
    document.getElementById('btnIrCadastro')?.addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal('loginModal');
        abrirModal('cadastroModal');
    });
    
    document.getElementById('btnConfirmarCadastro')?.addEventListener('click', fazerCadastroCliente);
    
    document.getElementById('cadastroTelefone')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    });
    
    document.getElementById('cadastroCpf')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{3})(\d)/g, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .slice(0, 14);
    });
    
    document.getElementById('cadastroCep')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/g, '$1-$2')
            .slice(0, 9);
    });
    
    const ultimoEmail = localStorage.getItem('cliente_ultimo_email');
    if (ultimoEmail) {
        document.getElementById('loginEmail').value = ultimoEmail;
    }
}

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
            setTimeout(() => window.location.href = '../../../login.html', 2000);
            return;
        }
        
        carregarLogoLoja();
        carregarDadosLoja();
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

// Exportar funções globais
window.verProdutoDetalhe = verProdutoDetalhe;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.filtrarPorCategoria = filtrarPorCategoria;
window.fecharModal = fecharModal;

console.log("✅ novo_clientes.js carregado com sucesso!");
