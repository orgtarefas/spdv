// index_8.js - UI, Modais e Configurações da Loja
console.log("📁 Módulo 8 Carregado: UI e Configurações");

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
// ATUALIZAR MENU PERFIL
// ============================================
function atualizarMenuPerfil() {
    if (!dadosUsuario) return;
    
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    console.log('🔍 Atualizando menu para perfil:', perfil);
    
    // Permissões por perfil
    const permissoes = {
        'admin': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'gerente': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'supervisor': ['menuEstoque'],
        'vendedor': ['menuEstoque'],
        'cliente': [] // Cliente não vê nenhum item administrativo
    };
    
    const itensPermitidos = permissoes[perfil] || [];
    
    // Itens do menu
    const menuItems = {
        menuProgramasAprimoramento: document.getElementById('menuProgramasAprimoramento'),
        menuRelatorios: document.getElementById('menuRelatorios'),
        menuGestaoLogins: document.getElementById('menuGestaoLogins'),
        menuEstoque: document.getElementById('menuEstoque'),
        menuGestaoAgendamento: document.getElementById('menuGestaoAgendamento'),
        menuLogout: document.getElementById('menuLogout')
    };
    
    // Divisores
    const menuDividerProgramas = document.getElementById('menuDividerProgramas');
    const menuDividerPrincipal = document.getElementById('menuDividerPrincipal');
    
    // ============================================
    // 1. PROGRAMA DE APRIMORAMENTO - VISÍVEL PARA TODOS
    // ============================================
    if (menuItems.menuProgramasAprimoramento) {
        menuItems.menuProgramasAprimoramento.style.display = 'flex';
        
        // Evento de clique para abrir programas de aprimoramento
        menuItems.menuProgramasAprimoramento.onclick = (e) => {
            e.preventDefault();
            window.location.href = 'programas_aprimoramento.html';
        };
    }
    
    // ============================================
    // 2. ITENS ADMINISTRATIVOS (visíveis apenas para funcionários)
    // ============================================
    let temItemAdministrativo = false;
    
    for (const [id, element] of Object.entries(menuItems)) {
        if (element && id !== 'menuProgramasAprimoramento' && id !== 'menuLogout') {
            if (itensPermitidos.includes(id) || (id === 'menuGestaoAgendamento' && agendamentoHabilitado && perfil !== 'cliente')) {
                element.style.display = 'flex';
                temItemAdministrativo = true;
                console.log(`✅ Mostrando item: ${id}`);
            } else {
                element.style.display = 'none';
                console.log(`❌ Escondendo item: ${id}`);
            }
        }
    }
    
    // ============================================
    // 3. GERENCIAR DIVISORES
    // ============================================
    // Divisor entre Programas e itens administrativos
    if (menuDividerProgramas) {
        menuDividerProgramas.style.display = temItemAdministrativo ? 'block' : 'none';
    }
    
    // Divisor principal (antes do logout)
    if (menuDividerPrincipal) {
        const temAlgumItem = temItemAdministrativo || menuItems.menuProgramasAprimoramento?.style.display === 'flex';
        menuDividerPrincipal.style.display = temAlgumItem ? 'block' : 'none';
    }
    
    // ============================================
    // 4. LOGOUT - SEMPRE VISÍVEL QUANDO LOGADO
    // ============================================
    if (menuItems.menuLogout) {
        menuItems.menuLogout.style.display = 'flex';
    }
    
    console.log('✅ Menu atualizado com Programas de Aprimoramento');
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
        
        agendamentoHabilitado = await verificarAgendamentoHabilitado();
        console.log(`📅 Agendamento habilitado: ${agendamentoHabilitado ? 'SIM' : 'NÃO'}`);
        toggleAgendamentoContainer(agendamentoHabilitado);
        
        if (agendamentoHabilitado) {
            await carregarConfiguracoesServicos();
            iniciarEscutaAgendamentos();
            setTimeout(() => {
                verificarEIniciarCarrossel();
            }, 1000);
        }
        
        configurarEventos();
        
        await carregarProdutos();
        await carregarCategorias();
        await carregarProdutosDestaque();
        
        esconderLoading();
        configurarDropdownAgendamento();
        console.log("✅ Loja clientes pronta!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar loja', 'error');
        esconderLoading();
    }
}

// Exportar para window
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.abrirModalAgendamento = abrirModalAgendamento;
window.abrirModalNovaSenhaHoje = abrirModalNovaSenhaHoje;
window.carregarDadosLoja = carregarDadosLoja;
window.renderizarContatos = renderizarContatos;
window.renderizarEndereco = renderizarEndereco;
window.renderizarChat = renderizarChat;
window.configurarEventos = configurarEventos;
window.configurarDropdownAgendamento = configurarDropdownAgendamento;
window.inicializarSistema = inicializarSistema;

// Inicializar
inicializarSistema();

console.log("✅ Módulo 8 carregado com sucesso!");