// ============================================================
// Tela D — Dashboard de Controle (Gestor de TIC / Admin)
// ============================================================
// Funcionalidades:
// - Seletor de unidade (Todas ou filial específica)
// - KPI: Total de chamados em aberto
// - KPI: Tempo médio de resolução
// - Ranking de máquinas com mais reincidências
// - Tabela de chamados recentes
// ============================================================

async function renderDashboard() {
    const session = getSession();
    if (!session) return;

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Dashboard de Controle</h2>
                    <p class="text-eva-muted text-sm mt-1">Monitoramento consolidado dos clientes atendidos</p>
                </div>
                <div class="flex items-center gap-3">
                    <select id="dashboard-unit-filter" onchange="loadDashboardData()" class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                        <option value="all">📊 Todos os Clientes</option>
                    </select>
                    <button onclick="loadDashboardData()" class="btn-ghost px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Atualizar
                    </button>
                </div>
            </div>

            <!-- KPI Cards (Grid com 4 cards compactados) -->
            <div id="kpi-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-center min-h-[90px]">
                    <div class="spinner"></div>
                </div>
                <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-center min-h-[90px]">
                    <div class="spinner"></div>
                </div>
                <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-center min-h-[90px]">
                    <div class="spinner"></div>
                </div>
                <div class="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-center min-h-[90px]">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- Grid Principal (2/3 para Chamados Recentes e 1/3 para Reincidências) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Lado Esquerdo: Chamados Recentes (2/3) -->
                <div class="lg:col-span-2 bg-eva-card border border-eva-border rounded-2xl p-6 flex flex-col">
                    <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Chamados Recentes
                    </h3>
                    <div id="recent-tickets" class="overflow-y-auto max-h-[350px] pr-1.5 scrollbar-thin">
                        <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                    </div>
                </div>

                <!-- Lado Direito: Máquinas com Mais Chamados (1/3) -->
                <div class="lg:col-span-1 bg-eva-card border border-eva-border rounded-2xl p-6 flex flex-col">
                    <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        Máquinas com Mais Chamados
                    </h3>
                    <div id="ranking-list" class="overflow-y-auto max-h-[350px] pr-1.5 scrollbar-thin">
                        <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carrega lista de clientes no filtro
    await loadClientFilter();
    // Carrega os dados do dashboard
    await loadDashboardData();
}

