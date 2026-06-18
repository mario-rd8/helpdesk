// ============================================================
// Módulo de Cadastros — CRUD Completo
// ============================================================
// Telas:
// - Cadastro de Unidades (filiais)
// - Cadastro de Colaboradores (com nível, VIP, ativo/inativo)
// - Cadastro de Equipamentos (com histórico de manutenções)
// ============================================================

// ============================================================
// 1. CADASTRO DE UNIDADES
// ============================================================

async function renderCadastroUnidades() {
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Unidades</h2>
                    <p class="text-eva-muted text-sm mt-1">Gerenciamento de filiais e holding</p>
                </div>
                ${isGestorTIC ? `
                <button onclick="openUnidadeModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Nova Unidade
                </button>
                ` : `
                <button disabled class="btn-primary opacity-40 cursor-not-allowed px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" title="Apenas o Gestor de TIC pode cadastrar unidades">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Nova Unidade
                </button>
                `}
            </div>
            <div id="unidades-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadUnidadesTable();
}

async function loadUnidadesTable() {
    const container = document.getElementById('unidades-table');
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';

    try {
        const { data: unidades, error } = await db
            .from('unidades')
            .select(`
                *,
                tecnicos:tecnico_responsavel_id ( nome )
            `)
            .order('id');
        if (error) throw error;

        if (!unidades || unidades.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhuma unidade cadastrada.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="w-full">
                <thead>
                    <tr class="border-b border-eva-border text-left bg-slate-800/30">
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">ID</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nome da Unidade</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Tipo</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Técnico Responsável</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Criado em</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${unidades.map(u => `
                        <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td class="py-3 px-5 text-sm text-slate-400 font-mono">${u.id}</td>
                            <td class="py-3 px-5 text-sm text-white font-medium">${u.nome_unidade}</td>
                            <td class="py-3 px-5">
                                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${u.tipo === 'holding' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}">
                                    ${u.tipo === 'holding' ? '🏢 Holding' : '🏬 Filial'}
                                </span>
                            </td>
                            <td class="py-3 px-5 text-sm text-slate-300">
                                ${u.tecnicos?.nome ? `🔧 ${u.tecnicos.nome}` : '<span class="text-slate-500">Nenhum</span>'}
                            </td>
                            <td class="py-3 px-5 text-xs text-slate-500">${formatDate(u.created_at)}</td>
                            <td class="py-3 px-5 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    ${isGestorTIC ? `
                                    <button onclick='openUnidadeModal(${JSON.stringify(u)})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button onclick="deleteUnidade(${u.id})" class="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Excluir">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                    ` : `
                                    <button disabled class="p-2 rounded-lg opacity-30 cursor-not-allowed text-slate-500" title="Apenas o Gestor de TIC pode editar esta unidade">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button disabled class="p-2 rounded-lg opacity-30 cursor-not-allowed text-slate-500" title="Apenas o Gestor de TIC pode excluir esta unidade">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro: ${err.message}</p>`;
    }
}

async function openUnidadeModal(unidade = null) {
    const isEdit = unidade !== null;

    let tecnicosOptions = '';
    try {
        const { data: tecnicos } = await db
            .from('tecnicos')
            .select('id, nome')
            .order('nome');
        
        tecnicosOptions = (tecnicos || []).map(t => 
            `<option value="${t.id}" ${isEdit && unidade.tecnico_responsavel_id === t.id ? 'selected' : ''}>🔧 ${t.nome}</option>`
        ).join('');
    } catch (e) {
        console.warn('Erro ao carregar técnicos:', e);
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveUnidade(event, ${isEdit ? unidade.id : 'null'})" class="p-6 space-y-5">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Nome da Unidade <span class="text-red-400">*</span></label>
                <input type="text" id="unidade-nome" required value="${isEdit ? unidade.nome_unidade : ''}" placeholder="Ex: Filial Centro" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Tipo <span class="text-red-400">*</span></label>
                <select id="unidade-tipo" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="filial" ${isEdit && unidade.tipo === 'filial' ? 'selected' : ''}>🏬 Filial</option>
                    <option value="holding" ${isEdit && unidade.tipo === 'holding' ? 'selected' : ''}>🏢 Holding</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Técnico Responsável</label>
                <select id="unidade-tecnico" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="">Nenhum técnico responsável</option>
                    ${tecnicosOptions}
                </select>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Unidade'}</button>
            </div>
        </form>
    `);
}

async function handleSaveUnidade(event, id) {
    event.preventDefault();
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';
    if (!isGestorTIC) {
        showToast('Apenas o Gestor de TIC pode criar ou editar unidades.', 'error');
        return;
    }

    const nome = document.getElementById('unidade-nome').value.trim();
    const tipo = document.getElementById('unidade-tipo').value;
    const tecnico_responsavel_id = document.getElementById('unidade-tecnico').value || null;
    
    const payload = { 
        nome_unidade: nome, 
        tipo, 
        tecnico_responsavel_id 
    };

    try {
        if (id) {
            const { error } = await db.from('unidades').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Unidade atualizada!', 'success');
        } else {
            const { error } = await db.from('unidades').insert(payload);
            if (error) throw error;
            showToast('Unidade cadastrada!', 'success');
        }
        closeModal();
        await loadUnidadesTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function deleteUnidade(id) {
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';
    if (!isGestorTIC) {
        showToast('Apenas o Gestor de TIC pode excluir unidades.', 'error');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.')) return;
    try {
        const { error } = await db.from('unidades').delete().eq('id', id);
        if (error) throw error;
        showToast('Unidade excluída.', 'success');
        await loadUnidadesTable();
    } catch (err) {
        showToast(`Erro ao excluir: ${err.message}`, 'error');
    }
}

// ============================================================
// 2. CADASTRO DE COLABORADORES
// ============================================================

async function renderCadastroColaboradores() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Colaboradores</h2>
                    <p class="text-eva-muted text-sm mt-1">Cadastro e gerenciamento de usuários do sistema</p>
                </div>
                <button onclick="openColaboradorModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Novo Colaborador
                </button>
            </div>

            <!-- Filtros -->
            <div class="flex flex-wrap gap-3 mb-6">
                <select id="filtro-unidade-colab" onchange="loadColaboradoresTable()" class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="all">Todas as Unidades</option>
                </select>
                <select id="filtro-status-colab" onchange="loadColaboradoresTable()" class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors">
                    <option value="all">Todos</option>
                    <option value="true">✅ Ativos</option>
                    <option value="false">❌ Inativos</option>
                </select>
                <input type="text" id="busca-colab" onkeyup="loadColaboradoresTable()" placeholder="🔍 Buscar por nome..." class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-64"/>
            </div>

            <div id="colaboradores-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadUnidadesFilter('filtro-unidade-colab');
    await loadColaboradoresTable();
}

async function loadUnidadesFilter(selectId) {
    try {
        const { data: unidades } = await db.from('unidades').select('id, nome_unidade').order('id');
        const select = document.getElementById(selectId);
        if (select && unidades) {
            unidades.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.nome_unidade;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.warn('Erro ao carregar unidades:', e); }
}

async function loadColaboradoresTable() {
    const container = document.getElementById('colaboradores-table');
    const filtroUnidade = document.getElementById('filtro-unidade-colab')?.value || 'all';
    const filtroStatus = document.getElementById('filtro-status-colab')?.value || 'all';
    const busca = document.getElementById('busca-colab')?.value?.toLowerCase() || '';

    try {
        let query = db.from('usuarios').select(`
            *,
            unidades:unidade_id ( nome_unidade ),
            gestor:gestor_id ( nome )
        `).order('nome');

        if (filtroUnidade !== 'all') query = query.eq('unidade_id', filtroUnidade);
        if (filtroStatus !== 'all') query = query.eq('ativo', filtroStatus === 'true');

        const { data: usuarios, error } = await query;
        if (error) throw error;

        let filtrados = usuarios || [];
        if (busca) {
            filtrados = filtrados.filter(u => u.nome.toLowerCase().includes(busca) || u.username.toLowerCase().includes(busca));
        }

        if (filtrados.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum colaborador encontrado.</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left bg-slate-800/30">
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Colaborador</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">WhatsApp</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Unidade</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nível</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Gestor</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtrados.map(u => {
                            const isVip = u.nivel_hierarquico === 'gestor' || u.nivel_hierarquico === 'diretor';
                            const nivelBadge = {
                                'colaborador': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
                                'gestor': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
                                'diretor': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
                            };
                            return `
                                <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td class="py-3 px-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs text-white font-semibold flex-shrink-0">
                                                ${u.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <p class="text-sm text-white font-medium flex items-center gap-2">
                                                    ${u.nome}
                                                    ${isVip ? '<span class="vip-badge">VIP</span>' : ''}
                                                </p>
                                                <p class="text-xs text-slate-500">@${u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3 px-4 text-sm text-slate-400">${u.whatsapp || '—'}</td>
                                    <td class="py-3 px-4 text-sm text-slate-300">${u.unidades?.nome_unidade || '—'}</td>
                                    <td class="py-3 px-4">
                                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold border ${nivelBadge[u.nivel_hierarquico] || nivelBadge.colaborador}">
                                            ${u.nivel_hierarquico}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-sm text-slate-400">${u.gestor?.nome || '—'}</td>
                                    <td class="py-3 px-4">
                                        ${u.ativo !== false
                                            ? '<span class="flex items-center gap-1.5 text-xs text-emerald-400"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Ativo</span>'
                                            : '<span class="flex items-center gap-1.5 text-xs text-red-400"><span class="w-2 h-2 rounded-full bg-red-400"></span> Inativo</span>'
                                        }
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick='openColaboradorModal(${JSON.stringify({ id: u.id, username: u.username, nome: u.nome, whatsapp: u.whatsapp, unidade_id: u.unidade_id, nivel_hierarquico: u.nivel_hierarquico, gestor_id: u.gestor_id, ativo: u.ativo })})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtrados.length} colaborador(es) encontrado(s)</div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro: ${err.message}</p>`;
    }
}

async function openColaboradorModal(usuario = null) {
    const isEdit = usuario !== null;

    // Carrega unidades e gestores para os dropdowns
    let unidadesOptions = '', gestoresOptions = '';
    try {
        const { data: unidades } = await db.from('unidades').select('id, nome_unidade').order('id');
        unidadesOptions = (unidades || []).map(u => `<option value="${u.id}" ${isEdit && usuario.unidade_id == u.id ? 'selected' : ''}>${u.nome_unidade}</option>`).join('');

        const { data: gestores } = await db.from('usuarios').select('id, nome').in('nivel_hierarquico', ['gestor', 'diretor']).order('nome');
        gestoresOptions = (gestores || []).map(g => `<option value="${g.id}" ${isEdit && usuario.gestor_id === g.id ? 'selected' : ''}>${g.nome}</option>`).join('');
    } catch (e) { console.warn(e); }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveColaborador(event, ${isEdit ? `'${usuario.id}'` : 'null'})" class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nome Completo <span class="text-red-400">*</span></label>
                    <input type="text" id="colab-nome" required value="${isEdit ? usuario.nome : ''}" placeholder="Nome completo" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Username (Login) <span class="text-red-400">*</span></label>
                    <input type="text" id="colab-username" required value="${isEdit ? usuario.username : ''}" placeholder="nome.sobrenome" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">WhatsApp</label>
                    <input type="text" id="colab-whatsapp" value="${isEdit && usuario.whatsapp ? usuario.whatsapp : ''}" placeholder="5511999999999" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Senha ${isEdit ? '(deixe vazio para manter)' : '<span class="text-red-400">*</span>'}</label>
                    <input type="password" id="colab-senha" ${isEdit ? '' : 'required'} placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Unidade <span class="text-red-400">*</span></label>
                    <select id="colab-unidade" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Selecione...</option>
                        ${unidadesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nível Hierárquico</label>
                    <select id="colab-nivel" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="colaborador" ${isEdit && usuario.nivel_hierarquico === 'colaborador' ? 'selected' : ''}>👤 Colaborador</option>
                        <option value="gestor" ${isEdit && usuario.nivel_hierarquico === 'gestor' ? 'selected' : ''}>📋 Gestor (VIP)</option>
                        <option value="diretor" ${isEdit && usuario.nivel_hierarquico === 'diretor' ? 'selected' : ''}>🏢 Diretor (VIP)</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Gestor Responsável</label>
                    <select id="colab-gestor" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Nenhum</option>
                        ${gestoresOptions}
                    </select>
                </div>
                <div class="flex items-end">
                    <label class="flex items-center gap-3 cursor-pointer py-2.5">
                        <input type="checkbox" id="colab-ativo" ${isEdit && usuario.ativo === false ? '' : 'checked'} class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"/>
                        <span class="text-sm text-slate-300">Colaborador Ativo</span>
                    </label>
                </div>
            </div>
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</button>
            </div>
        </form>
    `);
}

async function handleSaveColaborador(event, id) {
    event.preventDefault();
    const data = {
        nome: document.getElementById('colab-nome').value.trim(),
        username: document.getElementById('colab-username').value.trim().toLowerCase(),
        whatsapp: document.getElementById('colab-whatsapp').value.trim() || null,
        unidade_id: parseInt(document.getElementById('colab-unidade').value),
        nivel_hierarquico: document.getElementById('colab-nivel').value,
        gestor_id: document.getElementById('colab-gestor').value || null,
        ativo: document.getElementById('colab-ativo').checked,
    };

    const senha = document.getElementById('colab-senha').value;
    if (senha) data.senha_hash = senha;
    if (!id && !senha) { showToast('Senha é obrigatória para novos colaboradores.', 'warning'); return; }

    try {
        if (id) {
            const { error } = await db.from('usuarios').update(data).eq('id', id);
            if (error) throw error;
            showToast('Colaborador atualizado!', 'success');
        } else {
            if (!data.senha_hash) { showToast('Informe a senha.', 'warning'); return; }
            const { error } = await db.from('usuarios').insert(data);
            if (error) throw error;
            showToast('Colaborador cadastrado!', 'success');
        }
        closeModal();
        await loadColaboradoresTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 3. CADASTRO DE EQUIPAMENTOS
// ============================================================

async function renderCadastroEquipamentos() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Equipamentos</h2>
                    <p class="text-eva-muted text-sm mt-1">Inventário de ativos e histórico de manutenções</p>
                </div>
                <button onclick="openEquipamentoModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Novo Equipamento
                </button>
            </div>

            <!-- Busca -->
            <div class="mb-6">
                <input type="text" id="busca-equip" onkeyup="loadEquipamentosTable()" placeholder="🔍 Buscar por tombamento, modelo ou responsável..." class="bg-eva-card border border-eva-border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-full max-w-md"/>
            </div>

            <div id="equipamentos-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadEquipamentosTable();
}

async function loadEquipamentosTable() {
    const container = document.getElementById('equipamentos-table');
    const busca = document.getElementById('busca-equip')?.value?.toLowerCase() || '';

    try {
        const { data: ativos, error } = await db
            .from('ativos')
            .select(`*, usuarios:usuario_id ( nome, username )`)
            .order('id', { ascending: false });
        if (error) throw error;

        let filtrados = ativos || [];
        if (busca) {
            filtrados = filtrados.filter(a =>
                (a.codigo_tombamento || '').toLowerCase().includes(busca) ||
                (a.modelo || '').toLowerCase().includes(busca) ||
                (a.usuarios?.nome || '').toLowerCase().includes(busca)
            );
        }

        if (filtrados.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum equipamento encontrado.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="w-full">
                <thead>
                    <tr class="border-b border-eva-border text-left bg-slate-800/30">
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Tombamento</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Modelo</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Responsável</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Cadastrado em</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrados.map(a => `
                        <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td class="py-3 px-5 text-sm text-emerald-400 font-mono font-medium">${a.codigo_tombamento}</td>
                            <td class="py-3 px-5 text-sm text-white">${a.modelo || '—'}</td>
                            <td class="py-3 px-5">
                                ${a.usuarios ? `
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] text-white font-semibold">${a.usuarios.nome.charAt(0)}</div>
                                        <span class="text-sm text-slate-300">${a.usuarios.nome}</span>
                                    </div>
                                ` : '<span class="text-sm text-slate-500">Sem responsável</span>'}
                            </td>
                            <td class="py-3 px-5 text-xs text-slate-500">${formatDate(a.created_at)}</td>
                            <td class="py-3 px-5 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button onclick="openHistoricoModal(${a.id}, '${(a.modelo || '').replace(/'/g, "\\'")}', '${a.codigo_tombamento}')" class="p-2 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-all" title="Histórico de Manutenções">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </button>
                                    <button onclick='openEquipamentoModal(${JSON.stringify({ id: a.id, codigo_tombamento: a.codigo_tombamento, modelo: a.modelo, usuario_id: a.usuario_id })})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button onclick="deleteEquipamento(${a.id})" class="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Excluir">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtrados.length} equipamento(s)</div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro: ${err.message}</p>`;
    }
}

async function openEquipamentoModal(ativo = null) {
    const isEdit = ativo !== null;

    // Carrega lista de usuários para o dropdown
    let usuariosOptions = '';
    try {
        const { data: usuarios } = await db.from('usuarios').select('id, nome, username').order('nome');
        usuariosOptions = (usuarios || []).map(u => `<option value="${u.id}" ${isEdit && ativo.usuario_id === u.id ? 'selected' : ''}>${u.nome} (@${u.username})</option>`).join('');
    } catch (e) { console.warn(e); }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveEquipamento(event, ${isEdit ? ativo.id : 'null'})" class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Código de Tombamento <span class="text-red-400">*</span></label>
                    <input type="text" id="equip-tombamento" required value="${isEdit ? ativo.codigo_tombamento : ''}" placeholder="TOMB-2024-XXX" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Modelo</label>
                    <input type="text" id="equip-modelo" value="${isEdit && ativo.modelo ? ativo.modelo : ''}" placeholder="Dell Latitude 5520" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Responsável (Colaborador)</label>
                <select id="equip-responsavel" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="">Nenhum responsável</option>
                    ${usuariosOptions}
                </select>
            </div>
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</button>
            </div>
        </form>
    `);
}

async function handleSaveEquipamento(event, id) {
    event.preventDefault();
    const data = {
        codigo_tombamento: document.getElementById('equip-tombamento').value.trim(),
        modelo: document.getElementById('equip-modelo').value.trim() || null,
        usuario_id: document.getElementById('equip-responsavel').value || null,
    };
    try {
        if (id) {
            const { error } = await db.from('ativos').update(data).eq('id', id);
            if (error) throw error;
            showToast('Equipamento atualizado!', 'success');
        } else {
            const { error } = await db.from('ativos').insert(data);
            if (error) throw error;
            showToast('Equipamento cadastrado!', 'success');
        }
        closeModal();
        await loadEquipamentosTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function deleteEquipamento(id) {
    if (!confirm('Tem certeza que deseja excluir este equipamento? O histórico de manutenções também será apagado.')) return;
    try {
        const { error } = await db.from('ativos').delete().eq('id', id);
        if (error) throw error;
        showToast('Equipamento excluído.', 'success');
        await loadEquipamentosTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 4. HISTÓRICO DE MANUTENÇÕES
// ============================================================

async function openHistoricoModal(ativoId, modelo, tombamento) {
    const session = getSession();

    // Busca manutenções do ativo
    let manutencoes = [];
    try {
        const { data, error } = await db
            .from('manutencoes')
            .select(`*, tecnicos:tecnico_id ( nome )`)
            .eq('ativo_id', ativoId)
            .order('created_at', { ascending: false });
        if (!error) manutencoes = data || [];
    } catch (e) { console.warn(e); }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-bold text-white">Histórico de Manutenções</h3>
                    <p class="text-sm text-eva-muted mt-1">${modelo} — <span class="font-mono">${tombamento}</span></p>
                </div>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>

        <div class="p-6">
            <!-- Formulário de nova manutenção -->
            <form onsubmit="handleAddManutencao(event, ${ativoId}, '${modelo.replace(/'/g, "\\'")}', '${tombamento}')" class="mb-6">
                <label class="block text-sm font-medium text-slate-300 mb-2">Registrar Nova Manutenção</label>
                <div class="flex gap-2">
                    <input type="text" id="manutencao-descricao" required placeholder="Descreva o serviço realizado..." class="flex-1 bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                    <button type="submit" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0">Registrar</button>
                </div>
            </form>

            <!-- Lista de manutenções -->
            <div class="space-y-3">
                ${manutencoes.length === 0 ? `
                    <div class="empty-state py-6">
                        <p class="text-xs">Nenhuma manutenção registrada ainda.</p>
                    </div>
                ` : manutencoes.map(m => `
                    <div class="bg-slate-800/50 rounded-xl p-4 border-l-2 border-emerald-500/40">
                        <div class="flex items-start justify-between">
                            <p class="text-sm text-slate-200 leading-relaxed flex-1">${m.descricao}</p>
                        </div>
                        <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>📅 ${formatDate(m.created_at)}</span>
                            ${m.tecnicos?.nome ? `<span>🔧 ${m.tecnicos.nome}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
}

async function handleAddManutencao(event, ativoId, modelo, tombamento) {
    event.preventDefault();
    const session = getSession();
    const descricao = document.getElementById('manutencao-descricao').value.trim();
    if (!descricao) return;

    try {
        const insertData = {
            ativo_id: ativoId,
            descricao: descricao,
        };
        // Se for técnico, associa o registro ao técnico logado
        if (session && session.tipo === 'tecnico') {
            insertData.tecnico_id = session.id;
        }

        const { error } = await db.from('manutencoes').insert(insertData);
        if (error) throw error;

        showToast('Manutenção registrada!', 'success');
        // Reabre o modal para atualizar a lista
        await openHistoricoModal(ativoId, modelo, tombamento);
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 5. CADASTRO DE TÉCNICOS
// ============================================================

async function renderCadastroTecnicos() {
    const session = getSession();
    if (!session || session.perfil !== 'gestor_ti') {
        document.getElementById('app-content').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <p class="text-red-400 font-bold mb-2">Acesso Negado</p>
                    <p class="text-xs text-slate-500">Apenas Gestores de TIC podem acessar este cadastro.</p>
                </div>
            </div>
        `;
        return;
    }

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Técnicos de TIC</h2>
                    <p class="text-eva-muted text-sm mt-1">Gerenciamento da equipe de suporte e TIC</p>
                </div>
                <button onclick="openTecnicoModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Novo Técnico
                </button>
            </div>
            
            <div id="tecnicos-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadTecnicosTable();
}

async function loadTecnicosTable() {
    const container = document.getElementById('tecnicos-table');
    try {
        const { data: tecnicos, error } = await db
            .from('tecnicos')
            .select(`
                *,
                unidades:unidade_id ( nome_unidade )
            `)
            .order('nome');
        if (error) throw error;

        if (!tecnicos || tecnicos.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum técnico cadastrado.</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left bg-slate-800/30">
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nome</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Username</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Unidade Base</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Perfil</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">ID Telegram</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tecnicos.map(t => `
                            <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td class="py-3 px-5">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs text-white font-bold font-mono">
                                            ${t.nome.charAt(0)}
                                        </div>
                                        <span class="text-sm text-white font-medium">${t.nome}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-5 text-sm text-slate-400 font-mono">@${t.username}</td>
                                <td class="py-3 px-5 text-sm text-slate-300">${t.unidades?.nome_unidade || '<span class="text-slate-500">—</span>'}</td>
                                <td class="py-3 px-5">
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${t.perfil === 'gestor_ti' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}">
                                        ${t.perfil === 'gestor_ti' ? '🛡️ Gestor de TIC' : '🔧 Técnico'}
                                    </span>
                                </td>
                                <td class="py-3 px-5 text-xs font-mono text-slate-400">${t.telegram_chat_id || '<span class="text-slate-600">Nenhum</span>'}</td>
                                <td class="py-3 px-5 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick='openTecnicoModal(${JSON.stringify({ id: t.id, username: t.username, nome: t.nome, unidade_id: t.unidade_id, telegram_chat_id: t.telegram_chat_id, perfil: t.perfil })})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        </button>
                                        <button onclick="deleteTecnico('${t.id}')" class="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Excluir">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-4 border-t border-eva-border text-xs text-slate-500">${tecnicos.length} técnico(s) cadastrado(s)</div>
        `;
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro: ${err.message}</p>`;
    }
}

async function openTecnicoModal(tecnico = null) {
    const isEdit = tecnico !== null;

    // Carrega unidades para o dropdown
    let unidadesOptions = '';
    try {
        const { data: unidades } = await db.from('unidades').select('id, nome_unidade').order('id');
        unidadesOptions = (unidades || []).map(u => 
            `<option value="${u.id}" ${isEdit && tecnico.unidade_id == u.id ? 'selected' : ''}>${u.nome_unidade}</option>`
        ).join('');
    } catch (e) {
        console.warn('Erro ao carregar unidades:', e);
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Técnico' : 'Novo Técnico'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveTecnico(event, ${isEdit ? `'${tecnico.id}'` : 'null'})" class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nome Completo <span class="text-red-400">*</span></label>
                    <input type="text" id="tec-nome" required value="${isEdit ? tecnico.nome : ''}" placeholder="Nome completo" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Username (Login) <span class="text-red-400">*</span></label>
                    <input type="text" id="tec-username" required value="${isEdit ? tecnico.username : ''}" placeholder="nome.sobrenome" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">ID Chat Telegram (Notificações)</label>
                    <input type="text" id="tec-telegram" value="${isEdit && tecnico.telegram_chat_id ? tecnico.telegram_chat_id : ''}" placeholder="Ex: tg_carlos_001" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Senha ${isEdit ? '(deixe vazio para manter)' : '<span class="text-red-400">*</span>'}</label>
                    <input type="password" id="tec-senha" ${isEdit ? '' : 'required'} placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Unidade Base <span class="text-red-400">*</span></label>
                    <select id="tec-unidade" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Selecione...</option>
                        ${unidadesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Perfil de Acesso</label>
                    <select id="tec-perfil" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="tecnico" ${isEdit && tecnico.perfil === 'tecnico' ? 'selected' : ''}>🔧 Técnico de Suporte</option>
                        <option value="gestor_ti" ${isEdit && tecnico.perfil === 'gestor_ti' ? 'selected' : ''}>🛡️ Gestor de TIC</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Técnico'}</button>
            </div>
        </form>
    `);
}

async function handleSaveTecnico(event, id) {
    event.preventDefault();
    const data = {
        nome: document.getElementById('tec-nome').value.trim(),
        username: document.getElementById('tec-username').value.trim().toLowerCase(),
        telegram_chat_id: document.getElementById('tec-telegram').value.trim() || null,
        unidade_id: parseInt(document.getElementById('tec-unidade').value),
        perfil: document.getElementById('tec-perfil').value,
    };

    const senha = document.getElementById('tec-senha').value;
    if (senha) data.senha_hash = senha;
    if (!id && !senha) { showToast('Senha é obrigatória para novos técnicos.', 'warning'); return; }

    try {
        if (id) {
            const { error } = await db.from('tecnicos').update(data).eq('id', id);
            if (error) throw error;
            showToast('Técnico atualizado!', 'success');
        } else {
            const { error } = await db.from('tecnicos').insert(data);
            if (error) throw error;
            showToast('Técnico cadastrado!', 'success');
        }
        closeModal();
        await loadTecnicosTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function deleteTecnico(id) {
    if (!confirm('Tem certeza que deseja remover este técnico da equipe?')) return;
    try {
        const { error } = await db.from('tecnicos').delete().eq('id', id);
        if (error) throw error;
        showToast('Técnico removido com sucesso.', 'success');
        await loadTecnicosTable();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

console.log('✅ Módulo Cadastros carregado');
