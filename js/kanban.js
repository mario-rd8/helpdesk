// ============================================================
// Tela B — Kanban do Técnico (Visão por Unidade)
// ============================================================
// Funcionalidades:
// - Busca chamados filtrados por unidade_id do técnico
// - 4 colunas: Novo, Em Atendimento, Pendente, Resolvido
// - Cards VIP para gestores/diretores (borda verde + badge)
// - Botões de ação rápida para mudar status
// - Modal de detalhes com dados do ativo e histórico
// ============================================================

async function renderKanban() {
    const session = getSession();
    if (!session) return;

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Kanban de Chamados</h2>
                    <p class="text-eva-muted text-sm mt-1" id="kanban-subtitle">Carregando unidade...</p>
                </div>
                <button onclick="loadKanbanData()" class="btn-ghost px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Atualizar
                </button>
            </div>

            <!-- Kanban Board -->
            <div id="kanban-board" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <!-- Colunas carregadas dinamicamente -->
                <div class="flex items-center justify-center py-20 col-span-full">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    await loadKanbanData();
}

async function loadKanbanData() {
    const session = getSession();
    const board = document.getElementById('kanban-board');
    const subtitle = document.getElementById('kanban-subtitle');

    try {
        // Busca nome da unidade do técnico
        const { data: unidade } = await db
            .from('unidades')
            .select('nome_unidade')
            .eq('id', session.unidade_id)
            .single();

        if (subtitle) {
            subtitle.textContent = `📍 ${unidade?.nome_unidade || 'Unidade não definida'}`;
        }

        // Busca chamados da unidade com dados do usuário e ativo
        const { data: chamados, error } = await db
            .from('chamados')
            .select(`
                *,
                usuarios:usuario_id ( id, nome, nivel_hierarquico, whatsapp ),
                ativos:ativo_id ( id, codigo_tombamento, modelo, historico ),
                tecnicos:tecnico_id ( id, nome )
            `)
            .eq('unidade_id', session.unidade_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Agrupa chamados por status
        const colunas = {
            'Novo': [],
            'Em Atendimento': [],
            'Pendente': [],
            'Resolvido': [],
        };

        (chamados || []).forEach(c => {
            if (colunas[c.status]) {
                colunas[c.status].push(c);
            }
        });

        // Renderiza as 4 colunas
        board.innerHTML = Object.entries(colunas).map(([status, items]) => `
            <div class="bg-eva-dark/50 rounded-2xl ${getKanbanColClass(status)} overflow-hidden">
                <!-- Header da Coluna -->
                <div class="p-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-white">${status}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status)}">${items.length}</span>
                    </div>
                </div>

                <!-- Cards -->
                <div class="p-3 pt-0 space-y-3 min-h-[200px]">
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

    } catch (err) {
        board.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-400">Erro ao carregar chamados: ${err.message}</p>
                <button onclick="loadKanbanData()" class="btn-ghost px-4 py-2 rounded-xl text-sm mt-4">Tentar novamente</button>
            </div>
        `;
    }
}

function renderKanbanCard(chamado, session) {
    const isVip = chamado.usuarios && 
        (chamado.usuarios.nivel_hierarquico === 'gestor' || chamado.usuarios.nivel_hierarquico === 'diretor');
    
    const cardClass = isVip ? 'vip-card' : 'border border-eva-border';
    const nomeUsuario = chamado.usuarios?.nome || 'Usuário desconhecido';
    const modeloAtivo = chamado.ativos?.modelo || 'N/A';
    const descricaoCurta = chamado.descricao.length > 80 
        ? chamado.descricao.substring(0, 80) + '...' 
        : chamado.descricao;

    // Botões de ação rápida baseados no status atual
    const acoes = getStatusActions(chamado.status, chamado.id, session.id);

    return `
        <div class="kanban-card bg-eva-card rounded-xl p-4 ${cardClass}" onclick="openChamadoModal(${chamado.id})">
            <!-- Header do Card -->
            <div class="flex items-start justify-between mb-2">
                <span class="text-xs text-eva-muted font-mono">#${chamado.id}</span>
                <div class="flex items-center gap-1.5">
                    ${isVip ? '<span class="vip-badge">🚨 VIP</span>' : ''}
                </div>
            </div>

            <!-- Descrição -->
            <p class="text-sm text-slate-200 mb-3 leading-relaxed">${descricaoCurta}</p>

            <!-- Info do Solicitante -->
            <div class="flex items-center gap-2 mb-3">
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] text-white font-semibold">
                    ${nomeUsuario.charAt(0)}
                </div>
                <span class="text-xs text-eva-muted truncate">${nomeUsuario}</span>
            </div>

            <!-- Equipamento -->
            ${chamado.ativos ? `
                <div class="flex items-center gap-1.5 mb-3 text-xs text-slate-400">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <span class="truncate">${modeloAtivo}</span>
                </div>
            ` : ''}

            <!-- Data -->
            <div class="text-[11px] text-slate-500 mb-3">${formatDate(chamado.created_at)}</div>

            <!-- Ações Rápidas -->
            <div class="flex gap-2 mt-auto" onclick="event.stopPropagation()">
                ${acoes}
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
            { target: 'Resolvido', label: 'Resolver', color: 'emerald' },
        ],
        'Pendente': [
            { target: 'Em Atendimento', label: 'Retomar', color: 'amber' },
            { target: 'Resolvido', label: 'Resolver', color: 'emerald' },
        ],
        'Resolvido': [],
    };

    const actions = transitions[currentStatus] || [];
    return actions.map(a => `
        <button 
            onclick="updateChamadoStatus(${chamadoId}, '${a.target}', '${tecnicoId}')" 
            class="flex-1 text-xs py-1.5 px-2 rounded-lg bg-${a.color}-500/15 text-${a.color}-400 hover:bg-${a.color}-500/25 border border-${a.color}-500/20 transition-all duration-200 font-medium"
        >
            ${a.label}
        </button>
    `).join('');
}

/** Atualiza o status de um chamado no Supabase */
async function updateChamadoStatus(chamadoId, newStatus, tecnicoId) {
    try {
        const updateData = { status: newStatus };
        // Se está movendo de Novo para Em Atendimento, atribui o técnico
        if (newStatus === 'Em Atendimento') {
            updateData.tecnico_id = tecnicoId;
        }

        const { error } = await db
            .from('chamados')
            .update(updateData)
            .eq('id', chamadoId);

        if (error) throw error;

        showToast(`Chamado #${chamadoId} → ${newStatus}`, 'success');
        await loadKanbanData(); // Recarrega o board
    } catch (err) {
        showToast(`Erro ao atualizar: ${err.message}`, 'error');
    }
}

/** Abre modal com detalhes completos do chamado */
async function openChamadoModal(chamadoId) {
    try {
        const { data: chamado, error } = await db
            .from('chamados')
            .select(`
                *,
                usuarios:usuario_id ( id, nome, nivel_hierarquico, whatsapp, username ),
                ativos:ativo_id ( id, codigo_tombamento, modelo, historico ),
                tecnicos:tecnico_id ( id, nome ),
                unidades:unidade_id ( nome_unidade )
            `)
            .eq('id', chamadoId)
            .single();

        if (error) throw error;

        const isVip = chamado.usuarios && 
            (chamado.usuarios.nivel_hierarquico === 'gestor' || chamado.usuarios.nivel_hierarquico === 'diretor');

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
            <div class="p-6 space-y-6">
                
                <!-- Descrição do Problema -->
                <div>
                    <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Descrição do Problema</h4>
                    <p class="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-4 rounded-xl">${chamado.descricao}</p>
                </div>

                <!-- Grid de Informações -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Solicitante -->
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Solicitante</h4>
                        <p class="text-sm text-white font-medium">${chamado.usuarios?.nome || '—'}</p>
                        <p class="text-xs text-slate-400 mt-1">@${chamado.usuarios?.username || '—'}</p>
                        <p class="text-xs text-slate-400">${chamado.usuarios?.nivel_hierarquico || '—'}</p>
                        ${chamado.usuarios?.whatsapp ? `<p class="text-xs text-emerald-400 mt-1">📱 ${chamado.usuarios.whatsapp}</p>` : ''}
                    </div>

                    <!-- Unidade -->
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-2">Unidade</h4>
                        <p class="text-sm text-white font-medium">${chamado.unidades?.nome_unidade || '—'}</p>
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
            </div>
        `);

    } catch (err) {
        showToast(`Erro ao abrir detalhes: ${err.message}`, 'error');
    }
}

console.log('✅ Módulo Kanban carregado');
