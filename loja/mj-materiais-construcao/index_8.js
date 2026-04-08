// index_8.js - UI, Modais e Configurações da Loja
console.log("📁 Módulo 8 Carregado: UI e Configurações");

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
// VARIÁVEIS GLOBAIS (declaradas e exportadas)
// ============================================
let agendamentoHabilitado = false;
let programasAprimoramentoHabilitado = false;

// ============================================
// FUNÇÕES DE MODAL
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log(`✅ Modal ${modalId} aberto`);
        rolarAteModal(modalId);
    } else {
        console.error(`❌ Modal ${modalId} não encontrado`);
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        console.log(`✅ Modal ${modalId} fechado`);
    }
}

// ============================================
// ABRIR MODAL AGENDAMENTO
// ============================================
function abrirModalAgendamento() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para fazer um agendamento', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('Abrir modal de agendamento para cliente');
    
    const modal = document.getElementById('agendamentoRapidoModal');
    if (!modal) {
        console.error('❌ Modal de agendamento não encontrado');
        mostrarMensagem('Erro ao abrir agendamento', 'error');
        return;
    }
    
    const form = document.querySelector('.agendamento-rapido-form');
    if (form) {
        const selects = form.querySelectorAll('select');
        selects.forEach(s => {
            s.value = '';
            s.disabled = false;
        });
        
        const inputs = form.querySelectorAll('input');
        inputs.forEach(i => {
            i.value = '';
            i.disabled = false;
        });
    }
    
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    
    if (dataInput) {
        dataInput.value = '';
        dataInput.disabled = true;
        
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.min = `${ano}-${mes}-${dia}`;
    }
    
    if (horarioSelect) {
        horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
        horarioSelect.disabled = true;
    }
    
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    const tipo = dadosUsuario.tipo;
    
    const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                          perfil === 'admin' || perfil === 'gerente' || 
                          perfil === 'supervisor' || perfil === 'vendedor');
    
    let clienteField = document.getElementById('clienteSelectField');
    
    if (isFuncionario) {
        if (!clienteField) {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.id = 'clienteSelectField';
            formGroup.innerHTML = `
                <label><i class="fas fa-user"></i> Cliente</label>
                <select id="clienteSelect" class="form-select">
                    <option value="">Selecionar cliente...</option>
                </select>
                <small>Funcionário pode agendar para clientes</small>
            `;
            
            const servicoGroup = document.querySelector('#servicoSelect')?.closest('.form-group');
            if (servicoGroup) {
                servicoGroup.parentNode.insertBefore(formGroup, servicoGroup);
            }
        }
        
        carregarClientesParaSelect();
    } else {
        if (clienteField) {
            clienteField.remove();
        }
    }
    
    carregarServicosCliente();
    
    modal.classList.add('active');
    
    setTimeout(() => {
        modal.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });
    }, 500);
}

// ============================================
// ABRIR MODAL NOVA SENHA HOJE
// ============================================
async function abrirModalNovaSenhaHoje() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para gerar uma senha', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('📅 Abrindo modal Nova Senha Hoje');
    
    const modal = document.getElementById('novaSenhaHojeModal');
    if (!modal) {
        console.error('❌ Modal novaSenhaHojeModal não encontrado');
        return;
    }
    
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    const tipo = dadosUsuario.tipo;
    const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                          perfil === 'admin' || perfil === 'gerente' || 
                          perfil === 'supervisor' || perfil === 'vendedor');
    
    let clienteField = document.getElementById('clienteSelectField');
    
    if (isFuncionario) {
        if (!clienteField) {
            const form = document.querySelector('#novaSenhaHojeModal .senha-rapida-form');
            if (form) {
                clienteField = document.createElement('div');
                clienteField.className = 'form-group';
                clienteField.id = 'clienteSelectField';
                clienteField.innerHTML = `
                    <label><i class="fas fa-user"></i> Cliente</label>
                    <select id="clienteSelect" class="form-select">
                        <option value="">Selecionar cliente...</option>
                    </select>
                    <small><i class="fas fa-info-circle"></i> Funcionário pode gerar senha para clientes</small>
                `;
                
                const servicoGroup = document.getElementById('senhaRapidaServico')?.closest('.form-group');
                if (servicoGroup) {
                    form.insertBefore(clienteField, servicoGroup);
                }
            }
        }
        
        await carregarClientesParaSelect();
        
    } else {
        if (clienteField) {
            clienteField.remove();
        }
    }
    
    const servicoSelect = document.getElementById('senhaRapidaServico');
    const dataInput = document.getElementById('senhaRapidaData');
    const horarioInput = document.getElementById('senhaRapidaHorario');
    
    if (servicoSelect) {
        servicoSelect.innerHTML = '<option value="">Carregando serviços...</option>';
        servicoSelect.disabled = true;
    }
    
    if (dataInput) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.value = `${ano}-${mes}-${dia}`;
        dataInput.disabled = true;
    }
    
    if (horarioInput) {
        horarioInput.value = 'Selecione um serviço primeiro';
        horarioInput.disabled = true;
    }
    
    await carregarServicosComPrimeiroHorario();
    
    modal.classList.add('active');
    
    setTimeout(() => {
        modal.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });
    }, 500);
}

