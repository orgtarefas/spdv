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
let codigoInput, nomeInput, categoriaInput, unidadeVendaSelect, precoCustoInput;
let precoInput, quantidadeInput, estoqueMinimoInput, descricaoTextarea, fornecedorInput;

// NOVOS ELEMENTOS PARA UNIDADE COM VALOR
let valorUnidadeInput, tipoUnidadeSelect, totalEstoqueUnidadeInput, totalEstoqueTipoSpan;

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
    nomeInput = document.getElementById('nome');
    categoriaInput = document.getElementById('categoria');
    unidadeVendaSelect = document.getElementById('unidade_venda');
    precoCustoInput = document.getElementById('preco_custo');
    precoInput = document.getElementById('preco');
    quantidadeInput = document.getElementById('quantidade');
    estoqueMinimoInput = document.getElementById('estoque_minimo');
    descricaoTextarea = document.getElementById('descricao');
    fornecedorInput = document.getElementById('fornecedor');
    
    // NOVOS ELEMENTOS PARA UNIDADE COM VALOR
    valorUnidadeInput = document.getElementById('valor_unidade');
    tipoUnidadeSelect = document.getElementById('tipo_unidade');
    totalEstoqueUnidadeInput = document.getElementById('total_estoque_unidade');
    totalEstoqueTipoSpan = document.getElementById('total_estoque_tipo');
    
    // Elementos de imagem
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
    
    const valorUnidade = parseFloat(valorUnidadeInput.value) || 0;
    const quantidade = parseInt(quantidadeInput.value) || 0;
    const tipoUnidade = tipoUnidadeSelect ? tipoUnidadeSelect.value : 'unid';
    
    const totalUnidade = valorUnidade * quantidade;
    
    if (totalEstoqueUnidadeInput) {
        totalEstoqueUnidadeInput.value = totalUnidade.toFixed(2);
    }
    
    if (totalEstoqueTipoSpan) {
        totalEstoqueTipoSpan.textContent = tipoUnidade;
    }
}

function formatarUnidadeExibicao(valor, tipo) {
    const formatarTipo = (tipo) => {
        const unidades = {
            'kg': 'kg',
            'g': 'g',
            'ton': 't',
            'l': 'L',
            'ml': 'mL',
            'm': 'm',
            'cm': 'cm',
            'm2': 'm²',
            'm3': 'm³',
            'unid': 'unid'
        };
        return unidades[tipo] || tipo;
    };
    
    const tipoFormatado = formatarTipo(tipo);
    
    if (valor > 0 && tipo !== 'unid') {
        const casasDecimais = ['kg', 'l', 'm', 'm2', 'm3', 'ton'].includes(tipo) ? 2 : 0;
        return `${valor.toFixed(casasDecimais)} ${tipoFormatado}`;
    } else if (valor > 0 && tipo === 'unid') {
        return `${valor.toFixed(0)} ${tipoFormatado}`;
    } else {
        return '1 unid';
    }
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
        
        // Dados da unidade
        const valorUnidade = produto.peso_por_unidade || produto.valor_unidade || 0;
        const tipoUnidade = produto.unidade_peso || produto.tipo_unidade || 'unid';
        const quantidade = produto.quantidade || 0;
        
        // URL da imagem
        const imagemUrl = produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const imagemThumb = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        
        // Formatar a unidade para exibição
        const unidadeDisplay = formatarUnidadeExibicao(valorUnidade, tipoUnidade);
        
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
                
                <!-- COLUNA 5: Unidade -->
                <td class="unidade-cell">
                    <div class="unidade-info">
                        <span class="unidade-valor">${unidadeDisplay}</span>
                        ${produto.unidade_venda ? `
                            <div class="unidade-tipo">
                                <small class="text-muted">${produto.unidade_venda}</small>
                            </div>
                        ` : ''}
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
                
                <!-- COLUNA 10: Ações COM BOTÕES DIRETOS -->
                <td class="acoes-cell">
                    <div class="acoes-botoes" data-id="${produto.id}">
                        <!-- ENTRADA DE ESTOQUE (+) -->
                        <button class="btn-acao btn-entrada" title="Entrada de Estoque" data-id="${produto.id}">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        
                        <!-- SAÍDA DE ESTOQUE (-) -->
                        <button class="btn-acao btn-saida" title="Saída de Estoque" data-id="${produto.id}">
                            <i class="fas fa-minus-circle"></i>
                        </button>
                        
                        <!-- EDITAR (CAIXINHA) -->
                        <button class="btn-acao btn-editar" title="Editar Produto" data-id="${produto.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        
                        <!-- EXCLUIR (X VERMELHO) -->
                        <button class="btn-acao btn-excluir" title="Excluir Produto" data-id="${produto.id}">
                            <i class="fas fa-times"></i>
                        </button>
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
    
    console.log(`✅ ${produtosFiltrados.length} produtos renderizados`);
}

