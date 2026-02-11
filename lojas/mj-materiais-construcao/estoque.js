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
    if (!imagens || !imagens.principal || imagens.principal === '/images/sem-foto.png') {
        removerImagem();
        return;
    }
    
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
                        <td colspan="11" class="empty-state">
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
                    <td colspan="11" class="empty-state">
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
    
    if (produtosFiltrados.length === 0) {
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
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
        const statusClass = !produto.ativo ? 'status-inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'status-baixo' : 'status-ativo';
        
        const statusText = !produto.ativo ? 'Inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'Baixo' : 'Ativo';
        
        // Dados da unidade (mantendo compatibilidade com dados antigos)
        const valorUnidade = produto.peso_por_unidade || produto.valor_unidade || 0;
        const tipoUnidade = produto.unidade_peso || produto.tipo_unidade || 'unid';
        const quantidade = produto.quantidade || 0;
        
        // URL da imagem - usando base64 como fallback
        const imagemUrl = produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        const imagemThumb = produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64;
        
        // Formatar a unidade para exibição
        const unidadeDisplay = formatarUnidadeExibicao(valorUnidade, tipoUnidade);
        
        // Calcular total
        const totalUnidade = valorUnidade * quantidade;
        const totalDisplay = totalUnidade > 0 ? formatarUnidadeExibicao(totalUnidade, tipoUnidade) : '';
        
        html += `
            <tr data-id="${produto.id}">
                <!-- COLUNA: Imagem (imagem maior e centralizada) -->
                <td class="imagem-cell">
                    <div class="produto-imagem-grande-container">
                        <img src="${imagemThumb}" 
                             alt="${produto.nome || 'Produto'}"
                             class="produto-imagem-grande"
                             onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                    </div>
                </td>
                
                <td class="codigo-cell">${produto.codigo || 'N/A'}</td>
                
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
                
                <td class="categoria-cell">
                    <span class="categoria-badge">${produto.categoria || 'Sem categoria'}</span>
                </td>
                
                <!-- COLUNA: Unidade com valor (ex: 175 g) -->
                <td class="unidade-cell">
                    <div class="unidade-info">
                        <span class="unidade-valor">${unidadeDisplay}</span>
                        ${totalUnidade > 0 && tipoUnidade !== 'unid' ? `
                            <div class="unidade-total">
                                <small class="text-muted">
                                    <i class="fas fa-calculator"></i>
                                    Total: ${totalDisplay}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </td>
                
                <td class="estoque-cell">
                    <div class="estoque-info">
                        <strong class="estoque-quantidade">${quantidade.toLocaleString('pt-BR')}</strong>
                        <span class="estoque-unidade">${produto.unidade_venda || produto.unidade || 'UN'}</span>
                    </div>
                </td>
                
                <td class="minimo-cell">${produto.estoque_minimo || 5}</td>
                <td class="custo-cell">${formatarMoeda(produto.preco_custo || 0)}</td>
                
                <td class="venda-cell">
                    <strong class="preco-venda">${formatarMoeda(produto.preco || 0)}</strong>
                </td>
                
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">
                        <i class="status-icon ${statusClass === 'status-ativo' ? 'fas fa-check-circle' : 
                                             statusClass === 'status-baixo' ? 'fas fa-exclamation-circle' : 
                                             'fas fa-times-circle'}"></i>
                        ${statusText}
                    </span>
                </td>
                
                <!-- COLUNA: Ações com dropdown (VERSÃO SIMPLIFICADA E FUNCIONAL) -->
                <td class="acoes-cell">
                    <div class="acoes-dropdown">
                        <button class="btn-acao-menu" title="Ações" data-id="${produto.id}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-content" style="display: none;">
                            <button class="dropdown-item btn-editar" data-action="editar" data-id="${produto.id}">
                                <i class="fas fa-edit"></i>
                                <span>Editar</span>
                            </button>
                            <button class="dropdown-item ${produto.ativo ? 'btn-desativar' : 'btn-ativar'}" 
                                    data-action="${produto.ativo ? 'desativar' : 'ativar'}" 
                                    data-id="${produto.id}">
                                <i class="fas ${produto.ativo ? 'fa-ban' : 'fa-check'}"></i>
                                <span>${produto.ativo ? 'Desativar' : 'Ativar'}</span>
                            </button>
                            <button class="dropdown-item btn-entrada" data-action="entrada" data-id="${produto.id}">
                                <i class="fas fa-plus-circle"></i>
                                <span>Entrada</span>
                            </button>
                            <button class="dropdown-item btn-excluir" data-action="excluir" data-id="${produto.id}">
                                <i class="fas fa-trash-alt"></i>
                                <span>Excluir</span>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    estoqueTableBody.innerHTML = html;
    
    if (currentCountElement) {
        currentCountElement.textContent = produtosFiltrados.length;
    }
    
    // Configurar eventos dos dropdowns
    configurarDropdowns();
}

