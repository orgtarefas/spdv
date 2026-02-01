// venda.js - VERSÃO SIMPLIFICADA SEM IMPORT
console.log("🛒 venda.js carregando...");

// Elementos DOM
const searchProduct = document.getElementById('searchProduct');
const productsGrid = document.getElementById('productsGrid');
const productCount = document.getElementById('productCount');
const emptyProducts = document.getElementById('emptyProducts');
const cartItems = document.getElementById('cartItems');
const btnClearCart = document.getElementById('btnClearCart');
const subtotalElement = document.getElementById('subtotal');
const descontoInput = document.getElementById('desconto');
const totalElement = document.getElementById('total');
const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
const btnCancelarVenda = document.getElementById('btnCancelarVenda');
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const currentDateTimeElement = document.getElementById('currentDateTime');

// Modal
const modalQuantidade = document.getElementById('modalQuantidade');
const modalProductInfo = document.getElementById('modalProductInfo');
const quantidadeInput = document.getElementById('quantidade');

// Variáveis globais
let usuario = null;
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let produtoSelecionado = null;
let desconto = 0;
let mjServices = window.mjServices; // Tentar pegar do window global

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 venda.html carregada");
    
    // PRIMEIRO: Verificar sessão
    if (!verificarSessao()) {
        return;
    }
    
    // SEGUNDO: Verificar mjServices
    console.log("🔍 Procurando mjServices...");
    
    // Esperar um pouco para firebase_config.js carregar
    await esperar(1500);
    
    // Tentar várias formas de acessar mjServices
    mjServices = window.mjServices || 
                 (typeof mjServices !== 'undefined' ? mjServices : null) ||
                 (window.firebase_config ? window.firebase_config.mjServices : null);
    
    console.log("mjServices encontrado?", !!mjServices);
    console.log("Disponível em window?", !!window.mjServices);
    
    if (!mjServices) {
        console.warn("⚠️ mjServices não encontrado, usando modo simulação");
        alert("⚠️ Modo simulação ativado\nOs dados serão salvos apenas localmente");
    }
    
    // TERCEIRO: Configurar página
    configurarPagina();
    
    // QUARTO: Carregar produtos
    await carregarProdutos();
    
    console.log("✅ venda.js inicializado!");
});

// ============================================
// 2. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    console.log("🔍 Verificando sessão...");
    
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        console.log("❌ Nenhuma sessão encontrada!");
        
        alert("Sessão não encontrada ou expirada.\nFaça login novamente.");
        
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário logado:", usuario.nome || usuario.login);
        
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao ler sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        
        return false;
    }
}

// ============================================
// 3. CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    console.log("📦 Carregando produtos...");
    
    try {
        mostrarLoading("Carregando produtos...");
        
        // OPÇÃO A: Usar mjServices se disponível
        if (mjServices && mjServices.buscarProdutosParaVenda) {
            console.log("📡 Buscando produtos via mjServices...");
            
            const resultado = await mjServices.buscarProdutosParaVenda();
            console.log("Resultado mjServices:", resultado);
            
            if (resultado && resultado.success) {
                produtos = resultado.data || [];
                console.log(`✅ ${produtos.length} produtos do Firebase`);
            } else {
                throw new Error("Erro na resposta do mjServices");
            }
            
        } else {
            // OPÇÃO B: Buscar diretamente do Firebase (fallback)
            console.log("🔄 Tentando buscar diretamente do Firebase...");
            produtos = await buscarProdutosDireto();
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        
        // OPÇÃO C: Usar dados de exemplo
        console.log("📋 Usando produtos de exemplo");
        produtos = obterProdutosExemplo();
        
        mostrarMensagem(`Aviso: ${error.message}\nUsando dados de exemplo.`, "warning");
    }
    
    // Processar produtos
    produtosFiltrados = produtos.filter(p => p.quantidade > 0 && p.ativo !== false);
    
    console.log(`📊 Total de produtos: ${produtosFiltrados.length}`);
    
    if (produtosFiltrados.length > 0) {
        console.log("Primeiro produto:", produtosFiltrados[0]);
    }
    
    renderizarProdutos();
    atualizarContadorProdutos();
    esconderLoading();
}

// ============================================
// 4. BUSCAR PRODUTOS DIRETO DO FIREBASE (fallback)
// ============================================
async function buscarProdutosDireto() {
    try {
        console.log("🌐 Tentando conectar ao Firebase...");
        
        // Verificar se Firebase está disponível
        if (typeof firebase === 'undefined') {
            console.log("Firebase não disponível, carregando...");
            await carregarFirebase();
        }
        
        if (!firebase || !firebase.firestore) {
            throw new Error("Firebase não carregado");
        }
        
        // Configuração do Firebase (mesma do seu projeto)
        const firebaseConfig = {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        };
        
        // Inicializar app secundário
        const app = firebase.initializeApp(firebaseConfig, 'pdv-secundario');
        const db = firebase.firestore(app);
        
        // Buscar produtos da coleção estoque_mj_construcoes
        const querySnapshot = await db.collection('estoque_mj_construcoes')
            .where('ativo', '==', true)
            .where('quantidade', '>', 0)
            .orderBy('nome')
            .get();
        
        const produtosFirebase = [];
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            produtosFirebase.push({
                id: doc.id,
                nome: data.nome || 'Sem nome',
                codigo: data.codigo || doc.id,
                preco: parseFloat(data.preco) || 0,
                quantidade: parseInt(data.quantidade) || 0,
                categoria: data.categoria || '',
                unidade: data.unidade || 'UN',
                estoque_minimo: parseInt(data.estoque_minimo) || 5,
                ativo: data.ativo !== false
            });
        });
        
        console.log(`✅ ${produtosFirebase.length} produtos do Firebase`);
        return produtosFirebase;
        
    } catch (error) {
        console.error("Erro ao buscar do Firebase:", error);
        return [];
    }
}

