// index_2.js - Agendamento: Configuração e Verificação
console.log("📁 Módulo 2 Carregado: Agendamento Configuração");

// ============================================
// IMPORTAÇÕES DO FIREBASE
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
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    limit
} from './novo_firebase_config.js';

// ============================================
// VERIFICAR SE AGENDAMENTO ESTÁ HABILITADO
// ============================================
async function verificarAgendamentoHabilitado() {
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) return false;
    
    try {
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaId)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                const habilitado = dados.habilitar_agendamento === true;
                console.log(`📅 Agendamento habilitado no Firestore: ${habilitado ? 'SIM' : 'NÃO'}`);
                return habilitado;
            } else {
                console.log(`⚠️ Documento da loja não encontrado no Firestore: ${lojaId}`);
                return false;
            }
        } else {
            console.log('📅 loginDb não disponível, agendamento desabilitado');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar agendamento:', error);
        return false;
    }
}

// ============================================
// VERIFICAR SE ESTOQUE/CARRINHO ESTÁ HABILITADO
// ============================================
async function verificarEstoqueCarrinhoHabilitado() {
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) return true;
    
    try {
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaId)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                // Se o campo não existir, assume true (compatibilidade com lojas antigas)
                const habilitado = dados.habilitar_estoque_carrinho !== false;
                console.log(`🛒 Estoque/Carrinho habilitado: ${habilitado ? 'SIM' : 'NÃO'}`);
                return habilitado;
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Erro ao verificar estoque/carrinho:', error);
        return true;
    }
}


// ============================================
// VERIFICAR SE PROGRAMAS DE APRIMORAMENTO ESTÁ HABILITADO
// ============================================
async function verificarProgramasAprimoramentoHabilitado() {
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) return false;
    
    try {
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaId)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                const habilitado = dados.habilitar_programas_aprimoramento === true;
                console.log(`📚 Programas de Aprimoramento habilitado no Firestore: ${habilitado ? 'SIM' : 'NÃO'}`);
                return habilitado;
            } else {
                console.log(`⚠️ Documento da loja não encontrado no Firestore: ${lojaId}`);
                return false;
            }
        } else {
            console.log('📚 loginDb não disponível, programas de aprimoramento desabilitado');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar programas de aprimoramento:', error);
        return false;
    }
}

// ============================================
// MOSTRAR/ESCONDER CONTAINER DE AGENDAMENTO
// ============================================
function toggleAgendamentoContainer(mostrar) {
    const container = document.getElementById('agendamentoContainer');
    if (!container) return;
    
    if (mostrar) {
        container.style.display = 'block';
        
        if (!agendamentosCarregados) {
            mostrarSkeletonAgendamento();
            console.log('📅 Container exibido com skeleton loading');
        } else {
            console.log('📅 Container exibido com dados já carregados');
        }
    } else {
        container.style.display = 'none';
        console.log(`📅 Container de agendamento ocultado`);
    }
}

