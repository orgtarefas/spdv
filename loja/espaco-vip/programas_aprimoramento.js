// ============================================
// programas_aprimoramento.js
// COM SELEÇÃO DE CLIENTES POR CONTEÚDO
// ============================================

console.log("📚 Inicializando Programas de Aprimoramento...");

// ============================================
// IMPORTAÇÕES
// ============================================
import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc
} from './novo_firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let lojaIdAtual = null;
let dadosUsuario = null;
let isAdmin = false;
let treinamentos = [];
let videos = [];
let testes = [];
let progresso = null;
let clientes = [];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando...');
    
    mostrarLoading(true);
    
    try {
        lojaIdAtual = obterLojaId();
        console.log(`📍 Loja: ${lojaIdAtual}`);
        
        await aguardarFirebaseAuth();
        await obterUsuarioLogado();
        atualizarNomeUsuario();
        
        if (!dadosUsuario) {
            mostrarMensagem('Faça login para acessar', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        console.log(`👤 Usuário: ${dadosUsuario.email} (${dadosUsuario.perfil})`);
        isAdmin = dadosUsuario.perfil === 'admin' || dadosUsuario.perfil === 'gerente' || dadosUsuario.perfil === 'supervisor';
        
        if (isAdmin) {
            await carregarClientes();
        }
        
        await carregarTreinamentos();
        await carregarVideos();
        await carregarTestes();
        await carregarProgresso();
        
        renderizarTudo();
        configurarEventos();
        
        mostrarLoading(false);
        console.log('✅ Sistema pronto!');
        
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarMensagem('Erro ao carregar', 'error');
        mostrarLoading(false);
    }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function obterLojaId() {
    const path = window.location.pathname;
    const match = path.match(/\/loja\/([^\/]+)/);
    return match ? match[1] : null;
}

async function aguardarFirebaseAuth() {
    let tentativas = 0;
    const maxTentativas = 20;
    
    while (tentativas < maxTentativas) {
        if (window.dadosUsuario && window.dadosUsuario.email) return;
        const info = sessionStorage.getItem('usuarioInfo');
        if (info) {
            try {
                if (JSON.parse(info).email) return;
            } catch(e) {}
        }
        if (window.auth && window.auth.currentUser) return;
        await new Promise(resolve => setTimeout(resolve, 500));
        tentativas++;
    }
}

async function obterUsuarioLogado() {
    if (window.dadosUsuario && window.dadosUsuario.email) {
        dadosUsuario = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente'
        };
        return;
    }
    
    const info = sessionStorage.getItem('usuarioInfo');
    if (info) {
        try {
            const parsed = JSON.parse(info);
            dadosUsuario = {
                email: parsed.email,
                nome: parsed.nome || parsed.email?.split('@')[0],
                perfil: parsed.perfil || 'cliente'
            };
            return;
        } catch(e) {}
    }
    
    if (window.auth && window.auth.currentUser) {
        const user = window.auth.currentUser;
        dadosUsuario = {
            email: user.email,
            nome: user.displayName || user.email.split('@')[0],
            perfil: 'cliente'
        };
        return;
    }
}

function atualizarNomeUsuario() {
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan && dadosUsuario) {
        userNameSpan.textContent = dadosUsuario.nome || dadosUsuario.email?.split('@')[0] || 'Usuário';
    }
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

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

// ============================================
// CARREGAR CLIENTES
// ============================================
async function carregarClientes() {
    if (!window.loginDb) return;
    
    try {
        const clientesRef = window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes');
        
        const snapshot = await clientesRef.get();
        
        clientes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            clientes.push({
                email: doc.id,
                nome: data.nome || doc.id.split('@')[0]
            });
        });
        
        console.log(`👥 ${clientes.length} clientes carregados`);
        atualizarSelectsClientes();
        
    } catch (err) {
        console.error('Erro ao carregar clientes:', err);
        clientes = [];
    }
}

function atualizarSelectsClientes() {
    const selects = ['treinamentoClientes', 'videoClientes', 'testeClientes'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = clientes.map(c => 
                `<option value="${c.email}">${c.nome} (${c.email})</option>`
            ).join('');
        }
    });
}