// ============================================
// 10. CONFIGURAR BOTÕES DE AÇÃO
// ============================================
function configurarBotoesAcao() {
    console.log('⚙️ Configurando botões de ação...');
    
    // 1. BOTÃO "ENTRADA" (+)
    document.querySelectorAll('.btn-entrada').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!produto) return;
            
            // Modal simples para entrada
            const quantidade = prompt(
                `Entrada de estoque para: ${produto.nome}\n\n` +
                `Estoque atual: ${produto.quantidade} ${produto.unidade_venda || 'UN'}\n` +
                `Digite a quantidade para ADICIONAR:`,
                "1"
            );
            
            if (quantidade === null || quantidade === '') return;
            
            const qtd = parseInt(quantidade);
            if (isNaN(qtd) || qtd <= 0) {
                mostrarMensagem('Quantidade inválida! Digite um número maior que zero.', 'error');
                return;
            }
            
            await processarEntradaEstoque(produtoId, qtd);
        });
    });
    
    // 2. BOTÃO "SAÍDA" (-)
    document.querySelectorAll('.btn-saida').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!produto) return;
            
            // Modal simples para saída
            const quantidade = prompt(
                `Saída de estoque para: ${produto.nome}\n\n` +
                `Estoque atual: ${produto.quantidade} ${produto.unidade_venda || 'UN'}\n` +
                `Digite a quantidade para REMOVER (máx: ${produto.quantidade}):`,
                "1"
            );
            
            if (quantidade === null || quantidade === '') return;
            
            const qtd = parseInt(quantidade);
            if (isNaN(qtd) || qtd <= 0) {
                mostrarMensagem('Quantidade inválida! Digite um número maior que zero.', 'error');
                return;
            }
            
            if (qtd > produto.quantidade) {
                mostrarMensagem(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'error');
                return;
            }
            
            await processarSaidaEstoque(produtoId, qtd);
        });
    });
    
    // 3. BOTÃO "EDITAR" (CAIXINHA)
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            abrirModalEditar(produtoId);
        });
    });
    
    // 4. BOTÃO "EXCLUIR" (X VERMELHO)
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
// 11. CONFIGURAR TOGGLE DE STATUS
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
// 12. MOSTRAR MODAL DE SELEÇÃO DE STATUS
// ============================================
async function mostrarModalSelecaoStatus(produto, currentStatus) {
    return new Promise((resolve) => {
        // Criar modal
        const modalHTML = `
            <div class="modal-status-overlay">
                <div class="modal-status">
                    <div class="modal-status-header">
                        <h3><i class="fas fa-exchange-alt"></i> Alterar Status</h3>
                        <button class="modal-status-close">&times;</button>
                    </div>
                    <div class="modal-status-body">
                        <p>Produto: <strong>${produto.nome}</strong></p>
                        <p>Código: <strong>${produto.codigo || 'N/A'}</strong></p>
                        <p>Status atual: <span class="status-badge ${currentStatus === 'ativo' ? 'status-ativo' : 'status-inativo'}">
                            ${currentStatus === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span></p>
                        
                        <div class="status-options">
                            <button class="btn-status-option btn-status-ativo" data-status="ativo">
                                <i class="fas fa-check-circle"></i>
                                <span>Ativo</span>
                                <small>Produto disponível para venda</small>
                            </button>
                            
                            <button class="btn-status-option btn-status-inativo" data-status="inativo">
                                <i class="fas fa-times-circle"></i>
                                <span>Inativo</span>
                                <small>Produto indisponível para venda</small>
                            </button>
                        </div>
                    </div>
                    <div class="modal-status-footer">
                        <button class="btn-cancelar-status">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        const modal = modalContainer.querySelector('.modal-status-overlay');
        
        // Configurar eventos
        const closeBtn = modal.querySelector('.modal-status-close');
        const cancelBtn = modal.querySelector('.btn-cancelar-status');
        const statusOptions = modal.querySelectorAll('.btn-status-option');
        
        // Fechar modal
        const fecharModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modalContainer);
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
            option.addEventListener('click', () => {
                const selectedStatus = option.getAttribute('data-status');
                console.log(`✅ Status selecionado: ${selectedStatus}`);
                
                // Fechar modal
                modal.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(modalContainer);
                    resolve(selectedStatus); // Retorna o status selecionado
                }, 300);
            });
        });
        
        // Animar entrada do modal
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    });
}

// ============================================
// 13. ALTERAR STATUS DO PRODUTO
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
// 14. PROCESSAR ENTRADA DE ESTOQUE
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
// 15. PROCESSAR SAÍDA DE ESTOQUE
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
// 16. FILTRAR PRODUTOS
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
// 17. ATUALIZAR ESTATÍSTICAS
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
// 18. MODAL - NOVO PRODUTO
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
    
    // Configurar valores padrão
    if (quantidadeInput) quantidadeInput.value = '0';
    if (estoqueMinimoInput) estoqueMinimoInput.value = '5';
    if (precoCustoInput) precoCustoInput.value = '0.00';
    if (precoInput) precoInput.value = '0.00';
    if (valorUnidadeInput) valorUnidadeInput.value = '1';
    if (tipoUnidadeSelect) tipoUnidadeSelect.value = 'unid';
    
    // Calcular total inicial
    calcularTotalUnidade();
    
    removerImagem();
    
    if (modalProduto) {
        modalProduto.style.display = 'flex';
    }
}

// ============================================
// 19. MODAL - EDITAR PRODUTO
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
            if (nomeInput) nomeInput.value = produto.nome || '';
            if (categoriaInput) categoriaInput.value = produto.categoria || '';
            if (unidadeVendaSelect) unidadeVendaSelect.value = produto.unidade_venda || produto.unidade || 'UN';
            
            // Carregar valores da unidade (compatibilidade com dados antigos)
            if (valorUnidadeInput) valorUnidadeInput.value = produto.peso_por_unidade || produto.valor_unidade || 0;
            if (tipoUnidadeSelect) tipoUnidadeSelect.value = produto.unidade_peso || produto.tipo_unidade || 'unid';
            
            if (precoCustoInput) precoCustoInput.value = produto.preco_custo || 0;
            if (precoInput) precoInput.value = produto.preco || 0;
            if (quantidadeInput) quantidadeInput.value = produto.quantidade || 0;
            if (estoqueMinimoInput) estoqueMinimoInput.value = produto.estoque_minimo || 5;
            if (descricaoTextarea) descricaoTextarea.value = produto.descricao || '';
            if (fornecedorInput) fornecedorInput.value = produto.fornecedor || '';
            
            // Calcular total
            calcularTotalUnidade();

            // Carregar imagem se existir
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
// 20. SALVAR PRODUTO
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
                console.log('✅ Upload de imagem bem-sucedido:', uploadResult.url.substring(0, 50) + '...');
            } else {
                // USANDO BASE64 EM VEZ DE /images/sem-foto.png
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
            console.log('📷 Usando imagem existente:', imagemUploadResult.url.substring(0, 50) + '...');
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
            console.log('🖼️ Sem imagem, usando base64 padrão');
            // USANDO BASE64 EM VEZ DE /images/sem-foto.png
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
            nome: nomeInput.value.trim(),
            categoria: categoriaInput ? categoriaInput.value.trim() : 'Sem Categoria',
            unidade_venda: unidadeVendaSelect ? unidadeVendaSelect.value : 'UN',
            // Novos campos para unidade com valor
            valor_unidade: valorUnidadeInput ? parseFloat(valorUnidadeInput.value) || 0 : 0,
            tipo_unidade: tipoUnidadeSelect ? tipoUnidadeSelect.value : 'unid',
            // Campos antigos para compatibilidade
            peso_por_unidade: valorUnidadeInput ? parseFloat(valorUnidadeInput.value) || 0 : 0,
            unidade_peso: tipoUnidadeSelect ? tipoUnidadeSelect.value : 'unid',
            preco_custo: precoCustoInput ? parseFloat(precoCustoInput.value.replace(',', '.')) || 0 : 0,
            preco: precoInput ? parseFloat(precoInput.value.replace(',', '.')) || 0 : 0,
            quantidade: quantidade,
            estoque_minimo: estoqueMinimo,
            descricao: descricaoTextarea ? descricaoTextarea.value.trim() : '',
            fornecedor: fornecedorInput ? fornecedorInput.value.trim() : '',
            ativo: true,
            data_cadastro: new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            loja_id: lojaServices.lojaId,
            loja_nome: lojaServices.dadosLoja?.nome || lojaServices.lojaId
        };
        
        if (codigoInput && codigoInput.value.trim()) {
            dadosProduto.codigo = codigoInput.value.trim();
        } else {
            const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
            dadosProduto.codigo = `${prefixo}-${Date.now().toString().slice(-8)}`;
        }
        
        // Calcular total da unidade para exibição
        if (dadosProduto.valor_unidade > 0 && dadosProduto.quantidade > 0) {
            dadosProduto.total_unidade = dadosProduto.valor_unidade * dadosProduto.quantidade;
            dadosProduto.tipo_unidade_total = dadosProduto.tipo_unidade;
        }
        
        Object.assign(dadosProduto, dadosImagem);
        
        if (dadosProduto.preco <= 0) {
            throw new Error('O preço de venda deve ser maior que R$ 0,00');
        }
        
        if (dadosProduto.quantidade < 0) {
            throw new Error('A quantidade não pode ser negativa');
        }
        
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
        
        console.log('📊 Dados salvos no Firebase com sucesso');
        
        imagemAtual = null;
        imagemPreviewURL = null;
        imagemUploadResult = null;
        
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
            calcularTotalUnidade();
        }
        
        removerImagem();
        await carregarProdutos();
        atualizarEstatisticas();
        
        if (!produtoId) {
            setTimeout(() => {
                const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
                if (codigoInput) {
                    codigoInput.value = `${prefixo}-${Date.now().toString().slice(-8)}`;
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        
        let mensagemErro = error.message;
        
        if (error.message.includes('permission')) {
            mensagemErro = 'Você não tem permissão para salvar produtos. Verifique seu acesso.';
        } else if (error.message.includes('network')) {
            mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Firebase')) {
            mensagemErro = 'Erro no servidor. Tente novamente em alguns instantes.';
        }
        
        mostrarMensagem(mensagemErro, 'error');
        
    } finally {
        esconderLoading();
    }
}

// ============================================
// 21. EXCLUIR PRODUTO
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
// 22. CONFIGURAR EVENTOS
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
// 23. FUNÇÕES UTILITÁRIAS
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
// 24. EXPORTAÇÃO PARA ESCOPO GLOBAL
// ============================================
window.trocarImagem = trocarImagem;
window.removerImagem = removerImagem;

console.log("✅ Sistema de estoque dinâmico completamente carregado!");
