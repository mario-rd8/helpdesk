// ============================================================
// Tela B — Kanban de Chamados (Gestor + Técnico)
// ============================================================
// Funcionalidades:
// - 4 colunas: Novo, Em Atendimento, Pendente, Resolvido
// - Cards VIP + Cards Resolvidos compactos
// - Toggle Kanban/Lista + Busca Global
// - Modal de resolução com texto
// - Botão Reabrir chamados
// - Filtros de Cliente e Filial
// - Estrelas de avaliação do técnico
// - 5ª coluna de Tarefas do Gestor (técnico)
// ============================================================

let kanbanViewMode = localStorage.getItem('kanban_view_mode') || 'kanban';
let kanbanSearchTerm = '';
let kanbanFilterCliente = 'all';
let kanbanFilterFilial = 'all';
let kanbanListFilterStatus = null; // For list view status filtering
let allChamadosCache = []; // Cache for filtering

async function renderKanban() {
    const session = getSession();
    if (!session) return;

    const content = document.getElementById('app-content');

    // Load tech rating
    let ratingHtml = '';
    if (session.tipo === 'tecnico') {
        ratingHtml = await getTecnicoRatingHtml(session.id);
    }

    // Load client filter options
    let clientesOptions = '';
    try {
        let q = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') q = q.eq('provedor_ti_id', session.provedor_ti_id);
        const { data: clientes } = await q;
        clientesOptions = (clientes || []).map(c => `<option value="${c.id}">🏢 ${c.nome_cliente}</option>`).join('');
    } catch (e) { console.warn(e); }

    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header + Filtros na mesma linha horizontal -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <!-- Título e Subtítulo -->
                <div class="flex-shrink-0">
                    <h2 class="text-2xl font-bold text-white leading-tight">Kanban de Chamados</h2>
                    <p class="text-eva-muted text-xs mt-0.5" id="kanban-subtitle">Carregando...</p>
                </div>
                
                <!-- Filtros e Controles Horizontalizados -->
                <div class="flex flex-wrap items-center gap-2">
                    <!-- Busca -->
                    <div class="relative w-full sm:w-48">
                        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text" id="kanban-search" onkeyup="handleKanbanSearch(this.value)" placeholder="Buscar..." value="${kanbanSearchTerm}" class="kanban-search-input py-1.5 pl-9 pr-3 text-xs w-full"/>
                    </div>
                    <!-- Filtro Cliente -->
                    <select id="kanban-filter-cliente" onchange="handleKanbanClienteFilter(this.value)" class="bg-eva-card border border-eva-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors max-w-[160px]">
                        <option value="all" ${kanbanFilterCliente === 'all' ? 'selected' : ''}>Todos os Clientes</option>
                        ${clientesOptions}
                    </select>
                    <!-- Filtro Filial -->
                    <select id="kanban-filter-filial" onchange="handleKanbanFilialFilter(this.value)" class="bg-eva-card border border-eva-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors max-w-[140px]">
                        <option value="all">Todas as Filiais</option>
                    </select>

                    <!-- View Toggle (Apenas ícones para economizar espaço) -->
                    <div class="kanban-view-toggle flex items-center bg-eva-card border border-eva-border rounded-xl p-0.5">
                        <button onclick="setKanbanView('kanban')" class="p-1.5 rounded-lg text-xs transition-all ${kanbanViewMode === 'kanban' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'}" title="Visualização em Kanban">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                        </button>
                        <button onclick="setKanbanView('lista')" class="p-1.5 rounded-lg text-xs transition-all ${kanbanViewMode === 'lista' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'}" title="Visualização em Lista">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                    </div>

                    <!-- Botão Atualizar (Apenas ícone) -->
                    <button onclick="loadKanbanData()" class="btn-ghost p-2 rounded-xl text-slate-400 hover:text-white border border-eva-border hover:bg-slate-800/50 transition-all" title="Atualizar dados">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Board Container (flex with optional tasks column) -->
            <div class="flex gap-4">
                <!-- Main Kanban/List Area -->
                <div id="kanban-board" class="flex-1 ${kanbanViewMode === 'kanban' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4' : ''}">
                    <div class="flex items-center justify-center py-20 ${kanbanViewMode === 'kanban' ? 'col-span-full' : ''}">
                        <div class="spinner"></div>
                    </div>
                </div>

                <!-- 5th Column: Tasks (Technician only) -->
                ${session.perfil === 'tecnico' ? '<div id="kanban-tasks-column"></div>' : ''}
            </div>
        </div>
    `;

    // Load branch filter based on initial client selection
    await updateKanbanFilialFilter();
    await loadKanbanData();
}

async function getTecnicoRatingHtml(tecnicoId) {
    try {
        const { data: avaliacoes } = await db.from('avaliacoes')
            .select('nota')
            .eq('tecnico_id', tecnicoId);

        if (!avaliacoes || avaliacoes.length === 0) return '';

        const media = avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length;
        const mediaRound = Math.round(media * 10) / 10;
        const fullStars = Math.floor(mediaRound);
        const hasHalf = (mediaRound - fullStars) >= 0.3;

        let stars = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<span class="star-filled">★</span>';
            } else if (i === fullStars && hasHalf) {
                stars += '<span class="star-filled">★</span>';
            } else {
                stars += '<span class="star-empty">★</span>';
            }
        }

        return `
            <div class="tech-rating-stars">
                ${stars}
                <span class="tech-rating-value">${mediaRound}</span>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

function setKanbanView(mode) {
    kanbanViewMode = mode;
    localStorage.setItem('kanban_view_mode', mode);
    renderKanban();
}

function handleKanbanSearch(value) {
    kanbanSearchTerm = value.toLowerCase();
    renderKanbanFromCache();
}

async function handleKanbanClienteFilter(value) {
    kanbanFilterCliente = value;
    kanbanFilterFilial = 'all';
    await updateKanbanFilialFilter();
    await loadKanbanData();
}

function handleKanbanFilialFilter(value) {
    kanbanFilterFilial = value;
    loadKanbanData();
}

async function updateKanbanFilialFilter() {
    const select = document.getElementById('kanban-filter-filial');
    if (!select) return;
    select.innerHTML = '<option value="all">Todas as Filiais</option>';

    if (kanbanFilterCliente === 'all') return;

    try {
        const { data: unidades } = await db.from('unidades')
            .select('id, nome_unidade')
            .eq('cliente_id', kanbanFilterCliente)
            .order('nome_unidade');

        (unidades || []).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `🏬 ${u.nome_unidade}`;
            select.appendChild(opt);
        });
    } catch (e) { console.warn(e); }
}