// ============================================
// PÚBLICO-ALVO
// ============================================
window.togglePublicoAlvo = function(tipo) {
    const publicoTipo = document.getElementById(`${tipo}PublicoTipo`).value;
    const clientesContainer = document.getElementById(`${tipo}ClientesContainer`);
    
    if (clientesContainer) {
        clientesContainer.style.display = publicoTipo === 'especifico' ? 'block' : 'none';
    }
};

function getPublicoAlvo(tipo) {
    const publicoTipo = document.getElementById(`${tipo}PublicoTipo`).value;
    
    if (publicoTipo === 'geral') {
        return { publico_alvo: 'geral', clientes_autorizados: [] };
    } else {
        const clientesSelecionados = [];
        const select = document.getElementById(`${tipo}Clientes`);
        if (select) {
            Array.from(select.selectedOptions).forEach(opt => {
                clientesSelecionados.push(opt.value);
            });
        }
        return { publico_alvo: 'especifico', clientes_autorizados: clientesSelecionados };
    }
}

function usuarioTemAcesso(conteudo) {
    if (isAdmin) return true;
    if (conteudo.publico_alvo === 'geral') return true;
    if (conteudo.publico_alvo === 'especifico' && conteudo.clientes_autorizados) {
        return conteudo.clientes_autorizados.includes(dadosUsuario.email);
    }
    return false;
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarTreinamentos() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        const snapshot = await getDocs(treinamentosRef);
        
        const todos = [];
        snapshot.forEach(doc => todos.push({ id: doc.id, ...doc.data() }));
        treinamentos = todos.filter(t => usuarioTemAcesso(t));
        
        console.log(`📚 ${treinamentos.length} treinamentos disponíveis`);
        renderizarTreinamentos();
    } catch (err) {
        console.error('Erro treinamentos:', err);
        treinamentos = [];
    }
}

async function carregarVideos() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos', 'itens');
        const snapshot = await getDocs(videosRef);
        
        const todos = [];
        snapshot.forEach(doc => todos.push({ id: doc.id, ...doc.data() }));
        videos = todos.filter(v => usuarioTemAcesso(v));
        
        console.log(`🎬 ${videos.length} vídeos disponíveis`);
        renderizarVideos();
    } catch (err) {
        console.error('Erro vídeos:', err);
        videos = [];
    }
}

async function carregarTestes() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes', 'itens');
        const snapshot = await getDocs(testesRef);
        
        const todos = [];
        snapshot.forEach(doc => todos.push({ id: doc.id, ...doc.data() }));
        testes = todos.filter(t => usuarioTemAcesso(t));
        
        console.log(`📝 ${testes.length} testes disponíveis`);
        renderizarTestes();
    } catch (err) {
        console.error('Erro testes:', err);
        testes = [];
    }
}

async function carregarProgresso() {
    if (!dadosUsuario?.email) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso', 'usuarios', dadosUsuario.email);
        const docSnap = await getDoc(progressoRef);
        
        if (docSnap.exists()) {
            progresso = docSnap.data();
        } else {
            progresso = {
                email: dadosUsuario.email,
                nome: dadosUsuario.nome,
                pontos: 0,
                treinamentos: [],
                videos: [],
                testes: []
            };
            await setDoc(progressoRef, progresso);
        }
        console.log('✅ Progresso carregado');
        atualizarStats();
    } catch (err) {
        console.error('Erro progresso:', err);
        progresso = { pontos: 0, treinamentos: [], videos: [], testes: [] };
    }
}

