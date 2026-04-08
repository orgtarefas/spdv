// index_4.js - Agendamento: Escuta e Renderização
console.log("📁 Módulo 4 Carregado: Agendamento Escuta e Renderização");

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
// INICIAR ESCUTA AGENDAMENTOS
// ============================================
function iniciarEscutaAgendamentos() {
    if (!agendamentoHabilitado || !lojaIdAtual) return;
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos...');
    
    try {
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        console.log(`📅 Escutando documento: ${dataFormatada}`);
        
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        unsubscribeAgendamentos = onSnapshot(diaDocRef, (docSnap) => {
            console.log(`📨 Atualização no documento ${dataFormatada}`);
            
            if (docSnap.exists()) {
                dadosAgendamentoHoje = docSnap.data();
                reconstruirListaAgendamentos(docSnap.data());
                
                setTimeout(() => {
                    verificarEAvancarFila();
                }, 500);
                
            } else {
                console.log('📭 Nenhum agendamento para hoje');
                dadosAgendamentoHoje = null;
                agendamentosAtivos = [];
                renderizarPainelAgendamento();
            }
            
        }, (error) => {
            console.error('❌ Erro na escuta:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// RECONSTRUIR LISTA DE AGENDAMENTOS
// ============================================
function reconstruirListaAgendamentos(dadosDoDia) {
    try {
        console.log('📊 Processando dados do dia...');
        
        agendamentosAtivos = [];
        agendamentosFuturos = [];
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        if (!dadosDoDia) {
            renderizarPainelAgendamento();
            return;
        }
        
        Object.entries(dadosDoDia).forEach(([servicoId, agendamentosMap]) => {
            console.log(`  🔧 Serviço: ${servicoId}`);
            
            const agendamentosArray = Object.entries(agendamentosMap || {})
                .map(([agendamentoId, dados]) => {
                    const dataHoraAgendada = dados.data_hora_agendada?.toDate?.() || 
                                            new Date(dados.data_hora_agendada);
                    return {
                        agendamentoId,
                        dados,
                        dataHoraAgendada,
                        timestamp: dataHoraAgendada.getTime()
                    };
                })
                .sort((a, b) => a.timestamp - b.timestamp);
            
            agendamentosArray.forEach(({agendamentoId, dados, dataHoraAgendada, timestamp}, index) => {
                if (dados && dados.data_hora_agendada) {
                    const dataAgendadaDate = new Date(dataHoraAgendada);
                    dataAgendadaDate.setHours(0, 0, 0, 0);
                    
                    if (dataAgendadaDate.getTime() === hoje.getTime()) {
                        const numero = index + 1;
                        const statusFila = ['Em atendimento', 'Próximo a atender', 'Na fila', 'Verificado'];
                        
                        if (statusFila.includes(dados.status_agendamento)) {
                            agendamentosAtivos.push({
                                id: `${servicoId}_${agendamentoId}`,
                                servico_id: servicoId,
                                servico_nome: servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' '),
                                agendamento_id: agendamentoId,
                                cliente_email: dados.cliente_email,
                                cliente_nome: dados.cliente_nome,
                                status: dados.status_agendamento,
                                data_hora: dataHoraAgendada,
                                horario: dataHoraAgendada.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                }),
                                senha: gerarSenha(numero, servicoId, servicosConfig),
                                timestamp: timestamp,
                                numero_original: numero
                            });
                        }
                    }
                }
            });
        });
        
        console.log(`✅ Total agendamentos hoje: ${agendamentosAtivos.length}`);
        agendamentosCarregados = true;
        renderizarPainelAgendamento();
        
    } catch (error) {
        console.error('❌ Erro ao reconstruir lista:', error);
        agendamentosCarregados = true;
        renderizarPainelAgendamento();
    }
}

// ============================================
// RENDERIZAR PAINEL AGENDAMENTO
// ============================================
function renderizarPainelAgendamento() {
    if (!agendamentoHabilitado) return;
    
    console.log('📅 Renderizando painel de agendamento...');
    
    const agendamentosPorServico = {};
    
    agendamentosAtivos.forEach(item => {
        if (!agendamentosPorServico[item.servico_id]) {
            agendamentosPorServico[item.servico_id] = {
                nome: item.servico_nome || item.servico_id,
                itens: []
            };
        }
        agendamentosPorServico[item.servico_id].itens.push(item);
    });
    
    const servicosOrdenados = Object.keys(agendamentosPorServico).sort((a, b) => {
        const nomeA = agendamentosPorServico[a].nome.toLowerCase();
        const nomeB = agendamentosPorServico[b].nome.toLowerCase();
        return nomeA.localeCompare(nomeB);
    });
    
    let emAtendimento = [];
    let proximosAtender = [];
    let outrosNaFila = [];
    
    servicosOrdenados.forEach(servicoId => {
        const servico = agendamentosPorServico[servicoId];
        const itensOrdenados = servico.itens.sort((a, b) => a.timestamp - b.timestamp);
        
        itensOrdenados.forEach(item => {
            if (item.status === 'Em atendimento') {
                emAtendimento.push(item);
            } else if (item.status === 'Próximo a atender') {
                proximosAtender.push(item);
            } else if (['Na fila', 'Verificado'].includes(item.status)) {
                outrosNaFila.push(item);
            }
        });
    });
    
    // Atualizar badges
    const totalOutrosBadge = document.getElementById('totalOutrosBadge');
    if (totalOutrosBadge) totalOutrosBadge.textContent = outrosNaFila.length;
    
    const totalFilaTexto = document.getElementById('totalFilaTexto');
    if (totalFilaTexto) totalFilaTexto.textContent = proximosAtender.length + outrosNaFila.length;
    
    calcularTempoMedioEsperaReal().then(tempoEstimado => {
        const tempoMedioEspera = document.getElementById('tempoMedioEspera');
        if (tempoMedioEspera) tempoMedioEspera.textContent = tempoEstimado;
    });
    
    // Renderizar colunas (as funções detalhadas estão no módulo 5)
    if (typeof window.renderizarColunaOutros === 'function') {
        window.renderizarColunaOutros(outrosNaFila, agendamentosPorServico, servicosOrdenados);
    }
    
    if (typeof window.renderizarColunaProximos === 'function') {
        window.renderizarColunaProximos(proximosAtender);
    }
    
    if (typeof window.renderizarColunaAtendimento === 'function') {
        window.renderizarColunaAtendimento(emAtendimento);
    }
    
    setTimeout(() => {
        if (typeof window.configurarPausaAoInteragir === 'function') {
            window.configurarPausaAoInteragir();
        }
        if (typeof window.criarBotaoPlayNoHeader === 'function') {
            window.criarBotaoPlayNoHeader();
        }
    }, 200);
}

// ============================================
// INICIALIZAR CARROSSEL DE AGENDAMENTO
// ============================================
let agendamentoSwiper = null;

function inicializarCarrosselAgendamento() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    if (agendamentoSwiper) {
        agendamentoSwiper.destroy(true, true);
    }
    
    agendamentoSwiper = new Swiper('.agendamento-swiper', {
        slidesPerView: 1,
        spaceBetween: 15,
        loop: false,
        autoplay: false,
        pagination: {
            el: '.agendamento-pagination',
            clickable: true,
        },
        navigation: {
            prevEl: '#agendamentoPrev',
            nextEl: '#agendamentoNext',
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
        },
    });
    
    console.log('✅ Carrossel de agendamento inicializado');
}

// Exportar para window
window.iniciarEscutaAgendamentos = iniciarEscutaAgendamentos;
window.reconstruirListaAgendamentos = reconstruirListaAgendamentos;
window.renderizarPainelAgendamento = renderizarPainelAgendamento;
window.inicializarCarrosselAgendamento = inicializarCarrosselAgendamento;

console.log("✅ Módulo 4 carregado com sucesso!");