async function loadKanbanData() {
    const session = getSession();
    const board = document.getElementById('kanban-board');
    const subtitle = document.getElementById('kanban-subtitle');

    try {
        // Provider name
        const { data: provedor } = await db
            .from('provedores_ti')
            .select('nome_provedor')
            .eq('id', session.provedor_ti_id)
            .single();

        if (subtitle) {
            subtitle.textContent = `🏢 Provedor: ${provedor?.nome_provedor || 'Provedor'}`;
        }

        // Build query
        let query = db
            .from('chamados')
            .select(`
                *,
                clientes:cliente_id ( nome_cliente ),
                unidades:unidade_id ( nome_unidade ),
                usuarios:usuario_id ( id, nome, nivel_hierarquico, whatsapp ),
                ativos:ativo_id ( id, codigo_tombamento, modelo, historico ),
                tecnicos:tecnico_id ( id, nome )
            `)
            .eq('provedor_ti_id', session.provedor_ti_id)
            .order('created_at', { ascending: false });

        // Apply filters
        if (kanbanFilterCliente !== 'all') {
            query = query.eq('cliente_id', kanbanFilterCliente);
        }
        if (kanbanFilterFilial !== 'all') {
            query = query.eq('unidade_id', kanbanFilterFilial);
        }

        const { data: chamados, error } = await query;
        if (error) throw error;

        allChamadosCache = chamados || [];
        renderKanbanFromCache();

        // Load tasks column for technicians
        const tasksCol = document.getElementById('kanban-tasks-column');
        if (tasksCol && session.perfil === 'tecnico') {
            tasksCol.innerHTML = await renderTarefasTecnicoColumn();
        }

    } catch (err) {
        board.innerHTML = `
            <div class="${kanbanViewMode === 'kanban' ? 'col-span-full' : ''} text-center py-12">
                <p class="text-red-400">Erro ao carregar chamados: ${err.message}</p>
                <button onclick="loadKanbanData()" class="btn-ghost px-4 py-2 rounded-xl text-sm mt-4">Tentar novamente</button>
            </div>
        `;
    }
}

function renderKanbanFromCache() {
    const session = getSession();
    const board = document.getElementById('kanban-board');

    // Apply search filter
    let chamados = allChamadosCache;
    if (kanbanSearchTerm) {
        chamados = chamados.filter(c =>
            (c.descricao || '').toLowerCase().includes(kanbanSearchTerm) ||
            (c.usuarios?.nome || '').toLowerCase().includes(kanbanSearchTerm) ||
            (c.clientes?.nome_cliente || '').toLowerCase().includes(kanbanSearchTerm) ||
            String(c.id).includes(kanbanSearchTerm)
        );
    }

    if (kanbanViewMode === 'kanban') {
        board.className = 'flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4';
        renderKanbanColumns(board, chamados, session);
    } else {
        board.className = 'flex-1';
        renderKanbanList(board, chamados, session);
    }
}

function renderKanbanColumns(board, chamados, session) {
    const colunas = {
        'Novo': [],
        'Em Atendimento': [],
        'Pendente': [],
        'Resolvido': [],
    };

    chamados.forEach(c => {
        if (colunas[c.status]) colunas[c.status].push(c);
    });

    board.innerHTML = Object.entries(colunas).map(([status, items]) => `
        <div class="bg-eva-dark/50 rounded-2xl ${getKanbanColClass(status)} overflow-hidden"
             ondragover="event.preventDefault(); this.classList.add('bg-slate-800/40');"
             ondragleave="this.classList.remove('bg-slate-800/40');"
             ondrop="this.classList.remove('bg-slate-800/40'); handleKanbanCardDrop(event, '${status}', '${session.id}')">
            <div class="p-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-white">${status}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status)}">${items.length}</span>
                </div>
            </div>
            <div class="p-3 pt-0 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                ${items.length === 0 ? `
                    <div class="empty-state py-8">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p class="text-xs">Nenhum chamado</p>
                    </div>
                ` : items.map(c => renderKanbanCard(c, session)).join('')}
            </div>
        </div>
    `).join('');
}

function handleKanbanCardDragStart(event, chamadoId) {
    event.dataTransfer.setData('text/plain', chamadoId);
}

async function handleKanbanCardDrop(event, targetStatus, tecnicoId) {
    event.preventDefault();
    const chamadoIdStr = event.dataTransfer.getData('text/plain');
    if (!chamadoIdStr) return;
    const chamadoId = parseInt(chamadoIdStr, 10);
    if (isNaN(chamadoId)) return;

    // Encontra o chamado no cache para ver seu status anterior
    const chamado = allChamadosCache.find(c => c.id === chamadoId);
    if (!chamado) return;
    if (chamado.status === targetStatus) return;

    if (targetStatus === 'Resolvido') {
        openResolucaoModal(chamadoId, tecnicoId);
        return;
    }

    // Move visualmente local antes para UX fluida
    const oldStatus = chamado.status;
    chamado.status = targetStatus;
    if (targetStatus === 'Em Atendimento') {
        chamado.tecnico_id = tecnicoId;
    }
    renderKanbanFromCache();

    try {
        const updateData = { status: targetStatus };
        if (targetStatus === 'Em Atendimento') {
            updateData.tecnico_id = tecnicoId;
        }

        const { error } = await db
            .from('chamados')
            .update(updateData)
            .eq('id', chamadoId);

        if (error) throw error;
        showToast(`Chamado #${chamadoId} movido para ${targetStatus}`, 'success');
        await loadKanbanData();
    } catch (err) {
        // Reverte em caso de falha
        chamado.status = oldStatus;
        renderKanbanFromCache();
        showToast(`Erro ao mover chamado: ${err.message}`, 'error');
    }
}