async function salvarProgresso() {
    if (!dadosUsuario?.email) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso', 'usuarios', dadosUsuario.email);
        await setDoc(progressoRef, progresso);
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
                <p>Nenhum treinamento disponível para você</p>
                ${isAdmin ? '<button class="btn-add" onclick="abrirModalTreinamento()"><i class="fas fa-plus"></i> Criar Treinamento</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="abrirModalTreinamento()"><i class="fas fa-plus"></i> Novo Treinamento</button>';
    }
    
    treinamentos.forEach(t => {
        const concluido = progresso?.treinamentos?.includes(t.id);
        const publicoBadge = t.publico_alvo === 'geral' ? '📢 Geral' : `👤 ${t.clientes_autorizados?.length} cliente(s)`;
        
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${escapeHtml(t.titulo || 'Sem título')}</div>
                    <div class="card-desc">${escapeHtml(t.descricao || '')}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${t.pontos || 10} pontos</div>
                    ${isAdmin ? `<div class="card-publico"><i class="fas fa-users"></i> ${publicoBadge}</div>` : ''}
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="editarTreinamento('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="excluirTreinamento('${t.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        ${concluido ? 
                            '<button class="btn-concluir" disabled><i class="fas fa-check"></i> Concluído</button>' : 
                            `<button class="btn-concluir" onclick="concluirTreinamento('${t.id}', ${t.pontos || 10})"><i class="fas fa-check-circle"></i> Marcar Concluído</button>`
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
                <p>Nenhum vídeo disponível para você</p>
                ${isAdmin ? '<button class="btn-add" onclick="abrirModalVideo()"><i class="fas fa-plus"></i> Adicionar Vídeo</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="abrirModalVideo()"><i class="fas fa-plus"></i> Novo Vídeo</button>';
    }
    
    videos.forEach(v => {
        const assistido = progresso?.videos?.includes(v.id);
        const publicoBadge = v.publico_alvo === 'geral' ? '📢 Geral' : `👤 ${v.clientes_autorizados?.length} cliente(s)`;
        
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${escapeHtml(v.titulo || 'Sem título')}</div>
                    <div class="card-desc">${escapeHtml(v.descricao || '')}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${v.pontos || 5} pontos</div>
                    ${isAdmin ? `<div class="card-publico"><i class="fas fa-users"></i> ${publicoBadge}</div>` : ''}
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="editarVideo('${v.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="excluirVideo('${v.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        ${assistido ? 
                            '<button class="btn-concluir" disabled><i class="fas fa-check"></i> Assistido</button>' : 
                            `<button class="btn-concluir" onclick="assistirVideo('${v.id}', '${v.url}', ${v.pontos || 5})"><i class="fas fa-play"></i> Assistir</button>`
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
                <p>Nenhum teste disponível para você</p>
                ${isAdmin ? '<button class="btn-add" onclick="abrirModalTeste()"><i class="fas fa-plus"></i> Criar Teste</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '';
    if (isAdmin) {
        html += '<button class="btn-add" onclick="abrirModalTeste()"><i class="fas fa-plus"></i> Novo Teste</button>';
    }
    
    testes.forEach(t => {
        const realizado = progresso?.testes?.find(tr => tr.id === t.id);
        const aprovado = realizado?.aprovado;
        const publicoBadge = t.publico_alvo === 'geral' ? '📢 Geral' : `👤 ${t.clientes_autorizados?.length} cliente(s)`;
        
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${escapeHtml(t.titulo || 'Sem título')}</div>
                    <div class="card-desc">${escapeHtml(t.descricao || '')}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${t.pontos_max || 100} pontos</div>
                    ${isAdmin ? `<div class="card-publico"><i class="fas fa-users"></i> ${publicoBadge}</div>` : ''}
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="editarTeste('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="excluirTeste('${t.id}')"><i class="fas fa-trash"></i></button>
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
    const total = treinamentos.length;
    const concluidos = progresso?.treinamentos?.length || 0;
    const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    
    document.getElementById('totalPontos').textContent = progresso?.pontos || 0;
    document.getElementById('totalConcluidos').textContent = `${concluidos}/${total}`;
    document.getElementById('progressoPercentual').textContent = `${percentual}%`;
    document.getElementById('progressoFill').style.width = `${percentual}%`;
    
    let nivel = 'Iniciante';
    if (percentual >= 80) nivel = 'Expert';
    else if (percentual >= 60) nivel = 'Avançado';
    else if (percentual >= 30) nivel = 'Intermediário';
    document.getElementById('nivelAtual').textContent = nivel;
}

// ============================================
// AÇÕES DO USUÁRIO
// ============================================
window.concluirTreinamento = async function(id, pontos) {
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
    if (progresso.videos?.includes(id)) {
        mostrarMensagem('Este vídeo já foi assistido!', 'warning');
        return;
    }
    
    let videoId = url;
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    }
    
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    
    setTimeout(async () => {
        if (!progresso.videos) progresso.videos = [];
        progresso.videos.push(id);
        progresso.pontos = (progresso.pontos || 0) + pontos;
        
        await salvarProgresso();
        renderizarVideos();
        atualizarStats();
        mostrarMensagem(`✅ Você ganhou ${pontos} pontos!`, 'success');
    }, 3000);
};

// ============================================
// CRUD TREINAMENTOS
// ============================================
window.abrirModalTreinamento = function(id = null) {
    if (id) {
        const t = treinamentos.find(t => t.id === id);
        if (t) {
            document.getElementById('treinamentoId').value = t.id;
            document.getElementById('treinamentoTitulo').value = t.titulo;
            document.getElementById('treinamentoDescricao').value = t.descricao || '';
            document.getElementById('treinamentoConteudo').value = t.conteudo || '';
            document.getElementById('treinamentoPontos').value = t.pontos || 10;
            document.getElementById('treinamentoCategoria').value = t.categoria || 'iniciante';
            
            if (t.publico_alvo === 'geral') {
                document.getElementById('treinamentoPublicoTipo').value = 'geral';
            } else {
                document.getElementById('treinamentoPublicoTipo').value = 'especifico';
                if (t.clientes_autorizados && document.getElementById('treinamentoClientes')) {
                    Array.from(document.getElementById('treinamentoClientes').options).forEach(opt => {
                        opt.selected = t.clientes_autorizados.includes(opt.value);
                    });
                }
            }
            togglePublicoAlvo('treinamento');
            document.getElementById('modalTreinamentoTitle').textContent = 'Editar Treinamento';
        }
    } else {
        document.getElementById('treinamentoId').value = '';
        document.getElementById('treinamentoTitulo').value = '';
        document.getElementById('treinamentoDescricao').value = '';
        document.getElementById('treinamentoConteudo').value = '';
        document.getElementById('treinamentoPontos').value = 10;
        document.getElementById('treinamentoCategoria').value = 'iniciante';
        document.getElementById('treinamentoPublicoTipo').value = 'geral';
        togglePublicoAlvo('treinamento');
        document.getElementById('modalTreinamentoTitle').textContent = 'Novo Treinamento';
    }
    document.getElementById('modalTreinamento').style.display = 'flex';
};

window.salvarTreinamento = async function() {
    const id = document.getElementById('treinamentoId').value;
    const publico = getPublicoAlvo('treinamento');
    
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        conteudo: document.getElementById('treinamentoConteudo').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10,
        categoria: document.getElementById('treinamentoCategoria').value,
        ...publico,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        
        if (id) {
            await updateDoc(doc(treinamentosRef, id), dados);
            mostrarMensagem('Treinamento atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            dados.criado_por = dadosUsuario.email;
            await addDoc(treinamentosRef, dados);
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
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        await deleteDoc(doc(treinamentosRef, id));
        
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

// ============================================
// CRUD VÍDEOS
// ============================================
window.abrirModalVideo = function(id = null) {
    if (id) {
        const v = videos.find(v => v.id === id);
        if (v) {
            document.getElementById('videoId').value = v.id;
            document.getElementById('videoTitulo').value = v.titulo;
            document.getElementById('videoDescricao').value = v.descricao || '';
            document.getElementById('videoUrl').value = v.url || '';
            document.getElementById('videoDuracao').value = v.duracao || 0;
            document.getElementById('videoPontos').value = v.pontos || 5;
            document.getElementById('videoCategoria').value = v.categoria || 'iniciante';
            
            if (v.publico_alvo === 'geral') {
                document.getElementById('videoPublicoTipo').value = 'geral';
            } else {
                document.getElementById('videoPublicoTipo').value = 'especifico';
                if (v.clientes_autorizados && document.getElementById('videoClientes')) {
                    Array.from(document.getElementById('videoClientes').options).forEach(opt => {
                        opt.selected = v.clientes_autorizados.includes(opt.value);
                    });
                }
            }
            togglePublicoAlvo('video');
            document.getElementById('modalVideoTitle').textContent = 'Editar Vídeo';
        }
    } else {
        document.getElementById('videoId').value = '';
        document.getElementById('videoTitulo').value = '';
        document.getElementById('videoDescricao').value = '';
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoDuracao').value = 5;
        document.getElementById('videoPontos').value = 5;
        document.getElementById('videoCategoria').value = 'iniciante';
        document.getElementById('videoPublicoTipo').value = 'geral';
        togglePublicoAlvo('video');
        document.getElementById('modalVideoTitle').textContent = 'Novo Vídeo';
    }
    document.getElementById('modalVideo').style.display = 'flex';
};

window.salvarVideo = async function() {
    const id = document.getElementById('videoId').value;
    const publico = getPublicoAlvo('video');
    
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        duracao: parseInt(document.getElementById('videoDuracao').value) || 0,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5,
        categoria: document.getElementById('videoCategoria').value,
        ...publico,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos', 'itens');
        
        if (id) {
            await updateDoc(doc(videosRef, id), dados);
            mostrarMensagem('Vídeo atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            dados.criado_por = dadosUsuario.email;
            await addDoc(videosRef, dados);
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
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos', 'itens');
        await deleteDoc(doc(videosRef, id));
        
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

// ============================================
// CRUD TESTES
// ============================================
window.abrirModalTeste = function(id = null) {
    if (id) {
        const t = testes.find(t => t.id === id);
        if (t) {
            document.getElementById('testeId').value = t.id;
            document.getElementById('testeTitulo').value = t.titulo;
            document.getElementById('testeDescricao').value = t.descricao || '';
            document.getElementById('testePontosMax').value = t.pontos_max || 100;
            document.getElementById('testePontosMin').value = t.pontos_min || 70;
            
            if (t.publico_alvo === 'geral') {
                document.getElementById('testePublicoTipo').value = 'geral';
            } else {
                document.getElementById('testePublicoTipo').value = 'especifico';
                if (t.clientes_autorizados && document.getElementById('testeClientes')) {
                    Array.from(document.getElementById('testeClientes').options).forEach(opt => {
                        opt.selected = t.clientes_autorizados.includes(opt.value);
                    });
                }
            }
            togglePublicoAlvo('teste');
            
            const container = document.getElementById('questoesContainer');
            container.innerHTML = '';
            if (t.questoes && t.questoes.length > 0) {
                t.questoes.forEach(q => adicionarQuestaoForm(q));
            } else {
                adicionarQuestaoForm();
                adicionarQuestaoForm();
            }
            document.getElementById('modalTesteTitle').textContent = 'Editar Teste';
        }
    } else {
        document.getElementById('testeId').value = '';
        document.getElementById('testeTitulo').value = '';
        document.getElementById('testeDescricao').value = '';
        document.getElementById('testePontosMax').value = 100;
        document.getElementById('testePontosMin').value = 70;
        document.getElementById('testePublicoTipo').value = 'geral';
        togglePublicoAlvo('teste');
        
        const container = document.getElementById('questoesContainer');
        container.innerHTML = '';
        adicionarQuestaoForm();
        adicionarQuestaoForm();
        document.getElementById('modalTesteTitle').textContent = 'Novo Teste';
    }
    document.getElementById('modalTeste').style.display = 'flex';
};

function adicionarQuestaoForm(questaoData = null) {
    const container = document.getElementById('questoesContainer');
    const questaoDiv = document.createElement('div');
    questaoDiv.className = 'questao-item';
    const questaoNumero = container.children.length + 1;
    
    let alternativasHtml = '';
    if (questaoData) {
        for (let i = 0; i < questaoData.alternativas.length; i++) {
            const letra = String.fromCharCode(65 + i);
            alternativasHtml += `
                <div class="alternativa-item">
                    <input type="radio" name="alternativa_correta" class="alternativa-correta" value="${i}" ${questaoData.correta === i ? 'checked' : ''}>
                    <input type="text" class="alternativa-texto" placeholder="Alternativa ${letra}" value="${escapeHtml(questaoData.alternativas[i])}">
                    <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
                </div>
            `;
        }
    } else {
        alternativasHtml = `
            <div class="alternativa-item">
                <input type="radio" name="alternativa_correta" class="alternativa-correta" value="0">
                <input type="text" class="alternativa-texto" placeholder="Alternativa A">
                <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
            </div>
            <div class="alternativa-item">
                <input type="radio" name="alternativa_correta" class="alternativa-correta" value="1">
                <input type="text" class="alternativa-texto" placeholder="Alternativa B">
                <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
            </div>
        `;
    }
    
    questaoDiv.innerHTML = `
        <div class="questao-header">
            <span class="questao-numero">Questão ${questaoNumero}</span>
            <button type="button" class="btn-remover-questao" onclick="this.remove()">&times;</button>
        </div>
        <input type="text" class="questao-texto" placeholder="Enunciado da questão" value="${questaoData ? escapeHtml(questaoData.texto) : ''}">
        <div class="alternativas-container">
            ${alternativasHtml}
        </div>
        <button type="button" class="btn-add-alternativa" onclick="adicionarAlternativa(this)">+ Adicionar Alternativa</button>
    `;
    
    container.appendChild(questaoDiv);
}

window.adicionarQuestao = function() {
    adicionarQuestaoForm();
};

function adicionarAlternativa(btn) {
    const alternativasContainer = btn.closest('.questao-item').querySelector('.alternativas-container');
    const numAlternativas = alternativasContainer.children.length;
    const letra = String.fromCharCode(65 + numAlternativas);
    
    const altDiv = document.createElement('div');
    altDiv.className = 'alternativa-item';
    altDiv.innerHTML = `
        <input type="radio" name="alternativa_correta" class="alternativa-correta" value="${numAlternativas}">
        <input type="text" class="alternativa-texto" placeholder="Alternativa ${letra}">
        <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
    `;
    alternativasContainer.appendChild(altDiv);
}

window.salvarTeste = async function() {
    const id = document.getElementById('testeId').value;
    const publico = getPublicoAlvo('teste');
    
    const questoes = [];
    document.querySelectorAll('#questoesContainer .questao-item').forEach((questaoDiv) => {
        const texto = questaoDiv.querySelector('.questao-texto').value;
        const alternativas = [];
        let correta = -1;
        
        questaoDiv.querySelectorAll('.alternativa-item').forEach((altDiv, altIdx) => {
            const textoAlt = altDiv.querySelector('.alternativa-texto').value;
            if (textoAlt.trim()) {
                alternativas.push(textoAlt);
                if (altDiv.querySelector('.alternativa-correta').checked) {
                    correta = altIdx;
                }
            }
        });
        
        if (texto.trim() && alternativas.length >= 2 && correta !== -1) {
            questoes.push({ texto, alternativas, correta });
        }
    });
    
    if (questoes.length === 0) {
        mostrarMensagem('Adicione pelo menos uma questão válida!', 'warning');
        return;
    }
    
    const dados = {
        titulo: document.getElementById('testeTitulo').value,
        descricao: document.getElementById('testeDescricao').value,
        pontos_max: parseInt(document.getElementById('testePontosMax').value) || 100,
        pontos_min: parseInt(document.getElementById('testePontosMin').value) || 70,
        questoes: questoes,
        ...publico,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes', 'itens');
        
        if (id) {
            await updateDoc(doc(testesRef, id), dados);
            mostrarMensagem('Teste atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            dados.criado_por = dadosUsuario.email;
            await addDoc(testesRef, dados);
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
    if (!confirm('Tem certeza que deseja excluir este teste?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes', 'itens');
        await deleteDoc(doc(testesRef, id));
        
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
// UTILITÁRIOS
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function configurarEventos() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

console.log('✅ programas_aprimoramento.js carregado');
