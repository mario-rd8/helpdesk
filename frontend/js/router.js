// ============================================================
// Router — Roteamento SPA baseado em Hash
// ============================================================

const ROUTES = {
    '#/login': renderLogin,
    '#/kanban': renderKanban,
    '#/portal': renderPortal,
    '#/dashboard': renderDashboard,
    '#/unidades': renderCadastroUnidades,
    '#/colaboradores': renderCadastroColaboradores,
    '#/equipamentos': renderCadastroEquipamentos,
    '#/tecnicos': renderCadastroTecnicos,
    '#/senha': renderChangePassword,
};

/** Configura a sidebar com links de navegação baseados no perfil */
function setupSidebar(session) {
    const sidebar = document.getElementById('sidebar');
    const nav = document.getElementById('sidebar-nav');
    const userName = document.getElementById('sidebar-user-name');
    const userRole = document.getElementById('sidebar-user-role');

    // Info do usuário
    userName.textContent = session.nome;
    const roleLabels = {
        'tecnico': '🔧 Técnico',
        'gestor_ti': '🛡️ Gestor de TIC',
        'colaborador': '👤 Colaborador',
        'gestor': '📋 Gestor de Equipe',
        'diretor': '🏢 Diretor',
    };
    userRole.textContent = roleLabels[session.perfil || session.nivel_hierarquico] || 'Usuário';

    // Monta os links de navegação baseados no perfil
    let links = '';

    if (session.tipo === 'tecnico') {
        links += buildSidebarLink('#/kanban', 'Kanban', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
            </svg>
        `);

        // Seção: Cadastros
        links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Cadastros</div>';

        links += buildSidebarLink('#/colaboradores', 'Colaboradores', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
        `);

        if (session.perfil === 'gestor_ti') {
            links += buildSidebarLink('#/tecnicos', 'Técnicos', `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
            `);
        }

        links += buildSidebarLink('#/equipamentos', 'Equipamentos', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        `);

        links += buildSidebarLink('#/unidades', 'Unidades', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
        `);

        if (session.perfil === 'gestor_ti') {
            links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Administração</div>';
            links += buildSidebarLink('#/dashboard', 'Dashboard', `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
                </svg>
            `);
        }

        // Link de Senha para técnicos
        links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Configurações</div>';
        links += buildSidebarLink('#/senha', 'Alterar Senha', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        `);
    } else {
        links += buildSidebarLink('#/portal', 'Meu Portal', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        `);

        links += buildSidebarLink('#/senha', 'Alterar Senha', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        `);
    }

    nav.innerHTML = links;

    // Exibe a sidebar
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    document.getElementById('app-container').classList.add('ml-64');
}

/** Helper para gerar um link de sidebar */
function buildSidebarLink(hash, label, iconSvg) {
    const isActive = window.location.hash === hash;
    return `
        <a href="${hash}" class="sidebar-link ${isActive ? 'active' : ''}">
            ${iconSvg}
            ${label}
        </a>
    `;
}

/** Atualiza o estado ativo dos links da sidebar */
function updateSidebarActive() {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === window.location.hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/** Roteador principal */
function handleRoute() {
    const hash = window.location.hash || '#/login';
    const session = getSession();

    // Se não está logado e não está na página de login → redireciona
    if (!session && hash !== '#/login') {
        window.location.hash = '#/login';
        return;
    }

    // Se está logado e está na página de login → redireciona para a tela correta
    if (session && hash === '#/login') {
        if (session.tipo === 'tecnico') {
            window.location.hash = session.perfil === 'gestor_ti' ? '#/dashboard' : '#/kanban';
        } else {
            window.location.hash = '#/portal';
        }
        return;
    }

    // Configura sidebar se logado
    if (session && hash !== '#/login') {
        setupSidebar(session);
        updateSidebarActive();
    }

    // Controla visibilidade do FAB "Abrir Chamado"
    const fab = document.getElementById('fab-novo-chamado');
    if (fab) {
        // Mostra FAB para usuários logados (colaboradores/gestores/diretores)
        // Esconde para técnicos (eles não abrem chamados) e na tela de login
        if (session && session.tipo === 'usuario' && hash !== '#/login') {
            fab.classList.remove('hidden');
            fab.classList.add('flex');
        } else {
            fab.classList.add('hidden');
            fab.classList.remove('flex');
        }
    }

    // Renderiza a rota
    const renderFn = ROUTES[hash];
    if (renderFn) {
        // Animação de transição
        const content = document.getElementById('app-content');
        content.classList.remove('animate-fade-in');
        void content.offsetWidth; // force reflow
        content.classList.add('animate-fade-in');
        renderFn();

        // Verifica avaliações pendentes se for usuário/colaborador logado
        if (session && session.tipo === 'usuario') {
            setTimeout(checkPendingRatings, 300);
        }
    } else {
        // Rota não encontrada
        document.getElementById('app-content').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <p class="text-6xl font-bold text-slate-700 mb-4">404</p>
                    <p class="text-slate-400 mb-6">Página não encontrada</p>
                    <a href="#/login" class="btn-primary px-6 py-2 rounded-xl text-sm">Voltar ao Início</a>
                </div>
            </div>
        `;
    }
}

// Inicialização do Router
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
    if (!window.location.hash) {
        window.location.hash = '#/login';
    }
    handleRoute();
});

console.log('✅ Router inicializado');