function renderKanbanList(board, chamados, session) {
    // Apply list status filter if active
    let filtered = chamados;
    if (kanbanListFilterStatus) {
        filtered = chamados.filter(c => c.status === kanbanListFilterStatus);
    }

    const statusCounts = {
        'Novo': chamados.filter(c => c.status === 'Novo').length,
        'Em Atendimento': chamados.filter(c => c.status === 'Em Atendimento').length,
        'Pendente': chamados.filter(c => c.status === 'Pendente').length,
        'Resolvido': chamados.filter(c => c.status === 'Resolvido').length,
    };

    board.innerHTML = `
        <div class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden kanban-list-view">
            <!-- Filter Header -->
            <div class="flex gap-3 p-4 border-b border-eva-border bg-slate-800/30">
                <button onclick="setListFilter(null)" class="task-filter-btn ${!kanbanListFilterStatus ? 'active' : ''}">Todos (${chamados.length})</button>
                ${Object.entries(statusCounts).map(([status, count]) => `
                    <button onclick="setListFilter('${status}')" class="task-filter-btn ${kanbanListFilterStatus === status ? 'active' : ''}">${status} (${count})</button>
                `).join('')}
            </div>
            <!-- Table -->
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left bg-slate-800/20">
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">#</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Descrição</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Solicitante</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Cliente / Unidade</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Técnico</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Data</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `
                            <tr><td colspan="8" class="py-8 text-center text-slate-500 text-sm">Nenhum chamado encontrado</td></tr>
                        ` : filtered.map(c => {
                            const isVip = c.usuarios && (c.usuarios.nivel_hierarquico === 'gestor' || c.usuarios.nivel_hierarquico === 'diretor');
                            const acoes = getStatusActions(c.status, c.id, session.id);
                            return `
                                <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer" onclick="openChamadoModal(${c.id})">
                                    <td class="py-2.5 px-4 text-sm text-slate-400 font-mono">${c.id}</td>
                                    <td class="py-2.5 px-4 text-sm text-slate-200 max-w-[250px] truncate">
                                        ${isVip ? '<span class="vip-badge mr-1">VIP</span>' : ''}
                                        ${c.descricao}
                                    </td>
                                    <td class="py-2.5 px-4 text-sm text-slate-300">${c.usuarios?.nome || '—'}</td>
                                    <td class="py-2.5 px-4 text-xs text-slate-400">${c.clientes?.nome_cliente || '—'} / ${c.unidades?.nome_unidade || '—'}</td>
                                    <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(c.status)}">${c.status}</span></td>
                                    <td class="py-2.5 px-4 text-sm text-slate-400">${c.tecnicos?.nome || '—'}</td>
                                    <td class="py-2.5 px-4 text-xs text-slate-500">${formatDate(c.created_at)}</td>
                                    <td class="py-2.5 px-4 text-right" onclick="event.stopPropagation()">
                                        <div class="flex justify-end gap-1">${acoes}</div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3 border-t border-eva-border text-xs text-slate-500">${filtered.length} chamado(s)</div>
        </div>
    `;
}

function setListFilter(status) {
    kanbanListFilterStatus = status;
    renderKanbanFromCache();
}

function renderKanbanCard(chamado, session) {
    const isVip = chamado.usuarios && 
        (chamado.usuarios.nivel_hierarquico === 'gestor' || chamado.usuarios.nivel_hierarquico === 'diretor');
    
    const cardClass = chamado.status === 'Resolvido' ? 'kanban-card-resolved opacity-75' : (isVip ? 'vip-card border-l-4 border-l-red-500' : 'border border-eva-border');
    const nomeUsuario = chamado.usuarios?.nome || 'Usuário desconhecido';

    return `
        <div class="kanban-card bg-eva-card rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all ${cardClass}" 
             draggable="true" 
             ondragstart="handleKanbanCardDragStart(event, ${chamado.id})"
             onclick="openChamadoModal(${chamado.id})">
            <!-- Header -->
            <div class="flex items-start justify-between mb-2">
                <span class="text-xs text-eva-muted font-mono">#${chamado.id}</span>
                <div class="flex items-center gap-1.5">
                    ${isVip ? '<span class="vip-badge text-[10px] py-0.5 px-1.5 bg-red-500/20 text-red-400 rounded border border-red-500/20">🚨 VIP</span>' : ''}
                </div>
            </div>

            <!-- Descrição cortada em 3 linhas -->
            <p class="text-sm text-slate-200 mb-3 leading-relaxed line-clamp-3 select-none">${chamado.descricao}</p>

            <!-- Solicitante em destaque discreto -->
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[10px] text-white font-semibold flex-shrink-0">
                    ${nomeUsuario.charAt(0)}
                </div>
                <span class="text-xs text-white font-medium truncate">${nomeUsuario}</span>
            </div>
        </div>
    `;
}

function getStatusActions(currentStatus, chamadoId, tecnicoId) {
    const transitions = {
        'Novo': [
            { target: 'Em Atendimento', label: 'Iniciar', color: 'amber' },
        ],
        'Em Atendimento': [
            { target: 'Pendente', label: 'Aguardar', color: 'orange' },
            { target: 'Resolvido', label: 'Resolver', color: 'emerald', modal: true },
        ],
        'Pendente': [
            { target: 'Em Atendimento', label: 'Retomar', color: 'amber' },
            { target: 'Resolvido', label: 'Resolver', color: 'emerald', modal: true },
        ],
        'Resolvido': [
            { target: 'Novo', label: '🔄 Reabrir', color: 'blue' },
        ],
    };

    const actions = transitions[currentStatus] || [];
    return actions.map(a => `
        <button 
            onclick="${a.modal ? `openResolucaoModal(${chamadoId}, '${tecnicoId}')` : `updateChamadoStatus(${chamadoId}, '${a.target}', '${tecnicoId}')`}" 
            class="flex-1 text-xs py-1.5 px-3 rounded-lg bg-${a.color}-500/15 text-${a.color}-400 hover:bg-${a.color}-500/25 border border-${a.color}-500/20 transition-all duration-200 font-medium"
        >
            ${a.label}
        </button>
    `).join('');
}

/** Modal de Resolução */
function openResolucaoModal(chamadoId, tecnicoId) {
    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">✅ Resolver Chamado #${chamadoId}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleResolverChamado(event, ${chamadoId}, '${tecnicoId}')" class="p-6 space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Detalhe as ações realizadas <span class="text-red-400">*</span></label>
                <textarea id="resolucao-texto" required rows="4" placeholder="Ex: Substituição do HD, reinstalação do Windows, backup restaurado..." class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"></textarea>
            </div>
            <div class="flex gap-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">Confirmar Resolução</button>
            </div>
        </form>
    `);
}

