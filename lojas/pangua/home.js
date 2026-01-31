// lojas/pangua/home.js
import { db } from './firebase_pangua.js';

// Verificar autenticação e se o usuário pertence à loja pangua
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('pdv_autenticado');
    const usuario = localStorage.getItem('pdv_usuario');
    const loja = localStorage.getItem('pdv_loja');
    
    if (autenticado !== 'true' || !usuario || loja !== 'pangua') {
        window.location.href = '../../login.html';
        return null;
    }
    
    const usuarioData = JSON.parse(usuario);
    
    // Verificar se o usuário realmente pertence à loja pangua
    if (usuarioData.loja !== 'pangua' && !usuarioData.acessoTotal) {
        window.location.href = '../../login.html';
        return null;
    }
    
    return usuarioData;
}

// Carregar dados do usuário
function carregarDadosUsuario(usuario) {
    if (usuario) {
        // Atualizar elementos com dados do usuário
        document.getElementById('userName').textContent = usuario.login;
        document.getElementById('userProfile').textContent = usuario.perfil;
        document.getElementById('lojaNome').textContent = usuario.loja;
        document.getElementById('welcomeName').textContent = usuario.login;
        document.getElementById('welcomeLoja').textContent = usuario.loja;
        document.getElementById('footerUser').textContent = usuario.login;
        document.getElementById('footerProfile').textContent = usuario.perfil;
        document.getElementById('pageTitle').textContent = `Dashboard - ${usuario.loja}`;
    }
}

// Atualizar hora atual
function atualizarHora() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const timeElement = document.getElementById('currentTime');
    timeElement.textContent = now.toLocaleDateString('pt-BR', options);
}

// Toggle sidebar no mobile
function configurarMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
}

// Logout
function configurarLogout() {
    const btnLogout = document.getElementById('btnLogout');
    
    btnLogout.addEventListener('click', function() {
        // Limpar dados de autenticação
        localStorage.removeItem('pdv_autenticado');
        localStorage.removeItem('pdv_usuario');
        localStorage.removeItem('pdv_loja');
        
        // Redirecionar para login
        window.location.href = '../../login.html';
    });
}

// Configurar ações dos botões
function configurarBotoesAcao(usuario) {
    document.getElementById('btnNovaVenda').addEventListener('click', function() {
        alert('Funcionalidade de Nova Venda - Em desenvolvimento');
    });
    
    document.getElementById('btnNovoProduto').addEventListener('click', function() {
        // Verificar permissão
        if (usuario.perfil !== 'admin' && usuario.perfil !== 'gerente') {
            alert('Apenas administradores e gerentes podem adicionar produtos');
            return;
        }
        alert('Funcionalidade de Novo Produto - Em desenvolvimento');
    });
    
    document.getElementById('btnNovoCliente').addEventListener('click', function() {
        alert('Funcionalidade de Novo Cliente - Em development');
    });
    
    document.getElementById('btnRelatorio').addEventListener('click', function() {
        alert('Funcionalidade de Relatório - Em development');
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    const usuario = verificarAutenticacao();
    
    if (!usuario) {
        return;
    }
    
    // Carregar dados do usuário
    carregarDadosUsuario(usuario);
    
    // Configurar funcionalidades
    configurarMenuToggle();
    configurarLogout();
    configurarBotoesAcao(usuario);
    
    // Atualizar hora inicial e configurar intervalo
    atualizarHora();
    setInterval(atualizarHora, 1000);
    
    // Configurar navegação do menu
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover classe active de todos os itens
            menuItems.forEach(i => {
                i.parentElement.classList.remove('active');
            });
            
            // Adicionar classe active ao item clicado
            this.parentElement.classList.add('active');
            
            // Atualizar título da página
            const title = this.querySelector('span').textContent;
            document.getElementById('pageTitle').textContent = `${title} - ${usuario.loja}`;
        });
    });
    
    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
});