// ============================================
// FUNÇÃO DE CONFIGURAÇÃO DOS DROPDOWNS (SIMPLIFICADA E FUNCIONAL)
// ============================================
function configurarDropdowns() {
    // Configurar clique nos botões de menu
    document.querySelectorAll('.btn-acao-menu').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Fechar todos os dropdowns abertos
            document.querySelectorAll('.dropdown-content').forEach(dd => {
                if (dd !== this.nextElementSibling) {
                    dd.style.display = 'none';
                }
            });
            
            // Alternar o dropdown atual
            const dropdown = this.nextElementSibling;
            if (dropdown && dropdown.classList.contains('dropdown-content')) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
    
    // Configurar clique nos itens do dropdown
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const action = this.getAttribute('data-action');
            const produto = produtos.find(p => p.id === produtoId);
            
            // Fechar o dropdown
            const dropdown = this.closest('.dropdown-content');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
            
            // Executar ação correspondente
            switch(action) {
                case 'editar':
                    abrirModalEditar(produtoId);
                    break;
                case 'desativar':
                case 'ativar':
                    if (produto) alterarStatusProduto(produto);
                    break;
                case 'entrada':
                    if (produto) abrirModalEntradaEstoque(produto);
                    break;
                case 'excluir':
                    if (produto) excluirProdutoComConfirmacao(produto);
                    break;
            }
        });
    });
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.acoes-dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(dd => {
                dd.style.display = 'none';
            });
        }
    });
}

// Função auxiliar para excluir produto
function excluirProdutoComConfirmacao(produto) {
    if (!produto) return;
    
    const confirmMessage = `ATENÇÃO: Esta ação é PERMANENTE!\n\n` +
                          `Deseja EXCLUIR o produto:\n` +
                          `"${produto.nome}"\n` +
                          `Código: ${produto.codigo || 'sem código'}\n` +
                          `Estoque atual: ${produto.quantidade}\n\n` +
                          `Esta ação não poderá ser desfeita!`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    if (produto.quantidade > 0) {
        const estoqueConfirm = confirm(
            `ATENÇÃO: O produto tem ${produto.quantidade} unidades em estoque!\n\n` +
            `Você realmente deseja excluir mesmo com estoque?\n` +
            `Todo o estoque será perdido permanentemente.`
        );
        
        if (!estoqueConfirm) {
            return;
        }
    }
    
    excluirProduto(produto);
}