async function handleResolverChamado(event, chamadoId, tecnicoId) {
    event.preventDefault();
    const resolucao = document.getElementById('resolucao-texto').value.trim();
    if (!resolucao) { showToast('Descreva as ações realizadas.', 'warning'); return; }

    try {
        const { error } = await db.from('chamados')
            .update({ status: 'Resolvido', tecnico_id: tecnicoId, resolucao: resolucao })
            .eq('id', chamadoId);

        if (error) throw error;
        showToast(`Chamado #${chamadoId} resolvido! ✅`, 'success');
        closeModal();
        await loadKanbanData();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

/** Atualiza o status de um chamado */
async function updateChamadoStatus(chamadoId, newStatus, tecnicoId) {
    try {
        const updateData = { status: newStatus };
        if (newStatus === 'Em Atendimento') {
            updateData.tecnico_id = tecnicoId;
        }

        const { error } = await db
            .from('chamados')
            .update(updateData)
            .eq('id', chamadoId);

        if (error) throw error;

        showToast(`Chamado #${chamadoId} → ${newStatus}`, 'success');
        closeModal(); // Caso esteja com o modal de detalhes aberto, fecha
        await loadKanbanData();
    } catch (err) {
        showToast(`Erro ao atualizar: ${err.message}`, 'error');
    }
}

/** Abre modal com detalhes do chamado */
async function openChamadoModal(chamadoId) {
    try {
        const { data: chamado, error } = await db
            .from('chamados')
            .select(`
                *,
                clientes:cliente_id ( nome_cliente ),
                usuarios:usuario_id ( id, nome, nivel_hierarquico, whatsapp, username ),
                ativos:ativo_id ( id, codigo_tombamento, modelo, historico ),
                tecnicos:tecnico_id ( id, nome ),
                unidades:unidade_id ( nome_unidade )
            `)
            .eq('id', chamadoId)
            .single();

        if (error) throw error;

        const session = getSession();
        const isVip = chamado.usuarios && 
            (chamado.usuarios.nivel_hierarquico === 'gestor' || chamado.usuarios.nivel_hierarquico === 'diretor');

        // Botões de ação dentro do modal de detalhes (se o usuário for técnico/gestor)
        let botoesAcao = '';
        if (session.tipo === 'tecnico' || session.perfil === 'gestor_ti') {
            const acoesHtml = getStatusActions(chamado.status, chamado.id, session.id);
            botoesAcao = `
                <div class="mt-6 pt-6 border-t border-eva-border">
                    <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-3">Ações Disponíveis</h4>
                    <div class="flex flex-wrap gap-3">
                        ${acoesHtml || ''}
                        <button onclick="openSolicitarAutorizacaoModal(${chamado.id})" class="flex-1 text-xs py-1.5 px-3 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20 transition-all duration-200 font-medium">
                            🔒 Solicitar Autorização
                        </button>
                    </div>
                </div>
            `;
        }

        openModal(`
            <!-- Header do Modal -->
            <div class="p-6 border-b border-eva-border">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <h3 class="text-lg font-bold text-white">Chamado #${chamado.id}</h3>
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(chamado.status)}">${chamado.status}</span>
                        ${isVip ? '<span class="vip-badge">🚨 VIP</span>' : ''}
                    </div>
                    <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Corpo do Modal -->
            <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <!-- Descrição do Problema -->
                <div>
                    <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Descrição do Problema</h4>
                    <p class="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-4 rounded-xl">${chamado.descricao}</p>
                </div>

                <!-- Timeline / Chat de Interações -->
                <div class="mt-6 pt-6 border-t border-slate-800">
                    <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-3">💬 Conversa e Histórico de Interações</h4>
                    <div id="chat-timeline-container" class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-4 max-h-[390px] overflow-y-auto mb-4 scrollbar-thin">
                        <div class="flex items-center justify-center py-6"><div class="spinner"></div></div>
                    </div>
                    
                    <!-- Área do Input do Chat -->
                    <div id="chat-input-area" class="space-y-2"></div>
                </div>

                <!-- Grid de Informações -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Solicitante</h4>
                        <p class="text-sm text-white font-medium">${chamado.usuarios?.nome || '—'}</p>
                        <p class="text-xs text-slate-400 mt-1">@${chamado.usuarios?.username || '—'}</p>
                        <p class="text-xs text-slate-400">${chamado.usuarios?.nivel_hierarquico || '—'}</p>
                        ${chamado.usuarios?.whatsapp ? `<p class="text-xs text-emerald-400 mt-1">📱 ${chamado.usuarios.whatsapp}</p>` : ''}
                    </div>
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Cliente / Unidade</h4>
                        <p class="text-sm text-white font-medium">${chamado.clientes?.nome_cliente || '—'}</p>
                        <p class="text-xs text-slate-400 mt-1">${chamado.unidades?.nome_unidade || '—'}</p>
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2 mt-3">Técnico</h4>
                        <p class="text-sm text-white">${chamado.tecnicos?.nome || 'Não atribuído'}</p>
                    </div>
                </div>

                <!-- Equipamento -->
                ${chamado.ativos ? `
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Equipamento</h4>
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm text-white font-medium">${chamado.ativos.modelo || 'Modelo não informado'}</p>
                                <p class="text-xs text-slate-400 font-mono">${chamado.ativos.codigo_tombamento}</p>
                            </div>
                        </div>
                        ${chamado.ativos.historico ? `
                            <div class="mt-3 pt-3 border-t border-slate-700">
                                <h5 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Histórico de Manutenções</h5>
                                <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">${chamado.ativos.historico}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Datas -->
                <div class="flex items-center gap-6 text-xs text-slate-400">
                    <span>📅 Criado: ${formatDate(chamado.created_at)}</span>
                    <span>🔄 Atualizado: ${formatDate(chamado.updated_at)}</span>
                </div>

                <!-- Ações Fixas no Modal -->
                ${botoesAcao}
            </div>
        `);

        // Marca menção do gestor como lida se for o gestor logado abrindo o chamado
        if (chamado.mencao_gestor_id === session.id && !chamado.mencao_gestor_lida) {
            await db.from('chamados')
                .update({ mencao_gestor_lida: true })
                .eq('id', chamadoId);
            
            // Recarrega listagens se houver
            if (window.location.hash === '#/portal' && typeof loadPortalTeamTickets === 'function') {
                loadPortalTeamTickets();
            }
        }

        // Carrega Timeline e Input de Chat
        await loadChatTimelineAndInput(chamado);

    } catch (err) {
        showToast(`Erro ao abrir detalhes: ${err.message}`, 'error');
    }
}

// ----------------------------------------------------------------------
// Módulo de Comunicação, Timeline e Autorizações (Evaflow)
// ----------------------------------------------------------------------

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function readAsBase64(fileOrBlob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(fileOrBlob);
    });
}

async function loadChatTimelineAndInput(chamado) {
    const chatContainer = document.getElementById('chat-timeline-container');
    const inputArea = document.getElementById('chat-input-area');
    if (!chatContainer || !inputArea) return;

    const session = getSession();
    const isResolvido = chamado.status === 'Resolvido';

    // 1. Atualizar Timeline
    await refreshChatTimeline(chamado.id, chatContainer);

    // 2. Renderizar Caixa de Digitação
    if (isResolvido) {
        inputArea.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-pulse">
                <span class="font-medium flex items-center gap-1.5">
                    🔒 Chamado resolvido. Use o botão 'Reabrir' para continuar a conversa.
                </span>
                <button onclick="reabrirChamado(${chamado.id})" class="btn-primary text-xs py-1.5 px-3 rounded-lg flex-shrink-0">
                    🔄 Reabrir Chamado
                </button>
            </div>
        `;
    } else {
        const isColaborador = session.tipo === 'usuario';
        
        inputArea.innerHTML = `
            <div class="flex items-center gap-2 relative">
                <!-- Drop de arquivos visual overlay -->
                <div id="chat-drag-overlay" class="hidden absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-center text-xs text-emerald-400 font-semibold pointer-events-none transition-all duration-200 z-10">
                    📂 Solte o arquivo aqui para fazer o upload
                </div>

                <div class="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-inner">
                    <input type="text" id="chat-mensagem-input" placeholder="Escreva uma mensagem..." class="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"/>
                    
                    <!-- Botões de Ação Multimídia -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button id="chat-mic-btn" onclick="toggleAudioRecording(${chamado.id})" class="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-emerald-600 transition-all" title="Gravar Áudio">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                            </svg>
                        </button>
                        <button onclick="document.getElementById('chat-file-input').click()" class="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-emerald-600 transition-all" title="Enviar Imagem">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                            </svg>
                        </button>
                        <input type="file" id="chat-file-input" onchange="handleChatFileUpload(event, ${chamado.id})" class="hidden" accept="image/*"/>
                    </div>
                </div>

                <button onclick="enviarMensagemChat(${chamado.id})" class="btn-primary text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-1 flex-shrink-0">
                    Enviar
                </button>

                ${isColaborador ? `
                    <button onclick="marcarGestorAtalho(${chamado.id})" class="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 text-xs font-semibold py-2.5 px-3 rounded-xl flex-shrink-0" title="Marcar meu Gestor">
                        📌 Marcar Gestor
                    </button>
                ` : ''}
            </div>
            
            <div id="mencao-popover" class="hidden absolute bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-2xl z-50 text-xs text-slate-300 w-48"></div>
        `;

        setupChatDragAndDrop(chamado.id);
        setupMencaoAutocomplete(chamado.id);

        // Mostra/oculta headers de data sticky ao rolar (Estilo WhatsApp)
        let scrollTimeout = null;
        chatContainer.addEventListener('scroll', () => {
            const headers = chatContainer.querySelectorAll('.chat-day-header');
            headers.forEach(h => {
                h.classList.remove('opacity-0', 'pointer-events-none');
                h.classList.add('opacity-100');
            });
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                headers.forEach(h => {
                    h.classList.remove('opacity-100');
                    h.classList.add('opacity-0', 'pointer-events-none');
                });
            }, 2500); // 2.5s após parar a rolagem
        });
    }
}

async function refreshChatTimeline(chamadoId, container) {
    try {
        const { data: interacoes, error } = await db.from('chamado_interacoes')
            .select('*')
            .eq('chamado_id', chamadoId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!interacoes || interacoes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6 text-xs text-slate-500 italic">
                    Nenhuma mensagem registrada. Inicie a conversa abaixo!
                </div>
            `;
            return;
        }

        const formatTime = (isoString) => {
            if (!isoString) return '';
            const date = new Date(isoString);
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        };

        const getDayLabel = (isoString) => {
            const d = new Date(isoString);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            
            if (d.toDateString() === today.toDateString()) return 'Hoje';
            if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
            return d.toLocaleDateString('pt-BR');
        };

        // Agrupar interações por dia
        const groups = {};
        interacoes.forEach(i => {
            const day = getDayLabel(i.created_at);
            if (!groups[day]) groups[day] = [];
            groups[day].push(i);
        });

        let html = '';
        const session = getSession();

        for (const [day, items] of Object.entries(groups)) {
            // Header do dia sticky
            html += `
                <div class="sticky top-2 z-10 flex justify-center my-2 pointer-events-none chat-day-header transition-opacity duration-300 opacity-0">
                    <span class="bg-slate-200/90 border border-slate-300/80 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm backdrop-blur">
                        ${day}
                    </span>
                </div>
            `;

            items.forEach(i => {
                const timeStr = formatTime(i.created_at);
                if (i.autor_tipo === 'sistema') {
                    html += `
                        <div class="text-center py-1.5">
                            <span class="inline-block bg-slate-200/60 border border-slate-300/40 text-[10px] text-slate-600 font-medium px-2.5 py-0.5 rounded-full">
                                ℹ️ ${i.mensagem} <span class="text-[9px] opacity-75 ml-1">${timeStr}</span>
                            </span>
                        </div>
                    `;
                    return;
                }

                const isMe = i.autor_id === session.id;
                const iniciais = i.autor_nome ? i.autor_nome.substring(0, 2).toUpperCase() : '??';

                if (isMe) {
                    html += `
                        <div class="flex items-end gap-2 justify-end mb-2">
                            <div class="flex flex-col gap-0.5 max-w-[70%]">
                                <span class="text-[9px] text-slate-500 text-right">${i.autor_nome}</span>
                                <div class="bg-emerald-600 text-white rounded-2xl rounded-tr-none px-3.5 py-2 text-sm shadow-sm relative flex flex-col gap-1">
                                    <div class="leading-relaxed break-words">${i.mensagem}</div>
                                    <span class="text-[9px] text-emerald-200 self-end select-none">${timeStr}</span>
                                </div>
                            </div>
                            <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] select-none shadow-sm flex-shrink-0 mb-0.5">
                                ${iniciais}
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="flex items-end gap-2 justify-start mb-2">
                            <div class="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[10px] select-none shadow-sm flex-shrink-0 mb-0.5">
                                ${iniciais}
                            </div>
                            <div class="flex flex-col gap-0.5 max-w-[70%]">
                                <span class="text-[9px] text-slate-500">${i.autor_nome}</span>
                                <div class="bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-none px-3.5 py-2 text-sm shadow-sm relative flex flex-col gap-1">
                                    <div class="leading-relaxed break-words">${i.mensagem}</div>
                                    <span class="text-[9px] text-slate-400 self-end select-none">${timeStr}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="text-red-400 text-xs py-4">Erro ao carregar Timeline.</p>`;
    }
}

async function enviarMensagemChat(chamadoId) {
    const input = document.getElementById('chat-mensagem-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    const session = getSession();

    try {
        const { error: insertError } = await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: session.tipo === 'tecnico' ? 'tecnico' : 'usuario',
            autor_id: session.id,
            autor_nome: session.nome,
            mensagem: msg,
            tipo_evento: 'mensagem'
        }]);

        if (insertError) throw insertError;

        // Trata menção ao gestor na digitação livre
        let gestorId = session.gestor_id;
        if (!gestorId && session.tipo === 'usuario') {
            const { data: me } = await db.from('usuarios').select('gestor_id').eq('id', session.id).single();
            if (me) gestorId = me.gestor_id;
        }

        if (gestorId) {
            const gestor = await getGestorInfo(gestorId);
            if (gestor && msg.includes(`@${gestor.nome}`)) {
                await db.from('chamados')
                    .update({ mencao_gestor_id: gestor.id, mencao_gestor_lida: false })
                    .eq('id', chamadoId);
                
                await db.from('chamado_interacoes').insert([{
                    chamado_id: chamadoId,
                    autor_tipo: 'sistema',
                    autor_id: session.id,
                    autor_nome: 'Sistema',
                    mensagem: `📌 @${gestor.nome} foi marcado para acompanhamento por ${session.nome}`,
                    tipo_evento: 'mencao'
                }]);
            }
        }

        input.value = '';
        const chatContainer = document.getElementById('chat-timeline-container');
        if (chatContainer) await refreshChatTimeline(chamadoId, chatContainer);

    } catch (e) {
        console.error(e);
        showToast(`Erro ao enviar mensagem: ${e.message}`, 'error');
    }
}

async function toggleAudioRecording(chamadoId) {
    const micBtn = document.getElementById('chat-mic-btn');
    if (!micBtn) return;

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                console.log("=== Audio onstop disparado ===");
                // Spinner mais simples, minimalista e elegante
                micBtn.innerHTML = `<svg class="w-4 h-4 text-emerald-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10" stroke="rgba(16,185,129,0.15)"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-linecap="round"/></svg>`;
                try {
                    console.log("Tamanho do audioChunks:", audioChunks.length);
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log("Blob criado:", audioBlob.size, "bytes");
                    console.log("Chamando uploadAudioBlobAndSend...");
                    await uploadAudioBlobAndSend(audioBlob, chamadoId);
                    console.log("uploadAudioBlobAndSend concluído.");
                } catch (err) {
                    console.error("Erro ao processar envio de áudio:", err);
                } finally {
                    console.log("Restaurando estado do botão de microfone...");
                    // Garante que o estado do botão sempre retorna ao ocioso
                    micBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>`;
                    isRecording = false;
                    console.log("Processo de gravação finalizado.");
                }
            };

            mediaRecorder.start();
            isRecording = true;
            micBtn.innerHTML = `<svg class="w-4 h-4 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>`;
            micBtn.title = 'Parar Gravação';
            showToast('Gravando áudio...', 'info');
        } catch (e) {
            console.error(e);
            showToast('Erro ao acessar o microfone.', 'error');
        }
    } else {
        console.log("Parando gravação. isRecording era true.");
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
}

async function uploadAudioBlobAndSend(blob, chamadoId) {
    console.log("uploadAudioBlobAndSend iniciado...");
    const session = getSession();
    try {
        const fileName = `${chamadoId}_${Date.now()}.webm`;
        let audioSrc = '';
        
        try {
            console.log("Tentando enviar áudio para o Storage Supabase:", fileName);
            const { data, error } = await db.storage.from('chamados_midia').upload(fileName, blob, {
                contentType: 'audio/webm',
                cacheControl: '3600',
                upsert: false
            });
            if (error) throw error;
            console.log("Upload Storage OK. Obtendo URL pública...");
            const { data: publicUrlData } = db.storage.from('chamados_midia').getPublicUrl(fileName);
            audioSrc = publicUrlData.publicUrl;
            console.log("URL pública obtida:", audioSrc);
        } catch (storageError) {
            console.warn('Falha no Storage. Usando fallback Base64 local:', storageError);
            audioSrc = await readAsBase64(blob);
        }

        const audioHtml = `<audio controls src="${audioSrc}" class="max-w-full rounded-lg"></audio>`;
        
        console.log("Inserindo registro na tabela chamado_interacoes...");
        const { error: insertError } = await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: session.tipo === 'tecnico' ? 'tecnico' : 'usuario',
            autor_id: session.id,
            autor_nome: session.nome,
            mensagem: audioHtml,
            tipo_evento: 'mensagem'
        }]);

        if (insertError) throw insertError;
        console.log("Inserção concluída. Atualizando timeline...");
        
        const chatContainer = document.getElementById('chat-timeline-container');
        if (chatContainer) await refreshChatTimeline(chamadoId, chatContainer);

        showToast('Áudio enviado com sucesso!', 'success');
    } catch (e) {
        console.error("Erro em uploadAudioBlobAndSend:", e);
        showToast(`Erro ao salvar áudio: ${e.message}`, 'error');
    }
}