// ============================================
// CONFIRMAR NOVA SENHA HOJE
// ============================================
document.getElementById('btnConfirmarSenhaHoje')?.addEventListener('click', async function() {
    try {
        const servicoSelect = document.getElementById('senhaRapidaServico');
        const horarioInput = document.getElementById('senhaRapidaHorario');
        const dataInput = document.getElementById('senhaRapidaData');
        
        const servico = servicoSelect?.value;
        const servicoText = servicoSelect?.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const horario = horarioInput?.value;
        const data = dataInput?.value;
        
        if (!servico) {
            mostrarMensagem('Selecione um serviço', 'warning');
            return;
        }
        
        if (!horario || horario === 'Selecione um serviço primeiro' || horario === 'Sem horários disponíveis hoje') {
            mostrarMensagem('Horário não disponível', 'warning');
            return;
        }
        
        if (!usuarioLogado || !dadosUsuario) {
            mostrarMensagem('Faça login para gerar senha', 'warning');
            fecharModal('novaSenhaHojeModal');
            abrirModal('loginModal');
            return;
        }
        
        mostrarLoading('Gerando senha...');
        
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const tipo = dadosUsuario.tipo;
        const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        let clienteEmail = dadosUsuario.email;
        let clienteNome = dadosUsuario.nome;
        let clienteTelefone = dadosUsuario.telefone || '';
        
        if (isFuncionario) {
            const clienteSelect = document.getElementById('clienteSelect');
            if (clienteSelect && clienteSelect.value) {
                const selectedOption = clienteSelect.selectedOptions[0];
                clienteEmail = clienteSelect.value;
                
                if (clienteEmail !== dadosUsuario.email) {
                    try {
                        const clienteDoc = await window.loginDb
                            .collection('usuarios')
                            .doc(lojaIdAtual)
                            .collection('clientes')
                            .doc(clienteEmail)
                            .get();
                        
                        if (clienteDoc.exists) {
                            const clienteData = clienteDoc.data();
                            clienteNome = clienteData.nome || clienteEmail;
                            clienteTelefone = clienteData.telefone || '';
                        } else {
                            clienteNome = selectedOption.dataset.nome || clienteEmail;
                            clienteTelefone = selectedOption.dataset.telefone || '';
                        }
                    } catch (e) {
                        console.warn('⚠️ Erro ao buscar dados do cliente:', e);
                        clienteNome = selectedOption.dataset.nome || clienteEmail;
                        clienteTelefone = selectedOption.dataset.telefone || '';
                    }
                }
            }
        }
        
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        const nomeServico = configServico.nome || servicoText;
        
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`;
        const dataFormatada = `${dia}_${mes}_${ano}`;
        
        const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
        
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada
        );
        
        const docSnap = await getDoc(diaDocRef);
        
        let dadosAtuais = {};
        let proximoNumero = 1;
        
        if (docSnap.exists()) {
            dadosAtuais = docSnap.data();
            if (dadosAtuais[servico]) {
                proximoNumero = Object.keys(dadosAtuais[servico]).length + 1;
            }
        }
        
        const agendamentoId = `agendamento_${proximoNumero}`;
        const statusInicial = "Verificado";
        
        const novoAgendamento = {
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            criado_por: isFuncionario ? dadosUsuario.email : clienteEmail,
            criado_por_nome: isFuncionario ? dadosUsuario.nome : clienteNome,
            criado_em: serverTimestamp(),
            data_hora_agendada: dataHoraAgendada,
            status_agendamento: statusInicial
        };
        
        const dadosParaSalvar = { ...dadosAtuais };
        if (!dadosParaSalvar[servico]) dadosParaSalvar[servico] = {};
        dadosParaSalvar[servico][agendamentoId] = novoAgendamento;
        
        await setDoc(diaDocRef, dadosParaSalvar, { merge: true });
        
        const novaSenhaObj = {
            servico_id: servico,
            agendamento_id: agendamentoId,
            cliente_nome: clienteNome
        };
        
        await processarNovaSenha(servico, novaSenhaObj);
        
        if (isFuncionario && clienteEmail !== dadosUsuario.email) {
            mostrarMensagem(`✅ Senha gerada para ${clienteNome} (${nomeServico} às ${horario})!`, 'success');
        } else {
            mostrarMensagem(`✅ Senha gerada para ${nomeServico} às ${horario}!`, 'success');
        }
        
        fecharModal('novaSenhaHojeModal');
        
        const clienteSelect = document.getElementById('clienteSelect');
        if (clienteSelect) clienteSelect.value = '';
        
        setTimeout(() => {
            mostrarMensagem('🔔 Acompanhe sua posição na fila acima', 'info', 4000);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao gerar senha rápida:', error);
        mostrarMensagem('Erro ao gerar senha: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
});

// ============================================
// CONFIRMAR AGENDAMENTO
// ============================================
document.getElementById('btnConfirmarAgendamento')?.addEventListener('click', async function() {
    try {
        const dataInput = document.getElementById('agendamentoData');
        const horarioSelect = document.getElementById('agendamentoHorario');
        const servicoSelect = document.getElementById('servicoSelect');
        
        const servico = servicoSelect?.value;
        const servicoText = servicoSelect?.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const data = dataInput?.value;
        const horario = horarioSelect?.value;
        
        if (!servico) {
            mostrarMensagem('Selecione um serviço', 'warning');
            return;
        }
        
        if (!data) {
            mostrarMensagem('Selecione uma data', 'warning');
            return;
        }
        
        if (!horario) {
            mostrarMensagem('Selecione um horário', 'warning');
            return;
        }
        
        if (!usuarioLogado || !dadosUsuario) {
            mostrarMensagem('Faça login para agendar', 'warning');
            fecharModal('agendamentoRapidoModal');
            abrirModal('loginModal');
            return;
        }
        
        mostrarLoading('Confirmando agendamento...');
        
        let clienteEmail = dadosUsuario.email;
        let clienteNome = dadosUsuario.nome;
        let clienteTelefone = dadosUsuario.telefone || '';
        
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const tipo = dadosUsuario.tipo;
        const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        if (isFuncionario) {
            const clienteSelect = document.getElementById('clienteSelect');
            if (clienteSelect && clienteSelect.value) {
                clienteEmail = clienteSelect.value;
                
                try {
                    const clienteDoc = await window.loginDb
                        .collection('usuarios')
                        .doc(lojaIdAtual)
                        .collection('clientes')
                        .doc(clienteEmail)
                        .get();
                    
                    if (clienteDoc.exists) {
                        const clienteData = clienteDoc.data();
                        clienteNome = clienteData.nome || clienteEmail;
                        clienteTelefone = clienteData.telefone || '';
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar dados do cliente:', e);
                }
            }
        }
        
        let precisaValidar = true;
        try {
            const configRef = doc(
                db,
                'configuracoes',
                'servico_agendamento',
                lojaIdAtual,
                servico
            );
            
            const configDoc = await getDoc(configRef);
            if (configDoc.exists()) {
                const config = configDoc.data();
                if (config.validacao === 'automatico_todos') {
                    precisaValidar = false;
                } else if (config.validacao === 'automatico_dia') {
                    const hoje = new Date().toISOString().split('T')[0];
                    if (data === hoje) {
                        precisaValidar = false;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao verificar configuração:', e);
        }
        
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        const nomeServico = configServico.nome || servicoText;
        const servicoId = servico;
        
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`;
        const dataFormatada = `${dia}_${mes}_${ano}`;
        
        const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
        
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada
        );
        
        const docSnap = await getDoc(diaDocRef);
        
        let dadosAtuais = {};
        let proximoNumero = 1;
        
        if (docSnap.exists()) {
            dadosAtuais = docSnap.data();
            if (dadosAtuais[servicoId]) {
                proximoNumero = Object.keys(dadosAtuais[servicoId]).length + 1;
            }
        }
        
        const agendamentoId = `agendamento_${proximoNumero}`;
        
        const novoAgendamento = {
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            criado_em: serverTimestamp(),
            data_hora_agendada: dataHoraAgendada,
            status_agendamento: precisaValidar ? "Pendente" : "Verificado"
        };
        
        const dadosParaSalvar = { ...dadosAtuais };
        if (!dadosParaSalvar[servicoId]) dadosParaSalvar[servicoId] = {};
        dadosParaSalvar[servicoId][agendamentoId] = novoAgendamento;
        
        await setDoc(diaDocRef, dadosParaSalvar, { merge: true });
        
        if (precisaValidar) {
            mostrarMensagem(`✅ Agendamento solicitado para ${nomeServico}! Aguarde confirmação.`, 'success', 5000);
        } else {
            mostrarMensagem(`✅ Agendamento confirmado para ${nomeServico}!`, 'success');
        }
        
        fecharModal('agendamentoRapidoModal');
        
        if (!isFuncionario) {
            setTimeout(() => {
                mostrarMensagem('🔔 Acompanhe sua posição na fila acima', 'info', 4000);
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Erro ao confirmar agendamento:', error);
        mostrarMensagem('Erro ao fazer agendamento: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
});

// ============================================
// CARREGAR DADOS DA LOJA
// ============================================
async function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    let tentativas = 0;
    while (typeof window.getLojaConfig !== 'function' && tentativas < 30) {
        console.log(`⏳ Aguardando getLojaConfig... tentativa ${tentativas + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
    }
    
    if (typeof window.getLojaConfig !== 'function') {
        console.error('❌ getLojaConfig não disponível');
        return;
    }
    
    try {
        const config = window.getLojaConfig(lojaId);
        console.log(`📋 Configuração da loja ${lojaId}:`, config);
        
        if (config) {
            const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const lojaNomeHeader = document.getElementById('lojaNomeHeader');
            if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
            
            document.title = `${nomeLoja} - Loja Online`;
            
            if (config.contato) {
                renderizarContatos(config);
            }
            
            if (config.contato?.endereco) {
                renderizarEndereco(config);
            }
        }
        
        renderizarChat();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
        renderizarChat();
    }
}

// ============================================
// RENDERIZAR CONTATOS
// ============================================
function renderizarContatos(dadosLoja) {
    const contactGrid = document.getElementById('contactGrid');
    if (!contactGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato) {
        contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
        return;
    }
    
    const contato = dadosLoja.contato;
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    let html = '';
    
    if (contato.whatsapp && contato.whatsapp.trim() !== '') {
        const numero = contato.whatsapp.replace(/\D/g, '');
        html += `
            <a href="https://wa.me/${numero}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}whatsapp.png" alt="WhatsApp" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">WhatsApp</div>
                        <div class="contact-value">${contato.whatsapp}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.email && contato.email.trim() !== '') {
        html += `
            <a href="mailto:${contato.email}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}email.png" alt="E-mail" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">E-mail</div>
                        <div class="contact-value">${contato.email}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.instagram && contato.instagram.trim() !== '') {
        const usuario = contato.instagram.replace('@', '');
        html += `
            <a href="https://instagram.com/${usuario}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}instagram.png" alt="Instagram" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">Instagram</div>
                        <div class="contact-value">${contato.instagram}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (html === '') {
        html = '<p class="no-contacts">Nenhum contato disponível</p>';
    }
    
    contactGrid.innerHTML = html;
}

// ============================================
// RENDERIZAR ENDEREÇO
// ============================================
function renderizarEndereco(dadosLoja) {
    const addressGrid = document.getElementById('addressGrid');
    if (!addressGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato?.endereco) {
        addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
        return;
    }
    
    const endereco = dadosLoja.contato.endereco;
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    const ruaNumeroBairro = [];
    if (endereco.rua) ruaNumeroBairro.push(endereco.rua);
    if (endereco.numero) ruaNumeroBairro.push(`nº ${endereco.numero}`);
    if (endereco.bairro) ruaNumeroBairro.push(endereco.bairro);
    const ruaNumeroBairroStr = ruaNumeroBairro.join(' ');
    
    const cidadeUfCep = [];
    if (endereco.cidade) cidadeUfCep.push(endereco.cidade);
    if (endereco.uf) cidadeUfCep.push(endereco.uf);
    if (endereco.cep) cidadeUfCep.push(`CEP: ${endereco.cep}`);
    const cidadeUfCepStr = cidadeUfCep.join(' - ');
    
    const enderecoCompleto = `${ruaNumeroBairroStr} ${cidadeUfCepStr}`.trim();
    const query = encodeURIComponent(enderecoCompleto);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    let html = `
        <a href="${mapsUrl}" target="_blank" class="address-item">
            <div class="address-icon">
                <img src="${basePath}endereco.png" alt="Endereço" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="address-content">
                <div class="address-label">Endereço</div>
                <div class="address-text">
                    <span class="rua-numero">${ruaNumeroBairroStr}</span>
                    <span class="cidade-uf-cep">${cidadeUfCepStr}</span>
                </div>
            </div>
        </a>
    `;
    
    addressGrid.innerHTML = html;
}

// ============================================
// ABRIR MODAL MEUS AGENDAMENTOS
// ============================================
async function abrirModalMeusAgendamentos() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para ver seus agendamentos', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('📅 Abrindo modal de meus agendamentos');
    
    const modal = document.getElementById('meusAgendamentosModal');
    if (!modal) {
        console.error('❌ Modal meusAgendamentosModal não encontrado');
        return;
    }
    
    mostrarLoading('Carregando agendamentos...');
    
    try {
        // Determinar perfil do usuário
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const isFuncionario = (dadosUsuario.tipo === 'admin' || dadosUsuario.tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        // Atualizar título do modal
        const tituloModal = document.getElementById('agendamentosTituloModal');
        if (tituloModal) {
            tituloModal.textContent = isFuncionario ? 'Todos os Agendamentos' : 'Meus Agendamentos';
        }
        
        // Mostrar/esconder filtros para admin/funcionário
        const filtrosAdmin = document.getElementById('filtrosAgendamentosAdmin');
        if (filtrosAdmin) {
            filtrosAdmin.style.display = isFuncionario ? 'block' : 'none';
        }
        
        // Carregar agendamentos
        await carregarAgendamentosParaModal(isFuncionario);
        
        // Abrir o modal
        modal.classList.add('active');
        
        // Rolar até o modal
        setTimeout(() => {
            modal.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal de agendamentos:', error);
        mostrarMensagem('Erro ao carregar agendamentos', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CARREGAR AGENDAMENTOS PARA O MODAL
// ============================================
async function carregarAgendamentosParaModal(isFuncionario, filtroStatus = 'todos') {
    const container = document.getElementById('listaAgendamentosModal');
    if (!container) return;
    
    try {
        // Data atual
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        // Buscar agendamentos do mês atual
        const diasRef = collection(db, 'agendamentos', lojaIdAtual, mesAnoAtual);
        const diasSnapshot = await getDocs(diasRef);
        
        let todosAgendamentos = [];
        
        // Processar cada dia
        for (const diaDoc of diasSnapshot.docs) {
            const diaData = diaDoc.data();
            const dataStr = diaDoc.id; // Formato: DD_MM_YYYY
            
            // Extrair data para exibição
            const [dia, mes, ano] = dataStr.split('_');
            const dataExibicao = `${dia}/${mes}/${ano}`;
            
            // Processar cada serviço
            Object.entries(diaData).forEach(([servicoId, agendamentosMap]) => {
                // Processar cada agendamento
                Object.entries(agendamentosMap || {}).forEach(([agendamentoId, dados]) => {
                    // Filtrar por usuário se for cliente
                    if (!isFuncionario && dados.cliente_email !== dadosUsuario.email) {
                        return;
                    }
                    
                    // Obter nome do serviço
                    const servicoNome = servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' ');
                    
                    // Gerar senha
                    const numero = Object.keys(agendamentosMap).indexOf(agendamentoId) + 1;
                    const senha = gerarSenha(numero, servicoId, servicosConfig);
                    
                    // Formatar data/hora
                    let dataHora = null;
                    let horario = '';
                    
                    if (dados.data_hora_agendada) {
                        dataHora = dados.data_hora_agendada?.toDate?.() || new Date(dados.data_hora_agendada);
                        horario = dataHora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    
                    todosAgendamentos.push({
                        id: `${servicoId}_${agendamentoId}`,
                        servicoId,
                        servicoNome,
                        agendamentoId,
                        clienteEmail: dados.cliente_email,
                        clienteNome: dados.cliente_nome,
                        status: dados.status_agendamento || 'Pendente',
                        data: dataExibicao,
                        horario,
                        data_hora: dataHora,
                        senha,
                        dados: {
                            criado_por: dados.criado_por,
                            criado_por_nome: dados.criado_por_nome,
                        }
                    });
                });
            });
        }
        
        // Ordenar por data/hora (mais recentes primeiro)
        todosAgendamentos.sort((a, b) => {
            if (!a.data_hora) return 1;
            if (!b.data_hora) return -1;
            return b.data_hora - a.data_hora;
        });
        
        console.log(`📋 ${todosAgendamentos.length} agendamentos carregados para o modal`);
        
        // Salvar lista completa para filtros
        window.todosAgendamentosModal = todosAgendamentos;
        window.isFuncionarioModal = isFuncionario;
        
        // Aplicar filtro inicial
        aplicarFiltroAgendamentosModal(filtroStatus);
        
    } catch (error) {
        console.error('❌ Erro ao carregar agendamentos para modal:', error);
        container.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar agendamentos</p>
            </div>
        `;
    }
}

// ============================================
// APLICAR FILTRO NO MODAL
// ============================================
function aplicarFiltroAgendamentosModal(filtro) {
    const container = document.getElementById('listaAgendamentosModal');
    if (!container) return;
    
    const todosAgendamentos = window.todosAgendamentosModal || [];
    const isFuncionario = window.isFuncionarioModal || false;
    const agora = new Date();
    
    let agendamentosFiltrados = [];
    
    // Status que NUNCA entram no filtro expirado
    const statusNaoExpirados = ['Finalizado', 'Cancelado'];
    
    // Função para verificar se um agendamento está expirado
    const isExpirado = (ag) => {
        return ag.data_hora && 
               ag.data_hora < agora && 
               !statusNaoExpirados.includes(ag.status);
    };
    
    if (filtro === 'todos') {
        agendamentosFiltrados = todosAgendamentos;
    } else if (filtro === 'expirado') {
        agendamentosFiltrados = todosAgendamentos.filter(ag => isExpirado(ag));
    } else {
        agendamentosFiltrados = todosAgendamentos.filter(ag => {
            let statusMatch = false;
            
            switch(filtro) {
                case 'Pendente':
                    statusMatch = ag.status === 'Pendente';
                    break;
                case 'Verificado':
                    statusMatch = ag.status === 'Verificado';
                    break;
                case 'Na fila':
                    statusMatch = ag.status === 'Na fila';
                    break;
                case 'Próximo a atender':
                    statusMatch = ag.status === 'Próximo a atender';
                    break;
                case 'Em atendimento':
                    statusMatch = ag.status === 'Em atendimento';
                    break;
                case 'Finalizado':
                    statusMatch = ag.status === 'Finalizado';
                    break;
                case 'Cancelado':
                    statusMatch = ag.status === 'Cancelado';
                    break;
                default:
                    statusMatch = true;
            }
            
            if (!statusMatch) return false;
            return !isExpirado(ag);
        });
    }
    
    console.log(`📊 Filtro "${filtro}": ${agendamentosFiltrados.length} agendamentos encontrados`);
    
    // Renderizar os agendamentos filtrados
    renderizarAgendamentosModal(container, agendamentosFiltrados, isFuncionario, filtro);
}

// ============================================
// RENDERIZAR AGENDAMENTOS NO MODAL
// ============================================
function renderizarAgendamentosModal(container, agendamentos, isFuncionario, filtroAtual = 'todos') {
    if (!container) return;
    
    const agora = new Date();
    const statusNaoExpirados = ['Finalizado', 'Cancelado'];
    
    if (agendamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhum agendamento encontrado</p>
                ${filtroAtual === 'expirado' ? 
                    '<small>Não há agendamentos expirados no momento</small>' : 
                    '<small>Clique em "Agendar" para fazer um novo agendamento</small>'}
            </div>
        `;
        return;
    }
    
    let html = '';
    
    agendamentos.forEach(ag => {
        const estaExpirado = !statusNaoExpirados.includes(ag.status) && 
                             ag.data_hora && ag.data_hora < agora;
        
        // Determinar o que mostrar no badge
        let badgeClass = '';
        let badgeIcon = '';
        let badgeText = '';
        
        if (estaExpirado) {
            badgeClass = 'status-expirado';
            badgeIcon = 'fa-hourglass-end';
            badgeText = 'EXPIRADO';
        } else {
            switch(ag.status) {
                case 'Pendente':
                    badgeClass = 'status-pendente';
                    badgeIcon = 'fa-clock';
                    badgeText = 'Pendente';
                    break;
                case 'Verificado':
                    badgeClass = 'status-verificado';
                    badgeIcon = 'fa-check-circle';
                    badgeText = 'Verificado';
                    break;
                case 'Na fila':
                    badgeClass = 'status-fila';
                    badgeIcon = 'fa-users';
                    badgeText = 'Na fila';
                    break;
                case 'Próximo a atender':
                    badgeClass = 'status-proximo';
                    badgeIcon = 'fa-arrow-right';
                    badgeText = 'Próximo a atender';
                    break;
                case 'Em atendimento':
                    badgeClass = 'status-atendimento';
                    badgeIcon = 'fa-bell';
                    badgeText = 'Em atendimento';
                    break;
                case 'Finalizado':
                    badgeClass = 'status-finalizado';
                    badgeIcon = 'fa-check-double';
                    badgeText = 'Finalizado';
                    break;
                case 'Cancelado':
                    badgeClass = 'status-cancelado';
                    badgeIcon = 'fa-times-circle';
                    badgeText = 'Cancelado';
                    break;
                default:
                    badgeClass = 'status-pendente';
                    badgeIcon = 'fa-clock';
                    badgeText = ag.status || 'Pendente';
            }
        }
        
        // Calcular tempo passado (se expirado)
        let tempoPassado = '';
        if (estaExpirado && ag.data_hora) {
            const diffMs = agora - ag.data_hora;
            const diffMin = Math.floor(diffMs / 60000);
            
            if (diffMin < 60) {
                tempoPassado = `há ${diffMin} min`;
            } else if (diffMin < 1440) {
                const diffHrs = Math.floor(diffMin / 60);
                tempoPassado = `há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
            } else {
                const diffDias = Math.floor(diffMin / 1440);
                tempoPassado = `há ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`;
            }
        }
        
        // Verificar se o agendamento foi criado por um funcionário para outro cliente
        const criadoPorFuncionario = ag.dados?.criado_por && ag.dados?.criado_por !== ag.clienteEmail;
        const nomeCriador = ag.dados?.criado_por_nome || ag.dados?.criado_por;
        
        // Determinar se o botão CANCELAR deve estar habilitado
        const cancelarHabilitado = isFuncionario && 
                                   ag.status !== 'Finalizado' && 
                                   ag.status !== 'Cancelado' && 
                                   !estaExpirado;
        
        html += `
            <div class="agendamento-item-modal ${estaExpirado ? 'agendamento-expirado' : ''}" 
                 data-status="${ag.status}" 
                 data-expirado="${estaExpirado}">
                
                <div class="agendamento-header-modal">
                    <div class="agendamento-servico-tag">
                        <i class="fas fa-tag"></i> ${ag.servicoNome}
                    </div>
                    <span class="agendamento-status-badge ${badgeClass}">
                        <i class="fas ${badgeIcon}"></i> ${badgeText}
                    </span>
                </div>
                
                <div class="agendamento-body-modal">
                    <div class="agendamento-senha-modal ${estaExpirado ? 'expirado' : ''}">
                        ${ag.senha}
                    </div>
                    
                    <div class="agendamento-info-modal">
                        <!-- Cliente -->
                        <div class="agendamento-cliente-modal">
                            <i class="fas fa-user"></i> 
                            <strong>${ag.clienteNome}</strong>
                            ${isFuncionario ? `<span class="agendamento-cliente-email">(${ag.clienteEmail})</span>` : ''}
                        </div>
                        
                        <!-- Quem agendou -->
                        ${criadoPorFuncionario && isFuncionario ? `
                            <div class="agendamento-criado-por">
                                <i class="fas fa-pen"></i> 
                                Agendado por: ${nomeCriador}
                            </div>
                        ` : ''}
                        
                        <div class="agendamento-data-modal">
                            <i class="fas fa-calendar-alt"></i> ${ag.data}
                        </div>
                        
                        ${ag.horario ? `
                            <div class="agendamento-horario-modal">
                                <i class="fas fa-clock"></i> ${ag.horario}
                                ${tempoPassado ? `<span class="tempo-passado">${tempoPassado}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="agendamento-acoes-modal">
                        <button class="btn-agendamento-acoes cancelar ${!cancelarHabilitado ? 'disabled' : ''}" 
                                onclick="${cancelarHabilitado ? `cancelarAgendamento('${ag.id}')` : 'event.preventDefault()'}" 
                                title="${!cancelarHabilitado ? 'Não é possível cancelar este agendamento' : 'Cancelar agendamento'}"
                                ${!cancelarHabilitado ? 'disabled' : ''}>
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// CANCELAR AGENDAMENTO
// ============================================
window.cancelarAgendamento = async function(agendamentoId) {
    const mensagemConfirmacao = "Deseja realmente cancelar o agendamento? Consulte as políticas de cancelamento do estabelecimento antes da confirmação. Após efetivar o cancelamento não será possível desfazer o procedimento.";
    
    if (!confirm(mensagemConfirmacao)) {
        return;
    }
    
    // Encontrar o agendamento na lista
    const agendamento = agendamentosAtivos.find(a => a.id === agendamentoId);
    if (!agendamento) {
        mostrarMensagem('Agendamento não encontrado', 'error');
        return;
    }
    
    mostrarLoading('Cancelando agendamento...');
    
    try {
        const resultado = await atualizarStatusAgendamento(agendamento, 'Cancelado');
        
        if (resultado) {
            mostrarMensagem('✅ Agendamento cancelado com sucesso', 'success');
            // Fechar modal e recarregar
            fecharModal('meusAgendamentosModal');
            setTimeout(() => {
                abrirModalMeusAgendamentos();
            }, 500);
        } else {
            mostrarMensagem('❌ Erro ao cancelar agendamento', 'error');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarMensagem('Erro ao cancelar agendamento', 'error');
    } finally {
        esconderLoading();
    }
};

// ============================================
// RENDERIZAR CHAT
// ============================================
function renderizarChat() {
    const footerChat = document.querySelector('.footer-chat');
    if (!footerChat) return;
    
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    footerChat.innerHTML = `
        <div class="chat-container">
            <div class="chat-icon-large">
                <img src="${basePath}chat.png" alt="Chat" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="chat-button" id="chatButton">
                Chat Online
            </div>
        </div>
    `;
    
    const chatButton = document.getElementById('chatButton');
    if (chatButton) {
        chatButton.addEventListener('click', () => {
            alert('Chat em desenvolvimento. Breve estaremos disponíveis 😉');
        });
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    document.getElementById('btnLogin')?.addEventListener('click', () => abrirModal('loginModal'));
    document.getElementById('btnLogout')?.addEventListener('click', fazerLogoutCliente);
    document.getElementById('btnGoToCart')?.addEventListener('click', () => {
        if (!usuarioLogado) {
            mostrarMensagem('Faça login para ir ao carrinho', 'warning');
            abrirModal('loginModal');
            return;
        }
        window.location.href = 'carrinho.html';
    });
    
    document.getElementById('btnConfirmarLogin')?.addEventListener('click', fazerLoginCliente);
    document.getElementById('loginSenha')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLoginCliente();
    });
    
    document.getElementById('btnIrCadastro')?.addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal('loginModal');
        abrirModal('cadastroModal');
    });
    
    document.getElementById('btnConfirmarCadastro')?.addEventListener('click', fazerCadastroCliente);
    
    document.getElementById('cadastroTelefone')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    });
    
    document.getElementById('cadastroCpf')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{3})(\d)/g, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .slice(0, 14);
    });
    
    document.getElementById('cadastroCep')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/g, '$1-$2')
            .slice(0, 9);
    });
    
    const ultimoEmail = localStorage.getItem('cliente_ultimo_email');
    if (ultimoEmail) {
        document.getElementById('loginEmail').value = ultimoEmail;
    }
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            abrirModal('quickSearchModal');
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('quickSearchModal');
            if (modal && modal.classList.contains('active')) {
                fecharModal('quickSearchModal');
            }
        }
    });
    
    document.getElementById('btnReenviarVerificacao')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Reenviando e-mail...');
        
        try {
            const resultado = await window.reenviarEmailVerificacao(email);
            
            if (resultado.sucesso) {
                mostrarMensagem('E-mail reenviado! Você tem mais 30 minutos.', 'success');
                atualizarTempoRestante();
            } else {
                mostrarMensagem('Erro: ' + resultado.erro, 'error');
            }
        } catch (error) {
            mostrarMensagem('Erro ao reenviar', 'error');
        } finally {
            esconderLoading();
        }
    });
    
    document.getElementById('btnVerificarAgora')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Verificando...');
        
        try {
            fecharModal('verificacaoEmailModal');
            abrirModal('loginModal');
            mostrarMensagem('Faça o login novamente após verificar seu e-mail', 'info');
        } catch (error) {
            mostrarMensagem('Erro ao verificar', 'error');
        } finally {
            esconderLoading();
        }
    });
    
    configurarMenuPerfil();
    
    const servicoSelect = document.getElementById('servicoSelect');
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    const btnAbrirAgendamento = document.getElementById('btnAbrirAgendamento');
    const btnVerAgendamento = document.getElementById('btnVerAgendamento');
    
    if (servicoSelect) {
        servicoSelect.addEventListener('change', function() {
            if (this.value) {
                if (dataInput) {
                    dataInput.disabled = false;
                    if (!dataInput.value) {
                        const hoje = new Date();
                        const ano = hoje.getFullYear();
                        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                        const dia = String(hoje.getDate()).padStart(2, '0');
                        dataInput.value = `${ano}-${mes}-${dia}`;
                        setTimeout(() => {
                            if (dataInput) {
                                const event = new Event('change', { bubbles: true });
                                dataInput.dispatchEvent(event);
                            }
                        }, 100);
                    }
                }
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Selecione uma data</option>';
                    horarioSelect.disabled = true;
                }
            } else {
                if (dataInput) {
                    dataInput.value = '';
                    dataInput.disabled = true;
                }
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
                    horarioSelect.disabled = true;
                }
            }
        });
    }
    
    if (dataInput) {
        dataInput.addEventListener('change', function() {
            if (this.value && servicoSelect?.value) {
                carregarHorariosCliente();
            } else if (!servicoSelect?.value) {
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
                    horarioSelect.disabled = true;
                }
            }
        });
    }
    
    if (btnAbrirAgendamento) {
        btnAbrirAgendamento.addEventListener('click', () => {
            if (!usuarioLogado) {
                mostrarMensagem('Faça login para fazer um agendamento', 'warning');
                abrirModal('loginModal');
                return;
            }
            abrirModalAgendamento();
        });
    }
    
    if (btnVerAgendamento) {
        btnVerAgendamento.addEventListener('click', () => {
            window.location.href = 'agendamento.html';
        });
    }
    
    document.getElementById('btnNovaSenhaHoje')?.addEventListener('click', abrirModalNovaSenhaHoje);
    
    const senhaRapidaServico = document.getElementById('senhaRapidaServico');
    if (senhaRapidaServico) {
        senhaRapidaServico.addEventListener('change', window.carregarPrimeiroHorarioDisponivel);
    }
    
    document.getElementById('agendamentoStatus')?.addEventListener('click', alternarModoOperacao);
}