// ============================================
// 11. FILTRAR PRODUTOS
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
// 12. ATUALIZAR ESTATÍSTICAS
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
// 13. MODAL - NOVO PRODUTO
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
// 14. MODAL - EDITAR PRODUTO
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
// 15. SALVAR PRODUTO
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
                dadosImagem = {
                    imagens: {
                        principal: '/images/sem-foto.png',
                        thumbnail: '/images/sem-foto.png',
                        medium: '/images/sem-foto.png',
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
            console.log('🖼️ Sem imagem, usando placeholder padrão');
            dadosImagem = {
                imagens: {
                    principal: '/images/sem-foto.png',
                    thumbnail: '/images/sem-foto.png',
                    medium: '/images/sem-foto.png',
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
// 16. ALTERAR STATUS DO PRODUTO
// ============================================
async function alterarStatusProduto(produto) {
    if (!produto) return;
    
    const confirmMessage = produto.ativo ? 
        `Desativar o produto "${produto.nome}"?` : 
        `Ativar o produto "${produto.nome}"?`;
    
    const confirmAction = produto.ativo ? 'Desativar' : 'Ativar';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        mostrarLoading(`${confirmAction} produto...`, 'Processando...');
        
        await lojaServices.atualizarProduto(produto.id, {
            ativo: !produto.ativo
        });
        
        mostrarMensagem(`Produto ${produto.ativo ? 'desativado' : 'ativado'} com sucesso!`, 'success');
        
        await carregarProdutos();
        
    } catch (error) {
        console.error(`❌ Erro ao ${produto.ativo ? 'desativar' : 'ativar'} produto:`, error);
        mostrarMensagem(`Erro ao ${produto.ativo ? 'desativar' : 'ativar'} produto`, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 17. ENTRADA DE ESTOQUE
// ============================================
async function abrirModalEntradaEstoque(produto) {
    if (!produto) return;
    
    const promptText = `Entrada de estoque para: ${produto.nome}\n\n` +
        `Estoque atual: ${produto.quantidade || 0} ${produto.unidade_venda || produto.unidade || 'UN'}\n` +
        `${(produto.valor_unidade || produto.peso_por_unidade) > 0 ? 
            `Unidade: ${formatarUnidadeExibicao(produto.valor_unidade || produto.peso_por_unidade, produto.tipo_unidade || produto.unidade_peso || 'unid')}\n` : ''}` +
        `Digite:\n` +
        `• Número positivo para ADICIONAR estoque\n` +
        `• Número negativo para REMOVER estoque\n` +
        `(Ex: -10 para remover 10 unidades)\n\n` +
        `Quantidade:`;
    
    const quantidade = prompt(promptText, "1");
    
    if (quantidade === null) return;
    
    const qtd = parseInt(quantidade);
    if (isNaN(qtd)) {
        mostrarMensagem('Quantidade inválida', 'error');
        return;
    }
    
    const tipo = qtd >= 0 ? 'entrada' : 'saida';
    const quantidadeAbs = Math.abs(qtd);
    
    try {
        mostrarLoading('Registrando alteração de estoque...', 'Processando...');
        
        const resultado = await lojaServices.atualizarEstoque(
            produto.id, 
            quantidadeAbs, 
            tipo
        );
        
        if (resultado.success) {
            if (tipo === 'entrada') {
                mostrarMensagem(`${quantidadeAbs} unidade(s) adicionada(s) ao estoque!`, 'success');
            } else {
                mostrarMensagem(`${quantidadeAbs} unidade(s) removida(s) do estoque!`, 'warning');
                
                if ((produto.quantidade - quantidadeAbs) === 0) {
                    setTimeout(() => {
                        mostrarMensagem('Estoque zerado. Você pode agora excluir o produto se desejar.', 'info');
                    }, 1500);
                }
            }
            
            await carregarProdutos();
            
        } else {
            mostrarMensagem(resultado.error || 'Erro ao registrar alteração de estoque', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao registrar alteração de estoque:', error);
        mostrarMensagem('Erro ao registrar alteração de estoque', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 18. EXCLUIR PRODUTO
// ============================================
async function excluirProduto(produto) {
    if (!produto) return;
    
    try {
        mostrarLoading('Excluindo produto...', 'Esta ação é permanente...');
        
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
// 19. CONFIGURAR EVENTOS
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
// 20. FUNÇÕES UTILITÁRIAS
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
// 21. ESTILOS DINÂMICOS
// ============================================
(function adicionarEstilos() {
    const estiloBadge = document.createElement('style');
    estiloBadge.textContent = `
        .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-block;
        }
        
        .status-ativo {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-baixo {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-inativo {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .text-muted {
            color: #6c757d;
            font-size: 0.85rem;
        }
        
        .text-primary {
            color: #3498db;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 15px;
            color: #bdc3c7;
        }
        
        .empty-state p {
            margin-bottom: 5px;
            font-size: 1.1rem;
        }
        
        .empty-state small {
            font-size: 0.9rem;
            color: #95a5a6;
        }

        /* Estilos para a coluna de imagem (IMAGEM GRANDE) */
        .imagem-cell {
            width: 90px;
            padding: 8px;
            text-align: center;
            vertical-align: middle;
        }
        
        .produto-imagem-grande-container {
            width: 80px;
            height: 80px;
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            margin: 0 auto;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .produto-imagem-grande-container:hover {
            border-color: #3498db;
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(52, 152, 219, 0.2);
        }
        
        .produto-imagem-grande {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        /* ESTILOS GARANTIDOS PARA DROPDOWN CLICÁVEL */
        .acoes-cell {
            width: 70px;
            text-align: center;
            vertical-align: middle;
        }
        
        .acoes-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .btn-acao-menu {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 16px;
            color: #495057;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
        }
        
        .btn-acao-menu:hover {
            background-color: #3498db;
            border-color: #3498db;
            color: white;
        }
        
        .btn-acao-menu.active {
            background-color: #3498db;
            border-color: #3498db;
            color: white;
        }
        
        .dropdown-content {
            position: absolute;
            right: 0;
            top: 100%;
            background-color: white;
            min-width: 180px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            z-index: 1000;
            overflow: hidden;
            border: 1px solid #dee2e6;
            margin-top: 5px;
            display: none;
        }
        
        .dropdown-content.show {
            display: block !important;
            animation: fadeInUp 0.2s ease;
        }
        
        /* Também funciona com hover para compatibilidade */
        .acoes-dropdown:hover .dropdown-content {
            display: block;
            animation: fadeInUp 0.2s ease;
        }
        
        .dropdown-item {
            width: 100%;
            padding: 10px 15px;
            text-align: left;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .dropdown-item:last-child {
            border-bottom: none;
        }
        
        .dropdown-item:hover {
            background-color: #f8f9fa;
        }
        
        .dropdown-item.btn-editar:hover {
            background-color: #e3f2fd;
            color: #3498db;
        }
        
        .dropdown-item.btn-desativar:hover {
            background-color: #ffebee;
            color: #e74c3c;
        }
        
        .dropdown-item.btn-ativar:hover {
            background-color: #e8f5e9;
            color: #27ae60;
        }
        
        .dropdown-item.btn-entrada:hover {
            background-color: #fff3e0;
            color: #f39c12;
        }
        
        .dropdown-item.btn-excluir:hover {
            background-color: #ffebee;
            color: #e74c3c;
        }
        
        .dropdown-item i {
            width: 16px;
            text-align: center;
            font-size: 1rem;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .form-section {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .form-section h4 {
            margin-top: 0;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .image-upload-container {
            margin-top: 15px;
        }
        
        .upload-area {
            border: 2px dashed #ddd;
            border-radius: 8px;
            padding: 30px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: white;
            position: relative;
            overflow: hidden;
        }
        
        .upload-area:hover {
            border-color: #3498db;
            background: #f8f9fa;
        }
        
        .upload-area.dragover {
            border-color: #27ae60;
            background: #f0fff4;
        }
        
        .upload-content i {
            font-size: 2.5rem;
            color: #7f8c8d;
            margin-bottom: 10px;
        }
        
        .upload-content h5 {
            margin: 0 0 5px 0;
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .upload-content p {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.95rem;
        }
        
        .upload-content small {
            color: #95a5a6;
            font-size: 0.85rem;
        }
        
        .image-preview {
            margin-top: 15px;
            animation: fadeIn 0.3s ease;
        }
        
        .preview-container {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 300px;
            margin: 0 auto;
        }
        
        .preview-container img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }
        
        .preview-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            gap: 10px;
            padding: 10px;
            justify-content: center;
        }
        
        .preview-overlay button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s;
        }
        
        .btn-change {
            background: #3498db;
            color: white;
        }
        
        .btn-change:hover {
            background: #2980b9;
        }
        
        .btn-remove {
            background: #e74c3c;
            color: white;
        }
        
        .btn-remove:hover {
            background: #c0392b;
        }
        
        .image-info {
            margin-top: 10px;
            text-align: center;
        }
        
        .info-row {
            display: flex;
            justify-content: center;
            gap: 10px;
            font-size: 0.9rem;
        }
        
        .info-row .label {
            font-weight: 600;
            color: #555;
        }
        
        .status-pending {
            color: #f39c12;
            font-weight: 600;
        }
        
        .status-success {
            color: #27ae60;
            font-weight: 600;
        }
        
        .status-error {
            color: #e74c3c;
            font-weight: 600;
        }
        
        .upload-progress {
            margin-top: 15px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .progress-bar {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 3px;
            transition: width 0.3s ease;
            width: 0%;
        }
        
        .image-tips {
            margin-top: 15px;
            padding: 10px 15px;
            background: #fff9e6;
            border-radius: 6px;
            border-left: 4px solid #f39c12;
            font-size: 0.9rem;
            color: #7d6608;
        }
        
        .image-tips i {
            color: #f39c12;
            margin-right: 5px;
        }
        
        .form-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        
        .input-with-unit {
            display: flex;
            gap: 0.5rem;
        }
        
        .input-with-unit input {
            flex: 1;
        }
        
        .unit-select {
            width: 120px;
        }
        
        .input-readonly {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .input-readonly input {
            background: #f8f9fa;
            cursor: not-allowed;
        }
        
        .input-with-icon {
            position: relative;
        }
        
        .input-with-icon i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
        }
        
        .input-with-icon input {
            padding-left: 2.5rem;
        }
        
        .form-hint {
            font-size: 0.85rem;
            color: #6c757d;
            margin-top: 0.25rem;
        }
        
        .estoque-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            table-layout: fixed;
        }
        
        .estoque-table thead {
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .estoque-table th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            white-space: nowrap;
        }
        
        .estoque-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #dee2e6;
            vertical-align: middle;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .estoque-table tbody tr {
            transition: all 0.2s;
        }
        
        .estoque-table tbody tr:hover {
            background-color: #f8f9fa;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        /* Estilos específicos para colunas */
        .codigo-cell {
            width: 100px;
            font-family: monospace;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .nome-cell {
            min-width: 200px;
            max-width: 250px;
            white-space: normal;
        }
        
        .produto-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .produto-nome {
            font-size: 0.95rem;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .produto-descricao {
            margin-top: 2px;
        }
        
        .categoria-cell {
            width: 120px;
        }
        
        .categoria-badge {
            display: inline-block;
            padding: 4px 10px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .unidade-cell {
            width: 120px;
        }
        
        .unidade-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .unidade-valor {
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.9rem;
        }
        
        .unidade-total small {
            font-size: 0.8rem;
            color: #7f8c8d;
        }
        
        .unidade-total i {
            margin-right: 4px;
            font-size: 0.8rem;
        }
        
        .estoque-cell {
            width: 100px;
        }
        
        .estoque-info {
            display: flex;
            align-items: baseline;
            gap: 4px;
        }
        
        .estoque-quantidade {
            font-size: 1rem;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .estoque-unidade {
            font-size: 0.8rem;
            color: #7f8c8d;
        }
        
        .minimo-cell {
            width: 80px;
            text-align: center;
            color: #6c757d;
        }
        
        .custo-cell {
            width: 100px;
            color: #6c757d;
        }
        
        .venda-cell {
            width: 120px;
        }
        
        .preco-venda {
            font-size: 1rem;
            font-weight: 700;
            color: #27ae60;
        }
        
        .status-cell {
            width: 100px;
        }
        
        .acao-tooltip {
            display: none;
        }
        
        @media (max-width: 1200px) {
            .estoque-table {
                table-layout: auto;
            }
            
            .nome-cell {
                min-width: 180px;
                max-width: 200px;
            }
        }
        
        @media (max-width: 1024px) {
            .estoque-table-container {
                overflow-x: auto;
            }
            
            .estoque-table {
                min-width: 1000px;
            }
            
            .nome-cell {
                min-width: 200px;
            }
        }
        
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .estoque-table {
                font-size: 0.85rem;
            }
            
            .estoque-table th,
            .estoque-table td {
                padding: 0.5rem;
            }
            
            .produto-imagem-grande-container {
                width: 60px;
                height: 60px;
            }
            
            .btn-acao-menu {
                width: 36px;
                height: 36px;
                padding: 6px;
            }
            
            .dropdown-content {
                min-width: 160px;
                right: -10px;
            }
            
            .dropdown-item {
                padding: 10px 12px;
                font-size: 0.85rem;
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(estiloBadge);
})();

// ============================================
// 22. EXPORTAÇÃO PARA ESCOPO GLOBAL
// ============================================
window.trocarImagem = trocarImagem;
window.removerImagem = removerImagem;

console.log("✅ Sistema de estoque dinâmico completamente carregado!");