async function handleChatFileUpload(event, chamadoId) {
    const file = event.target.files[0];
    if (file) {
        await uploadImageAndSend(file, chamadoId);
    }
}

async function uploadImageAndSend(file, chamadoId) {
    const session = getSession();
    try {
        const extension = file.name.split('.').pop();
        const fileName = `${chamadoId}_${Date.now()}.${extension}`;
        let imgSrc = '';

        try {
            const { data, error } = await db.storage.from('chamados_midia').upload(fileName, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });
            if (error) throw error;
            const { data: publicUrlData } = db.storage.from('chamados_midia').getPublicUrl(fileName);
            imgSrc = publicUrlData.publicUrl;
        } catch (storageError) {
            console.warn('Falha no Storage. Usando fallback Base64 local:', storageError);
            imgSrc = await readAsBase64(file);
        }

        const imgHtml = `<img src="${imgSrc}" class="max-w-xs rounded-xl shadow-md cursor-zoom-in hover:opacity-90 transition-opacity chat-img-attachment"/>`;

        const { error: insertError } = await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: session.tipo === 'tecnico' ? 'tecnico' : 'usuario',
            autor_id: session.id,
            autor_nome: session.nome,
            mensagem: imgHtml,
            tipo_evento: 'mensagem'
        }]);

        if (insertError) throw insertError;

        const chatContainer = document.getElementById('chat-timeline-container');
        if (chatContainer) await refreshChatTimeline(chamadoId, chatContainer);

        showToast('Imagem enviada com sucesso!', 'success');
    } catch (e) {
        console.error(e);
        showToast(`Erro ao enviar imagem: ${e.message}`, 'error');
    }
}

