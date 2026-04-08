// index_7.js - Login, Cadastro e Autenticação
console.log("📁 Módulo 7 Carregado: Autenticação");

// ============================================
// FAZER LOGIN CLIENTE
// ============================================
async function fazerLoginCliente() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const lembrar = document.getElementById('loginLembrar').checked;
    
    if (!email || !senha) {
        mostrarMensagem('Preencha e-mail e senha', 'warning');
        return;
    }
    
    mostrarLoading('Validando login...');
    
    try {
        const resultado = await window.fazerLogin(email, senha);
        
        if (resultado && resultado.sucesso) {
            if (lembrar) {
                localStorage.setItem('cliente_ultimo_email', email);
            } else {
                localStorage.removeItem('cliente_ultimo_email');
            }
            
            mostrarMensagem(`Bem-vindo(a) ${resultado.usuario.nome || email}!`, 'success');
            
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginSenha').value = '';
            
            fecharModal('loginModal');
            
        } else {
            if (resultado.tipo === 'email_nao_verificado') {
                mostrarMensagem(resultado.erro, 'warning', 6000);
                document.getElementById('loginSenha').value = '';
                
            } else if (resultado.tipo === 'email_nao_cadastrado') {
                if (confirm(resultado.erro + ' Clique OK para se cadastrar.')) {
                    fecharModal('loginModal');
                    abrirModal('cadastroModal');
                    document.getElementById('cadastroEmail').value = email;
                }
                document.getElementById('loginSenha').value = '';
                
            } else if (resultado.tipo === 'senha_incorreta') {
                if (confirm(resultado.erro + ' Clique OK para receber o link de redefinição.')) {
                    mostrarLoading('Enviando link de redefinição...');
                    try {
                        await auth.sendPasswordResetEmail(resultado.email);
                        mostrarMensagem(`Link de redefinição enviado para ${resultado.email}. Verifique sua caixa de entrada.`, 'success', 6000);
                    } catch (resetError) {
                        mostrarMensagem('Erro ao enviar link. Tente novamente.', 'error');
                    } finally {
                        esconderLoading();
                    }
                }
                document.getElementById('loginSenha').value = '';
                
            } else {
                mostrarMensagem(resultado.erro, 'error');
                document.getElementById('loginSenha').value = '';
            }
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem('Erro ao fazer login', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FAZER CADASTRO CLIENTE
// ============================================
async function fazerCadastroCliente() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    const cpf = document.getElementById('cadastroCpf').value.trim();
    const senha = document.getElementById('cadastroSenha').value.trim();
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value.trim();
    const endereco = document.getElementById('cadastroEndereco').value.trim();
    const cidade = document.getElementById('cadastroCidade').value.trim();
    const cep = document.getElementById('cadastroCep').value.trim();
    const termos = document.getElementById('cadastroTermos').checked;
    
    if (!nome || !email || !telefone || !cpf || !senha || !confirmarSenha) {
        mostrarMensagem('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    if (!termos) {
        mostrarMensagem('Você precisa aceitar os termos de uso', 'warning');
        return;
    }
    
    if (senha !== confirmarSenha) {
        mostrarMensagem('As senhas não coincidem', 'warning');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensagem('E-mail inválido', 'warning');
        return;
    }
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        mostrarMensagem('CPF inválido', 'warning');
        return;
    }
    
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('Telefone inválido', 'warning');
        return;
    }
    
    mostrarLoading('Cadastrando...');
    
    try {
        const resultado = await window.cadastrarCliente(
            nome, email, senha, telefoneLimpo, cpfLimpo, endereco, cidade, cep
        );
        
        if (resultado.sucesso) {
            if (resultado.precisaVerificar) {
                document.getElementById('verificacaoEmail').textContent = resultado.email;
                abrirModal('verificacaoEmailModal');
                mostrarMensagem(resultado.mensagem, 'success', 6000);
            } else {
                mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            }
            
            fecharModal('cadastroModal');
            
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroTelefone').value = '';
            document.getElementById('cadastroCpf').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmarSenha').value = '';
            document.getElementById('cadastroEndereco').value = '';
            document.getElementById('cadastroCidade').value = '';
            document.getElementById('cadastroCep').value = '';
            document.getElementById('cadastroTermos').checked = false;
            
        } else {
            mostrarMensagem(resultado.erro, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        mostrarMensagem('Erro ao realizar cadastro', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FAZER LOGOUT CLIENTE
// ============================================
async function fazerLogoutCliente() {
    if (confirm('Deseja realmente sair?')) {
        mostrarLoading('Saindo...');
        await window.fazerLogout();
        esconderLoading();
    }
}

// ============================================
// CONFIGURAR MENU PERFIL
// ============================================
function configurarMenuPerfil() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        dropdown.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        });
    }
    
    document.getElementById('menuRelatorios')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'relatorios.html';
    });
    
    document.getElementById('menuGestaoLogins')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Gestão de logins em desenvolvimento', 'info');
    });
    
    document.getElementById('menuEstoque')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (dadosUsuario) {
            window.location.href = `estoque.html?perfil=${dadosUsuario.nivel || dadosUsuario.tipo}`;
        }
    });
    
    document.getElementById('menuGestaoAgendamento')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'agendamento.html?modo=gestao';
    });
    
    document.getElementById('menuLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        fazerLogoutCliente();
    });
}