/** Popula o select de clientes */
async function loadClientFilter() {
    const session = getSession();
    try {
        let query = db.from('clientes').select('id, nome_cliente').order('nome_cliente');

        if (session.tipo === 'tecnico' && session.provedor_ti_id) {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        const { data: clientes } = await query;

        const select = document.getElementById('dashboard-unit-filter');
        if (select) {
            select.innerHTML = '<option value="all">📊 Todos os Clientes</option>';
            if (clientes) {
                clientes.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = `🏢 ${c.nome_cliente}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (err) {
        console.error('Erro ao carregar clientes para o filtro:', err);
    }
}

/** Carrega todos os dados do dashboard */
async function loadDashboardData() {
    const filterEl = document.getElementById('dashboard-unit-filter');
    const filter = filterEl ? filterEl.value : 'all';

    await Promise.all([
        loadKPIs(filter),
        loadRanking(filter),
        loadRecentTickets(filter),
        loadUnidadesSatisfacao(filter),
        loadTecnicosSatisfacao(filter),
    ]);
}

/** Carrega os KPI cards com layout compacto e horizontal */
async function loadKPIs(filter) {
    const kpiContainer = document.getElementById('kpi-cards');
    const session = getSession();

    try {
        // Query base de chamados
        let queryAbertos = db.from('chamados').select('id', { count: 'exact', head: true }).neq('status', 'Resolvido');
        let queryTotal = db.from('chamados').select('id', { count: 'exact', head: true });
        let queryResolvidos = db.from('chamados').select('created_at, updated_at').eq('status', 'Resolvido');
        
        // Query avaliações
        let queryAval = db.from('avaliacoes').select(`
            nota,
            provedor_ti_id,
            chamados!inner (
                cliente_id
            )
        `);

        // Isolamento de Tenant (Gestor TI)
        if (session.tipo === 'tecnico' && session.provedor_ti_id) {
            queryAbertos = queryAbertos.eq('provedor_ti_id', session.provedor_ti_id);
            queryTotal = queryTotal.eq('provedor_ti_id', session.provedor_ti_id);
            queryResolvidos = queryResolvidos.eq('provedor_ti_id', session.provedor_ti_id);
            queryAval = queryAval.eq('provedor_ti_id', session.provedor_ti_id);
        }

        // Filtro selecionado no seletor (Empresas Clientes)
        if (filter !== 'all') {
            queryAbertos = queryAbertos.eq('cliente_id', filter);
            queryTotal = queryTotal.eq('cliente_id', filter);
            queryResolvidos = queryResolvidos.eq('cliente_id', filter);
            queryAval = queryAval.eq('chamados.cliente_id', filter);
        }

        const [resAbertos, resTotal, resResolvidos, resAval] = await Promise.all([
            queryAbertos,
            queryTotal,
            queryResolvidos,
            queryAval
        ]);

        const totalAbertos = resAbertos.count || 0;
        const totalGeral = resTotal.count || 0;

        // Calcula tempo médio de resolução
        let tempoMedioHoras = 0;
        const resolvidos = resResolvidos.data || [];
        if (resolvidos.length > 0) {
            const totalMs = resolvidos.reduce((sum, c) => {
                const diff = new Date(c.updated_at) - new Date(c.created_at);
                return sum + Math.max(diff, 0);
            }, 0);
            tempoMedioHoras = Math.round((totalMs / resolvidos.length) / (1000 * 60 * 60) * 10) / 10;
        }

        // Calcula Satisfação Média Geral
        const avals = resAval.data || [];
        let totalAvaliacoes = 0;
        let mediaSatisfacao = 0;
        if (avals.length > 0) {
            totalAvaliacoes = avals.length;
            const soma = avals.reduce((acc, curr) => acc + curr.nota, 0);
            mediaSatisfacao = Math.round((soma / totalAvaliacoes) * 10) / 10;
        }

        kpiContainer.innerHTML = `
            <!-- KPI: Chamados em Aberto -->
            <div class="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl shadow-lg shadow-amber-500/2 min-h-[90px] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <p class="text-[10px] text-eva-muted uppercase tracking-wider font-semibold">Em Aberto</p>
                    <div class="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div>
                        <p class="text-2xl font-extrabold text-white leading-none">${totalAbertos}</p>
                        <p class="text-[10px] text-slate-500 mt-1">de ${totalGeral} total</p>
                    </div>
                    ${totalAbertos > 0 ? `
                        <div class="w-16 bg-slate-800 rounded-full h-1.5 flex-shrink-0 self-center ml-3">
                            <div class="bg-amber-400 h-1.5 rounded-full transition-all duration-500" style="width: ${totalGeral > 0 ? Math.round((totalAbertos / totalGeral) * 100) : 0}%"></div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- KPI: Tempo Médio de Resolução -->
            <div class="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl shadow-lg shadow-emerald-500/2 min-h-[90px] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <p class="text-[10px] text-eva-muted uppercase tracking-wider font-semibold">Tempo Médio</p>
                    <div class="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div>
                        <p class="text-2xl font-extrabold text-white leading-none">${tempoMedioHoras > 0 ? tempoMedioHoras + 'h' : '—'}</p>
                        <p class="text-[10px] text-slate-500 mt-1">${resolvidos.length} resolvido(s)</p>
                    </div>
                </div>
            </div>

            <!-- KPI: Taxa de Resolução -->
            <div class="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl shadow-lg shadow-blue-500/2 min-h-[90px] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <p class="text-[10px] text-eva-muted uppercase tracking-wider font-semibold">Taxa de Resolução</p>
                    <div class="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div>
                        <p class="text-2xl font-extrabold text-white leading-none">${totalGeral > 0 ? Math.round((resolvidos.length / totalGeral) * 100) : 0}%</p>
                        <p class="text-[10px] text-slate-500 mt-1">${resolvidos.length} de ${totalGeral}</p>
                    </div>
                    ${totalGeral > 0 ? `
                        <div class="w-16 bg-slate-800 rounded-full h-1.5 flex-shrink-0 self-center ml-3">
                            <div class="bg-blue-450 h-1.5 rounded-full transition-all duration-500" style="width: ${Math.round((resolvidos.length / totalGeral) * 100)}%"></div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- KPI: Satisfação do Cliente (Estrelas agregadas) -->
            <div class="bg-purple-500/5 border border-purple-500/20 p-4 rounded-2xl shadow-lg shadow-purple-500/2 min-h-[90px] flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <p class="text-[10px] text-eva-muted uppercase tracking-wider font-semibold">Média de Satisfação</p>
                    <div class="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <span class="text-purple-400 text-xs">★</span>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-1">
                    <div>
                        <p class="text-2xl font-extrabold text-white leading-none">${mediaSatisfacao > 0 ? mediaSatisfacao : '—'}</p>
                        <p class="text-[10px] text-slate-500 mt-1">${totalAvaliacoes} avaliação(ões)</p>
                    </div>
                    <div class="flex flex-col items-end gap-0.5 ml-3 flex-shrink-0">
                        <div class="flex gap-0.5">
                            ${renderStars(mediaSatisfacao, 'sm')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        kpiContainer.innerHTML = `<p class="text-red-400 text-xs">Erro ao carregar KPIs: ${err.message}</p>`;
    }
}

async function loadRanking(filter) {
    const rankingList = document.getElementById('ranking-list');
    const session = getSession();

    try {
        let query = db.from('chamados').select(`
            ativo_id,
            ativos:ativo_id ( codigo_tombamento, modelo )
        `);

        // Isolamento de Tenant (Gestor TI)
        if (session.tipo === 'tecnico' && session.provedor_ti_id) {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        // Filtro selecionado (Empresas Clientes)
        if (filter !== 'all') {
            query = query.eq('cliente_id', filter);
        }

        // Busca todos os chamados que têm ativo
        query = query.not('ativo_id', 'is', null);
        const { data: chamados, error } = await query;

        if (error) throw error;

        // Agrupa por ativo_id e conta
        const contagem = {};
        (chamados || []).forEach(c => {
            if (!c.ativo_id) return;
            if (!contagem[c.ativo_id]) {
                contagem[c.ativo_id] = {
                    count: 0,
                    modelo: c.ativos?.modelo || 'Desconhecido',
                    tombamento: c.ativos?.codigo_tombamento || '—',
                };
            }
            contagem[c.ativo_id].count++;
        });

        // Ordena por contagem decrescente
        const ranking = Object.values(contagem).sort((a, b) => b.count - a.count).slice(0, 5);

        if (ranking.length === 0) {
            rankingList.innerHTML = `
                <div class="empty-state py-6">
                    <p class="text-xs">Sem dados de reincidência</p>
                </div>
            `;
            return;
        }

        const maxCount = ranking[0].count;
        rankingList.innerHTML = ranking.map((item, i) => `
            <div class="flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-slate-800' : ''}">
                <span class="w-6 h-6 rounded-lg ${i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'} flex items-center justify-center text-xs font-bold flex-shrink-0">
                    ${i + 1}
                </span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">${item.modelo}</p>
                    <p class="text-xs text-slate-500 font-mono">${item.tombamento}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="w-16 bg-slate-700 rounded-full h-1.5">
                        <div class="bg-amber-400 h-1.5 rounded-full" style="width: ${(item.count / maxCount) * 100}%"></div>
                    </div>
                    <span class="text-xs text-slate-400 w-4 text-right">${item.count}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        rankingList.innerHTML = `<p class="text-red-400 text-xs">Erro: ${err.message}</p>`;
    }
}

/** Tabela de chamados recentes */
async function loadRecentTickets(filter) {
    const container = document.getElementById('recent-tickets');
    const session = getSession();

    try {
        let query = db
            .from('chamados')
            .select(`
                *,
                usuarios:usuario_id ( nome, nivel_hierarquico ),
                tecnicos:tecnico_id ( nome ),
                unidades:unidade_id ( nome_unidade )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        // Isolamento de Tenant (Gestor TI)
        if (session.tipo === 'tecnico' && session.provedor_ti_id) {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        // Filtro selecionado (Empresas Clientes)
        if (filter !== 'all') {
            query = query.eq('cliente_id', filter);
        }

        const { data: chamados, error } = await query;
        if (error) throw error;

        if (!chamados || chamados.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-6">
                    <p class="text-xs">Nenhum chamado encontrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left">
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">#</th>
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">Descrição</th>
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">Solicitante</th>
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">Unidade</th>
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                            <th class="py-2 px-3 text-xs font-semibold text-eva-muted uppercase tracking-wider">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chamados.map(c => {
                            const isVip = c.usuarios && (c.usuarios.nivel_hierarquico === 'gestor' || c.usuarios.nivel_hierarquico === 'diretor');
                            return `
                                <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer" onclick="openChamadoModal(${c.id})">
                                    <td class="py-2.5 px-3 text-sm text-slate-300 font-mono">${c.id}</td>
                                    <td class="py-2.5 px-3 text-sm text-slate-200 max-w-[200px] truncate">
                                        ${isVip ? '<span class="vip-badge mr-1">VIP</span>' : ''}
                                        ${c.descricao}
                                    </td>
                                    <td class="py-2.5 px-3 text-sm text-slate-300">${c.usuarios?.nome || '—'}</td>
                                    <td class="py-2.5 px-3 text-xs text-slate-400">${c.unidades?.nome_unidade || '—'}</td>
                                    <td class="py-2.5 px-3">
                                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(c.status)}">${c.status}</span>
                                    </td>
                                    <td class="py-2.5 px-3 text-xs text-slate-500">${formatDate(c.created_at)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-xs">Erro: ${err.message}</p>`;
    }
}

/** Carrega e calcula a satisfação média de cada empresa cliente */
async function loadUnidadesSatisfacao(filter) {
    const container = document.getElementById('ranking-unidades-satisfacao');
    const session = getSession();

    try {
        let query = db.from('avaliacoes').select(`
            nota,
            provedor_ti_id,
            chamados!inner (
                cliente_id,
                clientes ( nome_cliente )
            )
        `);

        // Isolamento de Tenant (Gestor TI)
        if (session.tipo === 'tecnico' && session.provedor_ti_id) {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        // Filtro selecionado (Empresas Clientes)
        if (filter !== 'all') {
            query = query.eq('chamados.cliente_id', filter);
        }

        const { data: avaliacoes, error } = await query;
        if (error) throw error;

        if (!avaliacoes || avaliacoes.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-4">
                    <p class="text-xs">Nenhuma avaliação de cliente</p>
                </div>
            `;
            return;
        }

        const clientesMap = {};
        avaliacoes.forEach(a => {
            const cid = a.chamados?.cliente_id;
            if (!cid) return;
            const nome = a.chamados?.clientes?.nome_cliente || 'Desconhecido';
            if (!clientesMap[cid]) {
                clientesMap[cid] = { nome, soma: 0, qtd: 0 };
            }
            clientesMap[cid].soma += a.nota;
            clientesMap[cid].qtd += 1;
        });

        const ranking = Object.values(clientesMap).map(c => ({
            nome: c.nome,
            media: Math.round((c.soma / c.qtd) * 10) / 10,
            qtd: c.qtd
        })).sort((a, b) => b.media - a.media);

        container.innerHTML = `
            <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h2m-6 0h2m-2 4h6m-7 8h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v16a2 2 0 002 2z"/>
                </svg>
                Satisfação por Cliente
            </h3>
            <div class="space-y-2.5">
                ${ranking.map(item => `
                    <div class="flex items-center justify-between py-1.5 border-b border-slate-800/30 text-sm">
                        <span class="text-slate-300 font-medium truncate max-w-[180px]">${item.nome}</span>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <div class="flex gap-0.5">
                                ${renderStars(item.media, 'sm')}
                            </div>
                            <span class="text-xs text-slate-500 font-semibold">(${item.qtd})</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-xs">Erro: ${err.message}</p>`;
    }
}

/** Carrega e calcula o ranking/desempenho dos técnicos com base nas notas (estilo Uber) */
async function loadTecnicosSatisfacao(filter) {
    const container = document.getElementById('ranking-tecnicos-satisfacao');
    try {
        let query = db.from('avaliacoes').select(`
            nota,
            tecnico_id,
            tecnicos:tecnico_id ( nome )
        `);

        if (filter !== 'all') {
            query = query.eq('unidade_id', filter);
        }

        const { data: avaliacoes, error } = await query;
        if (error) throw error;

        if (!avaliacoes || avaliacoes.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-4">
                    <p class="text-xs">Nenhuma avaliação de técnico</p>
                </div>
            `;
            return;
        }

        const tecnicosMap = {};
        avaliacoes.forEach(a => {
            const tid = a.tecnico_id;
            if (!tid) return;
            const nome = a.tecnicos?.nome || 'Técnico Desconhecido';
            if (!tecnicosMap[tid]) {
                tecnicosMap[tid] = { nome, soma: 0, qtd: 0 };
            }
            tecnicosMap[tid].soma += a.nota;
            tecnicosMap[tid].qtd += 1;
        });

        const ranking = Object.values(tecnicosMap).map(t => ({
            nome: t.nome,
            media: Math.round((t.soma / t.qtd) * 10) / 10,
            qtd: t.qtd
        })).sort((a, b) => b.media - a.media);

        container.innerHTML = `
            <div class="space-y-2.5">
                ${ranking.map(item => `
                    <div class="flex items-center justify-between py-1.5 border-b border-slate-800/30 text-sm">
                        <span class="text-slate-300 font-medium truncate max-w-[180px]">${item.nome}</span>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <div class="flex gap-0.5">
                                ${renderStars(item.media, 'sm')}
                            </div>
                            <span class="text-xs text-slate-500 font-semibold">(${item.qtd})</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-xs">Erro: ${err.message}</p>`;
    }
}

console.log('✅ Módulo Dashboard carregado');