function setupChatDragAndDrop(chamadoId) {
    const container = document.getElementById('chat-timeline-container');
    const overlay = document.getElementById('chat-drag-overlay');
    if (!container || !overlay) return;

    container.addEventListener('dragenter', e => {
        overlay.classList.remove('hidden');
    });

    overlay.addEventListener('dragleave', e => {
        overlay.classList.add('hidden');
    });

    overlay.addEventListener('dragover', e => {
        e.preventDefault();
    });

    overlay.addEventListener('drop', async e => {
        e.preventDefault();
        overlay.classList.add('hidden');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                await uploadImageAndSend(file, chamadoId);
            } else {
                showToast('Apenas arquivos de imagem são aceitos.', 'warning');
            }
        }
    });
}

async function setupMencaoAutocomplete(chamadoId) {
    const input = document.getElementById('chat-mensagem-input');
    const popover = document.getElementById('mencao-popover');
    if (!input || !popover) return;

    const session = getSession();
    let gestorId = session.gestor_id;
    if (!gestorId && session.tipo === 'usuario') {
        const { data: me } = await db.from('usuarios').select('gestor_id').eq('id', session.id).single();
        if (me) gestorId = me.gestor_id;
    }

    if (!gestorId) return;
    const gestor = await getGestorInfo(gestorId);
    if (!gestor) return;

    input.addEventListener('keyup', e => {
        const value = input.value;
        const index = value.lastIndexOf('@');
        
        if (index !== -1 && index === value.length - 1) {
            const rect = input.getBoundingClientRect();
            popover.style.left = `${rect.left}px`;
            popover.style.top = `${rect.top - 45}px`;
            popover.classList.remove('hidden');
            popover.innerHTML = `
                <div onclick="applyMencaoAtalho('${gestor.nome}')" class="p-2 hover:bg-slate-800 rounded cursor-pointer font-medium text-emerald-400">
                    👤 @${gestor.nome}
                </div>
            `;
        } else if (!value.includes('@')) {
            popover.classList.add('hidden');
        }
    });
}