// ============================================
// ATUALIZAR MENU PERFIL - SOMENTE QUANDO LOGADO
// ============================================
function atualizarMenuPerfil() {
    if (!dadosUsuario) {
        // Se NÃO estiver logado, esconde TODOS os itens do menu
        const todosMenuItems = document.querySelectorAll('#profileMenuDropdown .menu-item');
        todosMenuItems.forEach(item => {
            item.style.display = 'none';
        });
        
        const divisores = document.querySelectorAll('#profileMenuDropdown .menu-divider');
        divisores.forEach(div => {
            div.style.display = 'none';
        });
        
        console.log('🔒 Menu escondido - usuário não logado');
        return;
    }
    
    // ============================================
    // USUÁRIO ESTÁ LOGADO - MOSTRAR MENUS
    // ============================================
    
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    console.log('🔍 Atualizando menu para perfil:', perfil);
    
    // Permissões por perfil (itens administrativos)
    const permissoes = {
        'admin': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'gerente': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'supervisor': ['menuEstoque'],
        'vendedor': ['menuEstoque'],
        'cliente': [] // Cliente não vê itens administrativos
    };
    
    const itensPermitidos = permissoes[perfil] || [];
    
    // Referências dos elementos do menu
    const menuProgramas = document.getElementById('menuProgramasAprimoramento');
    const menuRelatorios = document.getElementById('menuRelatorios');
    const menuGestaoLogins = document.getElementById('menuGestaoLogins');
    const menuEstoque = document.getElementById('menuEstoque');
    const menuGestaoAgendamento = document.getElementById('menuGestaoAgendamento');
    const menuLogout = document.getElementById('menuLogout');
    
    // Divisores
    const menuDividerProgramas = document.getElementById('menuDividerProgramas');
    const menuDividerPrincipal = document.getElementById('menuDividerPrincipal');
    
    // ============================================
    // 1. PROGRAMA DE APRIMORAMENTO - VISÍVEL APENAS QUANDO LOGADO
    // ============================================
    if (menuProgramas) {
        menuProgramas.style.display = 'flex';
        
        // Evento de clique para abrir programas de aprimoramento
        menuProgramas.onclick = (e) => {
            e.preventDefault();
            window.location.href = 'programas_aprimoramento.html';
        };
        console.log('✅ Mostrando item: Programas de Aprimoramento');
    }
    
    // ============================================
    // 2. ITENS ADMINISTRATIVOS (apenas para funcionários)
    // ============================================
    let temItemAdministrativo = false;
    
    // Relatórios
    if (menuRelatorios) {
        if (itensPermitidos.includes('menuRelatorios')) {
            menuRelatorios.style.display = 'flex';
            temItemAdministrativo = true;
            console.log('✅ Mostrando item: Relatórios');
        } else {
            menuRelatorios.style.display = 'none';
        }
    }
    
    // Gestão de Logins
    if (menuGestaoLogins) {
        if (itensPermitidos.includes('menuGestaoLogins')) {
            menuGestaoLogins.style.display = 'flex';
            temItemAdministrativo = true;
            console.log('✅ Mostrando item: Gestão de Logins');
        } else {
            menuGestaoLogins.style.display = 'none';
        }
    }
    
    // Estoque
    if (menuEstoque) {
        if (itensPermitidos.includes('menuEstoque')) {
            menuEstoque.style.display = 'flex';
            temItemAdministrativo = true;
            console.log('✅ Mostrando item: Estoque');
        } else {
            menuEstoque.style.display = 'none';
        }
    }
    
    // Gestão de Agendamento (regra especial)
    if (menuGestaoAgendamento) {
        if (agendamentoHabilitado && perfil !== 'cliente') {
            menuGestaoAgendamento.style.display = 'flex';
            temItemAdministrativo = true;
            console.log('✅ Mostrando item: Gestão de Agendamento');
        } else {
            menuGestaoAgendamento.style.display = 'none';
        }
    }
    
    // ============================================
    // 3. GERENCIAR DIVISORES
    // ============================================
    // Divisor entre Programas e itens administrativos
    if (menuDividerProgramas) {
        menuDividerProgramas.style.display = temItemAdministrativo ? 'block' : 'none';
        console.log(`📏 Divisor Programas: ${temItemAdministrativo ? 'visível' : 'oculto'}`);
    }
    
    // Divisor principal (antes do logout)
    if (menuDividerPrincipal) {
        const temAlgumItem = temItemAdministrativo || true; // Programas sempre visível quando logado
        menuDividerPrincipal.style.display = temAlgumItem ? 'block' : 'none';
    }
    
    // ============================================
    // 4. LOGOUT - SEMPRE VISÍVEL QUANDO LOGADO
    // ============================================
    if (menuLogout) {
        menuLogout.style.display = 'flex';
        console.log('✅ Mostrando item: Sair');
    }
    
    console.log('✅ Menu atualizado com Programas de Aprimoramento');
}

