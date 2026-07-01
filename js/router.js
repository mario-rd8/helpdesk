// ============================================================
// Router — Roteamento SPA baseado em Hash
// ============================================================

const ROUTES = {
    '#/login': renderLogin,
    '#/kanban': renderKanban,
    '#/portal': renderPortal,
    '#/dashboard': renderDashboard,
    '#/tecnicos': renderCadastroTecnicos,
    '#/provedores': renderCadastroProvedores, // SaaS Owner
    '#/clientes': renderCadastroClientes,     // Gestor TI e SaaS Owner
    '#/clientes/detalhe': renderDetalheCliente, // Detalhe de Clientes
    '#/senha': renderChangePassword,
    '#/tarefas': renderTarefas, // Módulo de tarefas do Gestor
    '#/colaboradores': renderCadastroColaboradores, // Técnico
    '#/equipamentos': renderCadastroEquipamentos, // Técnico
};

function obterIniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(" ");
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Configura a sidebar com links de navegação baseados no perfil */
async function setupSidebar(session) {
    const sidebar = document.getElementById('sidebar');
    const nav = document.getElementById('sidebar-nav');
    const userName = document.getElementById('sidebar-user-name');
    const userRole = document.getElementById('sidebar-user-role');
    const userInfoContainer = document.getElementById('sidebar-user-info');

    // Posiciona estrelas abaixo do nome caso seja técnico
    let ratingHeaderHtml = '';
    if (session.perfil === 'tecnico') {
        const ratingStars = await getTecnicoRatingHtml(session.id);
        if (ratingStars) {
            ratingHeaderHtml = `<div class="mt-1 flex items-center tech-rating-sidebar-group">${ratingStars}</div>`;
        }
    }

    const roleLabels = {
        'saas_admin': 'Administrador SaaS',
        'tecnico': 'Técnico de Suporte',
        'gestor_ti': 'Gestor de TIC',
        'gestor_cliente': 'Gestor (Cliente)',
        'colaborador': 'Colaborador',
    };

    // Monta o container de iniciais ou nome completo
    if (userInfoContainer) {
        userInfoContainer.innerHTML = `
            <!-- Dados completos visíveis no menu expandido -->
            <div class="flex items-center gap-3 sidebar-user-details">
                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm select-none flex-shrink-0">
                    ${obterIniciais(session.nome)}
                </div>
                <div class="sidebar-info-texts min-w-0">
                    <p id="sidebar-user-name" class="text-sm font-semibold text-white truncate">${session.nome}</p>
                    <p id="sidebar-user-role" class="text-xs text-eva-muted truncate">${roleLabels[session.perfil] || 'Usuário'}${ratingHeaderHtml}</p>
                </div>
            </div>
            <!-- Iniciais visíveis apenas no menu recolhido -->
            <div class="hidden sidebar-initials flex items-center justify-center">
                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm select-none" title="${session.nome}">
                    ${obterIniciais(session.nome)}
                </div>
            </div>
        `;
    }

    // Monta os links de navegação baseados no perfil
    let links = '';

    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const logoExpanded = document.getElementById('sidebar-logo-expanded');
    const logoCollapsed = document.getElementById('sidebar-logo-collapsed');

    if (isCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
        document.getElementById('app-container').classList.add('ml-sidebar-collapsed');
        document.getElementById('app-container').classList.remove('ml-64');
        if (logoExpanded) {
            logoExpanded.classList.add('hidden');
            logoExpanded.classList.remove('block');
        }
        if (logoCollapsed) {
            logoCollapsed.classList.remove('hidden');
            logoCollapsed.classList.add('block');
        }
    } else {
        sidebar.classList.remove('sidebar-collapsed');
        document.getElementById('app-container').classList.remove('ml-sidebar-collapsed');
        document.getElementById('app-container').classList.add('ml-64');
        if (logoExpanded) {
            logoExpanded.classList.remove('hidden');
            logoExpanded.classList.add('block');
        }
        if (logoCollapsed) {
            logoCollapsed.classList.add('hidden');
            logoCollapsed.classList.remove('block');
        }
    }

    if (session.perfil === 'saas_admin') {
        links += buildSidebarLink('#/dashboard', 'Dashboard Global', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
            </svg>
        `, 'Dashboard Global');

        links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">SaaS Management</div>';
        
        links += buildSidebarLink('#/provedores', 'Provedores de TI', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
        `, 'Provedores');

        links += buildSidebarLink('#/clientes', 'Empresas Clientes', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
        `, 'Clientes');

    } else if (session.perfil === 'gestor_ti') {
        // PERFIL: GESTOR DE TI (PROVEDOR)
        links += '<div class="mt-2 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">Administração</div>';
        
        links += buildSidebarLink('#/dashboard', 'Dashboard', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
            </svg>
        `, 'Dashboard');

        links += buildSidebarLink('#/kanban', 'Kanban de Serviços', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
            </svg>
        `, 'Kanban de Serviços');

        links += buildSidebarLink('#/tarefas', 'Tarefas', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
        `, 'Tarefas');

        links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">Cadastros</div>';

        links += buildSidebarLink('#/clientes', 'Clientes', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
        `, 'Clientes');

        // Cascata de Clientes para o Gestor TI
        try {
            const { data: clientesList } = await db.from('clientes')
                .select('id, nome_cliente')
                .eq('provedor_ti_id', session.provedor_ti_id)
                .order('nome_cliente');

            if (clientesList && clientesList.length > 0 && !isCollapsed) {
                links += '<div class="pl-4 border-l border-slate-800 space-y-1 my-1 sidebar-client-submenu">';
                clientesList.forEach(cli => {
                    const hashTarget = `#/clientes/detalhe?id=${cli.id}`;
                    const isClientActive = window.location.hash.startsWith('#/clientes/detalhe') && window.location.hash.includes(cli.id);
                    links += `
                        <a href="${hashTarget}" class="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all ${isClientActive ? 'bg-slate-800/80 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}">
                            <span class="w-1.5 h-1.5 rounded-full ${isClientActive ? 'bg-emerald-400' : 'bg-slate-600'}"></span>
                            <span class="truncate">${cli.nome_cliente}</span>
                        </a>
                    `;
                });
                links += '</div>';
            }
        } catch (e) { console.warn(e); }

        links += buildSidebarLink('#/tecnicos', 'Técnicos', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
        `, 'Técnicos');

    } else if (session.perfil === 'tecnico') {
        // PERFIL: TÉCNICO DE SUPORTE
        links += '<div class="mt-2 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">Operação</div>';
        
        links += buildSidebarLink('#/kanban', 'Kanban de Serviços', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
            </svg>
        `, 'Kanban de Serviços');

        links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">Cadastros</div>';

        links += buildSidebarLink('#/colaboradores', 'Colaboradores', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
        `, 'Colaboradores');

        links += buildSidebarLink('#/equipamentos', 'Equipamentos', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        `, 'Equipamentos');

    } else {
        // CLIENTES: gestor_cliente ou colaborador
        links += buildSidebarLink('#/portal', 'Meu Portal', `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        `, 'Meu Portal');
    }

    // Link comum de Senha e Logout
    links += '<div class="mt-5 mb-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest sidebar-section-title">Configurações</div>';
    links += buildSidebarLink('#/senha', 'Alterar Senha', `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
    `, 'Alterar Senha');

    // Botão de recolher/expandir no fim do menu
    links += `
        <div class="mt-auto border-t border-slate-800/80 pt-2">
            <button onclick="toggleSidebarCollapsed()" class="sidebar-toggle-btn">
                <svg class="w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                </svg>
                <span class="sidebar-label">Recolher Menu</span>
            </button>
        </div>
    `;

    nav.innerHTML = links;
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    checkPendingAuthorizations(session);
}