// ============================================
// 5. CARREGAR FIREBASE DINAMICAMENTE
// ============================================
function carregarFirebase() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined') {
            resolve();
            return;
        }
        
        // Carregar Firebase App
        const scriptApp = document.createElement('script');
        scriptApp.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        scriptApp.onload = () => {
            // Carregar Firestore
            const scriptFirestore = document.createElement('script');
            scriptFirestore.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
            scriptFirestore.onload = resolve;
            scriptFirestore.onerror = reject;
            document.head.appendChild(scriptFirestore);
        };
        scriptApp.onerror = reject;
        document.head.appendChild(scriptApp);
    });
}

// ============================================
// 6. PRODUTOS DE EXEMPLO
// ============================================
function obterProdutosExemplo() {
    return [
        { 
            id: 'ex1', 
            codigo: 'MJ-0000000001', 
            nome: 'Bocal de Lâmpada', 
            preco: 15.00, 
            quantidade: 10, 
            categoria: 'Componentes Elétricos',
            unidade: 'UN',
            estoque_minimo: 5,
            ativo: true
        },
        { 
            id: 'ex2', 
            codigo: 'CIM001', 
            nome: 'Cimento 50kg', 
            preco: 28.90, 
            quantidade: 50, 
            categoria: 'Cimento',
            unidade: 'Saco',
            estoque_minimo: 10,
            ativo: true
        },
        { 
            id: 'ex3', 
            codigo: 'ARE001', 
            nome: 'Areia Média', 
            preco: 45.00, 
            quantidade: 30, 
            categoria: 'Areia',
            unidade: 'M³',
            estoque_minimo: 5,
            ativo: true
        },
        { 
            id: 'ex4', 
            codigo: 'TEL001', 
            nome: 'Tijolo 8 furos', 
            preco: 1.20, 
            quantidade: 1000, 
            categoria: 'Tijolo',
            unidade: 'UN',
            estoque_minimo: 100,
            ativo: true
        }
    ];
}

// ============================================
// 7. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    if (!productsGrid) return;
    
    if (produtosFiltrados.length === 0) {
        if (emptyProducts) {
            emptyProducts.style.display = 'flex';
        }
        productsGrid.innerHTML = '';
        return;
    }
    
    if (emptyProducts) {
        emptyProducts.style.display = 'none';
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" data-id="${produto.id}">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-footer">
                    <span class="product-price">R$ ${formatarMoeda(produto.preco)}</span>
                    <button class="btn-add-product" ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
    
    // Adicionar eventos
    document.querySelectorAll('.btn-add-product:not([disabled])').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productId = card.dataset.id;
            abrirModalProduto(productId);
        });
    });
    
    document.querySelectorAll('.product-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.dataset.id;
            abrirModalProduto(productId);
        });
    });
}

// ============================================
// 8. FUNÇÕES DO MODAL
// ============================================
function configurarModal() {
    if (!modalQuantidade) return;
    
    // Botão fechar
    const modalClose = modalQuantidade.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modalQuantidade.style.display = 'none';
        });
    }
    
    // Botão cancelar
    const btnCancel = modalQuantidade.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            modalQuantidade.style.display = 'none';
        });
    }
    
    // Fechar ao clicar fora
    modalQuantidade.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Controles de quantidade
    const btnDecrease = document.getElementById('btnDecrease');
    const btnIncrease = document.getElementById('btnIncrease');
    const btnAddToCart = document.getElementById('btnAddToCart');
    
    if (btnDecrease) {
        btnDecrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            if (qty > 1) {
                qty--;
                quantidadeInput.value = qty;
            }
        });
    }
    
    if (btnIncrease) {
        btnIncrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            qty++;
            quantidadeInput.value = qty;
        });
    }
    
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', adicionarAoCarrinho);
    }
}