function applyMencaoAtalho(nomeGestor) {
    const input = document.getElementById('chat-mensagem-input');
    const popover = document.getElementById('mencao-popover');
    if (!input) return;
    
    const index = input.value.lastIndexOf('@');
    if (index !== -1) {
        input.value = input.value.substring(0, index) + `@${nomeGestor} `;
    } else {
        input.value += `@${nomeGestor} `;
    }
    input.focus();
    if (popover) popover.classList.add('hidden');
}

async function marcarGestorAtalho(chamadoId) {
    const session = getSession();
    let gestorId = session.gestor_id;
    if (!gestorId && session.tipo === 'usuario') {
        const { data: me } = await db.from('usuarios').select('gestor_id').eq('id', session.id).single();
        if (me) gestorId = me.gestor_id;
    }

    if (!gestorId) {
        showToast('Nenhum gestor vinculado à sua conta.', 'warning');
        return;
    }

    const gestor = await getGestorInfo(gestorId);
    if (!gestor) return;

    try {
        const { error: updateError } = await db.from('chamados')
            .update({ mencao_gestor_id: gestor.id, mencao_gestor_lida: false })
            .eq('id', chamadoId);
        
        if (updateError) throw updateError;

        await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: 'sistema',
            autor_id: session.id,
            autor_nome: 'Sistema',
            mensagem: `📌 @${gestor.nome} foi marcado para acompanhamento por ${session.nome}`,
            tipo_evento: 'mencao'
        }]);

        const chatContainer = document.getElementById('chat-timeline-container');
        if (chatContainer) await refreshChatTimeline(chamadoId, chatContainer);

        showToast('Gestor marcado no chamado!', 'success');
    } catch (e) {
        console.error(e);
        showToast(`Erro ao marcar gestor: ${e.message}`, 'error');
    }
}