// ============================================
// ATUALIZAR TEMPO RESTANTE
// ============================================
async function atualizarTempoRestante() {
    const email = document.getElementById('verificacaoEmail').textContent;
    
    if (!email || email === 'email@exemplo.com') return;
    
    const resultado = await window.verificarTempoRestante(email);
    
    if (resultado.encontrado && !resultado.emailVerificado) {
        const tempoElement = document.getElementById('tempoRestante');
        const avisoElement = document.getElementById('avisoExpiracao');
        
        if (tempoElement) {
            if (resultado.expirado) {
                tempoElement.innerHTML = `<span style="color: #dc3545; font-weight: bold;">
                    ⚠️ EXPIRADO! Faça um novo cadastro.
                </span>`;
                if (avisoElement) avisoElement.style.display = 'block';
            } else {
                tempoElement.innerHTML = `⏳ Tempo restante: <strong>${resultado.minutosRestantes} minutos</strong>`;
            }
        }
    }
}

// Eventos de autenticação
window.addEventListener('usuarioLogado', (event) => {
    const { usuario, permissoes } = event.detail;
    
    usuarioLogado = true;
    dadosUsuario = usuario;
    
    console.log('✅ Usuário logado no clientes.js:', usuario);
    
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    
    if (userName) {
        let tipoDisplay = '';
        const perfilExibicao = usuario.perfil || usuario.nivel || usuario.tipo;
        
        if (usuario.tipo === 'admin') {
            tipoDisplay = ' (Admin)';
        } else if (usuario.tipo === 'funcionario') {
            const perfilFormatado = perfilExibicao.charAt(0).toUpperCase() + perfilExibicao.slice(1);
            tipoDisplay = ` (${perfilFormatado})`;
        } else if (usuario.tipo === 'cliente') {
            tipoDisplay = ' (Cliente)';
        }
        
        userName.textContent = usuario.nome + tipoDisplay;
    }
    
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'none';
    if (profileMenuBtn) profileMenuBtn.style.display = 'flex';
    
    atualizarMenuPerfil();
    
    fecharModal('loginModal');
});

// ============================================
// EVENTO: USUÁRIO DESLOGADO
// ============================================
window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = false;
    dadosUsuario = null;
    
    console.log('👤 Usuário deslogado');
    
    // Atualizar agendamento se necessário
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    // Elementos da interface
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    // Atualizar textos e botões
    if (userName) userName.textContent = 'Visitante';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (profileMenuBtn) profileMenuBtn.style.display = 'none';
    if (dropdown) dropdown.classList.remove('show');
    
    // ============================================
    // ESCONDER TODOS OS ITENS DO MENU
    // ============================================
    
    // Esconder itens individuais do menu
    const menuItems = [
        'menuProgramasAprimoramento',
        'menuRelatorios',
        'menuGestaoLogins',
        'menuEstoque',
        'menuGestaoAgendamento',
        'menuLogout'
    ];
    
    menuItems.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'none';
        }
    });
    
    // ============================================
    // ESCONDER TODOS OS DIVISORES
    // ============================================
    const divisores = [
        'menuDividerProgramas',
        'menuDividerPrincipal'
    ];
    
    divisores.forEach(divId => {
        const divisor = document.getElementById(divId);
        if (divisor) {
            divisor.style.display = 'none';
        }
    });
    
    // Fallback: esconder qualquer outro .menu-item ou .menu-divider que possa existir
    const todosMenuItems = document.querySelectorAll('#profileMenuDropdown .menu-item');
    todosMenuItems.forEach(item => {
        item.style.display = 'none';
    });
    
    const todosDivisores = document.querySelectorAll('#profileMenuDropdown .menu-divider');
    todosDivisores.forEach(div => {
        div.style.display = 'none';
    });
    
    console.log('🔒 Menu completamente escondido - usuário deslogado');
});

window.addEventListener('usuarioNaoAutorizado', (event) => {
    const erro = event.detail?.erro || 'Acesso negado';
    mostrarMensagem(erro, 'error');
});

window.addEventListener('usuarioNaoVerificado', (event) => {
    const { email } = event.detail;
    
    document.getElementById('verificacaoEmail').textContent = email;
    abrirModal('verificacaoEmailModal');
    
    atualizarTempoRestante();
    
    const interval = setInterval(() => {
        if (!document.getElementById('verificacaoEmailModal').classList.contains('active')) {
            clearInterval(interval);
            return;
        }
        atualizarTempoRestante();
    }, 30000);
});

// Exportar para window
window.fazerLoginCliente = fazerLoginCliente;
window.fazerCadastroCliente = fazerCadastroCliente;
window.fazerLogoutCliente = fazerLogoutCliente;
window.configurarMenuPerfil = configurarMenuPerfil;
window.atualizarMenuPerfil = atualizarMenuPerfil;
window.atualizarTempoRestante = atualizarTempoRestante;

console.log("✅ Módulo 7 carregado com sucesso!");