// ============================================
// MOSTRAR SKELETON LOADING
// ============================================
function mostrarSkeletonAgendamento() {
    const proximosTrack = document.getElementById('proximasSenhasTrack');
    const proximosEl = document.getElementById('proximosFilaCard');
    const chamandoEl = document.getElementById('chamandoAgoraCard');
    
    if (proximosTrack) {
        proximosTrack.innerHTML = `
            <div class="fila-servico skeleton">
                <div class="fila-servico-header">
                    <i class="fas fa-star"></i>
                    <h4>Carregando serviços...</h4>
                    <span class="servico-count">—</span>
                </div>
                <div class="servico-carousel-container">
                    <button class="servico-arrow prev" disabled><i class="fas fa-chevron-left"></i></button>
                    <div class="servico-scroll">
                        <div class="servico-track">
                            <div class="servico-card skeleton-card">
                                <div class="skeleton-shimmer"></div>
                                <div class="skeleton-line" style="width: 60px; height: 30px;"></div>
                                <div class="skeleton-line" style="width: 100px;"></div>
                                <div class="skeleton-line" style="width: 80px;"></div>
                            </div>
                            <div class="servico-card skeleton-card">
                                <div class="skeleton-shimmer"></div>
                                <div class="skeleton-line" style="width: 60px; height: 30px;"></div>
                                <div class="skeleton-line" style="width: 100px;"></div>
                                <div class="skeleton-line" style="width: 80px;"></div>
                            </div>
                            <div class="servico-card skeleton-card">
                                <div class="skeleton-shimmer"></div>
                                <div class="skeleton-line" style="width: 60px; height: 30px;"></div>
                                <div class="skeleton-line" style="width: 100px;"></div>
                                <div class="skeleton-line" style="width: 80px;"></div>
                            </div>
                        </div>
                    </div>
                    <button class="servico-arrow next" disabled><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
    }
    
    if (proximosEl) {
        proximosEl.innerHTML = `
            <div class="item-fila-vertical skeleton">
                <div class="skeleton-shimmer"></div>
                <div class="skeleton-line" style="width: 120px; height: 24px;"></div>
                <div class="skeleton-line" style="width: 80px; height: 40px;"></div>
                <div class="skeleton-line" style="width: 150px;"></div>
            </div>
            <div class="item-fila-vertical skeleton" style="margin-top: 10px;">
                <div class="skeleton-shimmer"></div>
                <div class="skeleton-line" style="width: 120px; height: 24px;"></div>
                <div class="skeleton-line" style="width: 80px; height: 40px;"></div>
                <div class="skeleton-line" style="width: 150px;"></div>
            </div>
        `;
    }
    
    if (chamandoEl) {
        chamandoEl.innerHTML = `
            <div class="card-chamando-item skeleton">
                <div class="skeleton-shimmer"></div>
                <div class="skeleton-line" style="width: 150px; height: 24px; background: rgba(255,255,255,0.3);"></div>
                <div class="skeleton-line" style="width: 100px; height: 50px; background: rgba(255,255,255,0.3);"></div>
                <div class="skeleton-line" style="width: 180px; height: 20px; background: rgba(255,255,255,0.3);"></div>
            </div>
        `;
    }
    
    const totalOutrosBadge = document.getElementById('totalOutrosBadge');
    const totalFilaTexto = document.getElementById('totalFilaTexto');
    const tempoMedioEspera = document.getElementById('tempoMedioEspera');
    const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
    
    if (totalOutrosBadge) totalOutrosBadge.textContent = '—';
    if (totalFilaTexto) totalFilaTexto.textContent = '—';
    if (tempoMedioEspera) tempoMedioEspera.textContent = '—';
    if (ultimoChamadoHora) ultimoChamadoHora.textContent = '--:--';
}

// ============================================
// ALTERNAR MODO OPERAÇÃO
// ============================================
function alternarModoOperacao() {
    modoAutomatico = !modoAutomatico;
    
    const statusElement = document.getElementById('agendamentoStatus');
    const indicator = statusElement?.querySelector('.status-indicator');
    const text = statusElement?.querySelector('span:last-child');
    
    if (statusElement) {
        if (modoAutomatico) {
            indicator?.classList.remove('manual');
            indicator?.classList.add('online');
            text.textContent = 'Modo Automático';
            statusElement.title = 'Clique para alternar para modo manual';
        } else {
            indicator?.classList.remove('online');
            indicator?.classList.add('manual');
            text.textContent = 'Modo Manual';
            statusElement.title = 'Clique para alternar para modo automático';
        }
    }
    
    console.log(`🔄 Modo de operação alterado para: ${modoAutomatico ? 'AUTOMÁTICO' : 'MANUAL'}`);
}

// ============================================
// CARREGAR CONFIGURAÇÕES DOS SERVIÇOS
// ============================================
async function carregarConfiguracoesServicos() {
    try {
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual
        );
        
        const snapshot = await getDocs(servicosRef);
        
        servicosConfig = {};
        snapshot.forEach(doc => {
            servicosConfig[doc.id] = doc.data();
        });
        
        console.log('📋 Configurações dos serviços carregadas:', Object.keys(servicosConfig).length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        servicosConfig = {};
    }
}

// ============================================
// PARAR ESCUTA DE AGENDAMENTOS
// ============================================
function pararEscutaAgendamentos() {
    if (unsubscribeAgendamentos) {
        unsubscribeAgendamentos();
        unsubscribeAgendamentos = null;
        console.log('📅 Escuta de agendamentos parada');
    }
    
    if (intervaloAtualizacaoAgendamento) {
        clearInterval(intervaloAtualizacaoAgendamento);
        intervaloAtualizacaoAgendamento = null;
    }
}

// ============================================
// EXPORTAR PARA WINDOW (SOMENTE AS FUNÇÕES)
// ============================================
window.verificarEstoqueCarrinhoHabilitado = verificarEstoqueCarrinhoHabilitado;
window.verificarAgendamentoHabilitado = verificarAgendamentoHabilitado;
window.verificarProgramasAprimoramentoHabilitado = verificarProgramasAprimoramentoHabilitado;
window.toggleAgendamentoContainer = toggleAgendamentoContainer;
window.mostrarSkeletonAgendamento = mostrarSkeletonAgendamento;
window.alternarModoOperacao = alternarModoOperacao;
window.carregarConfiguracoesServicos = carregarConfiguracoesServicos;
window.pararEscutaAgendamentos = pararEscutaAgendamentos;

console.log("✅ Módulo 2 carregado com sucesso!");
