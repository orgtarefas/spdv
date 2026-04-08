// ============================================
// programas_aprimoramento.js
// Programas de Aprimoramento - Versão Completa
// ============================================

console.log("📚 Inicializando Programas de Aprimoramento...");

// ============================================
// IMPORTAÇÕES (do novo_firebase_config.js)
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
    serverTimestamp,
    addDoc
} from './novo_firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let lojaIdAtual = null;
let dadosUsuario = null;
let isGestor = false; // Admin, Gerente ou Supervisor
let allTreinamentos = [];
let allVideos = [];
let allTestes = [];
let userProgresso = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Programas de Aprimoramento...');
    
    mostrarLoading('Carregando...');
    
    try {
        // 1. Identificar loja
        lojaIdAtual = obterLojaId();
        console.log(`📍 Loja: ${lojaIdAtual}`);
        
        // 2. Capturar usuário logado
        await capturarUsuarioLogado();
        
        if (!dadosUsuario || !dadosUsuario.email) {
            console.error('❌ Usuário não logado');
            mostrarMensagem('Faça login para acessar', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        console.log(`👤 Usuário: ${dadosUsuario.email} (${dadosUsuario.perfil})`);
        
        // 3. Verificar se é gestor (admin, gerente, supervisor)
        isGestor = ['admin', 'gerente', 'supervisor'].includes(dadosUsuario.perfil);
        console.log(`🔑 Gestor: ${isGestor ? 'SIM' : 'NÃO'}`);
        
        // 4. Verificar se programa está habilitado
        const habilitado = await verificarProgramaHabilitado();
        if (!habilitado) {
            mostrarMensagem('Programa de Aprimoramento não está habilitado para esta loja.', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // 5. Carregar dados
        await carregarTreinamentos();
        await carregarVideos();
        await carregarTestes();
        await carregarProgressoUsuario();
        
        // 6. Configurar interface
        atualizarInterface();
        configurarEventos();
        
        // 7. Mostrar botões de gestão se for gestor
        if (isGestor) {
            mostrarBotoesGestao();
        }
        
        esconderLoading();
        console.log('✅ Programas de Aprimoramento inicializado!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        esconderLoading();
        mostrarMensagem('Erro ao carregar: ' + error.message, 'error');
    }
});

// ============================================
// OBTER LOJA ID
// ============================================
function obterLojaId() {
    if (window.lojaIdAtual) return window.lojaIdAtual;
    if (window.lojaServices?.lojaId) return window.lojaServices.lojaId;
    
    const pathParts = window.location.pathname.split('/');
    const lojaIndex = pathParts.indexOf('loja');
    if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
        return pathParts[lojaIndex + 1];
    }
    return null;
}

// ============================================
// CAPTURAR USUÁRIO LOGADO
// ============================================
async function capturarUsuarioLogado() {
    // Tentar window.dadosUsuario
    if (window.dadosUsuario && window.dadosUsuario.email) {
        dadosUsuario = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente'
        };
        console.log('✅ Usuário via window.dadosUsuario');
        return;
    }
    
    // Tentar sessionStorage
    const info = sessionStorage.getItem('usuarioInfo');
    if (info) {
        try {
            const dados = JSON.parse(info);
            dadosUsuario = {
                email: dados.email,
                nome: dados.nome || dados.email.split('@')[0],
                perfil: dados.perfil || 'cliente'
            };
            console.log('✅ Usuário via sessionStorage');
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
        console.log('✅ Usuário via Firebase Auth');
        return;
    }
    
    console.error('❌ Não foi possível capturar usuário');
}

// ============================================
// VERIFICAR SE PROGRAMA ESTÁ HABILITADO
// ============================================
async function verificarProgramaHabilitado() {
    if (!window.loginDb && !window.firebaseLoginDb) {
        console.warn('⚠️ loginDb não disponível');
        return true; // Permitir por enquanto
    }
    
    const loginDbRef = window.loginDb || window.firebaseLoginDb;
    
    try {
        const lojaDoc = await loginDbRef.collection('lojas').doc(lojaIdAtual).get();
        if (lojaDoc.exists) {
            const habilitado = lojaDoc.data().habilitar_programas_aprimoramento === true;
            console.log(`📚 Programa habilitado: ${habilitado}`);
            return habilitado;
        }
    } catch (error) {
        console.error('Erro ao verificar:', error);
    }
    
    return true; // Permitir por padrão
}

// ============================================
// CARREGAR TREINAMENTOS DO FIREBASE
// ============================================
async function carregarTreinamentos() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos');
        const snapshot = await getDocs(treinamentosRef);
        
        allTreinamentos = [];
        snapshot.forEach(doc => {
            allTreinamentos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📚 ${allTreinamentos.length} treinamentos carregados`);
        renderizarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
        allTreinamentos = [];
    }
}

// ============================================
// CARREGAR VÍDEOS
// ============================================
async function carregarVideos() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos');
        const snapshot = await getDocs(videosRef);
        
        allVideos = [];
        snapshot.forEach(doc => {
            allVideos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`🎬 ${allVideos.length} vídeos carregados`);
        renderizarVideos();
        
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
        allVideos = [];
    }
}

// ============================================
// CARREGAR TESTES
// ============================================
async function carregarTestes() {
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes');
        const snapshot = await getDocs(testesRef);
        
        allTestes = [];
        snapshot.forEach(doc => {
            allTestes.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📝 ${allTestes.length} testes carregados`);
        renderizarTestes();
        
    } catch (error) {
        console.error('Erro ao carregar testes:', error);
        allTestes = [];
    }
}

// ============================================
// CARREGAR PROGRESSO DO USUÁRIO
// ============================================
async function carregarProgressoUsuario() {
    if (!dadosUsuario?.email) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso', dadosUsuario.email);
        const docSnap = await getDoc(progressoRef);
        
        if (docSnap.exists()) {
            userProgresso = docSnap.data();
        } else {
            // Criar progresso inicial
            userProgresso = {
                email: dadosUsuario.email,
                nome: dadosUsuario.nome,
                perfil: dadosUsuario.perfil,
                pontos_totais: 0,
                treinamentos_concluidos: [],
                videos_assistidos: [],
                testes_realizados: [],
                data_inicio: new Date().toISOString()
            };
            await setDoc(progressoRef, userProgresso);
            console.log('✅ Progresso inicial criado');
        }
        
        atualizarStatsProgresso();
        
    } catch (error) {
        console.error('Erro ao carregar progresso:', error);
        userProgresso = { pontos_totais: 0, treinamentos_concluidos: [], videos_assistidos: [], testes_realizados: [] };
    }
}