async function getGestorInfo(gestorId) {
    if (!gestorId) return null;
    const { data } = await db.from('usuarios').select('id, nome').eq('id', gestorId).single();
    return data;
}

async function reabrirChamado(chamadoId) {
    const session = getSession();
    try {
        const { error } = await db.from('chamados')
            .update({ status: 'Novo' })
            .eq('id', chamadoId);
        
        if (error) throw error;

        await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: session.tipo === 'tecnico' ? 'tecnico' : 'usuario',
            autor_id: session.id,
            autor_nome: session.nome,
            mensagem: '🔄 Chamado reaberto pelo usuário.',
            tipo_evento: 'reabertura'
        }]);

        showToast('Chamado reaberto!', 'success');
        
        if (location.hash === '#/portal' && typeof loadPortalTickets === 'function') {
            await loadPortalTickets();
        } else if (typeof loadKanbanData === 'function') {
            await loadKanbanData();
        }

        await openChamadoModal(chamadoId);
    } catch (e) {
        console.error(e);
        showToast(`Erro ao reabrir: ${e.message}`, 'error');
    }
}

function openSolicitarAutorizacaoModal(chamadoId) {
    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">🔒 Solicitar Autorização</h3>
                <button onclick="closeModal(); openChamadoModal(${chamadoId});" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveSolicitarAutorizacao(event, ${chamadoId})" class="p-6 space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Quem deve aprovar? <span class="text-red-400">*</span></label>
                <select id="solicit-aprovador" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm">
                    <option value="Pendente_Gestor_Cliente">👤 Gestor do Colaborador (Cliente)</option>
                    <option value="Pendente_Gestor_TI">🛡️ Gestor de TIC (TI)</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Justificativa da Solicitação <span class="text-red-400">*</span></label>
                <textarea id="solicit-mensagem" required rows="4" placeholder="Descreva a necessidade de autorização..." class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all resize-none text-sm"></textarea>
            </div>
            <div class="flex gap-3">
                <button type="button" onclick="closeModal(); openChamadoModal(${chamadoId});" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Voltar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">Enviar Solicitação</button>
            </div>
        </form>
    `);
}

async function handleSaveSolicitarAutorizacao(event, chamadoId) {
    event.preventDefault();
    const aprovadorType = document.getElementById('solicit-aprovador').value;
    const justificativa = document.getElementById('solicit-mensagem').value.trim();
    const session = getSession();

    try {
        const { error } = await db.from('chamados')
            .update({ 
                autorizacao_status: aprovadorType, 
                autorizacao_mensagem: justificativa 
            })
            .eq('id', chamadoId);
        
        if (error) throw error;

        const roleName = aprovadorType === 'Pendente_Gestor_Cliente' ? 'Gestor do Cliente' : 'Gestor de TIC';
        await db.from('chamado_interacoes').insert([{
            chamado_id: chamadoId,
            autor_tipo: 'sistema',
            autor_id: session.id,
            autor_nome: 'Sistema',
            mensagem: `🔒 Autorização solicitada para o ${roleName}. Justificativa: ${justificativa}`,
            tipo_evento: 'autorizacao_pendente'
        }]);

        showToast('Solicitação de autorização enviada!', 'success');
        closeModal();
        await loadKanbanData();
    } catch (e) {
        console.error(e);
        showToast(`Erro ao enviar solicitação: ${e.message}`, 'error');
    }
}

// Interceptador global para abrir imagens do chat no PhotoSwipe (Estilo WhatsApp)
document.addEventListener('click', async (event) => {
    const img = event.target.closest('#chat-timeline-container img, img.chat-img-attachment');
    if (!img) return;

    // Cancela o redirecionamento ou window.open inline de mensagens antigas
    event.preventDefault();
    event.stopImmediatePropagation();

    const imgSrc = img.getAttribute('src');
    if (!imgSrc) return;

    try {
        // Carrega dinamicamente o PhotoSwipe 5
        const PhotoSwipeModule = await import('https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.4.4/photoswipe.esm.min.js');
        const PhotoSwipe = PhotoSwipeModule.default;

        // Obtém as dimensões naturais da imagem ou fallback
        const width = img.naturalWidth || 1200;
        const height = img.naturalHeight || 900;

        const options = {
            dataSource: [
                {
                    src: imgSrc,
                    width: width,
                    height: height,
                    alt: 'Imagem do chat'
                }
            ],
            showHideAnimationType: 'zoom',
            getThumbBoundsFn: () => {
                const rect = img.getBoundingClientRect();
                return {
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY,
                    w: rect.width
                };
            }
        };

        const pswp = new PhotoSwipe(options);
        pswp.init();
    } catch (err) {
        console.error('Erro ao abrir imagem com PhotoSwipe:', err);
        // Fallback simples em caso de falha de carregamento
        window.open(imgSrc, '_blank');
    }
}, { capture: true });

console.log('✅ Módulo Kanban carregado');
