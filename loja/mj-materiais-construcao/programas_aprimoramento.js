// ============================================
// programas_aprimoramento.js
// ============================================

console.log('📚 Iniciando Programas de Aprimoramento...');

// Variáveis globais
let lojaId = null;
let usuario = null;
let db = null;
let isAdmin = false;
let treinamentos = [];
let videos = [];
let testes = [];
let progresso = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM carregado');
    mostrarLoading(true);
    
    try {
        // Aguardar Firebase
        await delay(1000);
        
        // Obter loja
        lojaId = obterLojaId();
        console.log('📍 Loja:', lojaId);
        
        // Obter usuário
        usuario = obterUsuario();
        
        if (!usuario) {
            mostrarMensagem('Faça login primeiro', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        document.getElementById('userName').textContent = usuario.nome || usuario.email;
        isAdmin = usuario.perfil === 'admin' || usuario.perfil === 'gerente' || usuario.perfil === 'supervisor';
        console.log('👤 Usuário:', usuario.email, '| Admin:', isAdmin);
        
        // Obter Firebase
        if (window.db) {
            db = window.db;
        } else if (window.lojaServices && window.lojaServices.db) {
            db = window.lojaServices.db;
        }
        
        if (!db) {
            mostrarMensagem('Banco de dados não disponível', 'error');
            return;
        }
        
        // Carregar dados
        await carregarTreinamentos();
        await carregarVideos();
        await carregarTestes();
        await carregarProgresso();
        
        // Renderizar
        renderizarTudo();
        
        // Configurar eventos
        configurarEventos();
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar', 'error');
    } finally {
        mostrarLoading(false);
    }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function obterLojaId() {
    const path = window.location.pathname;
    const match = path.match(/\/loja\/([^\/]+)/);
    return match ? match[1] : null;
}

function obterUsuario() {
    if (window.dadosUsuario) return window.dadosUsuario;
    
    const info = sessionStorage.getItem('usuarioInfo');
    if (info) {
        try {
            return JSON.parse(info);
        } catch(e) {}
    }
    
    return null;
}

function mostrarLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function mostrarMensagem(msg, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarTreinamentos() {
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('treinamentos').collection('itens');
        const snap = await ref.get();
        treinamentos = [];
        snap.forEach(doc => treinamentos.push({ id: doc.id, ...doc.data() }));
        console.log(`📚 ${treinamentos.length} treinamentos`);
    } catch (err) {
        console.error('Erro treinamentos:', err);
        treinamentos = [];
    }
}

async function carregarVideos() {
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('videos').collection('itens');
        const snap = await ref.get();
        videos = [];
        snap.forEach(doc => videos.push({ id: doc.id, ...doc.data() }));
        console.log(`🎬 ${videos.length} vídeos`);
    } catch (err) {
        console.error('Erro vídeos:', err);
        videos = [];
    }
}

async function carregarTestes() {
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('testes').collection('itens');
        const snap = await ref.get();
        testes = [];
        snap.forEach(doc => testes.push({ id: doc.id, ...doc.data() }));
        console.log(`📝 ${testes.length} testes`);
    } catch (err) {
        console.error('Erro testes:', err);
        testes = [];
    }
}

async function carregarProgresso() {
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('progresso').collection('usuarios').doc(usuario.email);
        const doc = await ref.get();
        
        if (doc.exists) {
            progresso = doc.data();
        } else {
            progresso = {
                email: usuario.email,
                nome: usuario.nome,
                pontos: 0,
                treinamentos: [],
                videos: [],
                testes: []
            };
            await ref.set(progresso);
        }
        console.log('✅ Progresso carregado');
    } catch (err) {
        console.error('Erro progresso:', err);
        progresso = { pontos: 0, treinamentos: [], videos: [], testes: [] };
    }
}

async function salvarProgresso() {
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('progresso').collection('usuarios').doc(usuario.email);
        await ref.set(progresso);
        console.log('✅ Progresso salvo');
    } catch (err) {
        console.error('Erro ao salvar:', err);
    }
}