// ============================================
// RENDERIZAR TREINAMENTOS
// ============================================
function renderizarTreinamentos() {
    const container = document.getElementById('treinamentosGrid');
    if (!container) return;
    
    if (allTreinamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>Nenhum treinamento disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalTreinamento()">+ Criar Primeiro Treinamento</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = allTreinamentos.map(t => {
        const isConcluido = userProgresso?.treinamentos_concluidos?.includes(t.id);
        
        return `
            <div class="card-treinamento">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="badge ${t.categoria || 'iniciante'}">${t.categoria || 'Iniciante'}</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(t.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${t.pontos || 10} pontos
                    </div>
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarTreinamento('${t.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirTreinamento('${t.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isConcluido ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Concluído</button>` :
                            `<button class="btn-marcar" onclick="marcarTreinamentoConcluido('${t.id}', ${t.pontos || 10})">
                                <i class="fas fa-check-circle"></i> Marcar como Lido
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDERIZAR VÍDEOS
// ============================================
function renderizarVideos() {
    const container = document.getElementById('videosGrid');
    if (!container) return;
    
    if (allVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <p>Nenhum vídeo disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalVideo()">+ Adicionar Vídeo</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = allVideos.map(v => {
        const isAssistido = userProgresso?.videos_assistidos?.includes(v.id);
        
        return `
            <div class="card-video">
                <div class="card-header">
                    <h4>${escapeHtml(v.titulo)}</h4>
                    <span class="badge ${v.categoria || 'iniciante'}">${v.categoria || 'Iniciante'}</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(v.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${v.pontos || 5} pontos
                    </div>
                    ${v.duracao ? `<div class="card-duracao"><i class="fas fa-clock"></i> ${v.duracao} min</div>` : ''}
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarVideo('${v.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirVideo('${v.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isAssistido ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Assistido</button>` :
                            `<button class="btn-marcar" onclick="assistirVideo('${v.id}')">
                                <i class="fas fa-play"></i> Assistir
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDERIZAR TESTES
// ============================================
function renderizarTestes() {
    const container = document.getElementById('testesGrid');
    if (!container) return;
    
    if (allTestes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Nenhum teste disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalTeste()">+ Criar Teste</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = allTestes.map(t => {
        const testeRealizado = userProgresso?.testes_realizados?.find(tr => tr.teste_id === t.id);
        const isAprovado = testeRealizado?.aprovado === true;
        const nota = testeRealizado?.pontuacao || 0;
        
        return `
            <div class="card-teste">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="badge">${t.questoes?.length || 0} questões</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(t.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${t.pontos_max || 100} pontos máx
                    </div>
                    <div class="card-nota-minima">
                        <i class="fas fa-flag-checkered"></i> Mínimo: ${t.pontos_min || 70}%
                    </div>
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarTeste('${t.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirTeste('${t.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isAprovado ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Aprovado (${nota} pts)</button>` :
                            `<button class="btn-marcar" onclick="iniciarTeste('${t.id}')">
                                <i class="fas fa-play"></i> Iniciar Teste
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// ATUALIZAR STATS DO PROGRESSO
// ============================================
function atualizarStatsProgresso() {
    const totalPontos = userProgresso?.pontos_totais || 0;
    const totalTreinamentos = allTreinamentos.length;
    const concluidos = userProgresso?.treinamentos_concluidos?.length || 0;
    const percentual = totalTreinamentos > 0 ? Math.round((concluidos / totalTreinamentos) * 100) : 0;
    
    document.getElementById('totalPontos').textContent = totalPontos;
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
// MARCAR TREINAMENTO COMO CONCLUÍDO
// ============================================
window.marcarTreinamentoConcluido = async function(id, pontos) {
    if (!userProgresso) return;
    
    if (userProgresso.treinamentos_concluidos.includes(id)) {
        mostrarMensagem('Este treinamento já foi concluído!', 'warning');
        return;
    }
    
    userProgresso.treinamentos_concluidos.push(id);
    userProgresso.pontos_totais += pontos;
    
    await salvarProgresso();
    renderizarTreinamentos();
    atualizarStatsProgresso();
    mostrarMensagem(`✅ Parabéns! Você ganhou ${pontos} pontos!`, 'success');
};

// ============================================
// ASSISTIR VÍDEO
// ============================================
window.assistirVideo = function(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;
    
    // Abrir modal com vídeo
    const modal = document.getElementById('verVideoModal');
    const iframe = document.getElementById('videoIframe');
    const titulo = document.getElementById('videoVerTitulo');
    
    if (titulo) titulo.textContent = video.titulo;
    
    // Extrair ID do YouTube
    let videoId = video.url;
    if (video.url.includes('youtube.com/watch?v=')) {
        videoId = video.url.split('v=')[1].split('&')[0];
    } else if (video.url.includes('youtu.be/')) {
        videoId = video.url.split('youtu.be/')[1].split('?')[0];
    }
    
    if (iframe) iframe.src = `https://www.youtube.com/embed/${videoId}`;
    if (modal) modal.style.display = 'flex';
    
    window.currentVideoId = id;
    window.currentVideoPontos = video.pontos || 5;
};

window.marcarVideoAssistido = async function() {
    if (!window.currentVideoId) return;
    
    if (userProgresso.videos_assistidos.includes(window.currentVideoId)) {
        mostrarMensagem('Este vídeo já foi assistido!', 'warning');
        return;
    }
    
    userProgresso.videos_assistidos.push(window.currentVideoId);
    userProgresso.pontos_totais += window.currentVideoPontos;
    
    await salvarProgresso();
    renderizarVideos();
    atualizarStatsProgresso();
    
    fecharModal('verVideoModal');
    document.getElementById('videoIframe').src = '';
    window.currentVideoId = null;
    
    mostrarMensagem(`✅ Vídeo assistido! Você ganhou ${window.currentVideoPontos} pontos!`, 'success');
};

// ============================================
// INICIAR TESTE
// ============================================
window.iniciarTeste = function(id) {
    const teste = allTestes.find(t => t.id === id);
    if (!teste) return;
    
    currentTeste = teste;
    currentRespostas = {};
    
    const modal = document.getElementById('realizarTesteModal');
    const container = document.getElementById('testeQuestoesContainer');
    const titulo = document.getElementById('testeRealizarTitulo');
    
    if (titulo) titulo.textContent = teste.titulo;
    
    if (container && teste.questoes) {
        container.innerHTML = teste.questoes.map((q, idx) => `
            <div class="questao-item">
                <div class="questao-header">
                    <span class="questao-numero">Questão ${idx + 1}</span>
                </div>
                <p class="questao-texto">${escapeHtml(q.texto)}</p>
                <div class="alternativas-container">
                    ${q.alternativas.map((alt, altIdx) => `
                        <label class="alternativa-item">
                            <input type="radio" name="questao_${idx}" value="${altIdx}" 
                                   onchange="marcarResposta(${idx}, ${altIdx})">
                            <span>${escapeHtml(alt)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    if (modal) modal.style.display = 'flex';
};

window.marcarResposta = function(questaoIdx, respostaIdx) {
    currentRespostas[questaoIdx] = respostaIdx;
};

window.enviarRespostasTeste = async function() {
    if (!currentTeste) return;
    
    let acertos = 0;
    currentTeste.questoes.forEach((q, idx) => {
        if (currentRespostas[idx] === q.correta) acertos++;
    });
    
    const percentual = (acertos / currentTeste.questoes.length) * 100;
    const pontuacao = Math.round((percentual / 100) * (currentTeste.pontos_max || 100));
    const aprovado = percentual >= (currentTeste.pontos_min || 70);
    
    const testeRealizado = {
        teste_id: currentTeste.id,
        teste_titulo: currentTeste.titulo,
        data: new Date().toISOString(),
        acertos: acertos,
        total: currentTeste.questoes.length,
        percentual: percentual,
        pontuacao: pontuacao,
        aprovado: aprovado
    };
    
    // Verificar se já fez o teste
    const jaFez = userProgresso.testes_realizados?.find(tr => tr.teste_id === currentTeste.id);
    
    if (!jaFez) {
        if (!userProgresso.testes_realizados) userProgresso.testes_realizados = [];
        userProgresso.testes_realizados.push(testeRealizado);
        
        if (aprovado) {
            userProgresso.pontos_totais += pontuacao;
        }
        
        await salvarProgresso();
        renderizarTestes();
        atualizarStatsProgresso();
    }
    
    fecharModal('realizarTesteModal');
    currentTeste = null;
    currentRespostas = {};
    
    if (aprovado) {
        mostrarMensagem(`✅ Parabéns! Você acertou ${acertos}/${currentTeste.questoes.length} e ganhou ${pontuacao} pontos!`, 'success');
    } else {
        mostrarMensagem(`❌ Você acertou ${acertos}/${currentTeste.questoes.length}. Mínimo: ${currentTeste.pontos_min}%. Tente novamente!`, 'error');
    }
};

// ============================================
// SALVAR PROGRESSO NO FIREBASE
// ============================================
async function salvarProgresso() {
    if (!dadosUsuario?.email) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso', dadosUsuario.email);
        await setDoc(progressoRef, userProgresso);
        console.log('✅ Progresso salvo');
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

// ============================================
// CRUD TREINAMENTOS (para gestores)
// ============================================
window.abrirModalTreinamento = function(id = null) {
    const modal = document.getElementById('treinamentoModal');
    const form = document.getElementById('treinamentoForm');
    
    if (id) {
        const treinamento = allTreinamentos.find(t => t.id === id);
        if (treinamento) {
            document.getElementById('treinamentoId').value = treinamento.id;
            document.getElementById('treinamentoTitulo').value = treinamento.titulo;
            document.getElementById('treinamentoDescricao').value = treinamento.descricao || '';
            document.getElementById('treinamentoConteudo').value = treinamento.conteudo || '';
            document.getElementById('treinamentoPontos').value = treinamento.pontos || 10;
            document.getElementById('treinamentoCategoria').value = treinamento.categoria || 'iniciante';
            document.getElementById('treinamentoModalTitle').textContent = 'Editar Treinamento';
        }
    } else {
        form.reset();
        document.getElementById('treinamentoId').value = '';
        document.getElementById('treinamentoModalTitle').textContent = 'Novo Treinamento';
    }
    
    if (modal) modal.style.display = 'flex';
};

window.salvarTreinamento = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('treinamentoId').value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        conteudo: document.getElementById('treinamentoConteudo').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10,
        categoria: document.getElementById('treinamentoCategoria').value,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos');
        
        if (id) {
            await updateDoc(doc(treinamentosRef, id), dados);
            mostrarMensagem('Treinamento atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await addDoc(treinamentosRef, dados);
            mostrarMensagem('Treinamento criado!', 'success');
        }
        
        fecharModal('treinamentoModal');
        await carregarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar', 'error');
    }
};

window.excluirTreinamento = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = collection(db, colecaoNome, 'treinamentos');
        await deleteDoc(doc(treinamentosRef, id));
        
        mostrarMensagem('Treinamento excluído!', 'success');
        await carregarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// CRUD VÍDEOS (para gestores)
// ============================================
window.abrirModalVideo = function(id = null) {
    const modal = document.getElementById('videoModal');
    
    if (id) {
        const video = allVideos.find(v => v.id === id);
        if (video) {
            document.getElementById('videoId').value = video.id;
            document.getElementById('videoTitulo').value = video.titulo;
            document.getElementById('videoDescricao').value = video.descricao || '';
            document.getElementById('videoUrl').value = video.url || '';
            document.getElementById('videoDuracao').value = video.duracao || 0;
            document.getElementById('videoPontos').value = video.pontos || 5;
            document.getElementById('videoCategoria').value = video.categoria || 'iniciante';
            document.getElementById('videoModalTitle').textContent = 'Editar Vídeo';
        }
    } else {
        document.getElementById('videoForm').reset();
        document.getElementById('videoId').value = '';
        document.getElementById('videoModalTitle').textContent = 'Novo Vídeo';
    }
    
    if (modal) modal.style.display = 'flex';
};

window.salvarVideo = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('videoId').value;
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        duracao: parseInt(document.getElementById('videoDuracao').value) || 0,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5,
        categoria: document.getElementById('videoCategoria').value,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos');
        
        if (id) {
            await updateDoc(doc(videosRef, id), dados);
            mostrarMensagem('Vídeo atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await addDoc(videosRef, dados);
            mostrarMensagem('Vídeo criado!', 'success');
        }
        
        fecharModal('videoModal');
        await carregarVideos();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar', 'error');
    }
};

window.excluirVideo = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = collection(db, colecaoNome, 'videos');
        await deleteDoc(doc(videosRef, id));
        
        mostrarMensagem('Vídeo excluído!', 'success');
        await carregarVideos();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// CRUD TESTES (para gestores)
// ============================================
window.abrirModalTeste = function(id = null) {
    const modal = document.getElementById('testeModal');
    
    if (id) {
        const teste = allTestes.find(t => t.id === id);
        if (teste) {
            document.getElementById('testeId').value = teste.id;
            document.getElementById('testeTitulo').value = teste.titulo;
            document.getElementById('testeDescricao').value = teste.descricao || '';
            document.getElementById('testePontosMax').value = teste.pontos_max || 100;
            document.getElementById('testePontosMin').value = teste.pontos_min || 70;
            document.getElementById('testeModalTitle').textContent = 'Editar Teste';
            
            // Carregar questões
            const container = document.getElementById('questoesContainer');
            container.innerHTML = '';
            if (teste.questoes) {
                teste.questoes.forEach((q, idx) => adicionarQuestaoForm(q, idx));
            }
        }
    } else {
        document.getElementById('testeForm').reset();
        document.getElementById('testeId').value = '';
        document.getElementById('testeModalTitle').textContent = 'Novo Teste';
        document.getElementById('questoesContainer').innerHTML = '';
    }
    
    if (modal) modal.style.display = 'flex';
};

function adicionarQuestaoForm(questaoData = null, idx = null) {
    const container = document.getElementById('questoesContainer');
    const questaoDiv = document.createElement('div');
    questaoDiv.className = 'questao-item';
    const questaoNumero = container.children.length + 1;
    
    questaoDiv.innerHTML = `
        <div class="questao-header">
            <span class="questao-numero">Questão ${questaoNumero}</span>
            <button type="button" class="btn-remover-questao" onclick="this.closest('.questao-item').remove()">&times;</button>
        </div>
        <input type="text" class="questao-texto" placeholder="Enunciado da questão" value="${questaoData ? escapeHtml(questaoData.texto) : ''}">
        <div class="alternativas-container">
            ${questaoData ? questaoData.alternativas.map((alt, altIdx) => `
                <div class="alternativa-item">
                    <input type="radio" name="alternativa_correta" class="alternativa-correta" value="${altIdx}" ${questaoData.correta === altIdx ? 'checked' : ''}>
                    <input type="text" class="alternativa-texto" placeholder="Alternativa ${String.fromCharCode(65 + altIdx)}" value="${escapeHtml(alt)}">
                    <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
                </div>
            `).join('') : `
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
            `}
        </div>
        <button type="button" class="btn-add-alternativa" onclick="adicionarAlternativa(this)">+ Adicionar Alternativa</button>
    `;
    
    container.appendChild(questaoDiv);
}

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

window.adicionarQuestao = function() {
    adicionarQuestaoForm();
};

window.salvarTeste = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('testeId').value;
    const questoes = [];
    
    document.querySelectorAll('#questoesContainer .questao-item').forEach((questaoDiv, idx) => {
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
        data_atualizacao: new Date().toISOString()
    };
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes');
        
        if (id) {
            await updateDoc(doc(testesRef, id), dados);
            mostrarMensagem('Teste atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await addDoc(testesRef, dados);
            mostrarMensagem('Teste criado!', 'success');
        }
        
        fecharModal('testeModal');
        await carregarTestes();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar', 'error');
    }
};

window.excluirTeste = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este teste?')) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = collection(db, colecaoNome, 'testes');
        await deleteDoc(doc(testesRef, id));
        
        mostrarMensagem('Teste excluído!', 'success');
        await carregarTestes();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// ATUALIZAR INTERFACE
// ============================================
function atualizarInterface() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && dadosUsuario) {
        userNameDisplay.textContent = dadosUsuario.nome || dadosUsuario.email.split('@')[0];
    }
}

function mostrarBotoesGestao() {
    const botoes = document.querySelectorAll('.btn-adicionar');
    botoes.forEach(btn => btn.style.display = 'flex');
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnBack')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`)?.classList.add('active');
        });
    });
    
    // Formulários
    document.getElementById('btnSalvarTreinamento')?.addEventListener('click', salvarTreinamento);
    document.getElementById('btnSalvarVideo')?.addEventListener('click', salvarVideo);
    document.getElementById('btnSalvarTeste')?.addEventListener('click', salvarTeste);
    document.getElementById('btnAddQuestao')?.addEventListener('click', () => adicionarQuestaoForm());
    document.getElementById('btnEnviarRespostas')?.addEventListener('click', enviarRespostasTeste);
    document.getElementById('btnMarcarAssistido')?.addEventListener('click', marcarVideoAssistido);
}

// ============================================
// UTILITÁRIOS
// ============================================
function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'flex';
        const msg = loading.querySelector('#loadingMessage');
        if (msg) msg.textContent = mensagem;
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info') {
    console.log(`[${tipo}] ${texto}`);
    
    const toast = document.createElement('div');
    toast.className = `toast-message ${tipo}`;
    toast.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${texto}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Adicionar estilos
if (!document.querySelector('#aprimoramentoStyles')) {
    const style = document.createElement('style');
    style.id = 'aprimoramentoStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .btn-adicionar-mini {
            margin-top: 15px;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
        }
        .card-treinamento, .card-video, .card-teste {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
        }
        .badge.iniciante { background: #e8f5e9; color: #2e7d32; }
        .badge.intermediario { background: #fff3e0; color: #ef6c00; }
        .badge.avancado { background: #fce4ec; color: #c62828; }
        .btn-editar, .btn-excluir, .btn-marcar, .btn-concluido {
            padding: 6px 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-editar { background: #2196F3; color: white; }
        .btn-excluir { background: #f44336; color: white; }
        .btn-marcar { background: #4CAF50; color: white; }
        .btn-concluido { background: #9e9e9e; color: white; cursor: default; }
        .questao-item {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .alternativa-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .alternativa-texto { flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
    `;
    document.head.appendChild(style);
}

// Exportar funções globais
window.fecharModal = fecharModal;
window.mostrarMensagem = mostrarMensagem;
window.adicionarQuestao = adicionarQuestaoForm;
window.adicionarAlternativa = adicionarAlternativa;

console.log("✅ programas_aprimoramento.js carregado com sucesso!");