function toggleSidebarCollapsed() {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    localStorage.setItem('sidebar_collapsed', !isCollapsed);
    const session = getSession();
    if (session) setupSidebar(session);
}

function buildSidebarLink(hash, label, iconSvg, tooltipText = '') {
    const isActive = window.location.hash === hash;
    return `
        <a href="${hash}" class="sidebar-link ${isActive ? 'active' : ''}" data-tooltip="${tooltipText || label}">
            ${iconSvg}
            <span class="sidebar-label">${label}</span>
        </a>
    `;
}

function updateSidebarActive() {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        if (link.getAttribute('href') === window.location.hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function handleRoute() {
    let hash = window.location.hash || '#/login';
    const session = getSession();

    let cleanHash = hash;
    let queryParams = {};
    if (hash.includes('?')) {
        const parts = hash.split('?');
        cleanHash = parts[0];
        const rawParams = parts[1].split('&');
        rawParams.forEach(p => {
            const pair = p.split('=');
            if (pair[0]) queryParams[pair[0]] = decodeURIComponent(pair[1] || '');
        });
    }

    window.currentRouteParams = queryParams;

    // Se não está logado e não está no login
    if (!session && cleanHash !== '#/login') {
        window.location.hash = '#/login';
        return;
    }

    // Se está logado e tenta login
    if (session && cleanHash === '#/login') {
        if (session.perfil === 'saas_admin') {
            window.location.hash = '#/dashboard';
        } else if (session.perfil === 'gestor_ti') {
            window.location.hash = '#/dashboard';
        } else if (session.perfil === 'tecnico') {
            window.location.hash = '#/kanban';
        } else {
            window.location.hash = '#/portal';
        }
        return;
    }

    // CONTROLE DE NAVEGAÇÃO / REDIRECIONAMENTO ESTRITO
    if (session && session.perfil === 'tecnico') {
        const forbiddenScreens = ['#/dashboard', '#/clientes', '#/tecnicos', '#/provedores', '#/clientes/detalhe', '#/tarefas'];
        if (forbiddenScreens.includes(cleanHash)) {
            showToast('Acesso negado: Redirecionando para o Kanban.', 'warning');
            window.location.hash = '#/kanban';
            return;
        }
    }

    if (session && cleanHash !== '#/login') {
        setupSidebar(session);
        updateSidebarActive();
    }

    const fab = document.getElementById('fab-novo-chamado');
    if (fab) {
        if (session && session.tipo === 'usuario' && cleanHash !== '#/login') {
            fab.classList.remove('hidden');
            fab.classList.add('flex');
        } else {
            fab.classList.add('hidden');
            fab.classList.remove('flex');
        }
    }

    const renderFn = ROUTES[cleanHash];
    if (renderFn) {
        const content = document.getElementById('app-content');
        content.classList.remove('animate-fade-in');
        void content.offsetWidth;
        content.classList.add('animate-fade-in');
        renderFn();

        if (session && session.tipo === 'usuario') {
            setTimeout(checkPendingRatings, 300);
        }
        if (session) {
            setTimeout(() => checkPendingAuthorizations(session), 350);
        }
    } else {
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

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
    if (!window.location.hash) {
        window.location.hash = '#/login';
    }
    handleRoute();
});

let vouAnalisarClicked = false;

async function checkPendingAuthorizations(session) {
    const isGestorCliente = session.perfil === 'gestor_cliente' || session.nivel_hierarquico === 'gestor' || session.nivel_hierarquico === 'diretor';
    const isGestorTI = session.perfil === 'gestor_ti';

    if (!isGestorCliente && !isGestorTI) return;

    try {
        let query = db.from('chamados').select('*');
        if (isGestorCliente) {
            const { data: userDetails } = await db.from('usuarios').select('cliente_id').eq('id', session.id).single();
            if (userDetails) {
                query = query.eq('cliente_id', userDetails.cliente_id).eq('autorizacao_status', 'Pendente_Gestor_Cliente');
            } else {
                return;
            }
        } else if (isGestorTI) {
            query = query.eq('provedor_ti_id', session.provedor_ti_id).eq('autorizacao_status', 'Pendente_Gestor_TI');
        }

        const { data: pendentes, error } = await query;
        if (error) throw error;

        const hasPendentes = pendentes && pendentes.length > 0;
        
        const existingSino = document.getElementById('sidebar-pending-sino');
        const userDetailsContainer = document.querySelector('.sidebar-user-details');

        if (hasPendentes) {
            if (!existingSino && userDetailsContainer) {
                userDetailsContainer.insertAdjacentHTML('afterbegin', `
                    <span id="sidebar-pending-sino" class="text-red-500 animate-pulse text-sm font-bold flex-shrink-0 cursor-pointer" title="Autorização pendente!">
                        🔔
                    </span>
                `);
            }
            
            if (!vouAnalisarClicked) {
                openModalBloqueioIntrusivo(pendentes[0]);
            }
        } else {
            if (existingSino) existingSino.remove();
        }
    } catch (e) {
        console.warn('Erro ao verificar autorizações pendentes:', e);
    }
}

function openModalBloqueioIntrusivo(chamado) {
    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center gap-3">
                <span class="text-xl">⚠️</span>
                <h3 class="text-lg font-bold text-white">Autorização Pendente</h3>
            </div>
            <p class="text-xs text-eva-muted mt-1.5">Bloqueio administrativo temporário</p>
        </div>
        <div class="p-6 space-y-4">
            <p class="text-sm text-slate-200">
                O chamado <strong class="text-emerald-400">#${chamado.id}</strong> requer aprovação antes do atendimento.
            </p>
            
            <div class="bg-slate-800/80 border border-slate-700 p-4 rounded-xl">
                <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Justificativa do Técnico</h4>
                <p class="text-sm text-slate-300 leading-relaxed italic">"${chamado.autorizacao_mensagem || 'Sem justificativa detalhada'}"</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 pt-4">
                <button onclick="responderAutorizacao(${chamado.id}, 'Autorizado')" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">
                    ✅ Autorizar
                </button>
                <button onclick="responderAutorizacao(${chamado.id}, 'Negado')" class="flex-1 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 py-3 rounded-xl text-sm font-semibold transition-all">
                    ❌ Não Autorizar
                </button>
                <button onclick="responderVouAnalisar()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">
                    ⏳ Vou Analisar
                </button>
            </div>
        </div>
    `);

    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.onclick = null;
    }
}

async function responderAutorizacao(chamadoId, decisao) {
    const session = getSession();
    try {
        const { error } = await db.from('chamados')
            .update({ autorizacao_status: decisao })
            .eq('id', chamadoId);

        if (error) throw error;

        await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: 'sistema',
            autor_id: session.id,
            autor_nome: 'Sistema',
            mensagem: decisao === 'Autorizado' 
                ? `✅ Chamado autorizado para atendimento por ${session.nome}` 
                : `❌ Chamado NÃO autorizado para atendimento por ${session.nome}`,
            tipo_evento: decisao === 'Autorizado' ? 'autorizado' : 'negado'
        }]);

        showToast(decisao === 'Autorizado' ? 'Chamado autorizado!' : 'Autorização negada!', 'success');
        
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.onclick = closeModal;
        }

        closeModal();
        await setupSidebar(session);
    } catch (e) {
        console.error(e);
        showToast(`Erro ao salvar decisão: ${e.message}`, 'error');
    }
}

function responderVouAnalisar() {
    vouAnalisarClicked = true;
    showToast('Acesso temporariamente liberado. O alerta continuará ativo.', 'info');
    
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.onclick = closeModal;
    }
    
    closeModal();
}

console.log('✅ Router inicializado');
