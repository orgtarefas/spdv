// ============================================
// programas_aprimoramento.js
// MESMO PADRÃO DO AGENDAMENTO - COM IMPORT
// ============================================

console.log("📚 Inicializando Programas de Aprimoramento...");

// ============================================
// IMPORTAÇÕES (igual ao agendamento)
// ============================================
import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    updateDoc,
    serverTimestamp
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

// ============================================
// INICIALIZAÇÃO (igual ao agendamento)
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando...');
    
    mostrarLoading(true);
    
    try {
        // Obter loja ID
        lojaIdAtual = obterLojaId();
        console.log(`📍 Loja: ${lojaIdAtual}`);
        
        // Obter usuário logado
        await obterUsuarioLogado();
        
        if (!dadosUsuario) {
            mostrarMensagem('Faça login para acessar', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        console.log(`👤 Usuário: ${dadosUsuario.email} (${dadosUsuario.perfil})`);
        isAdmin = dadosUsuario.perfil === 'admin' || dadosUsuario.perfil === 'gerente' || dadosUsuario.perfil === 'supervisor';
        
        // Carregar dados
        await carregarTreinamentos();
        await carregarVideos();
        await carregarTestes();
        await carregarProgresso();
        
        // Renderizar
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

async function obterUsuarioLogado() {
    // Tentar window.dadosUsuario
    if (window.dadosUsuario) {
        dadosUsuario = window.dadosUsuario;
        return;
    }
    
    // Tentar sessionStorage
    const info = sessionStorage.getItem('usuarioInfo');
    if (info) {
        try {
            dadosUsuario = JSON.parse(info);
            return;
        } catch(e) {}
    }
    
    // Tentar Firebase Auth
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
// CARREGAR DADOS (usando db importado)
// ============================================
async function carregarTreinamentos() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        const snapshot = await getDocs(treinamentosRef);
        
        treinamentos = [];
        snapshot.forEach(doc => {
            treinamentos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📚 ${treinamentos.length} treinamentos`);
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
        
        videos = [];
        snapshot.forEach(doc => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`🎬 ${videos.length} vídeos`);
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
        
        testes = [];
        snapshot.forEach(doc => {
            testes.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📝 ${testes.length} testes`);
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
        html += `
            <div class="card">
                <div class="card-info">
                    <div class="card-title">${t.titulo || 'Sem título'}</div>
                    <div class="card-desc">${t.descricao || ''}</div>
                    <div class="card-pontos"><i class="fas fa-star"></i> ${t.pontos_max || 100} pontos</div>
                </div>
                <div class="card-actions">
                    ${isAdmin ? `
                        <button class="btn-editar" onclick="window.editarTeste('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-excluir" onclick="window.excluirTeste('${t.id}')"><i class="fas fa-trash"></i></button>
                    ` : `
                        <button class="btn-concluir" onclick="alert('Teste em desenvolvimento')"><i class="fas fa-play"></i> Iniciar Teste</button>
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
// AÇÕES (GLOBAIS)
// ============================================
window.concluirTreinamento = async function(id, pontos) {
    if (progresso.treinamentos?.includes(id)) {
        mostrarMensagem('Já concluído!', 'warning');
        return;
    }
    
    if (!progresso.treinamentos) progresso.treinamentos = [];
    progresso.treinamentos.push(id);
    progresso.pontos = (progresso.pontos || 0) + pontos;
    
    await salvarProgresso();
    renderizarTreinamentos();
    atualizarStats();
    mostrarMensagem(`✅ +${pontos} pontos!`, 'success');
};

window.assistirVideo = function(id, url, pontos) {
    if (progresso.videos?.includes(id)) {
        mostrarMensagem('Já assistido!', 'warning');
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
        mostrarMensagem(`✅ +${pontos} pontos!`, 'success');
    }, 5000);
};

// ============================================
// CRUD (GLOBAIS)
// ============================================
window.abrirModalTreinamento = function(id = null) {
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
    const id = document.getElementById('treinamentoId').value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10,
        data_criacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        
        if (id) {
            await updateDoc(doc(treinamentosRef, id), dados);
            mostrarMensagem('Atualizado!', 'success');
        } else {
            await addDoc(treinamentosRef, dados);
            mostrarMensagem('Criado!', 'success');
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
    if (!confirm('Excluir?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos', 'itens');
        await deleteDoc(doc(treinamentosRef, id));
        
        mostrarMensagem('Excluído!', 'success');
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

// Vídeos
window.abrirModalVideo = function(id = null) {
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
    const id = document.getElementById('videoId').value;
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5,
        data_criacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos', 'itens');
        
        if (id) {
            await updateDoc(doc(videosRef, id), dados);
            mostrarMensagem('Atualizado!', 'success');
        } else {
            await addDoc(videosRef, dados);
            mostrarMensagem('Criado!', 'success');
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
    if (!confirm('Excluir?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos', 'itens');
        await deleteDoc(doc(videosRef, id));
        
        mostrarMensagem('Excluído!', 'success');
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

// Testes
window.abrirModalTeste = function(id = null) {
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
    const id = document.getElementById('testeId').value;
    const dados = {
        titulo: document.getElementById('testeTitulo').value,
        descricao: document.getElementById('testeDescricao').value,
        pontos_max: parseInt(document.getElementById('testePontosMax').value) || 100,
        data_criacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título obrigatório', 'warning');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes', 'itens');
        
        if (id) {
            await updateDoc(doc(testesRef, id), dados);
            mostrarMensagem('Atualizado!', 'success');
        } else {
            await addDoc(testesRef, dados);
            mostrarMensagem('Criado!', 'success');
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
    if (!confirm('Excluir?')) return;
    
    mostrarLoading(true);
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes', 'itens');
        await deleteDoc(doc(testesRef, id));
        
        mostrarMensagem('Excluído!', 'success');
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
// CONFIGURAR EVENTOS
// ============================================
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

// Exportar
window.fecharModal = fecharModal;

console.log('✅ programas_aprimoramento.js carregado');
