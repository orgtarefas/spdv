// estoque.js - SISTEMA DE ESTOQUE DINÂMICO PARA MULTILOJA
console.log("📦 Sistema de Estoque Multiloja - Iniciando...");

import { lojaServices, db } from './firebase_config.js';
import { imagemServices } from './imagem_api.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let produtos = [];
let produtosFiltrados = [];
let categorias = [];

// Elementos DOM
let searchInput, btnNovoProduto, btnRelatorioEstoque, btnRefresh, filterStatus;
let estoqueTableBody, totalProdutosElement, totalEstoqueElement, baixoEstoqueElement, valorTotalElement;
let currentCountElement, lastUpdateElement, userNameElement, btnLogout;
let modalProduto, formProduto, produtoIdInput, modalTitle;
let codigoInput, codigoBarrasInput, nomeInput, categoriaInput, unidadeVendaSelect, precoCustoInput;
let precoInput, quantidadeInput, estoqueMinimoInput, descricaoTextarea, fornecedorInput;
let valorUnidadeInput, tipoUnidadeSelect, totalEstoqueUnidadeInput, totalEstoqueTipoSpan;

// GERENCIADOR DE CÓDIGO DE BARRAS
let gerenciadorCodigoBarras; 

// VARIÁVEIS PARA IMAGENS
let imagemAtual = null;
let imagemPreviewURL = null;
let imagemUploadResult = null;
let uploadArea, fileInput, previewImage, imagePreview;
let uploadProgress, progressFill, progressPercent, imageStatus;

