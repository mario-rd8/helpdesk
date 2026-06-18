// ============================================================
// Tela C — Portal do Usuário / Visão Expandida do Gestor
// ============================================================
// Dynamic UI:
// - Colaborador: "Meus Dispositivos" + "Meus Chamados"
// - Gestor/Diretor: Tudo acima + "Equipamentos da Minha Equipe"
// ============================================================

async function renderPortal() {
    const session = getSession();
    if (!session) return;

    const isManager = session.nivel_hierarquico === 'gestor' || session.nivel_hierarquico === 'diretor';

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header com CTA Principal -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Meu Portal</h2>
                    <p class="text-eva-muted text-sm mt-1">
                        Olá, <span class="text-emerald-400 font-medium">${session.nome}</span> 
                        — ${session.nivel_hierarquico === 'colaborador' ? '👤 Colaborador' : session.nivel_hierarquico === 'gestor' ? '📋 Gestor' : '🏢 Diretor'}
                    </p>
                </div>
                <button onclick="openNewTicketModal()" class="btn-primary px-6 py-3.5 rounded-xl text-base font-bold flex items-center gap-3 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                    </svg>
                    Abrir Chamado
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex gap-6 border-b border-eva-border mb-6">
                <button class="tab-button active" onclick="switchPortalTab('devices', this)" id="tab-devices">
                    💻 Meus Dispositivos
                </button>
                <button class="tab-button" onclick="switchPortalTab('tickets', this)" id="tab-tickets">
                    📋 Meus Chamados
                </button>
                ${isManager ? `
                    <button class="tab-button" onclick="switchPortalTab('team', this)" id="tab-team">
                        👥 Equipamentos da Minha Equipe
                    </button>
                ` : ''}
            </div>

            <!-- Conteúdo das Tabs -->
            <div id="portal-tab-content">
                <div class="flex items-center justify-center py-12">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    // Carrega a primeira aba por padrão
    await loadPortalDevices();
}

/** Alterna entre tabs */
async function switchPortalTab(tab, btnElement) {
    // Atualiza estado ativo dos botões
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');

    // Carrega conteúdo
    const tabContent = document.getElementById('portal-tab-content');
    tabContent.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="spinner"></div>
        </div>
    `;

    switch (tab) {
        case 'devices': await loadPortalDevices(); break;
        case 'tickets': await loadPortalTickets(); break;
        case 'team': await loadPortalTeamDevices(); break;
    }
}

/** Aba: Meus Dispositivos */
async function loadPortalDevices() {
    const session = getSession();
    const tabContent = document.getElementById('portal-tab-content');

    try {
        const { data: ativos, error } = await db
            .from('ativos')
            .select('*')
            .eq('usuario_id', session.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!ativos || ativos.length === 0) {
            tabContent.innerHTML = `
                <div class="empty-state py-16">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-sm">Nenhum dispositivo vinculado ao seu perfil.</p>
                </div>
            `;
            return;
        }

        tabContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${ativos.map(a => `
                    <div class="bg-eva-card border border-eva-border rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-200">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-sm font-semibold text-white">${a.modelo || 'Modelo não informado'}</h4>
                                <p class="text-xs text-eva-muted font-mono mt-1">${a.codigo_tombamento}</p>
                                ${a.historico ? `
                                    <p class="text-xs text-slate-400 mt-2 line-clamp-2">${a.historico}</p>
                                ` : `
                                    <p class="text-xs text-slate-500 mt-2 italic">Sem histórico de manutenção</p>
                                `}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        tabContent.innerHTML = `<p class="text-red-400 text-sm">Erro ao carregar dispositivos: ${err.message}</p>`;
    }
}

