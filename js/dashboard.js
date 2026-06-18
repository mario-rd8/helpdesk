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
                    <p class="text-eva-muted text-sm mt-1">Monitoramento consolidado de todas as unidades</p>
                </div>
                <div class="flex items-center gap-3">
                    <select id="dashboard-unit-filter" onchange="loadDashboardData()" class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                        <option value="all">📊 Todas as Unidades</option>
                    </select>
                    <button onclick="loadDashboardData()" class="btn-ghost px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Atualizar
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div id="kpi-cards" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="kpi-card p-6 flex items-center justify-center">
                    <div class="spinner"></div>
                </div>
                <div class="kpi-card p-6 flex items-center justify-center">
                    <div class="spinner"></div>
                </div>
                <div class="kpi-card p-6 flex items-center justify-center">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- Grid Principal -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Coluna Lateral Esquerda: Satisfações e Ranking de Máquinas (1/3) -->
                <div class="lg:col-span-1 space-y-6">
                    <!-- Satisfação por Unidade -->
                    <div class="bg-eva-card border border-eva-border rounded-2xl p-6">
                        <div id="ranking-unidades-satisfacao">
                            <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <!-- Satisfação por Técnico (Oculto temporariamente para evitar redundância de dados) -->
                    <div class="bg-eva-card border border-eva-border rounded-2xl p-6 hidden">
                        <div id="ranking-tecnicos-satisfacao">
                            <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <!-- Ranking de Máquinas -->
                    <div class="bg-eva-card border border-eva-border rounded-2xl p-6">
                        <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                            </svg>
                            Máquinas com Mais Chamados
                        </h3>
                        <div id="ranking-list">
                            <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>

                <!-- Coluna da Direita: Chamados Recentes (2/3) -->
                <div class="lg:col-span-2">
                    <div class="bg-eva-card border border-eva-border rounded-2xl p-6">
                        <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Chamados Recentes
                        </h3>
                        <div id="recent-tickets">
                            <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carrega lista de unidades no filtro
    await loadUnitFilter();
    // Carrega os dados do dashboard
    await loadDashboardData();
}

/** Popula o select de unidades */
async function loadUnitFilter() {
    try {
        const { data: unidades } = await db
            .from('unidades')
            .select('id, nome_unidade')
            .order('id');

        const select = document.getElementById('dashboard-unit-filter');
        if (select && unidades) {
            unidades.forEach(u => {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = u.nome_unidade;
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Erro ao carregar unidades:', err);
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

/** Carrega os KPI cards */
async function loadKPIs(filter) {
    const kpiContainer = document.getElementById('kpi-cards');

    try {
        // Query base de chamados
        let queryAbertos = db.from('chamados').select('id', { count: 'exact', head: true }).neq('status', 'Resolvido');
        let queryTotal = db.from('chamados').select('id', { count: 'exact', head: true });
        let queryResolvidos = db.from('chamados').select('created_at, updated_at').eq('status', 'Resolvido');

        if (filter !== 'all') {
            queryAbertos = queryAbertos.eq('unidade_id', filter);
            queryTotal = queryTotal.eq('unidade_id', filter);
            queryResolvidos = queryResolvidos.eq('unidade_id', filter);
        }

        const [resAbertos, resTotal, resResolvidos] = await Promise.all([
            queryAbertos,
            queryTotal,
            queryResolvidos,
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

        kpiContainer.innerHTML = `
            <!-- KPI: Chamados em Aberto -->
            <div class="kpi-card p-6">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-xs text-eva-muted uppercase tracking-wider font-semibold">Em Aberto</p>
                        <p class="text-3xl font-bold text-white mt-2">${totalAbertos}</p>
                        <p class="text-xs text-slate-400 mt-1">de ${totalGeral} total</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                        <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                ${totalAbertos > 0 ? `
                    <div class="mt-4 w-full bg-slate-700 rounded-full h-1.5">
                        <div class="bg-amber-400 h-1.5 rounded-full transition-all duration-500" style="width: ${totalGeral > 0 ? Math.round((totalAbertos / totalGeral) * 100) : 0}%"></div>
                    </div>
                ` : ''}
            </div>

            <!-- KPI: Tempo Médio de Resolução -->
            <div class="kpi-card p-6">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-xs text-eva-muted uppercase tracking-wider font-semibold">Tempo Médio</p>
                        <p class="text-3xl font-bold text-white mt-2">${tempoMedioHoras > 0 ? tempoMedioHoras + 'h' : '—'}</p>
                        <p class="text-xs text-slate-400 mt-1">${resolvidos.length} chamado(s) resolvido(s)</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- KPI: Taxa de Resolução -->
            <div class="kpi-card p-6">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-xs text-eva-muted uppercase tracking-wider font-semibold">Taxa de Resolução</p>
                        <p class="text-3xl font-bold text-white mt-2">${totalGeral > 0 ? Math.round((resolvidos.length / totalGeral) * 100) : 0}%</p>
                        <p class="text-xs text-slate-400 mt-1">${resolvidos.length} de ${totalGeral}</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                ${totalGeral > 0 ? `
                    <div class="mt-4 w-full bg-slate-700 rounded-full h-1.5">
                        <div class="bg-emerald-400 h-1.5 rounded-full transition-all duration-500" style="width: ${Math.round((resolvidos.length / totalGeral) * 100)}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (err) {
        kpiContainer.innerHTML = `<p class="text-red-400 text-sm col-span-3">Erro ao carregar KPIs: ${err.message}</p>`;
    }
}

/** Ranking de máquinas com mais chamados */
async function loadRanking(filter) {
    const rankingList = document.getElementById('ranking-list');

    try {
        let query = db.from('chamados').select(`
            ativo_id,
            ativos:ativo_id ( codigo_tombamento, modelo )
        `);

        if (filter !== 'all') {
            query = query.eq('unidade_id', filter);
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

        if (filter !== 'all') {
            query = query.eq('unidade_id', filter);
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

/** Carrega e calcula a satisfação média de cada unidade organizativa */
async function loadUnidadesSatisfacao(filter) {
    const container = document.getElementById('ranking-unidades-satisfacao');
    try {
        let query = db.from('avaliacoes').select(`
            nota,
            unidade_id,
            unidades:unidade_id ( nome_unidade )
        `);

        if (filter !== 'all') {
            query = query.eq('unidade_id', filter);
        }

        const { data: avaliacoes, error } = await query;
        if (error) throw error;

        if (!avaliacoes || avaliacoes.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-4">
                    <p class="text-xs">Nenhuma avaliação de unidade</p>
                </div>
            `;
            return;
        }

        const unidadesMap = {};
        avaliacoes.forEach(a => {
            const uid = a.unidade_id;
            if (!uid) return;
            const nome = a.unidades?.nome_unidade || 'Desconhecida';
            if (!unidadesMap[uid]) {
                unidadesMap[uid] = { nome, soma: 0, qtd: 0 };
            }
            unidadesMap[uid].soma += a.nota;
            unidadesMap[uid].qtd += 1;
        });

        const ranking = Object.values(unidadesMap).map(u => ({
            nome: u.nome,
            media: Math.round((u.soma / u.qtd) * 10) / 10,
            qtd: u.qtd
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
