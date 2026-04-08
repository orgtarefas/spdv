// index_3.js - Agendamento: Gerenciamento de Fila e Status
console.log("📁 Módulo 3 Carregado: Agendamento Fila e Status");

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
// PROCESSAR NOVA SENHA
// ============================================
async function processarNovaSenha(servicoId, novaSenha) {
    try {
        console.log(`🆕 Processando nova senha para serviço: ${servicoId}`);
        
        const agendamentosServico = agendamentosAtivos.filter(a => a.servico_id === servicoId);
        const temEmAtendimento = agendamentosServico.some(a => a.status === 'Em atendimento');
        const temProximoAtender = agendamentosServico.some(a => a.status === 'Próximo a atender');
        
        let statusFinal = 'Na fila';
        
        if (modoAutomatico) {
            if (!temEmAtendimento) {
                statusFinal = 'Em atendimento';
                console.log(`  ➡️ Sem Em atendimento, nova senha vai para EM ATENDIMENTO`);
            } else if (!temProximoAtender) {
                statusFinal = 'Próximo a atender';
                console.log(`  ➡️ Com Em atendimento mas sem Próximo, nova senha vai para PRÓXIMO A ATENDER`);
            } else {
                statusFinal = 'Na fila';
                console.log(`  ➡️ Fila cheia, nova senha vai para NA FILA`);
            }
        } else {
            statusFinal = 'Na fila';
            console.log(`  ➡️ Modo manual, nova senha vai para NA FILA`);
        }
        
        await atualizarStatusAgendamento(novaSenha, statusFinal);
        return statusFinal;
        
    } catch (error) {
        console.error('❌ Erro ao processar nova senha:', error);
        return 'Na fila';
    }
}