function abrirModalProduto(productId) {
    produtoSelecionado = produtosFiltrados.find(p => p.id === productId);
    
    if (!produtoSelecionado || !modalQuantidade) return;
    
    // Configurar informações
    if (modalProductInfo) {
        modalProductInfo.innerHTML = `
            <h4>${produtoSelecionado.nome}</h4>
            <p><strong>Código:</strong> ${produtoSelecionado.codigo || 'N/A'}</p>
            <p><strong>Estoque:</strong> ${produtoSelecionado.quantidade} ${produtoSelecionado.unidade || 'UN'}</p>
            <p><strong>Preço:</strong> R$ ${formatarMoeda(produtoSelecionado.preco)}</p>
        `;
    }
    
    // Configurar quantidade
    if (quantidadeInput) {
        quantidadeInput.value = 1;
        quantidadeInput.max = produtoSelecionado.quantidade;
    }
    
    // Mostrar modal
    modalQuantidade.style.display = 'flex';
}

function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(quantidadeInput?.value) || 1;
    
    // Verificar estoque
    if (quantidade > produtoSelecionado.quantidade) {
        alert(`Estoque insuficiente! Disponível: ${produtoSelecionado.quantidade}`);
        return;
    }
    
    // Adicionar ao carrinho
    carrinho.push({
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        quantidade: quantidade,
        subtotal: produtoSelecionado.preco * quantidade
    });
    
    // Fechar modal
    if (modalQuantidade) {
        modalQuantidade.style.display = 'none';
    }
    
    // Atualizar carrinho
    renderizarCarrinhoSimples();
    atualizarTotal();
    
    // Mensagem
    alert(`${quantidade}x ${produtoSelecionado.nome} adicionado!`);
}

// ============================================
// 9. FUNÇÕES DO CARRINHO (simplificadas)
// ============================================
function renderizarCarrinhoSimples() {
    if (!cartItems) return;
    
    if (carrinho.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
                <small>Adicione produtos para iniciar a venda</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    carrinho.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>${item.quantidade} x R$ ${formatarMoeda(item.preco)}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-price">
                        R$ ${formatarMoeda(item.subtotal)}
                    </div>
                    <button class="btn-remove-item" onclick="removerItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

function removerItem(index) {
    if (confirm("Remover item do carrinho?")) {
        carrinho.splice(index, 1);
        renderizarCarrinhoSimples();
        atualizarTotal();
    }
}

function atualizarTotal() {
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

// ============================================
// 10. FUNÇÕES UTILITÁRIAS
// ============================================
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function mostrarLoading(mensagem) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = mensagem || 'Carregando...';
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info') {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo}] ${texto}`);
        return;
    }
    
    const icon = alert.querySelector('.message-icon');
    const text = alert.querySelector('.message-text');
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Ícone
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    if (text) text.textContent = texto;
    
    // Auto-ocultar
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

function atualizarContadorProdutos() {
    if (productCount) {
        productCount.textContent = `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? 's' : ''}`;
    }
}

function filtrarProdutos() {
    if (!searchProduct) return;
    
    const termo = searchProduct.value.toLowerCase().trim();
    
    if (termo === '') {
        produtosFiltrados = [...produtos];
    } else {
        produtosFiltrados = produtos.filter(produto => 
            (produto.codigo && produto.codigo.toLowerCase().includes(termo)) ||
            (produto.nome && produto.nome.toLowerCase().includes(termo)) ||
            (produto.categoria && produto.categoria.toLowerCase().includes(termo))
        );
    }
    
    renderizarProdutos();
    atualizarContadorProdutos();
}

// ============================================
// 11. CONFIGURAR PÁGINA
// ============================================
function configurarPagina() {
    console.log("⚙️ Configurando página...");
    
    // Configurar logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                window.location.href = '../../login.html';
            }
        });
    }
    
    // Configurar botão voltar
    const btnVoltar = document.querySelector('.btn-back');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
    
    // Configurar busca
    if (searchProduct) {
        searchProduct.addEventListener('input', function() {
            filtrarProdutos();
        });
    }
    
    // Configurar limpar carrinho
    if (btnClearCart) {
        btnClearCart.addEventListener('click', function() {
            if (carrinho.length > 0 && confirm("Limpar todo o carrinho?")) {
                carrinho = [];
                renderizarCarrinhoSimples();
                atualizarTotal();
            }
        });
    }
    
    // Configurar desconto
    if (descontoInput) {
        descontoInput.addEventListener('input', function() {
            desconto = parseFloat(this.value) || 0;
            if (desconto < 0) desconto = 0;
            if (desconto > 100) desconto = 100;
            atualizarTotal();
        });
    }
    
    // Configurar finalizar venda (simulado)
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', function() {
            if (carrinho.length === 0) {
                alert("Adicione produtos ao carrinho primeiro!");
                return;
            }
            
            const total = carrinho.reduce((sum, item) => sum + item.subtotal, 0);
            const confirmar = confirm(`Venda simulada!\n\nTotal: R$ ${formatarMoeda(total)}\n\nDeseja confirmar?`);
            
            if (confirmar) {
                alert("✅ Venda registrada (modo simulação)\n\nEm produção, esta venda seria salva no Firebase.");
                carrinho = [];
                renderizarCarrinhoSimples();
                atualizarTotal();
            }
        });
    }
    
    // Configurar cancelar
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Configurar modal
    configurarModal();
    
    console.log("✅ Página configurada");
}

console.log("✅ venda.js carregado!");