// IMAGEM GERADA EM BASE64 QUANDO NÃO HOUVER IMAGENS
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjBmMWYyIiByeD0iMTAiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMjAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIiBzdHJva2U9IiNlNzRjM2MiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNNDAgMzVMNjAgNTVNNTAgNDVMNzAgMjVNNjAgMzVMMzAgNjVNNzAgMzVMNTAgNTVNMzAgMzVMMzUgMzBNNzAgNTVMNjUgNjBNMzUgNjVMMzAgNjBNNjUgMzVMNzAgMzAiIHN0cm9rZT0iI2U3NGMzYyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8dGV4dCB4PSI1MCIgeT0iODUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzZjNzU3ZCIgZm9udC13ZWlnaHQ9IjUwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U0VNIEZPVE88L3RleHQ+Cjwvc3ZnPg==";

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página estoque carregada");
    
    mostrarLoading('Inicializando estoque...', 'Carregando configurações...');
    
    try {
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = '../../login.html';
            }, 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaServices.lojaId}`);
        console.log(`👤 Usuário: ${lojaServices.nomeUsuario}`);
        
        inicializarElementosDOM();
        atualizarInterfaceLoja();
        
        // INICIALIZAR GERENCIADOR DE CÓDIGO DE BARRAS
        gerenciadorCodigoBarras = new GerenciadorCodigoBarras();
        window.gerenciadorCodigoBarras = gerenciadorCodigoBarras;
        await gerenciadorCodigoBarras.inicializar();
        
        configurarEventos();
        await carregarDadosIniciais();
        atualizarUltimaAtualizacao();
        setInterval(atualizarUltimaAtualizacao, 60000);
        esconderLoading();
        verificarConfigImgBBCarregamento();
        
        console.log("✅ Sistema de estoque pronto para uso");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de estoque', 'error');
        esconderLoading();
    }
});

// ============================================
// 2. INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementosDOM() {
    console.log("🔍 Buscando elementos DOM...");
    
    searchInput = document.getElementById('searchInput');
    btnNovoProduto = document.getElementById('btnNovoProduto');
    btnRelatorioEstoque = document.getElementById('btnRelatorioEstoque');
    btnRefresh = document.getElementById('btnRefresh');
    filterStatus = document.getElementById('filterStatus');
    estoqueTableBody = document.getElementById('estoqueTableBody');
    totalProdutosElement = document.getElementById('totalProdutos');
    totalEstoqueElement = document.getElementById('totalEstoque');
    baixoEstoqueElement = document.getElementById('baixoEstoque');
    valorTotalElement = document.getElementById('valorTotal');
    currentCountElement = document.getElementById('currentCount');
    lastUpdateElement = document.getElementById('lastUpdate');
    userNameElement = document.getElementById('userName');
    btnLogout = document.getElementById('btnLogout');
    
    modalProduto = document.getElementById('modalProduto');
    formProduto = document.getElementById('formProduto');
    produtoIdInput = document.getElementById('produtoId');
    modalTitle = document.getElementById('modalTitle');
    
    codigoInput = document.getElementById('codigo');
    codigoBarrasInput = document.getElementById('codigo_barras'); // NOVO
    nomeInput = document.getElementById('nome');
    categoriaInput = document.getElementById('categoria');
    unidadeVendaSelect = document.getElementById('unidade_venda');
    precoCustoInput = document.getElementById('preco_custo');
    precoInput = document.getElementById('preco');
    quantidadeInput = document.getElementById('quantidade');
    estoqueMinimoInput = document.getElementById('estoque_minimo');
    descricaoTextarea = document.getElementById('descricao');
    fornecedorInput = document.getElementById('fornecedor');
    
    valorUnidadeInput = document.getElementById('valor_unidade');
    tipoUnidadeSelect = document.getElementById('tipo_unidade');
    totalEstoqueUnidadeInput = document.getElementById('total_estoque_unidade');
    totalEstoqueTipoSpan = document.getElementById('total_estoque_tipo');
    
    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('imagemProduto');
    previewImage = document.getElementById('previewImage');
    imagePreview = document.getElementById('imagePreview');
    
    uploadProgress = document.getElementById('uploadProgress');
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    imageStatus = document.getElementById('imageStatus');
    
    console.log("✅ Elementos DOM inicializados");
}

// ============================================
// 3. FUNÇÕES PARA UNIDADE COM VALOR
// ============================================
function calcularTotalUnidade() {
    if (!valorUnidadeInput || !quantidadeInput || !totalEstoqueUnidadeInput || !totalEstoqueTipoSpan) {
        return;
    }
    
    const valorUnidade = parseFloat(valorUnidadeInput.value) || 1; // Padrão 1 se não informado
    const quantidade = parseInt(quantidadeInput.value) || 0;
    const tipoUnidade = tipoUnidadeSelect ? tipoUnidadeSelect.value : 'unid';
    
    const totalUnidade = valorUnidade * quantidade;
    
    if (totalEstoqueUnidadeInput) {
        // Formatar com 2 casas decimais, exceto para valores inteiros
        if (Number.isInteger(totalUnidade)) {
            totalEstoqueUnidadeInput.value = totalUnidade;
        } else {
            totalEstoqueUnidadeInput.value = totalUnidade.toFixed(2);
        }
    }
    
    if (totalEstoqueTipoSpan) {
        totalEstoqueTipoSpan.textContent = tipoUnidade;
    }
}

function formatarQuantidadeComUnidade(quantidade, valorUnidade, tipoUnidade, unidadeVenda) {
    if (!quantidade || quantidade === 0) {
        return '0 ' + (unidadeVenda || 'UN');
    }
    
    // Formatar o valor da unidade
    if (valorUnidade && valorUnidade !== 1) {
        const valorLimpo = valorUnidade % 1 === 0 ? valorUnidade : valorUnidade.toFixed(1).replace(/\.0$/, '');
        
        const abreviacoes = {
            'unid': 'unid', 'kg': 'kg', 'g': 'g', 'ton': 't',
            'l': 'L', 'ml': 'mL', 'm': 'm', 'cm': 'cm',
            'm2': 'm²', 'm3': 'm³'
        };
        
        const unidadeAbreviada = abreviacoes[tipoUnidade] || tipoUnidade;
        
        // Formato: "4 UN - 175g"
        return `${quantidade} ${unidadeVenda || 'UN'} - ${valorLimpo}${unidadeAbreviada}`;
    }
    
    return `${quantidade} ${unidadeVenda || 'UN'}`;
}

// ============================================
// 4. GERENCIAMENTO DE IMAGENS
// ============================================
function inicializarUploadImagem() {
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processarImagemSelecionada(e.target.files[0]);
        }
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            processarImagemSelecionada(e.dataTransfer.files[0]);
        }
    });
}

function processarImagemSelecionada(file) {
    if (!file.type.startsWith('image/')) {
        mostrarMensagem('Selecione um arquivo de imagem válido', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        mostrarMensagem('Imagem muito grande. Máximo 5MB', 'error');
        return;
    }
    
    imagemAtual = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        imagemPreviewURL = e.target.result;
        mostrarPreviewImagem();
    };
    reader.readAsDataURL(file);
    
    if (imageStatus) {
        imageStatus.textContent = 'Pronto para enviar';
        imageStatus.className = 'status-pending';
    }
}

function mostrarPreviewImagem() {
    if (!imagemPreviewURL) return;
    
    if (previewImage) previewImage.src = imagemPreviewURL;
    if (imagePreview) imagePreview.style.display = 'block';
    if (uploadArea) uploadArea.style.display = 'none';
}

function trocarImagem() {
    if (fileInput) fileInput.click();
}

function removerImagem() {
    imagemAtual = null;
    imagemPreviewURL = null;
    imagemUploadResult = null;
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileInput) fileInput.value = '';
    if (previewImage) previewImage.src = '';
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (imageStatus) {
        imageStatus.textContent = '';
        imageStatus.className = '';
    }
}

async function verificarConfigImgBBCarregamento() {
    if (lojaServices.imgbbKey) {
        console.log('🔍 Verificando configuração do ImgBB...');
        
        try {
            const resultado = await imagemServices.testarConexao(lojaServices);
            
            if (resultado.success) {
                console.log('✅ ImgBB configurado corretamente!');
                console.log('📝 Modo: Conta independente por loja (sem álbum)');
            } else {
                console.warn('⚠️ ImgBB pode não estar funcionando:', resultado.error);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar ImgBB:', error);
        }
    } else {
        console.warn('⚠️ Loja não tem chave ImgBB configurada');
    }
}

async function fazerUploadImagem() {
    if (!imagemAtual) {
        return null;
    }
    
    try {
        mostrarProgressoUpload(0, 'Preparando...');
        
        console.log('📤 Iniciando upload de imagem...');
        
        const resultado = await imagemServices.uploadImagem(
            imagemAtual,
            `produto_${Date.now()}_${lojaServices.lojaId}`,
            lojaServices
        );
        
        if (resultado.success) {
            imagemUploadResult = resultado;
            mostrarProgressoUpload(100, 'Upload completo!');
            
            console.log('✅ Upload bem-sucedido:', resultado.url.substring(0, 50) + '...');
            
            if (imageStatus) {
                imageStatus.textContent = 'Imagem enviada com sucesso!';
                imageStatus.className = 'status-success';
            }
            
            return resultado;
        } else {
            throw new Error(resultado.error || 'Erro no upload');
        }
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        mostrarMensagem(`Erro ao enviar imagem: ${error.message}`, 'error');
        if (imageStatus) {
            imageStatus.textContent = 'Erro no upload';
            imageStatus.className = 'status-error';
        }
        return null;
    }
}

function mostrarProgressoUpload(percentual, texto) {
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (progressFill) progressFill.style.width = `${percentual}%`;
    if (progressPercent) progressPercent.textContent = texto;
}

function mostrarImagemExistente(imagens) {
    // Se não tem imagens ou a imagem é a padrão base64, não mostrar preview
    if (!imagens || !imagens.principal || imagens.principal === IMAGEM_PADRAO_BASE64) {
        removerImagem();
        return;
    }
    
    // Verificar se é uma URL externa (começa com http) ou base64
    if (imagens.principal.startsWith('http') || imagens.principal.startsWith('data:image')) {
        if (previewImage) previewImage.src = imagens.thumbnail || imagens.principal;
        if (imagePreview) imagePreview.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
        if (imageStatus) {
            imageStatus.textContent = 'Imagem carregada';
            imageStatus.className = 'status-success';
        }
        
        imagemUploadResult = {
            url: imagens.principal,
            thumb: imagens.thumbnail,
            medium: imagens.medium || imagens.principal,
            id: imagens.provider_id,
            uploaded_at: imagens.uploaded_at
        };
    } else {
        // Se for caminho antigo (/images/sem-foto.png), usar base64
        removerImagem();
    }
}
// ============================================
// 5. ATUALIZAR INTERFACE DA LOJA
// ============================================
function atualizarInterfaceLoja() {
    try {
        if (userNameElement) {
            userNameElement.textContent = lojaServices.nomeUsuario;
        }
        
        const resultadoLoja = lojaServices.dadosLoja;
        const nomeLoja = resultadoLoja?.nome || lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        document.title = `${nomeLoja} - Estoque`;
        
        const pageSubtitle = document.querySelector('.page-subtitle');
        if (pageSubtitle) {
            pageSubtitle.textContent = nomeLoja;
        }
        
        const footerText = document.querySelector('.main-footer p:first-child');
        if (footerText) {
            footerText.innerHTML = `<i class="fas fa-store"></i> ${nomeLoja} - Estoque`;
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface da loja:', error);
    }
}

// ============================================
// 6. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        await carregarCategorias();
        await carregarProdutos();
        atualizarEstatisticas();
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
        mostrarMensagem("Erro ao carregar dados do estoque", "error");
    }
}

// ============================================
// 7. CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...', 'Buscando estoque...');
        
        const resultado = await lojaServices.buscarProdutos();
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            console.log(`✅ ${produtos.length} produtos carregados`);
            
            renderizarProdutos();
            atualizarEstatisticas();
            
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            produtos = [];
            produtosFiltrados = [];
            
            if (estoqueTableBody) {
                estoqueTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Erro ao carregar estoque</p>
                            <small>${resultado.error || 'Tente novamente mais tarde'}</small>
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
        produtosFiltrados = [];
        
        if (estoqueTableBody) {
            estoqueTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar estoque</p>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// 8. CARREGAR CATEGORIAS
// ============================================
async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        if (resultado.success) {
            categorias = resultado.data;
            
            const categoriasList = document.getElementById('categoriasList');
            if (categoriasList) {
                categoriasList.innerHTML = '';
                categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria;
                    categoriasList.appendChild(option);
                });
            }
            
            console.log(`✅ ${categorias.length} categorias carregadas`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
    }
}

// ============================================
// 9. RENDERIZAR PRODUTOS NA TABELA
// ============================================
function renderizarProdutos() {
    if (!estoqueTableBody) return;
    
    console.log(`🔄 Renderizando ${produtosFiltrados.length} produtos...`);
    
    // Se não houver produtos
    if (produtosFiltrados.length === 0) {
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                    <small>${produtos.length === 0 ? 'Cadastre o primeiro produto' : 'Tente outro filtro'}</small>
                </td>
            </tr>
        `;
        
        if (currentCountElement) {
            currentCountElement.textContent = '0';
        }
        return;
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        // Determinar status do produto
        const statusClass = !produto.ativo ? 'status-inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'status-baixo' : 'status-ativo';
        
        const statusText = !produto.ativo ? 'Inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'Baixo' : 'Ativo';
        
        // Dados da unidade - CORRIGIDO
        const valorUnidade = produto.valor_unidade || produto.peso_por_unidade || 1;
        const tipoUnidade = produto.tipo_unidade || produto.unidade_peso || 'unid';
        const quantidade = produto.quantidade || 0;
        const unidadeVenda = produto.unidade_venda || 'UN';
        
        // URL da imagem
        const imagemUrl = produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const imagemThumb = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        
        // 🔥 CORREÇÃO: DECLARAR A VARIÁVEL UMA ÚNICA VEZ AQUI!
        const unidadeDisplay = formatarQuantidadeComUnidade(quantidade, valorUnidade, tipoUnidade, unidadeVenda);
        
        html += `
            <tr data-id="${produto.id}">
                <!-- COLUNA 1: Imagem -->
                <td class="imagem-cell">
                    <div class="produto-imagem-grande-container">
                        <img src="${imagemThumb}" 
                             alt="${produto.nome || 'Produto'}"
                             class="produto-imagem-grande"
                             onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                    </div>
                </td>
                
                <!-- COLUNA 2: Código -->
                <td class="codigo-cell">
                    <span class="codigo-badge">${produto.codigo || 'N/A'}</span>
                </td>
                
                <!-- COLUNA 3: Nome -->
                <td class="nome-cell">
                    <div class="produto-info">
                        <strong class="produto-nome">${produto.nome || 'Produto sem nome'}</strong>
                        ${produto.descricao ? `
                            <div class="produto-descricao">
                                <small class="text-muted">${produto.descricao.substring(0, 60)}${produto.descricao.length > 60 ? '...' : ''}</small>
                            </div>
                        ` : ''}
                    </div>
                </td>
                
                <!-- COLUNA 4: Categoria -->
                <td class="categoria-cell">
                    <span class="categoria-badge">${produto.categoria || 'Sem categoria'}</span>
                </td>
                
                <!-- COLUNA 5: Unidade - AGORA CORRETO -->
                <td class="unidade-cell">
                    <div class="unidade-info">
                        <span class="unidade-valor">${unidadeDisplay}</span>
                    </div>
                </td>
                
                <!-- COLUNA 6: Estoque Mínimo -->
                <td class="minimo-cell">${produto.estoque_minimo || 5}</td>
                
                <!-- COLUNA 7: Preço Custo -->
                <td class="custo-cell">${formatarMoeda(produto.preco_custo || 0)}</td>
                
                <!-- COLUNA 8: Preço Venda -->
                <td class="venda-cell">
                    <strong class="preco-venda">${formatarMoeda(produto.preco || 0)}</strong>
                </td>
                
                <!-- COLUNA 9: Status (CLICÁVEL) -->
                <td class="status-cell">
                    <button class="status-toggle ${statusClass}" 
                            data-id="${produto.id}" 
                            data-status="${produto.ativo ? 'ativo' : 'inativo'}"
                            title="Clique para alterar status">
                        <i class="status-icon ${statusClass === 'status-ativo' ? 'fas fa-check-circle' : 
                                             statusClass === 'status-baixo' ? 'fas fa-exclamation-circle' : 
                                             'fas fa-times-circle'}"></i>
                        ${statusText}
                    </button>
                </td>
                
                <!-- COLUNA 10: Ações COM CONTADOR E BOTÕES -->
                <td class="acoes-cell">
                    <div class="acoes-botoes" data-id="${produto.id}">
                        <!-- CONTADOR DE ESTOQUE -->
                        <div class="estoque-contador">
                            <div class="contador-controls">
                                <button class="btn-contador btn-diminuir" data-id="${produto.id}" title="Diminuir">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="contador-input" 
                                       data-id="${produto.id}" 
                                       value="${quantidade}" 
                                       min="0" 
                                       max="99999" 
                                       data-original="${quantidade}"
                                       title="Quantidade em estoque">
                                <button class="btn-contador btn-aumentar" data-id="${produto.id}" title="Aumentar">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="btn-salvar-estoque" 
                                    data-id="${produto.id}" 
                                    title="Salvar alteração do estoque"
                                    style="display: none;">
                                <i class="fas fa-check"></i>
                                Salvar
                            </button>
                        </div>
                        
                        <!-- BOTÕES DE AÇÃO -->
                        <div class="acoes-rapidas">
                            <!-- EDITAR (CAIXINHA) -->
                            <button class="btn-acao btn-editar" title="Editar Produto" data-id="${produto.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            
                            <!-- EXCLUIR (X VERMELHO) -->
                            <button class="btn-acao btn-excluir" title="Excluir Produto" data-id="${produto.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    estoqueTableBody.innerHTML = html;
    
    // Atualizar contador
    if (currentCountElement) {
        currentCountElement.textContent = produtosFiltrados.length.toLocaleString('pt-BR');
    }
    
    // Configurar eventos dos botões de ação
    configurarBotoesAcao();
    
    // Configurar eventos dos botões de status
    configurarStatusToggle();
    
    // Configurar eventos do contador de estoque
    configurarContadorEstoque();
    
    console.log(`✅ ${produtosFiltrados.length} produtos renderizados`);
}

// ============================================
// 10. CONFIGURAR CONTADOR DE ESTOQUE
// ============================================
function configurarContadorEstoque() {
    console.log('⚙️ Configurando contador de estoque...');
    
    // 1. BOTÕES DE AUMENTAR E DIMINUIR
    document.querySelectorAll('.btn-contador').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const isAumentar = this.classList.contains('btn-aumentar');
            const input = document.querySelector(`.contador-input[data-id="${produtoId}"]`);
            
            if (!input) return;
            
            let valor = parseInt(input.value) || 0;
            
            if (isAumentar) {
                valor++;
            } else {
                valor = Math.max(0, valor - 1);
            }
            
            input.value = valor;
            
            // Verificar se houve alteração
            const original = parseInt(input.getAttribute('data-original')) || 0;
            const btnSalvar = document.querySelector(`.btn-salvar-estoque[data-id="${produtoId}"]`);
            
            if (btnSalvar) {
                if (valor !== original) {
                    btnSalvar.style.display = 'block';
                    input.classList.add('modified');
                } else {
                    btnSalvar.style.display = 'none';
                    input.classList.remove('modified');
                }
            }
        });
    });
    
    // 2. INPUT DE QUANTIDADE
    document.querySelectorAll('.contador-input').forEach(input => {
        input.addEventListener('input', function(e) {
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            let valor = parseInt(this.value) || 0;
            
            // Garantir valores válidos
            if (valor < 0) {
                valor = 0;
                this.value = valor;
            }
            
            if (valor > 99999) {
                valor = 99999;
                this.value = valor;
            }
            
            // Verificar se houve alteração
            const original = parseInt(this.getAttribute('data-original')) || 0;
            const btnSalvar = document.querySelector(`.btn-salvar-estoque[data-id="${produtoId}"]`);
            
            if (btnSalvar) {
                if (valor !== original) {
                    btnSalvar.style.display = 'block';
                    this.classList.add('modified');
                } else {
                    btnSalvar.style.display = 'none';
                    this.classList.remove('modified');
                }
            }
        });
        
        // Validar ao perder o foco
        input.addEventListener('blur', function() {
            let valor = parseInt(this.value) || 0;
            
            if (valor < 0) {
                valor = 0;
                this.value = valor;
            }
            
            // Atualizar visualmente se for 0
            if (valor === 0) {
                this.classList.add('zero-stock');
            } else {
                this.classList.remove('zero-stock');
            }
        });
    });
    
    // 3. BOTÃO SALVAR ALTERAÇÃO
    document.querySelectorAll('.btn-salvar-estoque').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const input = document.querySelector(`.contador-input[data-id="${produtoId}"]`);
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!input || !produto) return;
            
            const novaQuantidade = parseInt(input.value) || 0;
            const quantidadeOriginal = parseInt(input.getAttribute('data-original')) || 0;
            
            // Verificar se realmente mudou
            if (novaQuantidade === quantidadeOriginal) {
                this.style.display = 'none';
                input.classList.remove('modified');
                return;
            }
            
            // Calcular diferença para registrar como entrada ou saída
            const diferenca = novaQuantidade - quantidadeOriginal;
            
            if (diferenca === 0) {
                mostrarMensagem('Quantidade não alterada', 'info');
                return;
            }
            
            try {
                mostrarLoading('Atualizando estoque...', 'Aguarde...');
                
                // Determinar tipo (entrada ou saída)
                const tipo = diferenca > 0 ? 'entrada' : 'saida';
                const quantidadeAbs = Math.abs(diferenca);
                
                // Atualizar estoque
                const resultado = await lojaServices.atualizarEstoque(
                    produtoId, 
                    quantidadeAbs, 
                    tipo
                );
                
                if (resultado.success) {
                    // Atualizar valor original
                    input.setAttribute('data-original', novaQuantidade);
                    
                    // Esconder botão salvar
                    this.style.display = 'none';
                    input.classList.remove('modified');
                    
                    // Atualizar lista local
                    const produtoIndex = produtos.findIndex(p => p.id === produtoId);
                    if (produtoIndex !== -1) {
                        produtos[produtoIndex].quantidade = novaQuantidade;
                    }
                    
                    // Atualizar estatísticas
                    atualizarEstatisticas();
                    
                    // Mostrar mensagem
                    if (tipo === 'entrada') {
                        mostrarMensagem(`+${quantidadeAbs} unidade(s) adicionada(s) ao estoque!`, 'success');
                    } else {
                        mostrarMensagem(`-${quantidadeAbs} unidade(s) removida(s) do estoque!`, 'warning');
                    }
                    
                } else {
                    // Reverter valor no input
                    input.value = quantidadeOriginal;
                    this.style.display = 'none';
                    input.classList.remove('modified');
                    
                    mostrarMensagem(resultado.error || 'Erro ao atualizar estoque', 'error');
                }
                
            } catch (error) {
                console.error('❌ Erro ao atualizar estoque:', error);
                
                // Reverter valor no input
                input.value = quantidadeOriginal;
                this.style.display = 'none';
                input.classList.remove('modified');
                
                mostrarMensagem('Erro ao atualizar estoque', 'error');
            } finally {
                esconderLoading();
            }
        });
    });
    
    console.log('✅ Contador de estoque configurado');
}

// ============================================
// 11. CONFIGURAR BOTÕES DE AÇÃO
// ============================================
function configurarBotoesAcao() {
    console.log('⚙️ Configurando botões de ação...');
    
    // 1. BOTÃO "EDITAR" (CAIXINHA)
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            abrirModalEditar(produtoId);
        });
    });
    
    // 2. BOTÃO "EXCLUIR" (X VERMELHO)
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!produto) return;
            
            if (confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?\n\nEsta ação é permanente e não pode ser desfeita!`)) {
                await excluirProduto(produto);
            }
        });
    });
    
    console.log('✅ Botões de ação configurados');
}