// ============================================
// VERIFICAR E AVANÇAR FILA AUTOMATICAMENTE
// ============================================
async function verificarEAvancarFila() {
    if (!modoAutomatico) {
        console.log('⏸️ Modo manual - não avançando automaticamente');
        return;
    }
    
    console.log('🔄 Verificando fila para avanço automático...');
    
    try {
        const agendamentosPorServico = {};
        
        agendamentosAtivos.forEach(ag => {
            if (!agendamentosPorServico[ag.servico_id]) {
                agendamentosPorServico[ag.servico_id] = [];
            }
            agendamentosPorServico[ag.servico_id].push(ag);
        });
        
        for (const [servicoId, agendamentos] of Object.entries(agendamentosPorServico)) {
            console.log(`\n🔧 Verificando serviço: ${servicoId}`);
            
            const ordenados = agendamentos.sort((a, b) => a.timestamp - b.timestamp);
            const emAtendimento = ordenados.find(a => a.status === 'Em atendimento');
            const proximoAtender = ordenados.find(a => a.status === 'Próximo a atender');
            const fila = ordenados.filter(a => 
                a.status !== 'Em atendimento' && 
                a.status !== 'Próximo a atender' &&
                ['Na fila', 'Verificado'].includes(a.status)
            );
            
            console.log(`  📊 Status: EmAtendimento=${!!emAtendimento}, Proximo=${!!proximoAtender}, Fila=${fila.length}`);
            
            if (!emAtendimento && proximoAtender) {
                console.log(`  ➡️ Avançando ${proximoAtender.cliente_nome} para Em atendimento`);
                await atualizarStatusAgendamento(proximoAtender, 'Em atendimento');
                continue;
            }
            
            if (!emAtendimento && !proximoAtender && fila.length > 0) {
                const primeiroDaFila = fila[0];
                console.log(`  ➡️ Avançando ${primeiroDaFila.cliente_nome} para Em atendimento (diretamente da fila)`);
                await atualizarStatusAgendamento(primeiroDaFila, 'Em atendimento');
                continue;
            }
            
            if (emAtendimento && !proximoAtender && fila.length > 0) {
                const primeiroDaFila = fila[0];
                console.log(`  ➡️ Avançando ${primeiroDaFila.cliente_nome} para Próximo a atender`);
                await atualizarStatusAgendamento(primeiroDaFila, 'Próximo a atender');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao avançar fila:', error);
    }
}

// ============================================
// ATUALIZAR STATUS AGENDAMENTO
// ============================================
async function atualizarStatusAgendamento(agendamento, novoStatus) {
    try {
        console.log(`📝 Atualizando agendamento ${agendamento.agendamento_id} para ${novoStatus}`);
        
        const servicoId = agendamento.servico_id;
        const agendamentoId = agendamento.agendamento_id;
        
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        await updateDoc(diaDocRef, {
            [`${servicoId}.${agendamentoId}.status_agendamento`]: novoStatus
        });
        
        console.log(`✅ Status atualizado para ${novoStatus}`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
    }
}

// ============================================
// GERAR SENHA BASEADA NO SERVIÇO
// ============================================
function gerarSenha(numero, servicoId, servicosConfig = {}) {
    let prefixo = 'S';
    
    if (servicosConfig[servicoId] && servicosConfig[servicoId].abreviacao) {
        prefixo = servicosConfig[servicoId].abreviacao;
    } else {
        const nomePartes = servicoId.split('_');
        if (nomePartes.length > 0) {
            prefixo = nomePartes[0].substring(0, 3).toUpperCase();
        }
    }
    
    const numeroFormatado = numero.toString().padStart(2, '0');
    return `${prefixo}${numeroFormatado}`;
}

// ============================================
// CHAMAR PRÓXIMO
// ============================================
async function chamarProximo(agendamentoId) {
    try {
        const agendamento = agendamentosAtivos.find(a => a.id === agendamentoId);
        if (!agendamento) {
            console.log('❌ Agendamento não encontrado na lista');
            return;
        }
        
        if (agendamento.status !== 'Na fila' && agendamento.status !== 'Próximo a atender') {
            mostrarMensagem('Este agendamento não pode ser chamado agora', 'warning');
            return;
        }
        
        const resultado = await atualizarStatusAgendamento(agendamento, 'Em atendimento');
        
        if (resultado) {
            agendamentosAtivos = agendamentosAtivos.map(a => 
                a.id === agendamentoId ? { ...a, status: 'Em atendimento' } : a
            );
            
            renderizarPainelAgendamento();
            mostrarMensagem(`🔔 Chamando ${agendamento.cliente_nome}`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Erro ao chamar próximo:', error);
        mostrarMensagem('Erro ao chamar cliente', 'error');
    }
}

// ============================================
// GERENCIAR FILA DE ATENDIMENTO
// ============================================
async function gerenciarFilaAtendimento() {
    try {
        console.log('🔄 Gerenciando fila de atendimento (independente por serviço)...');
        
        if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            console.log('📭 Fila vazia');
            return;
        }
        
        const agendamentosPorServico = {};
        
        agendamentosAtivos.forEach(ag => {
            if (!agendamentosPorServico[ag.servico_id]) {
                agendamentosPorServico[ag.servico_id] = [];
            }
            agendamentosPorServico[ag.servico_id].push(ag);
        });
        
        for (const [servicoId, agendamentos] of Object.entries(agendamentosPorServico)) {
            const ordenados = agendamentos.sort((a, b) => a.timestamp - b.timestamp);
            const emAtendimento = ordenados.find(a => a.status === 'Em atendimento');
            const proximoAtender = ordenados.find(a => a.status === 'Próximo a atender');
            const fila = ordenados.filter(a => 
                a.status !== 'Em atendimento' && 
                ['Na fila', 'Verificado', 'Pendente'].includes(a.status)
            );
            
            if (!emAtendimento) {
                if (proximoAtender) {
                    await atualizarStatusAgendamento(proximoAtender, 'Em atendimento');
                    continue;
                }
                if (fila.length > 0) {
                    await atualizarStatusAgendamento(fila[0], 'Em atendimento');
                    continue;
                }
            }
            
            if (emAtendimento && !proximoAtender && fila.length > 0) {
                const filaSemAtendimento = fila.filter(a => a.id !== emAtendimento.id);
                if (filaSemAtendimento.length > 0) {
                    await atualizarStatusAgendamento(filaSemAtendimento[0], 'Próximo a atender');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerenciar fila:', error);
    }
}

// ============================================
// FINALIZAR ATENDIMENTO
// ============================================
async function finalizarAtendimento(agendamento) {
    try {
        const agora = new Date();
        const servicoId = agendamento.servico_id;
        const agendamentoId = agendamento.agendamento_id;
        
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        let tempoAtendimento = null;
        if (agendamento.inicio_atendimento) {
            const inicio = new Date(agendamento.inicio_atendimento);
            tempoAtendimento = Math.round((agora - inicio) / (1000 * 60));
        }
        
        await updateDoc(diaDocRef, {
            [`${servicoId}.${agendamentoId}.status_agendamento`]: 'Finalizado',
            [`${servicoId}.${agendamentoId}.fim_atendimento`]: agora,
            [`${servicoId}.${agendamentoId}.tempo_atendimento`]: tempoAtendimento
        });
        
        console.log(`✅ Atendimento finalizado, tempo: ${tempoAtendimento} min`);
        
    } catch (error) {
        console.error('❌ Erro ao finalizar atendimento:', error);
    }
}

// ============================================
// CALCULAR TEMPO MÉDIO DE ESPERA REAL
// ============================================
async function calcularTempoMedioEsperaReal() {
    try {
        const totalNaFila = agendamentosAtivos.filter(a => 
            ['Na fila', 'Verificado', 'Próximo a atender'].includes(a.status)
        ).length;
        
        if (totalNaFila === 0) return 0;
        
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        const meses = [];
        for (let i = 0; i < 3; i++) {
            const data = new Date(anoAtual, hoje.getMonth() - i, 1);
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            meses.push(`${mes}_${ano}`);
        }
        
        let temposAtendimento = [];
        let totalAtendimentos = 0;
        let tempoTotal = 0;
        
        for (const mesAno of meses) {
            const diasRef = collection(db, 'agendamentos', lojaIdAtual, mesAno);
            const diasSnapshot = await getDocs(diasRef);
            
            diasSnapshot.forEach(diaDoc => {
                const diaData = diaDoc.data();
                
                Object.values(diaData).forEach(servicoMap => {
                    Object.values(servicoMap).forEach(agendamento => {
                        if (agendamento.status === 'Finalizado' || 
                            agendamento.status === 'Atendido' ||
                            agendamento.status === 'Concluído') {
                            
                            if (agendamento.tempo_atendimento) {
                                temposAtendimento.push(agendamento.tempo_atendimento);
                                tempoTotal += agendamento.tempo_atendimento;
                                totalAtendimentos++;
                            } else if (agendamento.inicio_atendimento && agendamento.fim_atendimento) {
                                const inicio = agendamento.inicio_atendimento?.toDate?.() || new Date(agendamento.inicio_atendimento);
                                const fim = agendamento.fim_atendimento?.toDate?.() || new Date(agendamento.fim_atendimento);
                                
                                if (inicio && fim && fim > inicio) {
                                    const tempoMinutos = Math.round((fim - inicio) / (1000 * 60));
                                    temposAtendimento.push(tempoMinutos);
                                    tempoTotal += tempoMinutos;
                                    totalAtendimentos++;
                                }
                            }
                        }
                    });
                });
            });
        }
        
        if (totalAtendimentos === 0) {
            return totalNaFila * 15;
        }
        
        const mediaMinutos = Math.round(tempoTotal / totalAtendimentos);
        const posicaoNaFila = agendamentosAtivos.filter(a => 
            a.status === 'Próximo a atender' || 
            (a.status !== 'Em atendimento' && ['Na fila', 'Verificado'].includes(a.status))
        ).length;
        
        const temAlguemAtendendo = agendamentosAtivos.some(a => a.status === 'Em atendimento');
        const pessoasNaFrente = posicaoNaFila + (temAlguemAtendendo ? 1 : 0);
        
        return pessoasNaFrente * mediaMinutos;
        
    } catch (error) {
        console.error('❌ Erro ao calcular tempo médio real:', error);
        const totalNaFila = agendamentosAtivos.filter(a => 
            ['Na fila', 'Verificado', 'Próximo a atender'].includes(a.status)
        ).length;
        return totalNaFila * 15;
    }
}

// Exportar para window
window.processarNovaSenha = processarNovaSenha;
window.verificarEAvancarFila = verificarEAvancarFila;
window.atualizarStatusAgendamento = atualizarStatusAgendamento;
window.gerarSenha = gerarSenha;
window.chamarProximo = chamarProximo;
window.gerenciarFilaAtendimento = gerenciarFilaAtendimento;
window.finalizarAtendimento = finalizarAtendimento;
window.calcularTempoMedioEsperaReal = calcularTempoMedioEsperaReal;

console.log("✅ Módulo 3 carregado com sucesso!");