// ============================================
// CONFIGURAR DROPDOWN AGENDAMENTO
// ============================================
function configurarDropdownAgendamento() {
    const btnDropdown = document.getElementById('btnAgendamentoDropdown');
    const dropdownMenu = document.getElementById('agendamentoDropdownMenu');
    
    if (!btnDropdown || !dropdownMenu) return;
    
    btnDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!btnDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    });
    
    document.getElementById('dropdownAgendar')?.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalAgendamento();
    });
    
    document.getElementById('dropdownMeusAgendamentos')?.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalMeusAgendamentos();
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
async function inicializarSistema() {
    console.log("📄 Inicializando sistema...");
    
    mostrarLoading('Carregando loja...');
    
    try {
        if (!lojaIdAtual) {
            lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
        }
        
        console.log(`📍 Loja ID: ${lojaIdAtual}`);
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            return;
        }
        
        configurarFavicon();
        carregarLogoLoja();
        await carregarDadosLoja();
        
        // ============================================
        // VERIFICAR CONFIGURAÇÕES DA LOJA (MESMO PADRÃO)
        // ============================================
        
        // 1. Verificar Agendamento
        agendamentoHabilitado = await verificarAgendamentoHabilitado();
        console.log(`📅 Agendamento habilitado: ${agendamentoHabilitado ? 'SIM' : 'NÃO'}`);
        toggleAgendamentoContainer(agendamentoHabilitado);
        
        // 2. Verificar Programas de Aprimoramento
        programasAprimoramentoHabilitado = await verificarProgramasAprimoramentoHabilitado();
        console.log(`📚 Programas de Aprimoramento habilitado: ${programasAprimoramentoHabilitado ? 'SIM' : 'NÃO'}`);
        
        // 3. Verificar Estoque/Carrinho (NOVO)
        estoqueCarrinhoHabilitado = await verificarEstoqueCarrinhoHabilitado();
        console.log(`🛒 Estoque/Carrinho habilitado: ${estoqueCarrinhoHabilitado ? 'SIM' : 'NÃO'}`);
        
        // Exportar para window para que outros módulos possam acessar
        window.agendamentoHabilitado = agendamentoHabilitado;
        window.programasAprimoramentoHabilitado = programasAprimoramentoHabilitado;
        window.estoqueCarrinhoHabilitado = estoqueCarrinhoHabilitado;
        
        // ============================================
        // CONTROLAR VISIBILIDADE DAS SEÇÕES DE PRODUTOS
        // ============================================
        const categoriesSection = document.querySelector('.categories-section');
        const featuredProducts = document.querySelector('.featured-products');
        const btnGoToCart = document.getElementById('btnGoToCart');
        const searchWrapper = document.querySelector('.search-wrapper');
        
        if (!estoqueCarrinhoHabilitado) {
            // Esconder seções de produtos e categorias
            if (categoriesSection) {
                categoriesSection.style.display = 'none';
                console.log('🛒 Seção de categorias ocultada');
            }
            if (featuredProducts) {
                featuredProducts.style.display = 'none';
                console.log('🛒 Seção de produtos ocultada');
            }
            if (btnGoToCart) {
                btnGoToCart.style.display = 'none';
                console.log('🛒 Botão do carrinho ocultado');
            }
            // Opcional: Desabilitar campo de busca de produtos
            if (searchWrapper) {
                searchWrapper.style.opacity = '0.5';
                const searchInput = searchWrapper.querySelector('input');
                if (searchInput) {
                    searchInput.disabled = true;
                    searchInput.placeholder = 'Funcionalidade desabilitada';
                }
            }
            console.log('🛒 Modo sem estoque/carrinho ativado');
        } else {
            // Mostrar seções normalmente
            if (categoriesSection) categoriesSection.style.display = 'block';
            if (featuredProducts) featuredProducts.style.display = 'block';
            if (btnGoToCart) btnGoToCart.style.display = 'flex';
            if (searchWrapper) {
                searchWrapper.style.opacity = '1';
                const searchInput = searchWrapper.querySelector('input');
                if (searchInput) {
                    searchInput.disabled = false;
                    searchInput.placeholder = 'O que você está procurando?';
                }
            }
        }
        
        if (agendamentoHabilitado) {
            await carregarConfiguracoesServicos();
            iniciarEscutaAgendamentos();
            setTimeout(() => {
                verificarEIniciarCarrossel();
            }, 1000);
        }
        
        configurarEventos();
        
        // Só carregar produtos se estoque/carrinho estiver habilitado
        if (estoqueCarrinhoHabilitado) {
            await carregarProdutos();
            await carregarCategorias();
            await carregarProdutosDestaque();
        } else {
            console.log('🛒 Carregamento de produtos ignorado (funcionalidade desabilitada)');
        }
        
        esconderLoading();
        configurarDropdownAgendamento();
        
        // Se já estiver logado, atualizar menu com as configurações
        if (usuarioLogado && dadosUsuario) {
            atualizarMenuPerfil();
        }
        
        console.log("✅ Loja clientes pronta!");
        console.log(`📊 Resumo das configurações:`);
        console.log(`   📅 Agendamento: ${agendamentoHabilitado ? 'ATIVO' : 'INATIVO'}`);
        console.log(`   📚 Aprimoramento: ${programasAprimoramentoHabilitado ? 'ATIVO' : 'INATIVO'}`);
        console.log(`   🛒 Estoque/Carrinho: ${estoqueCarrinhoHabilitado ? 'ATIVO' : 'INATIVO'}`);
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar loja', 'error');
        esconderLoading();
    }
}

// ============================================
// EXPORTAR PARA WINDOW
// ============================================
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.abrirModalAgendamento = abrirModalAgendamento;
window.abrirModalNovaSenhaHoje = abrirModalNovaSenhaHoje;
window.abrirModalMeusAgendamentos = abrirModalMeusAgendamentos;
window.carregarDadosLoja = carregarDadosLoja;
window.renderizarContatos = renderizarContatos;
window.renderizarEndereco = renderizarEndereco;
window.renderizarChat = renderizarChat;
window.configurarEventos = configurarEventos;
window.configurarDropdownAgendamento = configurarDropdownAgendamento;
window.inicializarSistema = inicializarSistema;

// Exportar variáveis para window
window.agendamentoHabilitado = agendamentoHabilitado;
window.programasAprimoramentoHabilitado = programasAprimoramentoHabilitado;
window.estoqueCarrinhoHabilitado = estoqueCarrinhoHabilitado;

// Inicializar
inicializarSistema();

console.log("✅ Módulo 8 carregado com sucesso!");