// ============================================
// RENDERIZAR
// ============================================
function renderizarTudo() {
    renderizarTreinamentos();
    renderizarVideos();
    renderizarTestes();
    atualizarStats();
}

function renderizarTreinamentos() {
    const container = document.getElementById('treinamentosList');
    if (!container) return;
    
    if (treinamentos.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-book-open"></i>
                <p>Nenhum treinamento disponível</p>
                ${isAdmin ? '<button class="btn-add" onclick="window.abrirModalTreinamento()"><i class="fas fa-plus"></i> Criar Treinamento</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="window.abrirModalTreinamento()"><i class="fas fa-plus"></i> Novo Treinamento</button>';
    }
    
    treinamentos.forEach(t => {
        const concluido = progresso?.treinamentos?.includes(t.id);
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${t.titulo || 'Sem título'}</div>
                    <div class="card-desc">${t.descricao || ''}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${t.pontos || 10} pontos</div>
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="window.editarTreinamento('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="window.excluirTreinamento('${t.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        ${concluido ? 
                            '<button class="btn-concluir" disabled><i class="fas fa-check"></i> Concluído</button>' : 
                            `<button class="btn-concluir" onclick="window.concluirTreinamento('${t.id}', ${t.pontos || 10})"><i class="fas fa-check-circle"></i> Marcar Concluído</button>`
                        }
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarVideos() {
    const container = document.getElementById('videosList');
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-video"></i>
                <p>Nenhum vídeo disponível</p>
                ${isAdmin ? '<button class="btn-add" onclick="window.abrirModalVideo()"><i class="fas fa-plus"></i> Adicionar Vídeo</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="window.abrirModalVideo()"><i class="fas fa-plus"></i> Novo Vídeo</button>';
    }
    
    videos.forEach(v => {
        const assistido = progresso?.videos?.includes(v.id);
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${v.titulo || 'Sem título'}</div>
                    <div class="card-desc">${v.descricao || ''}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${v.pontos || 5} pontos</div>
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="window.editarVideo('${v.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="window.excluirVideo('${v.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        ${assistido ? 
                            '<button class="btn-concluir" disabled><i class="fas fa-check"></i> Assistido</button>' : 
                            `<button class="btn-concluir" onclick="window.assistirVideo('${v.id}', '${v.url}', ${v.pontos || 5})"><i class="fas fa-play"></i> Assistir</button>`
                        }
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarTestes() {
    const container = document.getElementById('testesList');
    if (!container) return;
    
    if (testes.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <i class="fas fa-clipboard-list"></i>
                <p>Nenhum teste disponível</p>
                ${isAdmin ? '<button class="btn-add" onclick="window.abrirModalTeste()"><i class="fas fa-plus"></i> Criar Teste</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="window.abrirModalTeste()"><i class="fas fa-plus"></i> Novo Teste</button>';
    }
    
    testes.forEach(t => {
        const realizado = progresso?.testes?.find(tr => tr.id === t.id);
        const aprovado = realizado?.aprovado;
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${t.titulo || 'Sem título'}</div>
                    <div class="card-desc">${t.descricao || ''}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${t.pontos_max || 100} pontos máx</div>
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="window.editarTeste('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="window.excluirTeste('${t.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        ${aprovado ? 
                            '<button class="btn-concluir" disabled><i class="fas fa-check"></i> Aprovado</button>' : 
                            `<button class="btn-concluir" onclick="alert('Teste em desenvolvimento')"><i class="fas fa-play"></i> Iniciar Teste</button>`
                        }
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function atualizarStats() {
    const totalTreinamentos = treinamentos.length;
    const concluidos = progresso?.treinamentos?.length || 0;
    const percentual = totalTreinamentos > 0 ? Math.round((concluidos / totalTreinamentos) * 100) : 0;
    
    document.getElementById('totalPontos').textContent = progresso?.pontos || 0;
    document.getElementById('totalConcluidos').textContent = `${concluidos}/${totalTreinamentos}`;
    document.getElementById('progressoPercentual').textContent = `${percentual}%`;
    document.getElementById('progressoFill').style.width = `${percentual}%`;
    
    let nivel = 'Iniciante';
    if (percentual >= 80) nivel = 'Expert';
    else if (percentual >= 60) nivel = 'Avançado';
    else if (percentual >= 30) nivel = 'Intermediário';
    document.getElementById('nivelAtual').textContent = nivel;
}

// ============================================
// AÇÕES DO USUÁRIO (GLOBAIS)
// ============================================
window.concluirTreinamento = async function(id, pontos) {
    console.log('concluirTreinamento chamado', id, pontos);
    if (progresso.treinamentos?.includes(id)) {
        mostrarMensagem('Este treinamento já foi concluído!', 'warning');
        return;
    }
    
    if (!progresso.treinamentos) progresso.treinamentos = [];
    progresso.treinamentos.push(id);
    progresso.pontos = (progresso.pontos || 0) + pontos;
    
    await salvarProgresso();
    renderizarTreinamentos();
    atualizarStats();
    mostrarMensagem(`✅ Parabéns! Você ganhou ${pontos} pontos!`, 'success');
};

window.assistirVideo = function(id, url, pontos) {
    console.log('assistirVideo chamado', id, url, pontos);
    if (progresso.videos?.includes(id)) {
        mostrarMensagem('Este vídeo já foi assistido!', 'warning');
        return;
    }
    
    // Extrair ID do YouTube
    let videoId = url;
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    }
    
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    
    if (confirm('Após assistir, clique em OK para marcar como concluído')) {
        if (!progresso.videos) progresso.videos = [];
        progresso.videos.push(id);
        progresso.pontos = (progresso.pontos || 0) + pontos;
        
        salvarProgresso();
        renderizarVideos();
        atualizarStats();
        mostrarMensagem(`✅ Vídeo assistido! Você ganhou ${pontos} pontos!`, 'success');
    }
};

// ============================================
// CRUD ADMIN (GLOBAIS)
// ============================================
window.abrirModalTreinamento = function(id = null) {
    console.log('abrirModalTreinamento chamado', id);
    if (id) {
        const t = treinamentos.find(t => t.id === id);
        if (t) {
            document.getElementById('treinamentoId').value = t.id;
            document.getElementById('treinamentoTitulo').value = t.titulo;
            document.getElementById('treinamentoDescricao').value = t.descricao || '';
            document.getElementById('treinamentoPontos').value = t.pontos || 10;
            document.getElementById('modalTreinamentoTitle').textContent = 'Editar Treinamento';
        }
    } else {
        document.getElementById('treinamentoId').value = '';
        document.getElementById('treinamentoTitulo').value = '';
        document.getElementById('treinamentoDescricao').value = '';
        document.getElementById('treinamentoPontos').value = 10;
        document.getElementById('modalTreinamentoTitle').textContent = 'Novo Treinamento';
    }
    document.getElementById('modalTreinamento').style.display = 'flex';
};

window.salvarTreinamento = async function() {
    console.log('salvarTreinamento chamado');
    const id = document.getElementById('treinamentoId').value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('treinamentos').collection('itens');
        
        if (id) {
            await ref.doc(id).update(dados);
            mostrarMensagem('Treinamento atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await ref.add(dados);
            mostrarMensagem('Treinamento criado!', 'success');
        }
        
        fecharModal('modalTreinamento');
        await carregarTreinamentos();
        renderizarTreinamentos();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao salvar', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.excluirTreinamento = async function(id) {
    console.log('excluirTreinamento chamado', id);
    if (!confirm('Tem certeza?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('treinamentos').collection('itens');
        await ref.doc(id).delete();
        
        mostrarMensagem('Treinamento excluído!', 'success');
        await carregarTreinamentos();
        renderizarTreinamentos();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao excluir', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.editarTreinamento = function(id) {
    window.abrirModalTreinamento(id);
};

// CRUD Vídeos
window.abrirModalVideo = function(id = null) {
    console.log('abrirModalVideo chamado', id);
    if (id) {
        const v = videos.find(v => v.id === id);
        if (v) {
            document.getElementById('videoId').value = v.id;
            document.getElementById('videoTitulo').value = v.titulo;
            document.getElementById('videoDescricao').value = v.descricao || '';
            document.getElementById('videoUrl').value = v.url || '';
            document.getElementById('videoPontos').value = v.pontos || 5;
            document.getElementById('modalVideoTitle').textContent = 'Editar Vídeo';
        }
    } else {
        document.getElementById('videoId').value = '';
        document.getElementById('videoTitulo').value = '';
        document.getElementById('videoDescricao').value = '';
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoPontos').value = 5;
        document.getElementById('modalVideoTitle').textContent = 'Novo Vídeo';
    }
    document.getElementById('modalVideo').style.display = 'flex';
};

window.salvarVideo = async function() {
    console.log('salvarVideo chamado');
    const id = document.getElementById('videoId').value;
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('videos').collection('itens');
        
        if (id) {
            await ref.doc(id).update(dados);
            mostrarMensagem('Vídeo atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await ref.add(dados);
            mostrarMensagem('Vídeo criado!', 'success');
        }
        
        fecharModal('modalVideo');
        await carregarVideos();
        renderizarVideos();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao salvar', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.excluirVideo = async function(id) {
    console.log('excluirVideo chamado', id);
    if (!confirm('Tem certeza?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('videos').collection('itens');
        await ref.doc(id).delete();
        
        mostrarMensagem('Vídeo excluído!', 'success');
        await carregarVideos();
        renderizarVideos();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao excluir', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.editarVideo = function(id) {
    window.abrirModalVideo(id);
};

// CRUD Testes
window.abrirModalTeste = function(id = null) {
    console.log('abrirModalTeste chamado', id);
    if (id) {
        const t = testes.find(t => t.id === id);
        if (t) {
            document.getElementById('testeId').value = t.id;
            document.getElementById('testeTitulo').value = t.titulo;
            document.getElementById('testeDescricao').value = t.descricao || '';
            document.getElementById('testePontosMax').value = t.pontos_max || 100;
            document.getElementById('modalTesteTitle').textContent = 'Editar Teste';
        }
    } else {
        document.getElementById('testeId').value = '';
        document.getElementById('testeTitulo').value = '';
        document.getElementById('testeDescricao').value = '';
        document.getElementById('testePontosMax').value = 100;
        document.getElementById('modalTesteTitle').textContent = 'Novo Teste';
    }
    document.getElementById('modalTeste').style.display = 'flex';
};

window.salvarTeste = async function() {
    console.log('salvarTeste chamado');
    const id = document.getElementById('testeId').value;
    const dados = {
        titulo: document.getElementById('testeTitulo').value,
        descricao: document.getElementById('testeDescricao').value,
        pontos_max: parseInt(document.getElementById('testePontosMax').value) || 100
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('testes').collection('itens');
        
        if (id) {
            await ref.doc(id).update(dados);
            mostrarMensagem('Teste atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await ref.add(dados);
            mostrarMensagem('Teste criado!', 'success');
        }
        
        fecharModal('modalTeste');
        await carregarTestes();
        renderizarTestes();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao salvar', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.excluirTeste = async function(id) {
    console.log('excluirTeste chamado', id);
    if (!confirm('Tem certeza?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecao = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const ref = db.collection(colecao).doc('testes').collection('itens');
        await ref.doc(id).delete();
        
        mostrarMensagem('Teste excluído!', 'success');
        await carregarTestes();
        renderizarTestes();
        
    } catch (err) {
        console.error(err);
        mostrarMensagem('Erro ao excluir', 'error');
    } finally {
        mostrarLoading(false);
    }
};

window.editarTeste = function(id) {
    window.abrirModalTeste(id);
};

// ============================================
// EVENTOS
// ============================================
function configurarEventos() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
    
    // Fechar modais ao clicar fora
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

// Exportar para window
window.fecharModal = fecharModal;

console.log('✅ programas_aprimoramento.js carregado');