/** Aba: Meus Chamados */
async function loadPortalTickets() {
    const session = getSession();
    const tabContent = document.getElementById('portal-tab-content');

    try {
        const { data: chamados, error } = await db
            .from('chamados')
            .select(`
                *,
                ativos:ativo_id ( modelo, codigo_tombamento ),
                tecnicos:tecnico_id ( nome )
            `)
            .eq('usuario_id', session.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!chamados || chamados.length === 0) {
            tabContent.innerHTML = `
                <div class="empty-state py-16">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p class="text-sm">Nenhum chamado registrado.</p>
                </div>
            `;
            return;
        }

        tabContent.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left">
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">#</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Descrição</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Equipamento</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Técnico</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chamados.map(c => `
                            <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="openChamadoModal(${c.id})">
                                <td class="py-3 px-4 text-sm text-slate-300 font-mono">${c.id}</td>
                                <td class="py-3 px-4 text-sm text-slate-200 max-w-xs truncate">${c.descricao}</td>
                                <td class="py-3 px-4">
                                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(c.status)}">${c.status}</span>
                                </td>
                                <td class="py-3 px-4 text-sm text-slate-400">${c.ativos?.modelo || '—'}</td>
                                <td class="py-3 px-4 text-sm text-slate-400">${c.tecnicos?.nome || 'Não atribuído'}</td>
                                <td class="py-3 px-4 text-xs text-slate-500">${formatDate(c.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        tabContent.innerHTML = `<p class="text-red-400 text-sm">Erro ao carregar chamados: ${err.message}</p>`;
    }
}

/** Aba Exclusiva: Equipamentos da Minha Equipe (Gestor/Diretor) */
async function loadPortalTeamDevices() {
    const session = getSession();
    const tabContent = document.getElementById('portal-tab-content');

    try {
        // Busca usuários que têm este gestor como gestor_id
        const { data: membros, error: errMembros } = await db
            .from('usuarios')
            .select('id, nome, username')
            .eq('gestor_id', session.id);

        if (errMembros) throw errMembros;

        if (!membros || membros.length === 0) {
            tabContent.innerHTML = `
                <div class="empty-state py-16">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <p class="text-sm">Nenhum membro vinculado à sua equipe.</p>
                </div>
            `;
            return;
        }

        const membroIds = membros.map(m => m.id);

        // Busca ativos dos membros da equipe
        const { data: ativos, error: errAtivos } = await db
            .from('ativos')
            .select(`
                *,
                usuarios:usuario_id ( id, nome, username )
            `)
            .in('usuario_id', membroIds)
            .order('created_at', { ascending: false });

        if (errAtivos) throw errAtivos;

        // Busca chamados em aberto associados a esses ativos
        const ativoIds = (ativos || []).map(a => a.id);
        let chamadosAbertos = [];
        if (ativoIds.length > 0) {
            const { data: ch } = await db
                .from('chamados')
                .select('ativo_id, status, id')
                .in('ativo_id', ativoIds)
                .neq('status', 'Resolvido');
            chamadosAbertos = ch || [];
        }

        // Mapa: ativo_id → chamados em aberto
        const chamadosPorAtivo = {};
        chamadosAbertos.forEach(c => {
            if (!chamadosPorAtivo[c.ativo_id]) chamadosPorAtivo[c.ativo_id] = [];
            chamadosPorAtivo[c.ativo_id].push(c);
        });

        tabContent.innerHTML = `
            <div class="mb-4">
                <p class="text-sm text-eva-muted">${membros.length} membro(s) na equipe · ${ativos?.length || 0} equipamento(s)</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left">
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Tombamento</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Modelo</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Responsável</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Chamados Abertos</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(ativos || []).map(a => {
                            const chamadosDoAtivo = chamadosPorAtivo[a.id] || [];
                            const temProblema = chamadosDoAtivo.length > 0;
                            return `
                                <tr class="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                    <td class="py-3 px-4 text-sm text-slate-300 font-mono">${a.codigo_tombamento}</td>
                                    <td class="py-3 px-4 text-sm text-slate-200">${a.modelo || '—'}</td>
                                    <td class="py-3 px-4 text-sm text-slate-300">${a.usuarios?.nome || '—'}</td>
                                    <td class="py-3 px-4">
                                        ${temProblema 
                                            ? `<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">${chamadosDoAtivo.length} aberto(s)</span>`
                                            : `<span class="text-xs text-slate-500">Nenhum</span>`
                                        }
                                    </td>
                                    <td class="py-3 px-4">
                                        ${temProblema
                                            ? `<span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse"></span>`
                                            : `<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>`
                                        }
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        tabContent.innerHTML = `<p class="text-red-400 text-sm">Erro ao carregar equipe: ${err.message}</p>`;
    }
}

// ============================================================
// Abrir Novo Chamado — Modal + Submissão
// ============================================================

async function openNewTicketModal() {
    const session = getSession();
    if (!session) return;

    // Carrega os ativos do usuário para o dropdown
    let ativosOptions = '';
    try {
        const { data: ativos } = await db
            .from('ativos')
            .select('id, codigo_tombamento, modelo')
            .eq('usuario_id', session.id);

        ativosOptions = (ativos || []).map(a =>
            `<option value="${a.id}">${a.modelo || 'Sem modelo'} — ${a.codigo_tombamento}</option>`
        ).join('');
    } catch (e) {
        console.warn('Erro ao carregar ativos:', e);
    }

    openModal(`
        <!-- Header do Modal -->
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white flex items-center gap-3">
                    <span class="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                    </span>
                    Abrir Novo Chamado
                </h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Formulário -->
        <form onsubmit="handleNewTicket(event)" class="p-6 space-y-5">
            <!-- Descrição -->
            <div>
                <label for="ticket-description" class="block text-sm font-medium text-slate-300 mb-2">
                    Descreva o problema <span class="text-red-400">*</span>
                </label>
                <textarea 
                    id="ticket-description" 
                    required 
                    rows="4" 
                    placeholder="Ex: Meu monitor não está ligando após a queda de energia..."
                    class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
                ></textarea>
                <p class="text-xs text-slate-500 mt-1">Quanto mais detalhes, mais rápido resolveremos.</p>
            </div>

            <!-- Equipamento -->
            <div>
                <label for="ticket-asset" class="block text-sm font-medium text-slate-300 mb-2">
                    Equipamento relacionado
                </label>
                <select 
                    id="ticket-asset" 
                    class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                >
                    <option value="">Nenhum / Problema geral</option>
                    ${ativosOptions}
                </select>
            </div>

            <!-- Botões -->
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">
                    Cancelar
                </button>
                <button type="submit" id="btn-submit-ticket" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <span id="ticket-btn-text">Enviar Chamado</span>
                    <div id="ticket-spinner" class="spinner hidden"></div>
                </button>
            </div>
        </form>
    `);

    // Foco no textarea
    setTimeout(() => {
        const textarea = document.getElementById('ticket-description');
        if (textarea) textarea.focus();
    }, 100);
}

async function handleNewTicket(event) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const description = document.getElementById('ticket-description').value.trim();
    const assetId = document.getElementById('ticket-asset').value;
    const btnText = document.getElementById('ticket-btn-text');
    const spinner = document.getElementById('ticket-spinner');
    const btn = document.getElementById('btn-submit-ticket');

    if (!description) {
        showToast('Por favor, descreva o problema.', 'warning');
        return;
    }

    // Loading state
    btn.disabled = true;
    btnText.textContent = 'Enviando...';
    spinner.classList.remove('hidden');

    try {
        const insertData = {
            descricao: description,
            status: 'Novo',
            unidade_id: session.unidade_id,
            usuario_id: session.id,
        };

        if (assetId) {
            insertData.ativo_id = parseInt(assetId);
        }

        const { error } = await db.from('chamados').insert(insertData);

        if (error) throw error;

        closeModal();
        showToast('Chamado aberto com sucesso! 🎉', 'success');

        // Recarrega a aba de chamados se estiver no portal
        if (window.location.hash === '#/portal') {
            const tabTickets = document.getElementById('tab-tickets');
            if (tabTickets) {
                switchPortalTab('tickets', tabTickets);
            }
        }
        // Recarrega o kanban se estiver nele
        if (window.location.hash === '#/kanban') {
            await loadKanbanData();
        }
    } catch (err) {
        showToast(`Erro ao abrir chamado: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Enviar Chamado';
        spinner.classList.add('hidden');
    }
}

console.log('✅ Módulo Portal carregado');