// ============================================
// 12. CONFIGURAR TOGGLE DE STATUS
// ============================================
function configurarStatusToggle() {
    console.log('⚙️ Configurando botões de status...');
    
    document.querySelectorAll('.status-toggle').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const currentStatus = this.getAttribute('data-status');
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!produto) {
                console.error('❌ Produto não encontrado');
                return;
            }
            
            console.log(`🔄 Alterando status do produto: ${produto.nome}`);
            console.log(`📊 Status atual: ${currentStatus}`);
            
            // Mostrar modal de seleção
            const novoStatus = await mostrarModalSelecaoStatus(produto, currentStatus);
            
            if (novoStatus !== null) {
                await alterarStatusProduto(produto, novoStatus);
            }
        });
    });
    
    console.log('✅ Botões de status configurados');
}

// ============================================
// 13. MOSTRAR MODAL DE SELEÇÃO DE STATUS
// ============================================
// ============================================
// 13. MOSTRAR MODAL DE SELEÇÃO DE STATUS
// ============================================
async function mostrarModalSelecaoStatus(produto, currentStatus) {
    return new Promise((resolve) => {
        // Criar modal
        const modalHTML = `
            <div class="modal-status-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s;
            ">
                <div class="modal-status" style="
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    overflow: hidden;
                    transform: scale(0.9);
                    transition: transform 0.3s;
                ">
                    <div class="modal-status-header" style="
                        background: linear-gradient(135deg, #2c3e50, #3498db);
                        color: white;
                        padding: 1rem 1.5rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-exchange-alt"></i>
                            Alterar Status
                        </h3>
                        <button class="modal-status-close" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 1.5rem;
                            cursor: pointer;
                            padding: 0;
                            line-height: 1;
                        ">&times;</button>
                    </div>
                    <div class="modal-status-body" style="padding: 1.5rem;">
                        <div style="margin-bottom: 1rem;">
                            <p style="margin: 0 0 5px 0;"><strong>Produto:</strong> ${produto.nome}</p>
                            <p style="margin: 0 0 5px 0;"><strong>Código:</strong> ${produto.codigo || 'N/A'}</p>
                            <p style="margin: 0 0 15px 0;">
                                <strong>Status atual:</strong> 
                                <span style="
                                    display: inline-block;
                                    padding: 4px 10px;
                                    border-radius: 20px;
                                    font-size: 0.85rem;
                                    font-weight: 600;
                                    background: ${currentStatus === 'ativo' ? '#d4edda' : '#f8d7da'};
                                    color: ${currentStatus === 'ativo' ? '#155724' : '#721c24'};
                                ">
                                    ${currentStatus === 'ativo' ? 'Ativo' : 'Inativo'}
                                </span>
                            </p>
                        </div>
                        
                        <div class="status-options" style="display: flex; flex-direction: column; gap: 10px;">
                            <button class="btn-status-option btn-status-ativo" data-status="ativo" style="
                                padding: 12px 16px;
                                border: 1px solid #dee2e6;
                                border-radius: 6px;
                                background: white;
                                cursor: pointer;
                                text-align: left;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                gap: 12px;
                            ">
                                <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.2rem;"></i>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #2c3e50;">Ativo</div>
                                    <small style="color: #6c757d; font-size: 0.85rem;">Produto disponível para venda</small>
                                </div>
                            </button>
                            
                            <button class="btn-status-option btn-status-inativo" data-status="inativo" style="
                                padding: 12px 16px;
                                border: 1px solid #dee2e6;
                                border-radius: 6px;
                                background: white;
                                cursor: pointer;
                                text-align: left;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                gap: 12px;
                            ">
                                <i class="fas fa-times-circle" style="color: #dc3545; font-size: 1.2rem;"></i>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #2c3e50;">Inativo</div>
                                    <small style="color: #6c757d; font-size: 0.85rem;">Produto indisponível para venda</small>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="modal-status-footer" style="
                        padding: 1rem 1.5rem;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: flex-end;
                    ">
                        <button class="btn-cancelar-status" style="
                            padding: 8px 16px;
                            border: 1px solid #ddd;
                            background: white;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        const modal = modalContainer.querySelector('.modal-status-overlay');
        const modalContent = modal.querySelector('.modal-status');
        
        // Configurar eventos
        const closeBtn = modal.querySelector('.modal-status-close');
        const cancelBtn = modal.querySelector('.btn-cancelar-status');
        const statusOptions = modal.querySelectorAll('.btn-status-option');
        
        // Fechar modal
        const fecharModal = () => {
            modal.style.opacity = '0';
            modalContent.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (modalContainer.parentNode) {
                    document.body.removeChild(modalContainer);
                }
                resolve(null); // Retorna null se cancelado
            }, 300);
        };
        
        // Evento de fechar
        closeBtn.addEventListener('click', fecharModal);
        cancelBtn.addEventListener('click', fecharModal);
        
        // Evento de clique fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModal();
            }
        });
        
        // Evento de seleção de status
        statusOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedStatus = option.getAttribute('data-status');
                console.log(`✅ Status selecionado: ${selectedStatus}`);
                
                // Adicionar feedback visual
                option.style.background = selectedStatus === 'ativo' ? '#e7f5ec' : '#fdf2f2';
                option.style.borderColor = selectedStatus === 'ativo' ? '#28a745' : '#dc3545';
                
                // Fechar modal após breve delay
                setTimeout(() => {
                    fecharModal();
                    setTimeout(() => {
                        resolve(selectedStatus); // Retorna o status selecionado
                    }, 100);
                }, 200);
            });
        });
        
        // Adicionar estilos de hover
        statusOptions.forEach(option => {
            option.addEventListener('mouseenter', function() {
                const status = this.getAttribute('data-status');
                if (status === 'ativo') {
                    this.style.background = '#e7f5ec';
                    this.style.borderColor = '#28a745';
                } else {
                    this.style.background = '#fdf2f2';
                    this.style.borderColor = '#dc3545';
                }
            });
            
            option.addEventListener('mouseleave', function() {
                this.style.background = 'white';
                this.style.borderColor = '#dee2e6';
            });
        });
        
        // Animar entrada do modal
        setTimeout(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';
        }, 10);
        
        // Adicionar evento de teclado (ESC para fechar)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                fecharModal();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        // Limpar evento quando o modal for fechado
        setTimeout(() => {
            const checkModal = () => {
                if (!document.body.contains(modalContainer)) {
                    document.removeEventListener('keydown', handleKeyDown);
                } else {
                    setTimeout(checkModal, 100);
                }
            };
            checkModal();
        }, 1000);
    });
}

// ============================================
// 14. ALTERAR STATUS DO PRODUTO
// ============================================
async function alterarStatusProduto(produto, novoStatus) {
    if (!produto) return;
    
    try {
        mostrarLoading('Alterando status...', 'Aguarde...');
        
        const novoAtivo = novoStatus === 'ativo';
        
        // Verificar se realmente precisa alterar
        if (produto.ativo === novoAtivo) {
            mostrarMensagem(`O produto já está ${novoAtivo ? 'ativo' : 'inativo'}`, 'info');
            esconderLoading();
            return;
        }
        
        // Atualizar no Firebase
        const resultado = await lojaServices.atualizarProduto(produto.id, {
            ativo: novoAtivo,
            data_atualizacao: new Date().toISOString()
        });
        
        if (resultado.success) {
            mostrarMensagem(`Status alterado para ${novoStatus === 'ativo' ? 'Ativo' : 'Inativo'}!`, 'success');
            
            // Atualizar lista local
            const produtoIndex = produtos.findIndex(p => p.id === produto.id);
            if (produtoIndex !== -1) {
                produtos[produtoIndex].ativo = novoAtivo;
            }
            
            // Re-renderizar produtos
            renderizarProdutos();
            atualizarEstatisticas();
            
        } else {
            mostrarMensagem(resultado.error || 'Erro ao alterar status', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao alterar status do produto:', error);
        mostrarMensagem('Erro ao alterar status do produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 15. PROCESSAR ENTRADA DE ESTOQUE
// ============================================
async function processarEntradaEstoque(produtoId, quantidade) {
    try {
        mostrarLoading('Processando entrada...', 'Aguarde...');
        
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        
        const resultado = await lojaServices.atualizarEstoque(
            produtoId, 
            quantidade, 
            'entrada'
        );
        
        if (resultado.success) {
            mostrarMensagem(`${quantidade} unidade(s) adicionada(s) ao estoque!`, 'success');
            await carregarProdutos();
        } else {
            mostrarMensagem(resultado.error || 'Erro ao registrar entrada', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar entrada:', error);
        mostrarMensagem('Erro ao processar entrada de estoque', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 16. PROCESSAR SAÍDA DE ESTOQUE
// ============================================
async function processarSaidaEstoque(produtoId, quantidade) {
    try {
        mostrarLoading('Processando saída...', 'Aguarde...');
        
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        
        if (produto.quantidade < quantidade) {
            mostrarMensagem(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'error');
            return;
        }
        
        const resultado = await lojaServices.atualizarEstoque(
            produtoId, 
            quantidade, 
            'saida'
        );
        
        if (resultado.success) {
            mostrarMensagem(`${quantidade} unidade(s) removida(s) do estoque!`, 'warning');
            await carregarProdutos();
        } else {
            mostrarMensagem(resultado.error || 'Erro ao registrar saída', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar saída:', error);
        mostrarMensagem('Erro ao processar saída de estoque', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 17. FILTRAR PRODUTOS
// ============================================
function filtrarProdutos() {
    if (!searchInput || !filterStatus) return;
    
    const termoBusca = searchInput.value.toLowerCase().trim();
    const statusSelecionado = filterStatus.value;
    
    produtosFiltrados = produtos.filter(produto => {
        if (termoBusca) {
            const buscaNome = (produto.nome || '').toLowerCase().includes(termoBusca);
            const buscaCodigo = (produto.codigo || '').toLowerCase().includes(termoBusca);
            const buscaDescricao = (produto.descricao || '').toLowerCase().includes(termoBusca);
            const buscaCategoria = (produto.categoria || '').toLowerCase().includes(termoBusca);
            
            if (!(buscaNome || buscaCodigo || buscaDescricao || buscaCategoria)) {
                return false;
            }
        }
        
        if (statusSelecionado === 'ativo' && !produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'inativo' && produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'baixo' && 
            (produto.quantidade > produto.estoque_minimo || !produto.ativo)) {
            return false;
        }
        
        return true;
    });
    
    renderizarProdutos();
    atualizarEstatisticas();
}

// ============================================
// 18. ATUALIZAR ESTATÍSTICAS
// ============================================
function atualizarEstatisticas() {
    if (!totalProdutosElement || !totalEstoqueElement || 
        !baixoEstoqueElement || !valorTotalElement) {
        return;
    }
    
    if (!produtosFiltrados || produtosFiltrados.length === 0) {
        totalProdutosElement.textContent = '0';
        totalEstoqueElement.textContent = '0';
        baixoEstoqueElement.textContent = '0';
        valorTotalElement.textContent = 'R$ 0,00';
        return;
    }
    
    const produtosAtivos = produtosFiltrados.filter(p => p.ativo);
    
    const totalProdutos = produtosAtivos.length;
    const totalEstoque = produtosAtivos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    const baixoEstoque = produtosAtivos.filter(p => p.quantidade <= p.estoque_minimo).length;
    const valorTotal = produtosAtivos.reduce((sum, p) => {
        const valor = (p.preco_custo || 0) * (p.quantidade || 0);
        return sum + valor;
    }, 0);
    
    totalProdutosElement.textContent = totalProdutos.toLocaleString('pt-BR');
    totalEstoqueElement.textContent = totalEstoque.toLocaleString('pt-BR');
    baixoEstoqueElement.textContent = baixoEstoque.toLocaleString('pt-BR');
    valorTotalElement.textContent = formatarMoeda(valorTotal);
}

// ============================================
// 19. MODAL - NOVO PRODUTO
// ============================================
function abrirModalNovoProduto() {
    if (!produtoIdInput || !modalTitle || !formProduto) {
        mostrarMensagem('Erro: Elementos do modal não encontrados', 'error');
        return;
    }
    
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    if (codigoInput) {
        const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
        codigoInput.value = `${prefixo}-${Date.now().toString().slice(-6)}`;
    }
    
    // LIMPAR CÓDIGO DE BARRAS
    if (codigoBarrasInput) {
        codigoBarrasInput.value = '';
        codigoBarrasInput.classList.remove('barcode-duplicate', 'barcode-valid');
    }
    
    // Remover feedback
    const feedback = document.getElementById('codigoBarrasFeedback');
    if (feedback) feedback.style.display = 'none';
    
    if (categoriaInput) {
        const datalist = document.getElementById('categoriasList');
        if (datalist) {
            datalist.innerHTML = '';
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                datalist.appendChild(option);
            });
        }
        categoriaInput.value = '';
    }
    
    if (quantidadeInput) quantidadeInput.value = '0';
    if (estoqueMinimoInput) estoqueMinimoInput.value = '5';
    if (precoCustoInput) precoCustoInput.value = '0.00';
    if (precoInput) precoInput.value = '0.00';
    if (valorUnidadeInput) valorUnidadeInput.value = '1';
    if (tipoUnidadeSelect) tipoUnidadeSelect.value = 'unid';
    
    calcularTotalUnidade();
    removerImagem();
    
    if (modalProduto) {
        modalProduto.style.display = 'flex';
    }
}

// ============================================
// 20. MODAL - EDITAR PRODUTO
// ============================================
async function abrirModalEditar(produtoId) {
    try {
        mostrarLoading('Carregando produto...', 'Aguarde...');
        
        const resultado = await lojaServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            produtoIdInput.value = produto.id;
            modalTitle.textContent = 'Editar Produto';
            
            if (codigoInput) codigoInput.value = produto.codigo || '';
            
            // CARREGAR CÓDIGO DE BARRAS
            if (codigoBarrasInput) {
                codigoBarrasInput.value = produto.codigo_barras || '';
                codigoBarrasInput.classList.remove('barcode-duplicate', 'barcode-valid');
            }
            
            if (nomeInput) nomeInput.value = produto.nome || '';
            if (categoriaInput) categoriaInput.value = produto.categoria || '';
            if (unidadeVendaSelect) unidadeVendaSelect.value = produto.unidade_venda || produto.unidade || 'UN';
            
            if (valorUnidadeInput) {
                if (produto.valor_unidade !== undefined) {
                    valorUnidadeInput.value = produto.valor_unidade;
                } else if (produto.peso_por_unidade !== undefined) {
                    valorUnidadeInput.value = produto.peso_por_unidade;
                } else {
                    valorUnidadeInput.value = 1;
                }
            }
            
            if (tipoUnidadeSelect) {
                if (produto.tipo_unidade !== undefined) {
                    tipoUnidadeSelect.value = produto.tipo_unidade;
                } else if (produto.unidade_peso !== undefined) {
                    tipoUnidadeSelect.value = produto.unidade_peso;
                } else {
                    tipoUnidadeSelect.value = 'unid';
                }
            }
            
            if (precoCustoInput) precoCustoInput.value = produto.preco_custo || 0;
            if (precoInput) precoInput.value = produto.preco || 0;
            if (quantidadeInput) quantidadeInput.value = produto.quantidade || 0;
            if (estoqueMinimoInput) estoqueMinimoInput.value = produto.estoque_minimo || 5;
            if (descricaoTextarea) descricaoTextarea.value = produto.descricao || '';
            if (fornecedorInput) fornecedorInput.value = produto.fornecedor || '';
            
            setTimeout(() => {
                calcularTotalUnidade();
            }, 100);

            if (produto.imagens && produto.imagens.principal) {
                mostrarImagemExistente(produto.imagens);
            } else {
                removerImagem();
            }
            
            if (modalProduto) {
                modalProduto.style.display = 'flex';
            }
            
        } else {
            mostrarMensagem('Produto não encontrado', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        mostrarMensagem('Erro ao carregar produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 21. SALVAR PRODUTO
// ============================================
async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        mostrarLoading('Salvando produto...', 'Aguarde...');
        
        if (!nomeInput || !nomeInput.value.trim()) {
            throw new Error('Nome do produto é obrigatório');
        }
        
        if (!precoInput || parseFloat(precoInput.value) <= 0) {
            throw new Error('Preço de venda deve ser maior que zero');
        }
        
        const quantidade = parseInt(quantidadeInput ? quantidadeInput.value : 0);
        if (isNaN(quantidade) || quantidade < 0) {
            throw new Error('Quantidade deve ser um número positivo ou zero');
        }
        
        const estoqueMinimo = parseInt(estoqueMinimoInput ? estoqueMinimoInput.value : 5);
        if (isNaN(estoqueMinimo) || estoqueMinimo < 0) {
            throw new Error('Estoque mínimo deve ser um número positivo ou zero');
        }
        
        const valorUnidade = parseFloat(valorUnidadeInput ? valorUnidadeInput.value.replace(',', '.') : 1) || 1;
        const tipoUnidade = tipoUnidadeSelect ? tipoUnidadeSelect.value : 'unid';
        
        // VALIDAR CÓDIGO DE BARRAS
        const codigoBarras = codigoBarrasInput ? codigoBarrasInput.value.trim() : '';
        
        if (codigoBarras) {
            const duplicado = await gerenciadorCodigoBarras.verificarCodigoDuplicado(
                codigoBarras, 
                produtoIdInput.value
            );
            
            if (duplicado) {
                throw new Error('❌ Este código de barras já está cadastrado para outro produto!');
            }
        }
        
        // PROCESSAR IMAGEM
        let dadosImagem = null;
        
        if (imagemAtual instanceof File) {
            console.log('📤 Nova imagem detectada, fazendo upload...');
            mostrarLoading('Enviando imagem...', 'Aguarde um momento...');
            
            const uploadResult = await fazerUploadImagem();
            
            if (uploadResult && uploadResult.success && uploadResult.url) {
                dadosImagem = {
                    imagens: {
                        principal: uploadResult.url,
                        thumbnail: uploadResult.thumb || uploadResult.url,
                        medium: uploadResult.medium || uploadResult.url,
                        provider: 'imgbb',
                        provider_id: uploadResult.id || `imgbb_${Date.now()}`,
                        uploaded_at: new Date().toISOString()
                    }
                };
                console.log('✅ Upload de imagem bem-sucedido');
            } else {
                dadosImagem = {
                    imagens: {
                        principal: IMAGEM_PADRAO_BASE64,
                        thumbnail: IMAGEM_PADRAO_BASE64,
                        medium: IMAGEM_PADRAO_BASE64,
                        provider: 'local',
                        provider_id: `local_${Date.now()}`,
                        uploaded_at: new Date().toISOString()
                    }
                };
            }
            mostrarLoading('Salvando produto...', 'Finalizando...');
        } 
        else if (imagemUploadResult && imagemUploadResult.url) {
            dadosImagem = {
                imagens: {
                    principal: imagemUploadResult.url,
                    thumbnail: imagemUploadResult.thumb || imagemUploadResult.url,
                    medium: imagemUploadResult.medium || imagemUploadResult.url,
                    provider: imagemUploadResult.provider || 'imgbb',
                    provider_id: imagemUploadResult.id || `imgbb_${Date.now()}`,
                    uploaded_at: imagemUploadResult.uploaded_at || new Date().toISOString()
                }
            };
        }
        else {
            dadosImagem = {
                imagens: {
                    principal: IMAGEM_PADRAO_BASE64,
                    thumbnail: IMAGEM_PADRAO_BASE64,
                    medium: IMAGEM_PADRAO_BASE64,
                    provider: 'local',
                    provider_id: `local_${Date.now()}`,
                    uploaded_at: new Date().toISOString()
                }
            };
        }
        
        const dadosProduto = {
            codigo: codigoInput ? codigoInput.value.trim() : '',
            codigo_barras: codigoBarras, // NOVO CAMPO
            nome: nomeInput.value.trim(),
            categoria: categoriaInput ? categoriaInput.value.trim() : 'Sem Categoria',
            unidade_venda: unidadeVendaSelect ? unidadeVendaSelect.value : 'UN',
            valor_unidade: valorUnidade,
            tipo_unidade: tipoUnidade,
            peso_por_unidade: valorUnidade, // compatibilidade
            unidade_peso: tipoUnidade, // compatibilidade
            preco_custo: precoCustoInput ? parseFloat(precoCustoInput.value) || 0 : 0,
            preco: precoInput ? parseFloat(precoInput.value) || 0 : 0,
            quantidade: quantidade,
            estoque_minimo: estoqueMinimo,
            descricao: descricaoTextarea ? descricaoTextarea.value.trim() : '',
            fornecedor: fornecedorInput ? fornecedorInput.value.trim() : '',
            ativo: true,
            data_cadastro: produtoIdInput.value ? (await lojaServices.buscarProdutoPorId(produtoIdInput.value)).data?.data_cadastro || new Date().toISOString() : new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            loja_id: lojaServices.lojaId,
            loja_nome: lojaServices.dadosLoja?.nome || lojaServices.lojaId
        };
        
        if (dadosProduto.preco <= 0) {
            throw new Error('O preço de venda deve ser maior que R$ 0,00');
        }
        
        Object.assign(dadosProduto, dadosImagem);
        
        const produtoId = produtoIdInput.value;
        let resultadoFirebase = null;
        
        if (produtoId) {
            console.log(`✏️ Atualizando produto ${produtoId}...`);
            resultadoFirebase = await lojaServices.atualizarProduto(produtoId, dadosProduto);
            mostrarMensagem('✅ Produto atualizado com sucesso!', 'success');
        } else {
            console.log('🆕 Cadastrando novo produto...');
            resultadoFirebase = await lojaServices.cadastrarProduto(dadosProduto);
            mostrarMensagem('✅ Produto cadastrado com sucesso!', 'success');
        }
        
        if (!resultadoFirebase || !resultadoFirebase.success) {
            throw new Error(resultadoFirebase?.error || 'Erro ao salvar no banco de dados');
        }
        
        // LIMPAR ESTADO
        imagemAtual = null;
        imagemPreviewURL = null;
        imagemUploadResult = null;
        
        if (gerenciadorCodigoBarras && gerenciadorCodigoBarras.modoScanAtivo) {
            gerenciadorCodigoBarras.desativarModoScan();
        }
        
        if (modalProduto) {
            modalProduto.style.display = 'none';
        }
        
        if (formProduto) {
            formProduto.reset();
            if (quantidadeInput) quantidadeInput.value = '0';
            if (estoqueMinimoInput) estoqueMinimoInput.value = '5';
            if (precoCustoInput) precoCustoInput.value = '0.00';
            if (precoInput) precoInput.value = '0.00';
            if (valorUnidadeInput) valorUnidadeInput.value = '1';
            if (tipoUnidadeSelect) tipoUnidadeSelect.value = 'unid';
            if (codigoBarrasInput) codigoBarrasInput.value = ''; // LIMPAR
            calcularTotalUnidade();
        }
        
        removerImagem();
        await carregarProdutos();
        atualizarEstatisticas();
        
    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        mostrarMensagem(error.message || 'Erro ao salvar produto', 'error');
    } finally {
        esconderLoading();
    }
}
// ============================================
// 22. EXCLUIR PRODUTO
// ============================================
async function excluirProduto(produto) {
    if (!produto) return;
    
    try {
        mostrarLoading('Excluindo produto...', 'Esta ação é permanente...');
        
        // Primeiro, atualizar o produto para remover a imagem do ImgBB
        // e colocar a imagem base64 padrão antes de excluir
        if (produto.imagens && produto.imagens.provider === 'imgbb') {
            console.log('🖼️ Removendo imagem do produto antes da exclusão...');
            
            // Atualizar produto com imagem base64 padrão
            const produtoAtualizado = {
                ...produto,
                imagens: {
                    principal: IMAGEM_PADRAO_BASE64,
                    thumbnail: IMAGEM_PADRAO_BASE64,
                    medium: IMAGEM_PADRAO_BASE64,
                    provider: 'local',
                    provider_id: `local_${Date.now()}`,
                    uploaded_at: new Date().toISOString()
                },
                data_atualizacao: new Date().toISOString()
            };
            
            // Remover campos desnecessários antes de atualizar
            delete produtoAtualizado.id;
            delete produtoAtualizado.createdAt;
            delete produtoAtualizado.updatedAt;
            
            await lojaServices.atualizarProduto(produto.id, produtoAtualizado);
            console.log('✅ Imagem substituída por base64 padrão');
        }
        
        // Agora excluir o produto
        const resultado = await lojaServices.excluirProduto(produto.id);
        
        if (resultado.success) {
            mostrarMensagem('Produto excluído permanentemente!', 'success');
            
            await carregarProdutos();
            
        } else {
            mostrarMensagem(resultado.error || 'Erro ao excluir produto', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        mostrarMensagem('Erro ao excluir produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 23. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
    }
    
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async function() {
            await carregarProdutos();
            mostrarMensagem('Estoque atualizado', 'success');
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filtrarProdutos);
    }
    
    if (btnRelatorioEstoque) {
        btnRelatorioEstoque.addEventListener('click', function() {
            mostrarMensagem('Relatório em desenvolvimento', 'info');
        });
    }
    
    const modalClose = modalProduto?.querySelector('.modal-close');
    const btnCancel = document.querySelector('.btn-cancel');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    if (modalProduto) {
        modalProduto.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
    }

    // Eventos para cálculo automático da unidade
    if (quantidadeInput) {
        quantidadeInput.addEventListener('input', calcularTotalUnidade);
    }
    if (valorUnidadeInput) {
        valorUnidadeInput.addEventListener('input', calcularTotalUnidade);
    }
    if (tipoUnidadeSelect) {
        tipoUnidadeSelect.addEventListener('change', function() {
            if (totalEstoqueTipoSpan) {
                totalEstoqueTipoSpan.textContent = this.value;
            }
            calcularTotalUnidade();
        });
    }
    
    inicializarUploadImagem();
    
    const btnChange = document.querySelector('.btn-change');
    const btnRemove = document.querySelector('.btn-remove');
    
    if (btnChange) {
        btnChange.addEventListener('click', trocarImagem);
    }
    
    if (btnRemove) {
        btnRemove.addEventListener('click', removerImagem);
    }
    
    console.log("✅ Eventos configurados com sucesso");
}

// ============================================
// 24. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function atualizarUltimaAtualizacao() {
    if (lastUpdateElement) {
        const agora = new Date();
        const horaFormatada = agora.toLocaleTimeString('pt-BR');
        lastUpdateElement.textContent = `Última atualização: ${horaFormatada}`;
    }
}

function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail') || loading.querySelector('p');
        
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 4000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    const icon = alert.querySelector('.message-icon');
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    const closeBtn = alert.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

// ============================================
// 25. EXPORTAÇÃO PARA ESCOPO GLOBAL
// ============================================
window.trocarImagem = trocarImagem;
window.removerImagem = removerImagem;

console.log("✅ Sistema de estoque dinâmico completamente carregado!");

// ============================================
// CLASSE: GerenciadorCodigoBarras
// ============================================
// Gerencia leitura, validação e geração de códigos de barras
// ============================================
class GerenciadorCodigoBarras {
    constructor() {
        this.modoScanAtivo = false;
        this.bufferScan = '';
        this.scanTimer = null;
        this.leitorConectado = false;
        this.inputAtual = null;
        this.callbackLeitura = null;
        this.timeoutScan = 100;
        this.ultimoCodigoLido = '';
        this.tempoUltimoCodigo = 0;
    }

    // ========================================
    // 1. INICIALIZAR LEITOR
    // ========================================
    async inicializar() {
        console.log('🔍 Inicializando sistema de código de barras...');
        
        await this.verificarLeitorConectado();
        this.iniciarEscutaGlobal();
        this.configurarBotoes();
        
        console.log(`✅ Sistema de código de barras inicializado. Leitor: ${this.leitorConectado ? 'CONECTADO' : 'NÃO DETECTADO'}`);
        
        return this.leitorConectado;
    }

    // ========================================
    // 2. VERIFICAR LEITOR CONECTADO
    // ========================================
    async verificarLeitorConectado() {
        try {
            if ('usb' in navigator) {
                const dispositivos = await navigator.usb.getDevices();
                this.leitorConectado = dispositivos.some(d => 
                    d.vendorId === 0x067b || 
                    d.vendorId === 0x0403 || 
                    d.vendorId === 0x1a86 ||
                    d.productName?.toLowerCase().includes('barcode') ||
                    d.productName?.toLowerCase().includes('scanner') ||
                    d.productName?.toLowerCase().includes('leitor')
                );
            }
            
            if ('serial' in navigator && !this.leitorConectado) {
                const ports = await navigator.serial.getPorts();
                this.leitorConectado = ports.length > 0;
            }
            
        } catch (error) {
            console.warn('⚠️ Erro ao verificar leitor:', error);
            this.leitorConectado = false;
        }
        
        return this.leitorConectado;
    }

    // ========================================
    // 3. INICIAR ESCUTA GLOBAL DO TECLADO
    // ========================================
    iniciarEscutaGlobal() {
        document.addEventListener('keydown', (e) => {
            if (!this.modoScanAtivo) return;
            
            // Prevenir comportamento padrão para teclas de controle
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
            }
            
            // Processar Enter
            if (e.key === 'Enter') {
                this.processarCodigoLido();
                return;
            }
            
            // Adicionar caractere ao buffer
            if (e.key.length === 1) {
                this.bufferScan += e.key;
                
                clearTimeout(this.scanTimer);
                this.scanTimer = setTimeout(() => {
                    this.processarCodigoLido();
                }, this.timeoutScan);
            }
        });
    }

    // ========================================
    // 4. ATIVAR MODO SCAN
    // ========================================
    ativarModoScan(inputElement, callback) {
        if (this.modoScanAtivo) {
            this.desativarModoScan();
        }
        
        this.inputAtual = inputElement;
        this.callbackLeitura = callback;
        this.modoScanAtivo = true;
        this.bufferScan = '';
        
        if (this.inputAtual) {
            this.inputAtual.classList.add('scan-mode-active');
            this.inputAtual.focus();
            this.inputAtual.value = '';
            this.inputAtual.placeholder = 'Aguardando leitura do código...';
        }
        
        this.mostrarIndicadorScan();
        this.atualizarBotaoScan(true);
        
        mostrarMensagem('📷 Modo scan ativado. Aponte o leitor para o código de barras.', 'info', 3000);
        console.log('📷 Modo scan ATIVADO');
        
        return true;
    }

    // ========================================
    // 5. DESATIVAR MODO SCAN
    // ========================================
    desativarModoScan() {
        this.modoScanAtivo = false;
        this.bufferScan = '';
        this.callbackLeitura = null;
        
        if (this.inputAtual) {
            this.inputAtual.classList.remove('scan-mode-active');
            this.inputAtual.placeholder = 'Digite ou use o leitor de código de barras';
        }
        
        this.inputAtual = null;
        this.removerIndicadorScan();
        this.atualizarBotaoScan(false);
        
        console.log('📷 Modo scan DESATIVADO');
    }

    // ========================================
    // 6. PROCESSAR CÓDIGO LIDO
    // ========================================
    processarCodigoLido() {
        if (!this.modoScanAtivo || !this.bufferScan) {
            this.bufferScan = '';
            return;
        }
        
        const codigoLido = this.bufferScan.trim();
        this.bufferScan = '';
        
        if (codigoLido.length < 3) {
            console.log('⚠️ Código muito curto:', codigoLido);
            return;
        }
        
        console.log(`📷 Código de barras lido: ${codigoLido}`);
        
        // Verificar duplicata rápida (mesmo código em menos de 2 segundos)
        const agora = Date.now();
        if (codigoLido === this.ultimoCodigoLido && (agora - this.tempoUltimoCodigo) < 2000) {
            console.log('⚠️ Código duplicado ignorado');
            return;
        }
        
        this.ultimoCodigoLido = codigoLido;
        this.tempoUltimoCodigo = agora;
        
        // Chamar callback
        if (this.callbackLeitura) {
            this.callbackLeitura(codigoLido);
        }
        
        // Preencher campo
        if (this.inputAtual) {
            this.inputAtual.value = codigoLido;
            this.inputAtual.classList.add('barcode-valid');
            
            const event = new Event('input', { bubbles: true });
            this.inputAtual.dispatchEvent(event);
            
            setTimeout(() => {
                if (this.inputAtual) {
                    this.inputAtual.classList.remove('barcode-valid');
                }
            }, 2000);
        }
        
        // Feedback visual
        this.mostrarFeedback('✓ Código lido com sucesso!', 'success');
        
        // Desativar modo scan automaticamente
        setTimeout(() => {
            this.desativarModoScan();
        }, 1500);
    }

    // ========================================
    // 7. VALIDAR CÓDIGO DE BARRAS
    // ========================================
    validarFormatoCodigoBarras(codigo) {
        if (!codigo) return false;
        
        const codigoStr = String(codigo).trim();
        
        // EAN-13
        if (/^\d{13}$/.test(codigoStr)) return true;
        
        // EAN-8
        if (/^\d{8}$/.test(codigoStr)) return true;
        
        // UPC-A
        if (/^\d{12}$/.test(codigoStr)) return true;
        
        // CODE 39, CODE 128
        if (/^[A-Z0-9\-]{3,30}$/.test(codigoStr)) return true;
        
        // Código interno
        if (/^[A-Z]{2,3}-\d{4,}$/.test(codigoStr)) return true;
        
        return true; // Aceitar qualquer código por enquanto
    }

    // ========================================
    // 8. VERIFICAR CÓDIGO DUPLICADO
    // ========================================
    async verificarCodigoDuplicado(codigo, produtoIdIgnorar = null) {
        if (!codigo || !produtos) return false;
        
        const codigoStr = String(codigo).trim();
        if (!codigoStr) return false;
        
        const produtoExistente = produtos.find(p => 
            p.codigo_barras === codigoStr && 
            p.id !== produtoIdIgnorar
        );
        
        return !!produtoExistente;
    }

    // ========================================
    // 9. GERAR CÓDIGO DE BARRAS
    // ========================================
    gerarCodigoBarras() {
        const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        let codigo = `${prefixo}${timestamp}${random}`;
        
        if (codigo.length > 13) {
            codigo = codigo.slice(0, 13);
        }
        
        return codigo;
    }

    // ========================================
    // 10. GERAR CÓDIGO DO INTERNO
    // ========================================
    gerarCodigoBarrasDoCodigoInterno(codigoInterno) {
        if (!codigoInterno) return this.gerarCodigoBarras();
        
        const codigoLimpo = String(codigoInterno).replace(/[^A-Z0-9]/gi, '').toUpperCase();
        
        if (codigoLimpo.length < 8) {
            return codigoLimpo.padEnd(13, '0');
        }
        
        if (codigoLimpo.length > 13) {
            return codigoLimpo.slice(0, 13);
        }
        
        return codigoLimpo;
    }

    // ========================================
    // 11. CONFIGURAR BOTÕES
    // ========================================
    configurarBotoes() {
        const btnLer = document.getElementById('btnLerCodigoBarras');
        const btnGerar = document.getElementById('btnGerarCodigoBarras');
        const codigoBarrasInput = document.getElementById('codigo_barras');
        
        if (btnLer) {
            btnLer.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (this.modoScanAtivo) {
                    this.desativarModoScan();
                } else {
                    this.ativarModoScan(codigoBarrasInput, async (codigo) => {
                        // Verificar duplicidade automaticamente
                        const produtoId = document.getElementById('produtoId')?.value;
                        const duplicado = await this.verificarCodigoDuplicado(codigo, produtoId);
                        
                        if (duplicado) {
                            this.mostrarFeedback('⚠️ Código já cadastrado!', 'warning');
                            if (codigoBarrasInput) {
                                codigoBarrasInput.classList.add('barcode-duplicate');
                            }
                        }
                    });
                }
            });
        }
        
        if (btnGerar) {
            btnGerar.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (!codigoBarrasInput) return;
                
                const codigoInterno = document.getElementById('codigo')?.value || '';
                let codigoBarras;
                
                if (codigoInterno) {
                    codigoBarras = this.gerarCodigoBarrasDoCodigoInterno(codigoInterno);
                } else {
                    codigoBarras = this.gerarCodigoBarras();
                }
                
                codigoBarrasInput.value = codigoBarras;
                codigoBarrasInput.classList.add('barcode-valid');
                
                const event = new Event('input', { bubbles: true });
                codigoBarrasInput.dispatchEvent(event);
                
                setTimeout(() => {
                    codigoBarrasInput.classList.remove('barcode-valid');
                }, 2000);
                
                mostrarMensagem(`Código gerado: ${codigoBarras}`, 'success', 3000);
            });
        }
        
        if (codigoBarrasInput) {
            codigoBarrasInput.addEventListener('blur', async () => {
                const codigo = codigoBarrasInput.value.trim();
                if (!codigo) return;
                
                const produtoId = document.getElementById('produtoId')?.value;
                const duplicado = await this.verificarCodigoDuplicado(codigo, produtoId);
                
                const feedback = document.getElementById('codigoBarrasFeedback');
                if (feedback) {
                    if (duplicado) {
                        codigoBarrasInput.classList.add('barcode-duplicate');
                        feedback.style.display = 'block';
                        feedback.className = 'barcode-feedback warning';
                        feedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Este código de barras já está cadastrado para outro produto!';
                    } else {
                        codigoBarrasInput.classList.remove('barcode-duplicate');
                        feedback.style.display = 'none';
                    }
                }
            });
            
            codigoBarrasInput.addEventListener('input', () => {
                codigoBarrasInput.classList.remove('barcode-duplicate', 'barcode-valid');
                const feedback = document.getElementById('codigoBarrasFeedback');
                if (feedback) {
                    feedback.style.display = 'none';
                }
            });
        }
    }

    // ========================================
    // 12. ATUALIZAR BOTÃO SCAN
    // ========================================
    atualizarBotaoScan(ativo) {
        const btnLer = document.getElementById('btnLerCodigoBarras');
        if (!btnLer) return;
        
        if (ativo) {
            btnLer.classList.add('active');
            btnLer.innerHTML = '<i class="fas fa-stop-circle"></i>';
            btnLer.title = 'Parar leitura';
        } else {
            btnLer.classList.remove('active');
            btnLer.innerHTML = '<i class="fas fa-camera"></i>';
            btnLer.title = 'Ler código de barras';
        }
    }

    // ========================================
    // 13. MOSTRAR INDICADOR SCAN
    // ========================================
    mostrarIndicadorScan() {
        this.removerIndicadorScan();
        
        const status = document.createElement('div');
        status.id = 'barcodeReaderStatus';
        status.className = 'barcode-reader-status';
        status.innerHTML = `
            <i class="fas fa-barcode"></i>
            <div class="status-content">
                <strong>📷 Modo Scan Ativo</strong>
                <small>Aponte o leitor para o código de barras</small>
            </div>
            <button class="btn-stop-scan" onclick="window.gerenciadorCodigoBarras.desativarModoScan()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(status);
    }

    // ========================================
    // 14. REMOVER INDICADOR SCAN
    // ========================================
    removerIndicadorScan() {
        const status = document.getElementById('barcodeReaderStatus');
        if (status) {
            status.remove();
        }
    }

    // ========================================
    // 15. MOSTRAR FEEDBACK
    // ========================================
    mostrarFeedback(texto, tipo) {
        if (typeof mostrarMensagem === 'function') {
            mostrarMensagem(texto, tipo, 2000);
        }
    }
}

