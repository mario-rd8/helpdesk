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
    const isSaaS = session && session.tipo === 'saas_owner';

    try {
        let query = db.from('unidades').select(`
            *,
            clientes:cliente_id ( nome_cliente ),
            tecnicos:tecnico_responsavel_id ( nome )
        `);

        // Filtra por cliente_id se for gestor técnico
        if (session.tipo === 'tecnico') {
            // Unidades pertencem a clientes vinculados ao provedor do técnico
            const { data: clis } = await db.from('clientes').select('id').eq('provedor_ti_id', session.provedor_ti_id);
            const clisIds = (clis || []).map(c => c.id);
            query = query.in('cliente_id', clisIds.length > 0 ? clisIds : ['00000000-0000-0000-0000-000000000000']);
        }

        const { data: unidades, error } = await query.order('id');
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
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Empresa Cliente</th>
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
                            <td class="py-3 px-5 text-sm text-slate-300">${u.clientes?.nome_cliente || '—'}</td>
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
                                    ${isGestorTIC || isSaaS ? `
                                    <button onclick='openUnidadeModal(${JSON.stringify(u)})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button onclick="deleteUnidade(${u.id})" class="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Excluir">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                    ` : `
                                    <button disabled class="p-2 rounded-lg opacity-30 cursor-not-allowed text-slate-500" title="Sem permissão">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button disabled class="p-2 rounded-lg opacity-30 cursor-not-allowed text-slate-500" title="Sem permissão">
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

async function openUnidadeModal(unidade = null, forceClientId = null) {
    const isEdit = unidade !== null;
    const session = getSession();

    let tecnicosOptions = '';
    let clientesOptions = '';
    try {
        // Carrega técnicos vinculados ao provedor da sessão
        let queryTec = db.from('tecnicos').select('id, nome').order('nome');
        if (session.tipo === 'tecnico') {
            queryTec = queryTec.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: tecnicos } = await queryTec;
        tecnicosOptions = (tecnicos || []).map(t => 
            `<option value="${t.id}" ${isEdit && unidade.tecnico_responsavel_id === t.id ? 'selected' : ''}>🔧 ${t.nome}</option>`
        ).join('');

        // Carrega clientes do provedor
        let queryCli = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') {
            queryCli = queryCli.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: clientes } = await queryCli;
        clientesOptions = (clientes || []).map(c => {
            const isSelected = isEdit ? unidade.cliente_id === c.id : forceClientId === c.id;
            return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>🏢 ${c.nome_cliente}</option>`;
        }).join('');
    } catch (e) {
        console.warn('Erro ao carregar dados do modal de unidade:', e);
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
        <form onsubmit="handleSaveUnidade(event, ${isEdit ? unidade.id : 'null'}, '${forceClientId || ''}')" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Empresa Cliente <span class="text-red-400">*</span></label>
                <select id="unidade-cliente" required ${forceClientId ? 'disabled' : ''} class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="">Selecione uma empresa...</option>
                    ${clientesOptions}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nome da Unidade <span class="text-red-400">*</span></label>
                    <input type="text" id="unidade-nome" required value="${isEdit ? unidade.nome_unidade : ''}" placeholder="Ex: Filial Centro" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Tipo <span class="text-red-400">*</span></label>
                    <select id="unidade-tipo" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="filial" ${isEdit && unidade.tipo === 'filial' ? 'selected' : ''}>🏬 Filial</option>
                        <option value="holding" ${isEdit && unidade.tipo === 'holding' ? 'selected' : ''}>🏢 Holding</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Telefone da Unidade</label>
                    <input type="text" id="unidade-telefone" value="${isEdit && unidade.telefone ? unidade.telefone : ''}" placeholder="(11) 5555-5555" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Técnico Responsável</label>
                    <select id="unidade-tecnico" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Nenhum técnico responsável</option>
                        ${tecnicosOptions}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Endereço da Unidade</label>
                <input type="text" id="unidade-endereco" value="${isEdit && unidade.endereco ? unidade.endereco : ''}" placeholder="Rua Exemplo, 123 - Centro" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Unidade'}</button>
            </div>
        </form>
    `);
}

async function handleSaveUnidade(event, id, forceClientId = null) {
    event.preventDefault();
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';
    const isSaaS = session && session.tipo === 'saas_owner';
    if (!isGestorTIC && !isSaaS) {
        showToast('Apenas o Gestor de TIC ou Administrador SaaS pode criar ou editar unidades.', 'error');
        return;
    }

    const cliente_id = forceClientId || document.getElementById('unidade-cliente').value;
    const nome = document.getElementById('unidade-nome').value.trim();
    const tipo = document.getElementById('unidade-tipo').value;
    const telefone = document.getElementById('unidade-telefone').value.trim() || null;
    const endereco = document.getElementById('unidade-endereco').value.trim() || null;
    const tecnico_responsavel_id = document.getElementById('unidade-tecnico').value || null;
    
    const payload = { 
        cliente_id,
        nome_unidade: nome, 
        tipo, 
        telefone,
        endereco,
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
        if (window.currentRouteParams && window.currentRouteParams.id) {
            // Se estivermos dentro da view de detalhes do cliente, recarrega a view
            await renderDetalheCliente();
        } else {
            await loadUnidadesTable();
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function deleteUnidade(id) {
    const session = getSession();
    const isGestorTIC = session && session.perfil === 'gestor_ti';
    const isSaaS = session && session.tipo === 'saas_owner';
    if (!isGestorTIC && !isSaaS) {
        showToast('Apenas o Gestor de TIC ou Administrador SaaS pode excluir unidades.', 'error');
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
    const session = getSession();
    const content = document.getElementById('app-content');

    let clientesOptions = '';
    try {
        let queryCli = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') {
            queryCli = queryCli.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: clientes } = await queryCli;
        clientesOptions = (clientes || []).map(c => `<option value="${c.id}">🏢 ${c.nome_cliente}</option>`).join('');
    } catch (e) {
        console.warn(e);
    }

    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header e Filtros Unificados -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-eva-border pb-6">
                <div>
                    <h2 class="text-2xl font-bold text-white">Colaboradores</h2>
                    <p class="text-eva-muted text-xs mt-0.5">Gerenciamento de usuários</p>
                </div>
                
                <!-- Filtros e Botão agrupados à direita -->
                <div class="flex flex-wrap items-center gap-3 lg:ml-auto">
                    <div class="flex flex-wrap items-center gap-2">
                        <select id="filtro-cliente-colab" onchange="updateColabFilters(); loadColaboradoresTable();" class="bg-eva-card border border-eva-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors max-w-[150px]">
                            <option value="all">Todos os Clientes</option>
                            ${clientesOptions}
                        </select>
                        <select id="filtro-unidade-colab" onchange="loadColaboradoresTable()" class="bg-eva-card border border-eva-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors max-w-[130px]">
                            <option value="all">Todas as Unidades</option>
                        </select>
                        <select id="filtro-status-colab" onchange="loadColaboradoresTable()" class="bg-eva-card border border-eva-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="all">Todos Status</option>
                            <option value="true">✅ Ativos</option>
                            <option value="false">❌ Inativos</option>
                        </select>
                        <input type="text" id="busca-colab" onkeyup="loadColaboradoresTable()" placeholder="🔍 Buscar colaborador..." class="bg-eva-card border border-eva-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-44"/>
                    </div>

                    <button onclick="openColaboradorModal()" class="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        Novo Colaborador
                    </button>
                </div>
            </div>

            <div id="colaboradores-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-xl">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await updateColabFilters();
    await loadColaboradoresTable();
}

async function updateColabFilters() {
    const session = getSession();
    const filtroCliente = document.getElementById('filtro-cliente-colab')?.value || 'all';
    const selectUnidade = document.getElementById('filtro-unidade-colab');

    if (!selectUnidade) return;
    selectUnidade.innerHTML = '<option value="all">Todas as Unidades</option>';

    try {
        let query = db.from('unidades').select('id, nome_unidade').order('nome_unidade');
        
        if (filtroCliente !== 'all') {
            query = query.eq('cliente_id', filtroCliente);
        } else if (session.tipo === 'tecnico') {
            const { data: clis } = await db.from('clientes').select('id').eq('provedor_ti_id', session.provedor_ti_id);
            const clisIds = (clis || []).map(c => c.id);
            query = query.in('cliente_id', clisIds.length > 0 ? clisIds : ['00000000-0000-0000-0000-000000000000']);
        }
        
        const { data: unidades } = await query;
        if (unidades) {
            unidades.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.nome_unidade;
                selectUnidade.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Erro ao atualizar filtros de unidades:', e);
    }
}

async function loadColaboradoresTable() {
    const container = document.getElementById('colaboradores-table');
    const session = getSession();
    const filtroCliente = document.getElementById('filtro-cliente-colab')?.value || 'all';
    const filtroUnidade = document.getElementById('filtro-unidade-colab')?.value || 'all';
    const filtroStatus = document.getElementById('filtro-status-colab')?.value || 'all';
    const busca = document.getElementById('busca-colab')?.value?.toLowerCase() || '';

    try {
        let query = db.from('usuarios').select(`
            *,
            clientes:cliente_id ( nome_cliente ),
            unidades:unidade_id ( nome_unidade ),
            gestor:gestor_id ( nome )
        `).order('nome');

        if (session.tipo === 'tecnico') {
            const { data: clis } = await db.from('clientes').select('id').eq('provedor_ti_id', session.provedor_ti_id);
            const clisIds = (clis || []).map(c => c.id);
            query = query.in('cliente_id', clisIds.length > 0 ? clisIds : ['00000000-0000-0000-0000-000000000000']);
        }

        if (filtroCliente !== 'all') query = query.eq('cliente_id', filtroCliente);
        if (filtroUnidade !== 'all') query = query.eq('unidade_id', filtroUnidade);
        if (filtroStatus !== 'all') query = query.eq('ativo', filtroStatus === 'true');

        const { data: usuarios, error } = await query;
        if (error) {
            console.error("Erro ao buscar colaboradores:", error);
            container.innerHTML = `<div class="p-6 text-center text-red-400">Erro ao carregar colaboradores.</div>`;
            return;
        }

        if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum colaborador cadastrado.</p></div>`;
            return;
        }

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
                            <th class="py-3 px-4 text-xs font-semibold text-eva-muted uppercase tracking-wider">Cliente</th>
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
                                    <td class="py-3 px-4 text-sm text-slate-300">${u.clientes?.nome_cliente || '—'}</td>
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
                                            <button onclick='openColaboradorModal(${JSON.stringify({ id: u.id, username: u.username, nome: u.nome, whatsapp: u.whatsapp, cliente_id: u.cliente_id, unidade_id: u.unidade_id, nivel_hierarquico: u.nivel_hierarquico, gestor_id: u.gestor_id, ativo: u.ativo }).replace(/'/g, "&apos;")})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
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

async function openColaboradorModal(usuario = null, forceClientId = null) {
    const isEdit = usuario !== null;
    const session = getSession();

    let clientesOptions = '', unidadesOptions = '', gestoresOptions = '';
    try {
        // Carrega clientes do provedor
        let queryCli = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') {
            queryCli = queryCli.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: clientes } = await queryCli;
        clientesOptions = (clientes || []).map(c => {
            const isSelected = isEdit ? usuario.cliente_id === c.id : forceClientId === c.id;
            return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>🏢 ${c.nome_cliente}</option>`;
        }).join('');

        // Se for edição, ou se houver um cliente pré-selecionado, carrega unidades e gestores daquele cliente
        const activeClientId = isEdit ? usuario.cliente_id : (forceClientId || (clientes && clientes.length > 0 ? clientes[0].id : null));
        
        if (activeClientId) {
            const { data: unidades } = await db.from('unidades').select('id, nome_unidade').eq('cliente_id', activeClientId).order('nome_unidade');
            unidadesOptions = (unidades || []).map(u => `<option value="${u.id}" ${isEdit && usuario.unidade_id == u.id ? 'selected' : ''}>${u.nome_unidade}</option>`).join('');

            const { data: gestores } = await db.from('usuarios').select('id, nome').eq('cliente_id', activeClientId).in('nivel_hierarquico', ['gestor', 'diretor']).order('nome');
            gestoresOptions = (gestores || []).map(g => `<option value="${g.id}" ${isEdit && usuario.gestor_id === g.id ? 'selected' : ''}>${g.nome}</option>`).join('');
        }
    } catch (e) {
        console.warn('Erro ao carregar dados do modal de colaborador:', e);
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveColaborador(event, ${isEdit ? `'${usuario.id}'` : 'null'}, '${forceClientId || ''}')" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Empresa Cliente <span class="text-red-400">*</span></label>
                    <select id="colab-cliente" required onchange="updateColabModalDropdowns()" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all">
                        <option value="">Selecione...</option>
                        ${clientesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nome Completo <span class="text-red-400">*</span></label>
                    <input type="text" id="colab-nome" required value="${isEdit ? usuario.nome : ''}" placeholder="Nome completo" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Username (Login) <span class="text-red-400">*</span></label>
                    <input type="text" id="colab-username" required value="${isEdit ? usuario.username : ''}" placeholder="nome.sobrenome" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">WhatsApp</label>
                    <input type="text" id="colab-whatsapp" value="${isEdit && usuario.whatsapp ? usuario.whatsapp : ''}" placeholder="5511999999999" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Senha ${isEdit ? '(deixe vazio para manter)' : '<span class="text-red-400">*</span>'}</label>
                    <input type="password" id="colab-senha" ${isEdit ? '' : 'required'} placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Unidade <span class="text-red-400">*</span></label>
                    <select id="colab-unidade" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Selecione...</option>
                        ${unidadesOptions}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Nível Hierárquico</label>
                    <select id="colab-nivel" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="colaborador" ${isEdit && usuario.nivel_hierarquico === 'colaborador' ? 'selected' : ''}>👤 Colaborador</option>
                        <option value="gestor" ${isEdit && usuario.nivel_hierarquico === 'gestor' ? 'selected' : ''}>📋 Gestor (VIP)</option>
                        <option value="diretor" ${isEdit && usuario.nivel_hierarquico === 'diretor' ? 'selected' : ''}>🏢 Diretor (VIP)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Gestor Responsável</label>
                    <select id="colab-gestor" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                        <option value="">Nenhum</option>
                        ${gestoresOptions}
                    </select>
                </div>
            </div>
            <div class="flex items-center">
                <label class="flex items-center gap-3 cursor-pointer py-2.5">
                    <input type="checkbox" id="colab-ativo" ${isEdit && usuario.ativo === false ? '' : 'checked'} class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"/>
                    <span class="text-sm text-slate-300">Colaborador Ativo</span>
                </label>
            </div>
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</button>
            </div>
        </form>
    `);
}

async function updateColabModalDropdowns() {
    const clientId = document.getElementById('colab-cliente').value;
    const selectUnidade = document.getElementById('colab-unidade');
    const selectGestor = document.getElementById('colab-gestor');

    if (!selectUnidade || !selectGestor) return;

    selectUnidade.innerHTML = '<option value="">Selecione...</option>';
    selectGestor.innerHTML = '<option value="">Nenhum</option>';

    if (!clientId) return;

    try {
        const { data: unidades } = await db.from('unidades').select('id, nome_unidade').eq('cliente_id', clientId).order('nome_unidade');
        if (unidades) {
            unidades.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.nome_unidade;
                selectUnidade.appendChild(opt);
            });
        }

        const { data: gestores } = await db.from('usuarios').select('id, nome').eq('cliente_id', clientId).in('nivel_hierarquico', ['gestor', 'diretor']).order('nome');
        if (gestores) {
            gestores.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.nome;
                selectGestor.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Erro ao atualizar dropdowns do modal:', e);
    }
}

async function handleSaveColaborador(event, id, forceClientId = null) {
    event.preventDefault();
    const data = {
        cliente_id: forceClientId || document.getElementById('colab-cliente').value,
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
        if (window.currentRouteParams && window.currentRouteParams.id) {
            await renderDetalheCliente();
        } else {
            await loadColaboradoresTable();
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 3. CADASTRO DE EQUIPAMENTOS
// ============================================================

let techEquipsData = [];
let techEquipsSearch = '';
let techEquipsSortField = 'id';
let techEquipsSortAsc = false;

async function renderCadastroEquipamentos() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-white">Equipamentos</h2>
                    <p class="text-eva-muted text-sm mt-1">Inventário de ativos e histórico de manutenções</p>
                </div>
            </div>

            <!-- Mini-Dashboard de KPIs & Busca Horizontal -->
            <div class="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl mb-6">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="flex flex-wrap items-center gap-8">
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Total de Equipamentos</span>
                            <h5 id="kpi-tech-equips-total" class="text-2xl font-bold text-white mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Computadores</span>
                            <h5 id="kpi-tech-equips-computadores" class="text-2xl font-bold text-blue-400 mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Periféricos</span>
                            <h5 id="kpi-tech-equips-perifericos" class="text-2xl font-bold text-emerald-400 mt-1">...</h5>
                        </div>
                    </div>
                    <div class="w-full lg:w-80 flex-shrink-0 flex items-center gap-3">
                        <button onclick="openEquipamentoModal()" class="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 flex-shrink-0">
                            ➕ Novo Ativo
                        </button>
                        <input type="text" placeholder="🔍 Buscar por tombamento, modelo..." oninput="filterTechEquips(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                </div>
            </div>

            <div id="equipamentos-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-xl">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await fetchAndRenderTechEquips();
}

async function fetchAndRenderTechEquips() {
    const session = getSession();
    try {
        let query = db.from('ativos').select(`
            *,
            clientes:cliente_id ( nome_cliente ),
            usuarios:usuario_id ( nome, username )
        `);

        if (session.tipo === 'tecnico') {
            const { data: clis } = await db.from('clientes').select('id').eq('provedor_ti_id', session.provedor_ti_id);
            const clisIds = (clis || []).map(c => c.id);
            query = query.in('cliente_id', clisIds.length > 0 ? clisIds : ['00000000-0000-0000-0000-000000000000']);
        }

        const { data: ativos, error } = await query;
        if (error) throw error;

        techEquipsData = ativos || [];
        renderTechEquipsTableInner();
    } catch (e) {
        console.error(e);
        const container = document.getElementById('equipamentos-table');
        if (container) container.innerHTML = `<p class="text-red-400 text-sm p-6 font-medium">Erro ao carregar equipamentos: ${e.message}</p>`;
    }
}

function filterTechEquips(val) {
    techEquipsSearch = val.toLowerCase().trim();
    renderTechEquipsTableInner();
}

function sortTechEquips(field) {
    if (techEquipsSortField === field) {
        techEquipsSortAsc = !techEquipsSortAsc;
    } else {
        techEquipsSortField = field;
        techEquipsSortAsc = true;
    }
    renderTechEquipsTableInner();
}

function renderTechEquipsTableInner() {
    const container = document.getElementById('equipamentos-table');
    if (!container) return;

    // 1. Filtrar
    let filtered = techEquipsData.filter(e => 
        (e.codigo_tombamento || '').toLowerCase().includes(techEquipsSearch) || 
        (e.modelo || '').toLowerCase().includes(techEquipsSearch) ||
        (e.usuarios?.nome || '').toLowerCase().includes(techEquipsSearch) ||
        (e.clientes?.nome_cliente || '').toLowerCase().includes(techEquipsSearch)
    );

    // 2. Ordenar
    filtered.sort((a, b) => {
        let valA = a[techEquipsSortField];
        let valB = b[techEquipsSortField];
        if (techEquipsSortField === 'cliente') {
            valA = a.clientes?.nome_cliente || '';
            valB = b.clientes?.nome_cliente || '';
        } else if (techEquipsSortField === 'usuario') {
            valA = a.usuarios?.nome || '';
            valB = b.usuarios?.nome || '';
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return techEquipsSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // 3. KPIs
    const total = techEquipsData.length;
    const computadores = techEquipsData.filter(e => e.tipo_ativo === 'computador').length;
    const perifericos = techEquipsData.filter(e => e.tipo_ativo === 'periferico').length;

    document.getElementById('kpi-tech-equips-total').textContent = total;
    document.getElementById('kpi-tech-equips-computadores').textContent = computadores;
    document.getElementById('kpi-tech-equips-perifericos').textContent = perifericos;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum equipamento encontrado.</p></div>`;
        return;
    }

    const sortIndicator = (field) => {
        if (techEquipsSortField !== field) return '';
        return techEquipsSortAsc ? ' ▲' : ' ▼';
    };

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="border-b border-eva-border bg-slate-800/30">
                    <th onclick="sortTechEquips('codigo_tombamento')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Tombamento${sortIndicator('codigo_tombamento')}</th>
                    <th onclick="sortTechEquips('cliente')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Empresa Cliente${sortIndicator('cliente')}</th>
                    <th onclick="sortTechEquips('modelo')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Equipamento/Modelo${sortIndicator('modelo')}</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Tipo</th>
                    <th onclick="sortTechEquips('usuario')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Responsável${sortIndicator('usuario')}</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(a => {
                    const payload = {
                        id: a.id,
                        codigo_tombamento: a.codigo_tombamento,
                        modelo: a.modelo,
                        cliente_id: a.cliente_id,
                        usuario_id: a.usuario_id
                    };
                    return `
                        <tr onclick='openEquipamentoModal(JSON.parse(this.dataset.item))' data-item='${JSON.stringify(payload).replace(/'/g, "&apos;")}' class="border-b border-slate-800/50 hover:bg-slate-800/35 transition-colors cursor-pointer">
                            <td class="py-3.5 px-5 text-sm font-mono text-emerald-400 font-semibold">${a.codigo_tombamento}</td>
                            <td class="py-3.5 px-5 text-sm text-slate-300">${a.clientes?.nome_cliente || '—'}</td>
                            <td class="py-3.5 px-5 text-sm text-white font-medium">${a.modelo || '—'}</td>
                            <td class="py-3.5 px-5">
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${a.tipo_ativo === 'periferico' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}">
                                    ${a.tipo_ativo === 'periferico' ? '🔌 Periférico' : '💻 Computador'}
                                </span>
                            </td>
                            <td class="py-3.5 px-5">
                                ${a.usuarios ? `
                                    <div class="flex items-center gap-2">
                                        <div class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">${a.usuarios.nome.charAt(0)}</div>
                                        <span class="text-sm text-slate-300">${a.usuarios.nome}</span>
                                    </div>
                                ` : '<span class="text-sm text-slate-500 italic">Sem responsável</span>'}
                            </td>
                            <td class="py-3.5 px-5 text-right" onclick="event.stopPropagation()">
                                <div class="flex items-center justify-end gap-1">
                                    <button onclick="openHistoricoModal(${a.id}, '${(a.modelo || '').replace(/'/g, "\\'")}', '${a.codigo_tombamento}')" class="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-all" title="Histórico de Manutenções">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </button>
                                    <button onclick='openEquipamentoModal(JSON.parse(this.dataset.item))' data-item='${JSON.stringify(payload).replace(/'/g, "&apos;")}' class="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button onclick="deleteEquipamento(${a.id})" class="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Excluir">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtered.length} equipamento(s) exibido(s)</div>
    `;
}

async function openEquipamentoModal(ativo = null, forceClientId = null) {
    const isEdit = ativo !== null;
    const session = getSession();

    let clientesOptions = '', usuariosOptions = '';
    let ativoCompleto = ativo;
    let manutencoesHtml = '';

    try {
        if (isEdit && ativo.id) {
            const { data: fetchAtivo } = await db.from('ativos').select('*').eq('id', ativo.id).single();
            if (fetchAtivo) {
                ativoCompleto = fetchAtivo;
            }
        }

        // Carrega clientes do provedor
        let queryCli = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') {
            queryCli = queryCli.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: clientes } = await queryCli;
        clientesOptions = (clientes || []).map(c => {
            const isSelected = isEdit ? (ativoCompleto?.cliente_id === c.id) : (forceClientId === c.id);
            return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>🏢 ${c.nome_cliente}</option>`;
        }).join('');

        // Carrega os colaboradores associados a esse cliente
        const activeClientId = isEdit ? ativoCompleto?.cliente_id : (forceClientId || (clientes && clientes.length > 0 ? clientes[0].id : null));
        if (activeClientId) {
            const { data: usuarios } = await db.from('usuarios').select('id, nome, username').eq('cliente_id', activeClientId).order('nome');
            usuariosOptions = (usuarios || []).map(u => `<option value="${u.id}" ${isEdit && ativoCompleto?.usuario_id === u.id ? 'selected' : ''}>${u.nome} (@${u.username})</option>`).join('');
        }

        // Busca manutenções para o histórico se for edição
        if (isEdit && ativoCompleto?.id) {
            const { data: manutencoes } = await db
                .from('manutencoes')
                .select(`*, tecnicos:tecnico_id ( nome )`)
                .eq('ativo_id', ativoCompleto.id)
                .order('created_at', { ascending: false });

            manutencoesHtml = `
                <div class="mt-6 pt-6 border-t border-eva-border">
                    <h4 class="text-sm font-semibold text-white mb-3">🛠️ Histórico de Manutenções</h4>
                    <div class="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                        ${!manutencoes || manutencoes.length === 0 ? `
                            <p class="text-xs text-slate-500 italic py-2">Nenhuma manutenção registrada para este ativo.</p>
                        ` : manutencoes.map(m => `
                            <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                                <p class="text-xs text-slate-200">${m.descricao}</p>
                                <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                                    <span>📅 ${formatDate(m.created_at)}</span>
                                    ${m.tecnicos?.nome ? `<span>🔧 ${m.tecnicos.nome}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.warn('Erro ao carregar dados do modal de equipamento:', e);
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveEquipamento(event, ${isEdit ? ativoCompleto.id : 'null'}, '${forceClientId || ''}')" class="p-6 space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Empresa Cliente <span class="text-red-400">*</span></label>
                <select id="equip-cliente" required ${forceClientId ? 'disabled' : ''} onchange="updateEquipModalDropdown()" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-medium">
                    <option value="">Selecione...</option>
                    ${clientesOptions}
                </select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Código de Tombamento <span class="text-red-400">*</span></label>
                    <input type="text" id="equip-tombamento" required value="${isEdit ? ativoCompleto.codigo_tombamento : ''}" placeholder="TOMB-2024-XXX" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Equipamento</label>
                    <input type="text" id="equip-modelo" value="${isEdit && ativoCompleto.modelo ? ativoCompleto.modelo : ''}" placeholder="Dell Latitude 5520" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Tipo do Ativo <span class="text-red-400">*</span></label>
                <div class="flex items-center gap-6 bg-slate-800/40 border border-slate-700/80 rounded-xl p-3">
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                        <input type="radio" name="equip-tipo" value="computador" ${!isEdit || (ativoCompleto && ativoCompleto.tipo_ativo !== 'periferico') ? 'checked' : ''} class="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-slate-600 bg-slate-800 focus:ring-offset-0"/>
                        💻 Computador
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                        <input type="radio" name="equip-tipo" value="periferico" ${isEdit && (ativoCompleto && ativoCompleto.tipo_ativo === 'periferico') ? 'checked' : ''} class="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-slate-600 bg-slate-800 focus:ring-offset-0"/>
                        🔌 Periférico
                    </label>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Responsável (Colaborador)</label>
                <select id="equip-responsavel" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="">Nenhum responsável</option>
                    ${usuariosOptions}
                </select>
            </div>
            
            ${manutencoesHtml}

            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</button>
            </div>
        </form>
    `);
}

async function updateEquipModalDropdown() {
    const clientId = document.getElementById('equip-cliente').value;
    const selectResponsavel = document.getElementById('equip-responsavel');
    if (!selectResponsavel) return;

    selectResponsavel.innerHTML = '<option value="">Nenhum responsável</option>';
    if (!clientId) return;

    try {
        const { data: usuarios } = await db.from('usuarios').select('id, nome, username').eq('cliente_id', clientId).order('nome');
        if (usuarios) {
            usuarios.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.nome} (@${u.username})`;
                selectResponsavel.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Erro ao atualizar dropdown de responsáveis:', e);
    }
}

async function handleSaveEquipamento(event, id, forceClientId = null) {
    event.preventDefault();
    const data = {
        cliente_id: forceClientId || document.getElementById('equip-cliente').value,
        codigo_tombamento: document.getElementById('equip-tombamento').value.trim(),
        modelo: document.getElementById('equip-modelo').value.trim() || null,
        usuario_id: document.getElementById('equip-responsavel').value || null,
        tipo_ativo: document.querySelector('input[name="equip-tipo"]:checked')?.value || 'computador'
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
        if (window.currentRouteParams && window.currentRouteParams.id) {
            await renderDetalheCliente();
        } else {
            await fetchAndRenderTechEquips();
        }
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
        await fetchAndRenderTechEquips();
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
    if (!session || (session.perfil !== 'gestor_ti' && session.tipo !== 'saas_owner')) {
        document.getElementById('app-content').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <p class="text-red-400 font-bold mb-2">Acesso Negado</p>
                    <p class="text-xs text-slate-500">Apenas Gestores de TIC ou Administradores SaaS podem acessar este cadastro.</p>
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
    const session = getSession();
    try {
        let query = db.from('tecnicos').select(`
            *,
            provedores_ti:provedor_ti_id ( nome_provedor )
        `);

        if (session.tipo === 'tecnico') {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        const { data: tecnicos, error } = await query.order('nome');
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
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Provedor TI</th>
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
                                <td class="py-3 px-5 text-sm text-slate-300">${t.provedores_ti?.nome_provedor || '—'}</td>
                                <td class="py-3 px-5">
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${t.perfil === 'gestor_ti' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}">
                                        ${t.perfil === 'gestor_ti' ? '🛡️ Gestor de TIC' : '🔧 Técnico'}
                                    </span>
                                </td>
                                <td class="py-3 px-5 text-xs font-mono text-slate-400">${t.telegram_chat_id || '<span class="text-slate-600">Nenhum</span>'}</td>
                                <td class="py-3 px-5 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick='openTecnicoModal(${JSON.stringify({ id: t.id, username: t.username, nome: t.nome, provedor_ti_id: t.provedor_ti_id, telegram_chat_id: t.telegram_chat_id, perfil: t.perfil })})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
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
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';

    let provedoresOptions = '', clientesOptions = '', filiaisOptions = '';
    try {
        if (isSaaS) {
            const { data: provedores } = await db.from('provedores_ti').select('id, nome_provedor').eq('ativo', true).order('nome_provedor');
            provedoresOptions = (provedores || []).map(p => 
                `<option value="${p.id}" ${isEdit && tecnico.provedor_ti_id === p.id ? 'selected' : ''}>🏢 ${p.nome_provedor}</option>`
            ).join('');
        }

        // Carrega clientes do provedor do técnico logado
        let queryCli = db.from('clientes').select('id, nome_cliente').order('nome_cliente');
        if (session.tipo === 'tecnico') {
            queryCli = queryCli.eq('provedor_ti_id', session.provedor_ti_id);
        }
        const { data: clientes } = await queryCli;
        clientesOptions = (clientes || []).map(c => 
            `<option value="${c.id}" ${isEdit && tecnico.cliente_padrao_id === c.id ? 'selected' : ''}>🏢 ${c.nome_cliente}</option>`
        ).join('');

        // Se houver cliente_padrao_id, carrega unidades dele
        const activeClientId = isEdit ? tecnico.cliente_padrao_id : (clientes && clientes.length > 0 ? clientes[0].id : null);
        if (activeClientId) {
            const { data: filiais } = await db.from('unidades').select('id, nome_unidade').eq('cliente_id', activeClientId).order('nome_unidade');
            filiaisOptions = (filiais || []).map(f => 
                `<option value="${f.id}" ${isEdit && tecnico.filial_padrao_id === f.id ? 'selected' : ''}>🏬 ${f.nome_unidade}</option>`
            ).join('');
        }
    } catch (e) {
        console.warn('Erro ao carregar dados do modal de técnico:', e);
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
        <form onsubmit="handleSaveTecnico(event, ${isEdit ? `'${tecnico.id}'` : 'null'})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            ${isSaaS ? `
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Provedor de TI <span class="text-red-400">*</span></label>
                <select id="tec-provedor" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all">
                    <option value="">Selecione...</option>
                    ${provedoresOptions}
                </select>
            </div>
            ` : ''}
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
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Cliente Padrão (Foco Operacional)</label>
                    <select id="tec-cliente" onchange="updateTecnicoModalFiliais()" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all">
                        <option value="">Nenhum</option>
                        ${clientesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Filial Padrão</label>
                    <select id="tec-filial" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all">
                        <option value="">Nenhuma</option>
                        ${filiaisOptions}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Perfil de Acesso</label>
                <select id="tec-perfil" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="tecnico" ${isEdit && tecnico.perfil === 'tecnico' ? 'selected' : ''}>🔧 Técnico de Suporte</option>
                    <option value="gestor_ti" ${isEdit && tecnico.perfil === 'gestor_ti' ? 'selected' : ''}>🛡️ Gestor de TIC</option>
                </select>
            </div>
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">${isEdit ? 'Salvar Alterações' : 'Cadastrar Técnico'}</button>
            </div>
        </form>
    `);
}

async function updateTecnicoModalFiliais() {
    const clientId = document.getElementById('tec-cliente').value;
    const selectFilial = document.getElementById('tec-filial');
    if (!selectFilial) return;

    selectFilial.innerHTML = '<option value="">Nenhuma</option>';
    if (!clientId) return;

    try {
        const { data: filiais } = await db.from('unidades').select('id, nome_unidade').eq('cliente_id', clientId).order('nome_unidade');
        if (filiais) {
            filiais.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = `🏬 ${f.nome_unidade}`;
                selectFilial.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Erro ao atualizar filiais no modal de técnico:', e);
    }
}

async function handleSaveTecnico(event, id) {
    event.preventDefault();
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';

    const data = {
        nome: document.getElementById('tec-nome').value.trim(),
        username: document.getElementById('tec-username').value.trim().toLowerCase(),
        telegram_chat_id: document.getElementById('tec-telegram').value.trim() || null,
        perfil: document.getElementById('tec-perfil').value,
        cliente_padrao_id: document.getElementById('tec-cliente').value || null,
        filial_padrao_id: document.getElementById('tec-filial').value ? parseInt(document.getElementById('tec-filial').value) : null,
        provedor_ti_id: isSaaS ? document.getElementById('tec-provedor').value : session.provedor_ti_id
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

// ============================================================
// 5. CADASTRO DE PROVEDORES DE TI (SaaS Owner)
// ============================================================

async function renderCadastroProvedores() {
    const session = getSession();
    if (session.tipo !== 'saas_owner') {
        showToast('Acesso restrito ao Administrador do SaaS.', 'error');
        return;
    }

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Provedores de TI (Tenants)</h2>
                    <p class="text-eva-muted text-sm mt-1">Gerenciamento de empresas de TI parceiras da plataforma</p>
                </div>
                <button onclick="openProvedorModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Novo Provedor
                </button>
            </div>
            <div id="provedores-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadProvedoresTable();
}

async function loadProvedoresTable() {
    const container = document.getElementById('provedores-table');
    try {
        const { data: provedores, error } = await db
            .from('provedores_ti')
            .select('*')
            .order('nome_provedor');
        if (error) throw error;

        if (!provedores || provedores.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum provedor cadastrado.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="w-full">
                <thead>
                    <tr class="border-b border-eva-border text-left bg-slate-800/30">
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nome do Provedor</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">CNPJ</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                        <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${provedores.map(p => `
                        <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td class="py-3 px-5 text-sm text-white font-medium">${p.nome_provedor}</td>
                            <td class="py-3 px-5 text-sm text-slate-300">${p.cnpj || '—'}</td>
                            <td class="py-3 px-5">
                                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${p.ativo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}">
                                    ${p.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td class="py-3 px-5 text-right">
                                <button onclick='openProvedorModal(${JSON.stringify(p)})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
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

async function openProvedorModal(provedor = null) {
    const isEdit = provedor !== null;
    let gestor = null;
    if (isEdit) {
        try {
            const { data } = await db
                .from('tecnicos')
                .select('*')
                .eq('provedor_ti_id', provedor.id)
                .eq('perfil', 'gestor_ti')
                .maybeSingle();
            gestor = data;
        } catch (e) {
            console.warn('Erro ao buscar gestor do provedor:', e);
        }
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Provedor' : 'Novo Provedor'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveProvedor(event, ${isEdit ? `'${provedor.id}'` : 'null'})" class="p-6 space-y-4">
            <div>
                <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-3">Dados da Empresa</h4>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-2">Nome do Provedor <span class="text-red-400">*</span></label>
                        <input type="text" id="prov-nome" required value="${isEdit ? provedor.nome_provedor : ''}" placeholder="Ex: Selfware TI" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-2">CNPJ</label>
                        <input type="text" id="prov-cnpj" value="${isEdit && provedor.cnpj ? provedor.cnpj : ''}" placeholder="00.000.000/0000-00" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                    <div class="flex items-center">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" id="prov-ativo" ${isEdit && !provedor.ativo ? '' : 'checked'} class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"/>
                            <span class="text-xs text-slate-300">Provedor Ativo</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="pt-4 border-t border-eva-border">
                <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-3">Dados de Acesso do Gestor</h4>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-2">Nome Completo do Gestor <span class="text-red-400">*</span></label>
                        <input type="text" id="prov-gestor-nome" required value="${isEdit && gestor ? gestor.nome : ''}" placeholder="Ex: Roberto Silva" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-300 mb-2">Username de Acesso <span class="text-red-400">*</span></label>
                            <input type="text" id="prov-gestor-username" required value="${isEdit && gestor ? gestor.username : ''}" placeholder="roberto.silva" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-300 mb-2">${isEdit ? 'Redefinir Senha (Opcional)' : 'Senha Inicial *'}</label>
                            <input type="password" id="prov-gestor-senha" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '••••••••' : 'Defina a senha inicial'}" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">Salvar</button>
            </div>
        </form>
    `);
}

async function handleSaveProvedor(event, id) {
    event.preventDefault();
    const data = {
        nome_provedor: document.getElementById('prov-nome').value.trim(),
        cnpj: document.getElementById('prov-cnpj').value.trim() || null,
        ativo: document.getElementById('prov-ativo').checked
    };
    try {
        if (id) {
            // Atualiza Provedor
            const { error: erroProvedor } = await db.from('provedores_ti').update(data).eq('id', id);
            if (erroProvedor) throw erroProvedor;

            // Busca e Atualiza/Cria Gestor
            const gestorNome = document.getElementById('prov-gestor-nome').value.trim();
            const gestorUsername = document.getElementById('prov-gestor-username').value.trim().toLowerCase();
            const gestorSenha = document.getElementById('prov-gestor-senha').value;

            const { data: gestorAtual } = await db
                .from('tecnicos')
                .select('id')
                .eq('provedor_ti_id', id)
                .eq('perfil', 'gestor_ti')
                .maybeSingle();

            if (gestorAtual) {
                const updateGestorData = { 
                    nome: gestorNome,
                    username: gestorUsername
                };
                if (gestorSenha) {
                    updateGestorData.senha_hash = gestorSenha;
                }
                const { error: erroGestor } = await db.from('tecnicos').update(updateGestorData).eq('id', gestorAtual.id);
                if (erroGestor) throw erroGestor;
            } else {
                const gestorData = {
                    provedor_ti_id: id,
                    nome: gestorNome,
                    username: document.getElementById('prov-gestor-username').value.trim().toLowerCase(),
                    senha_hash: gestorSenha || '123456',
                    perfil: 'gestor_ti'
                };
                const { error: erroGestor } = await db.from('tecnicos').insert([gestorData]);
                if (erroGestor) throw erroGestor;
            }

            showToast('Provedor e Gestor atualizados!', 'success');
            closeModal();
            await loadProvedoresTable();
        } else {
            // Criação do Provedor
            const { data: novoProvedor, error: erroProvedor } = await db
                .from('provedores_ti')
                .insert([data])
                .select()
                .single();

            if (erroProvedor) throw erroProvedor;

            // Criação do Primeiro Gestor
            const gestorData = {
                provedor_ti_id: novoProvedor.id,
                nome: document.getElementById('prov-gestor-nome').value.trim(),
                username: document.getElementById('prov-gestor-username').value.trim().toLowerCase(),
                senha_hash: document.getElementById('prov-gestor-senha').value,
                perfil: 'gestor_ti'
            };

            const { error: erroGestor } = await db
                .from('tecnicos')
                .insert([gestorData]);

            if (erroGestor) {
                // Rollback manual do Provedor de TI criado
                await db.from('provedores_ti').delete().eq('id', novoProvedor.id);
                throw new Error(`Erro ao criar o Gestor: ${erroGestor.message}. Cadastro do provedor cancelado.`);
            }

            showToast('Provedor e primeiro Gestor cadastrados com sucesso!', 'success');
            closeModal();
            await loadProvedoresTable();
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 6. CADASTRO DE CLIENTES (SaaS Owner / Gestor TI)
// ============================================================

async function renderCadastroClientes() {
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';
    const isGestor = session.tipo === 'tecnico' && session.perfil === 'gestor_ti';

    if (!isSaaS && !isGestor) {
        showToast('Acesso restrito aos administradores e gestores de TIC.', 'error');
        return;
    }

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-bold text-white">Empresas Clientes</h2>
                    <p class="text-eva-muted text-sm mt-1">Empresas atendidas e sob suporte do Provedor de TI</p>
                </div>
                <button onclick="openClienteModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Novo Cliente
                </button>
            </div>
            <div id="clientes-table" class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden">
                <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
            </div>
        </div>
    `;
    await loadClientesTable();
}

async function loadClientesTable() {
    const container = document.getElementById('clientes-table');
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';

    try {
        let query = db.from('clientes').select(`
            *,
            provedores_ti:provedor_ti_id ( nome_provedor )
        `).order('nome_cliente');

        if (session.tipo === 'tecnico') {
            query = query.eq('provedor_ti_id', session.provedor_ti_id);
        }

        const { data: clientes, error } = await query;
        if (error) throw error;

        if (!clientes || clientes.length === 0) {
            container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum cliente cadastrado.</p></div>`;
            return;
        }

        // Se for SaaS Admin (Dono da Plataforma), agrupamos as empresas por provedor
        if (isSaaS) {
            // Remove a classe de borda e background padrão do container para permitir cards separados
            container.className = "space-y-6";

            // Agrupa
            const agrupados = {};
            clientes.forEach(c => {
                const provId = c.provedor_ti_id || 'sem_provedor';
                const provNome = c.provedores_ti?.nome_provedor || 'Sem Provedor de TI';
                if (!agrupados[provId]) {
                    agrupados[provId] = {
                        nome: provNome,
                        clientes: []
                    };
                }
                agrupados[provId].clientes.push(c);
            });

            container.innerHTML = Object.entries(agrupados).map(([provId, grupo]) => `
                <div class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-lg">
                    <!-- Cabeçalho do Provedor -->
                    <div class="bg-slate-800/40 px-6 py-4 border-b border-eva-border flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">🏢</span>
                            <h3 class="text-base font-bold text-white">Provedor: ${grupo.nome}</h3>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">${grupo.clientes.length} Cliente(s)</span>
                    </div>

                    <!-- Tabela de Clientes do Provedor -->
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-eva-border text-left bg-slate-800/10">
                                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nome da Empresa</th>
                                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">CNPJ</th>
                                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Responsável</th>
                                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Vencimento Contrato</th>
                                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${grupo.clientes.map(c => `
                                    <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td class="py-3 px-5 text-sm text-white font-medium">
                                            <a href="#/clientes/detalhe?id=${c.id}" class="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">${c.nome_cliente}</a>
                                        </td>
                                        <td class="py-3 px-5 text-sm text-slate-300">${c.cnpj || '—'}</td>
                                        <td class="py-3 px-5 text-sm text-slate-300">
                                            ${c.responsavel_nome ? `<span>${c.responsavel_nome}</span>` : '<span class="text-slate-500">—</span>'}
                                        </td>
                                        <td class="py-3 px-5 text-sm text-slate-400">
                                            ${c.data_vencimento_contrato ? `📅 ${formatDate(c.data_vencimento_contrato).split(' ')[0]}` : '<span class="text-slate-500">—</span>'}
                                        </td>
                                        <td class="py-3 px-5 text-right">
                                            <div class="flex justify-end gap-2">
                                                <a href="#/clientes/detalhe?id=${c.id}" class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Ver Detalhes / Operações">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                </a>
                                                <button onclick='openClienteModal(${JSON.stringify(c).replace(/'/g, "&apos;")})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('');

        } else {
            // Visualização clássica do Gestor TI (apenas uma tabela, pois ele só tem 1 provedor)
            container.className = "bg-eva-card border border-eva-border rounded-2xl overflow-hidden";
            container.innerHTML = `
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-eva-border text-left bg-slate-800/30">
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Nome da Empresa</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">CNPJ</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Responsável</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Vencimento Contrato</th>
                            <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientes.map(c => `
                            <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td class="py-3 px-5 text-sm text-white font-medium">
                                    <a href="#/clientes/detalhe?id=${c.id}" class="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">${c.nome_cliente}</a>
                                </td>
                                <td class="py-3 px-5 text-sm text-slate-300">${c.cnpj || '—'}</td>
                                <td class="py-3 px-5 text-sm text-slate-300">
                                    ${c.responsavel_nome ? `<span>${c.responsavel_nome}</span>` : '<span class="text-slate-500">—</span>'}
                                </td>
                                <td class="py-3 px-5 text-sm text-slate-400">
                                    ${c.data_vencimento_contrato ? `📅 ${formatDate(c.data_vencimento_contrato).split(' ')[0]}` : '<span class="text-slate-500">—</span>'}
                                </td>
                                <td class="py-3 px-5 text-right">
                                    <div class="flex justify-end gap-2">
                                        <a href="#/clientes/detalhe?id=${c.id}" class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Ver Detalhes / Operações">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        </a>
                                        <button onclick='openClienteModal(${JSON.stringify(c).replace(/'/g, "&apos;")})' class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Editar">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (err) {
        container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro: ${err.message}</p>`;
    }
}

async function openClienteModal(cliente = null) {
    const isEdit = cliente !== null;
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';

    let provedoresOptions = '';
    if (isSaaS) {
        try {
            const { data: provedores } = await db.from('provedores_ti').select('id, nome_provedor').eq('ativo', true).order('nome_provedor');
            provedoresOptions = (provedores || []).map(p => `<option value="${p.id}" ${isEdit && cliente.provedor_ti_id === p.id ? 'selected' : ''}>${p.nome_provedor}</option>`).join('');
        } catch (e) { console.warn(e); }
    }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveCliente(event, ${isEdit ? `'${cliente.id}'` : 'null'})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Nome da Empresa Cliente <span class="text-red-400">*</span></label>
                    <input type="text" id="cli-nome" required value="${isEdit ? cliente.nome_cliente : ''}" placeholder="Ex: Juntos Educação" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">CNPJ</label>
                    <input type="text" id="cli-cnpj" value="${isEdit && cliente.cnpj ? cliente.cnpj : ''}" placeholder="00.000.000/0000-00" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Nome do Responsável</label>
                    <input type="text" id="cli-resp-nome" value="${isEdit && cliente.responsavel_nome ? cliente.responsavel_nome : ''}" placeholder="Nome do contato principal" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Telefone do Responsável</label>
                    <input type="text" id="cli-resp-tel" value="${isEdit && cliente.responsavel_telefone ? cliente.responsavel_telefone : ''}" placeholder="(11) 99999-9999" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Email do Responsável</label>
                    <input type="email" id="cli-resp-email" value="${isEdit && cliente.responsavel_email ? cliente.responsavel_email : ''}" placeholder="contato@empresa.com" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Data Vencimento Contrato</label>
                    <input type="date" id="cli-venc-contrato" value="${isEdit && cliente.data_vencimento_contrato ? cliente.data_vencimento_contrato : ''}" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Contrato PDF (Simulação Upload / URL)</label>
                <input type="text" id="cli-contrato-url" value="${isEdit && cliente.contrato_pdf_url ? cliente.contrato_pdf_url : ''}" placeholder="https://exemplo.com/contrato.pdf" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"/>
            </div>
            ${isSaaS ? `
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Provedor TI Responsável <span class="text-red-400">*</span></label>
                <select id="cli-provedor" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                    <option value="">Selecione um provedor...</option>
                    ${provedoresOptions}
                </select>
            </div>
            ` : ''}
            <div class="flex gap-3 pt-3">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">Salvar</button>
            </div>
        </form>
    `);
}

async function handleSaveCliente(event, id) {
    event.preventDefault();
    const session = getSession();
    const isSaaS = session.tipo === 'saas_owner';

    const data = {
        nome_cliente: document.getElementById('cli-nome').value.trim(),
        cnpj: document.getElementById('cli-cnpj').value.trim() || null,
        responsavel_nome: document.getElementById('cli-resp-nome').value.trim() || null,
        responsavel_telefone: document.getElementById('cli-resp-tel').value.trim() || null,
        responsavel_email: document.getElementById('cli-resp-email').value.trim() || null,
        data_vencimento_contrato: document.getElementById('cli-venc-contrato').value || null,
        contrato_pdf_url: document.getElementById('cli-contrato-url').value.trim() || null,
        provedor_ti_id: isSaaS ? document.getElementById('cli-provedor').value : session.provedor_ti_id
    };

    try {
        if (id) {
            const { error } = await db.from('clientes').update(data).eq('id', id);
            if (error) {
                showToast(`Erro ao atualizar: ${error.message}`, 'error');
            } else {
                showToast('Cliente atualizado com sucesso!', 'success');
            }
        } else {
            const { error } = await db.from('clientes').insert(data);
            if (error) {
                showToast(`Erro ao cadastrar: ${error.message}`, 'error');
            } else {
                showToast('Cliente cadastrado com sucesso!', 'success');
            }
        }
        closeModal();
        await loadClientesTable();
        // Recarrega a barra lateral para atualizar a lista cascata se for técnico/gestor
        if (session.tipo === 'tecnico') {
            await setupSidebar(session);
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// 7. VIEW DE DETALHES DO CLIENTE (INTERFACE POR ABAS)
// ============================================================

let currentActiveClientTab = 'dashboard';

// Estado para busca e ordenação locais na visualização do cliente
let clientColabsData = [];
let clientColabsSearch = '';
let clientColabsSortField = 'nome';
let clientColabsSortAsc = true;

let clientEquipsData = [];
let clientEquipsSearch = '';
let clientEquipsSortField = 'id';
let clientEquipsSortAsc = false;

async function renderDetalheCliente() {
    const params = window.currentRouteParams || {};
    const clienteId = params.id;
    if (!clienteId) {
        document.getElementById('app-content').innerHTML = `
            <div class="p-8 text-center text-red-400">
                Erro: Cliente não especificado.
            </div>
        `;
        return;
    }

    try {
        const { data: cliente, error } = await db.from('clientes').select('*').eq('id', clienteId).single();
        if (error || !cliente) throw new Error('Cliente não encontrado.');

        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="p-6 lg:p-8 animate-slide-up">
                <!-- Top Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-eva-border pb-6">
                    <div>
                        <div class="flex items-center gap-3">
                            <h2 class="text-3xl font-extrabold text-white tracking-tight">${cliente.nome_cliente}</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cliente Ativo</span>
                        </div>
                        <p class="text-eva-muted text-sm mt-1.5 font-mono">CNPJ: ${cliente.cnpj || 'Sem CNPJ'}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openClienteModal(JSON.parse(this.dataset.cliente))" data-cliente='${JSON.stringify(cliente).replace(/'/g, "&apos;")}' class="btn-ghost py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700">
                            ✏️ Editar Cadastro
                        </button>
                        <a href="#/clientes" class="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                            ⬅️ Voltar à Lista
                        </a>
                    </div>
                </div>

                <!-- Navigation Tabs (5 Abas) -->
                <div class="flex border-b border-slate-800 gap-6 mb-8 overflow-x-auto scrollbar-none">
                    <button onclick="switchClientTab('dashboard')" id="tab-btn-dashboard" class="py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${currentActiveClientTab === 'dashboard' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}">
                        📊 Dashboard
                    </button>
                    <button onclick="switchClientTab('contrato_filiais')" id="tab-btn-contrato_filiais" class="py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${currentActiveClientTab === 'contrato_filiais' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}">
                        🏢 Contrato e Filiais
                    </button>
                    <button onclick="switchClientTab('colaboradores')" id="tab-btn-colaboradores" class="py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${currentActiveClientTab === 'colaboradores' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}">
                        👥 Colaboradores
                    </button>
                    <button onclick="switchClientTab('equipamentos')" id="tab-btn-equipamentos" class="py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${currentActiveClientTab === 'equipamentos' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}">
                        💻 Equipamentos
                    </button>
                    <button onclick="switchClientTab('tecnicos')" id="tab-btn-tecnicos" class="py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${currentActiveClientTab === 'tecnicos' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}">
                        🔧 Técnicos
                    </button>
                </div>

                <!-- Dynamic Container -->
                <div id="client-tab-container"></div>
            </div>
        `;

        await loadClientTabContent(cliente);
    } catch (e) {
        document.getElementById('app-content').innerHTML = `
            <div class="p-8 text-center text-red-400">
                Erro: ${e.message}
            </div>
        `;
    }
}

function switchClientTab(tabName) {
    currentActiveClientTab = tabName;
    renderDetalheCliente();
}

async function loadClientTabContent(cliente) {
    const container = document.getElementById('client-tab-container');
    if (!container) return;

    if (currentActiveClientTab === 'dashboard') {
        container.innerHTML = `<div class="flex items-center justify-center py-12"><div class="spinner"></div></div>`;
        try {
            // Chamados abertos
            const { count: chamadosAbertos } = await db.from('chamados')
                .select('*', { count: 'exact', head: true })
                .eq('cliente_id', cliente.id)
                .in('status', ['aberto', 'em_atendimento']);

            // Total de Ativos/Equipamentos
            const { count: totalAtivos } = await db.from('ativos')
                .select('*', { count: 'exact', head: true })
                .eq('cliente_id', cliente.id);

            // Total de Filiais/Unidades
            const { count: totalUnidades } = await db.from('unidades')
                .select('*', { count: 'exact', head: true })
                .eq('cliente_id', cliente.id);

            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-all">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-eva-muted text-xs font-semibold uppercase tracking-wider">Chamados Ativos</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">🚨</div>
                        </div>
                        <h4 class="text-3xl font-extrabold text-white">${chamadosAbertos || 0}</h4>
                        <p class="text-xs text-slate-500 mt-2">Aguardando atendimento ou em curso</p>
                    </div>

                    <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-all">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-eva-muted text-xs font-semibold uppercase tracking-wider">Ativos de TI</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">💻</div>
                        </div>
                        <h4 class="text-3xl font-extrabold text-white">${totalAtivos || 0}</h4>
                        <p class="text-xs text-slate-500 mt-2">Dispositivos e ativos inventariados</p>
                    </div>

                    <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-all">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-eva-muted text-xs font-semibold uppercase tracking-wider">Filiais (Unidades)</span>
                            <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">🏬</div>
                        </div>
                        <h4 class="text-3xl font-extrabold text-white">${totalUnidades || 0}</h4>
                        <p class="text-xs text-slate-500 mt-2">Locais operacionais cobertos</p>
                    </div>
                </div>

                <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl">
                    <h3 class="text-base font-bold text-white mb-4">Resumo dos Chamados Recentes</h3>
                    <div id="chamados-recentes-cliente" class="text-sm text-slate-400 py-6 text-center">Nenhum chamado registrado recentemente.</div>
                </div>
            `;

            const { data: chamados } = await db.from('chamados')
                .select('id, assunto, status, created_at')
                .eq('cliente_id', cliente.id)
                .order('created_at', { ascending: false })
                .limit(5);

            const chamadosContainer = document.getElementById('chamados-recentes-cliente');
            if (chamados && chamados.length > 0 && chamadosContainer) {
                chamadosContainer.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="border-b border-slate-800 text-xs text-eva-muted uppercase font-semibold">
                                    <th class="py-2.5">ID</th>
                                    <th class="py-2.5">Assunto</th>
                                    <th class="py-2.5">Status</th>
                                    <th class="py-2.5">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${chamados.map(ch => `
                                    <tr class="border-b border-slate-800/40 hover:bg-slate-800/20 text-slate-300">
                                        <td class="py-2.5 font-mono text-xs text-slate-500">#${ch.id.substring(0, 8)}</td>
                                        <td class="py-2.5 text-white font-medium">${ch.assunto}</td>
                                        <td class="py-2.5">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${ch.status === 'resolvido' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${ch.status}</span>
                                        </td>
                                        <td class="py-2.5 text-xs text-slate-500">${formatDate(ch.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch (e) {
            console.warn(e);
        }

    } else if (currentActiveClientTab === 'contrato_filiais') {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- LADO A: Informações do Contrato -->
                <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl h-fit">
                    <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">📂 Dados do Contrato</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between border-b border-slate-800 pb-2">
                            <span class="text-eva-muted">Responsável Principal</span>
                            <span class="text-white font-medium">${cliente.responsavel_nome || 'Não Informado'}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-800 pb-2">
                            <span class="text-eva-muted">Telefone Contato</span>
                            <span class="text-white font-medium">${cliente.responsavel_telefone || 'Não Informado'}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-800 pb-2">
                            <span class="text-eva-muted">E-mail Comercial</span>
                            <span class="text-white font-medium">${cliente.responsavel_email || 'Não Informado'}</span>
                        </div>
                        <div class="flex justify-between border-b border-slate-800 pb-2">
                            <span class="text-eva-muted">Vencimento Contratual</span>
                            <span class="text-emerald-400 font-semibold">${cliente.data_vencimento_contrato ? formatDate(cliente.data_vencimento_contrato).split(' ')[0] : 'Indeterminado'}</span>
                        </div>
                        <div class="pt-2 flex justify-between items-center">
                            <span class="text-eva-muted">Documento PDF</span>
                            ${cliente.contrato_pdf_url 
                                ? `<a href="${cliente.contrato_pdf_url}" target="_blank" class="text-emerald-400 hover:underline flex items-center gap-1">📄 Visualizar Contrato</a>`
                                : `<span class="text-slate-500">Nenhum anexo</span>`}
                        </div>
                    </div>
                </div>

                <!-- LADO B: Ferramenta de Filiais -->
                <div class="bg-eva-card border border-eva-border p-6 rounded-2xl shadow-xl">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-base font-bold text-white">🏬 Filiais (Unidades)</h3>
                        <button onclick="openUnidadeModal(null, '${cliente.id}')" class="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                            ➕ Nova Filial
                        </button>
                    </div>
                    <div id="detalhe-filiais-list" class="text-slate-500 text-xs py-6 text-center">Buscando filiais...</div>
                </div>
            </div>
        `;
        await loadClientFiliaisList(cliente.id);

    } else if (currentActiveClientTab === 'colaboradores') {
        container.innerHTML = `
            <!-- Top Gray Band (Mini-Dashboard & Filtro) -->
            <div class="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl mb-6">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="flex flex-wrap items-center gap-8">
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Total de Colaboradores</span>
                            <h5 id="kpi-colabs-total" class="text-2xl font-bold text-white mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Líderes / VIPs</span>
                            <h5 id="kpi-colabs-vips" class="text-2xl font-bold text-amber-400 mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden lg:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Distribuição por Filial</span>
                            <p id="kpi-colabs-distribuicao" class="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">...</p>
                        </div>
                    </div>
                    <div class="w-full lg:w-72 flex-shrink-0">
                        <input type="text" placeholder="🔍 Buscar colaborador..." oninput="filterClientColabs(this.value, '${cliente.id}')" class="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                </div>
            </div>

            <!-- Tabela de Colaboradores -->
            <div class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-xl">
                <div id="colabs-table-container">
                    <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await fetchAndRenderColabs(cliente.id);

    } else if (currentActiveClientTab === 'equipamentos') {
        container.innerHTML = `
            <!-- Top Gray Band (Mini-Dashboard & Filtro) -->
            <div class="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl mb-6">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="flex flex-wrap items-center gap-8">
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Total de Equipamentos</span>
                            <h5 id="kpi-equips-total" class="text-2xl font-bold text-white mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Computadores</span>
                            <h5 id="kpi-equips-computadores" class="text-2xl font-bold text-blue-400 mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Periféricos</span>
                            <h5 id="kpi-equips-perifericos" class="text-2xl font-bold text-emerald-400 mt-1">...</h5>
                        </div>
                    </div>
                    <div class="w-full lg:w-72 flex-shrink-0 flex items-center gap-3">
                        <button onclick="openEquipamentoModal(null, '${cliente.id}')" class="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 flex-shrink-0">
                            ➕ Novo Ativo
                        </button>
                        <input type="text" placeholder="🔍 Buscar ativo..." oninput="filterClientEquips(this.value, '${cliente.id}')" class="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                </div>
            </div>

            <!-- Tabela de Equipamentos -->
            <div class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-xl">
                <div id="equips-table-container">
                    <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await fetchAndRenderEquips(cliente.id);
    } else if (currentActiveClientTab === 'tecnicos') {
        container.innerHTML = `
            <!-- Top Gray Band (Mini-Dashboard & Filtro) -->
            <div class="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl mb-6">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="flex flex-wrap items-center gap-8">
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Técnicos Atendendo</span>
                            <h5 id="kpi-tecnicos-total" class="text-2xl font-bold text-white mt-1">...</h5>
                        </div>
                        <div class="border-l border-slate-700/80 h-10 hidden md:block"></div>
                        <div>
                            <span class="text-xs text-eva-muted uppercase font-semibold">Gestores de TI</span>
                            <h5 id="kpi-tecnicos-gestores" class="text-2xl font-bold text-amber-400 mt-1">...</h5>
                        </div>
                    </div>
                    <div class="w-full lg:w-72 flex-shrink-0">
                        <input type="text" placeholder="🔍 Buscar técnico..." oninput="filterClientTecnicos(this.value, '${cliente.provedor_ti_id}')" class="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                    </div>
                </div>
            </div>

            <!-- Tabela de Técnicos -->
            <div class="bg-eva-card border border-eva-border rounded-2xl overflow-hidden shadow-xl">
                <div id="tecnicos-table-container">
                    <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await fetchAndRenderClientTecnicos(cliente.provedor_ti_id);
    }
}

// ----------------------------------------------------------------------
// ABA 2: Contrato e Filiais - Helper
// ----------------------------------------------------------------------
async function loadClientFiliaisList(clienteId) {
    try {
        const { data: filiais } = await db.from('unidades')
            .select('*, tecnicos:tecnico_responsavel_id ( nome )')
            .eq('cliente_id', clienteId)
            .order('nome_unidade');

        const filiaisContainer = document.getElementById('detalhe-filiais-list');
        if (filiaisContainer) {
            if (!filiais || filiais.length === 0) {
                filiaisContainer.innerHTML = `<span class="text-slate-500">Nenhuma filial cadastrada para este cliente.</span>`;
            } else {
                filiaisContainer.innerHTML = `
                    <div class="overflow-y-auto max-h-[350px]">
                        <table class="w-full text-left">
                            <tbody>
                                ${filiais.map(fil => `
                                    <tr class="border-b border-slate-800/40 py-3">
                                        <td class="py-2.5">
                                            <p class="font-medium text-white text-sm">${fil.nome_unidade}</p>
                                            <p class="text-xs text-slate-500">${fil.endereco || 'Sem endereço'}</p>
                                        </td>
                                        <td class="py-2.5 text-xs text-slate-400">🔧 Resp: ${fil.tecnicos?.nome || 'Ninguém'}</td>
                                        <td class="py-2.5 text-right">
                                            <button onclick='openUnidadeModal(JSON.parse(this.dataset.item), "${clienteId}")' data-item='${JSON.stringify(fil).replace(/'/g, "&apos;")}' class="btn-ghost p-1.5 rounded-lg text-emerald-500 hover:text-emerald-400 text-xs">✏️ Editar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }
    } catch (e) { console.warn(e); }
}

// ----------------------------------------------------------------------
// ABA 3: Colaboradores - Lógica
// ----------------------------------------------------------------------
async function fetchAndRenderColabs(clienteId) {
    try {
        const { data: colabs } = await db.from('usuarios')
            .select('id, nome, username, whatsapp, nivel_hierarquico, unidade_id, unidades:unidade_id ( nome_unidade ), ativo, cliente_id, gestor_id')
            .eq('cliente_id', clienteId)
            .order('nome');

        clientColabsData = colabs || [];
        renderColabsTableInner(clienteId);
    } catch (e) {
        console.warn(e);
        const container = document.getElementById('colabs-table-container');
        if (container) container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro ao carregar colaboradores: ${e.message}</p>`;
    }
}

function filterClientColabs(val, clienteId) {
    clientColabsSearch = val.toLowerCase().trim();
    renderColabsTableInner(clienteId);
}

function sortClientColabs(field, clienteId) {
    if (clientColabsSortField === field) {
        clientColabsSortAsc = !clientColabsSortAsc;
    } else {
        clientColabsSortField = field;
        clientColabsSortAsc = true;
    }
    renderColabsTableInner(clienteId);
}

function renderColabsTableInner(clienteId) {
    // 1. Filtragem
    let filtered = clientColabsData.filter(c => 
        (c.nome || '').toLowerCase().includes(clientColabsSearch) || 
        (c.username || '').toLowerCase().includes(clientColabsSearch) ||
        (c.unidades?.nome_unidade || '').toLowerCase().includes(clientColabsSearch)
    );

    // 2. Ordenação
    filtered.sort((a, b) => {
        let valA = a[clientColabsSortField];
        let valB = b[clientColabsSortField];
        if (clientColabsSortField === 'unidade') {
            valA = a.unidades?.nome_unidade || '';
            valB = b.unidades?.nome_unidade || '';
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return clientColabsSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // 3. Atualizar KPIs do mini-dashboard
    const total = clientColabsData.length;
    const vips = clientColabsData.filter(u => u.nivel_hierarquico === 'gestor' || u.nivel_hierarquico === 'diretor').length;

    // Distribuição por filial
    const distMap = {};
    clientColabsData.forEach(c => {
        const key = c.unidades?.nome_unidade || 'Sem filial';
        distMap[key] = (distMap[key] || 0) + 1;
    });
    const distText = Object.entries(distMap).map(([name, count]) => `${name}: ${count}`).join(' · ') || 'Nenhuma filial associada';

    document.getElementById('kpi-colabs-total').textContent = total;
    document.getElementById('kpi-colabs-vips').textContent = vips;
    document.getElementById('kpi-colabs-distribuicao').innerHTML = distText;

    // 4. Renderizar Tabela
    const container = document.getElementById('colabs-table-container');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum colaborador encontrado.</p></div>`;
        return;
    }

    const sortIndicator = (field) => {
        if (clientColabsSortField !== field) return '';
        return clientColabsSortAsc ? ' ▲' : ' ▼';
    };

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="border-b border-eva-border bg-slate-800/30">
                    <th onclick="sortClientColabs('nome', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Nome${sortIndicator('nome')}</th>
                    <th onclick="sortClientColabs('username', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Username${sortIndicator('username')}</th>
                    <th onclick="sortClientColabs('unidade', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Filial${sortIndicator('unidade')}</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">WhatsApp</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(c => {
                    const isVip = c.nivel_hierarquico === 'gestor' || c.nivel_hierarquico === 'diretor';
                    const payload = {
                        id: c.id,
                        username: c.username,
                        nome: c.nome,
                        whatsapp: c.whatsapp,
                        cliente_id: c.cliente_id,
                        unidade_id: c.unidade_id,
                        nivel_hierarquico: c.nivel_hierarquico,
                        gestor_id: c.gestor_id,
                        ativo: c.ativo
                    };
                    return `
                        <tr onclick='openColaboradorModal(JSON.parse(this.dataset.item), "${clienteId}")' data-item='${JSON.stringify(payload).replace(/'/g, "&apos;")}' class="border-b border-slate-800/50 hover:bg-slate-800/35 transition-colors cursor-pointer">
                            <td class="py-3.5 px-5 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="text-white font-medium">${c.nome}</span>
                                    ${isVip ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">VIP (${c.nivel_hierarquico})</span>` : ''}
                                </div>
                            </td>
                            <td class="py-3.5 px-5 text-sm text-slate-400">@${c.username}</td>
                            <td class="py-3.5 px-5 text-sm text-slate-300">🏬 ${c.unidades?.nome_unidade || 'Sem filial'}</td>
                            <td class="py-3.5 px-5 text-sm text-slate-400 font-mono">${c.whatsapp || '—'}</td>
                            <td class="py-3.5 px-5">
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${c.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">
                                    ${c.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtered.length} colaborador(es) exibido(s)</div>
    `;
}

// ----------------------------------------------------------------------
// ABA 4: Equipamentos - Lógica
// ----------------------------------------------------------------------
async function fetchAndRenderEquips(clienteId) {
    try {
        const { data: ativos } = await db.from('ativos')
            .select('id, codigo_tombamento, modelo, tipo_ativo, usuario_id, usuarios:usuario_id ( nome ), cliente_id')
            .eq('cliente_id', clienteId);

        clientEquipsData = ativos || [];
        renderEquipsTableInner(clienteId);
    } catch (e) {
        console.warn(e);
        const container = document.getElementById('equips-table-container');
        if (container) container.innerHTML = `<p class="text-red-400 text-sm p-6">Erro ao carregar equipamentos: ${e.message}</p>`;
    }
}

function filterClientEquips(val, clienteId) {
    clientEquipsSearch = val.toLowerCase().trim();
    renderEquipsTableInner(clienteId);
}

function sortClientEquips(field, clienteId) {
    if (clientEquipsSortField === field) {
        clientEquipsSortAsc = !clientEquipsSortAsc;
    } else {
        clientEquipsSortField = field;
        clientEquipsSortAsc = true;
    }
    renderEquipsTableInner(clienteId);
}

function renderEquipsTableInner(clienteId) {
    // 1. Filtragem
    let filtered = clientEquipsData.filter(e => 
        (e.codigo_tombamento || '').toLowerCase().includes(clientEquipsSearch) || 
        (e.modelo || '').toLowerCase().includes(clientEquipsSearch) ||
        (e.usuarios?.nome || '').toLowerCase().includes(clientEquipsSearch)
    );

    // 2. Ordenação
    filtered.sort((a, b) => {
        let valA = a[clientEquipsSortField];
        let valB = b[clientEquipsSortField];
        if (clientEquipsSortField === 'usuario') {
            valA = a.usuarios?.nome || '';
            valB = b.usuarios?.nome || '';
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return clientEquipsSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // 3. Atualizar KPIs do mini-dashboard
    const total = clientEquipsData.length;
    const computadores = clientEquipsData.filter(e => e.tipo_ativo === 'computador').length;
    const perifericos = clientEquipsData.filter(e => e.tipo_ativo === 'periferico').length;

    document.getElementById('kpi-equips-total').textContent = total;
    document.getElementById('kpi-equips-computadores').textContent = computadores;
    document.getElementById('kpi-equips-perifericos').textContent = perifericos;

    // 4. Renderizar Tabela
    const container = document.getElementById('equips-table-container');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum equipamento encontrado.</p></div>`;
        return;
    }

    const sortIndicator = (field) => {
        if (clientEquipsSortField !== field) return '';
        return clientEquipsSortAsc ? ' ▲' : ' ▼';
    };

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="border-b border-eva-border bg-slate-800/30">
                    <th onclick="sortClientEquips('codigo_tombamento', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Tombamento${sortIndicator('codigo_tombamento')}</th>
                    <th onclick="sortClientEquips('modelo', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Equipamento/Modelo${sortIndicator('modelo')}</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Tipo</th>
                    <th onclick="sortClientEquips('usuario', '${clienteId}')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Responsável${sortIndicator('usuario')}</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(at => {
                    const payload = {
                        id: at.id,
                        codigo_tombamento: at.codigo_tombamento,
                        modelo: at.modelo,
                        cliente_id: at.cliente_id,
                        usuario_id: at.usuario_id
                    };
                    return `
                        <tr onclick='openEquipamentoModal(JSON.parse(this.dataset.item), "${clienteId}")' data-item='${JSON.stringify(payload).replace(/'/g, "&apos;")}' class="border-b border-slate-800/50 hover:bg-slate-800/35 transition-colors cursor-pointer">
                            <td class="py-3.5 px-5 text-sm font-mono text-emerald-400 font-semibold">${at.codigo_tombamento}</td>
                            <td class="py-3.5 px-5 text-sm text-white font-medium">${at.modelo || '—'}</td>
                            <td class="py-3.5 px-5">
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${at.tipo_ativo === 'periferico' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}">
                                    ${at.tipo_ativo === 'periferico' ? '🔌 Periférico' : '💻 Computador'}
                                </span>
                            </td>
                            <td class="py-3.5 px-5 text-sm text-slate-300">👤 ${at.usuarios?.nome || '<span class="text-slate-500 italic">Sem responsável</span>'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtered.length} equipamento(s) exibido(s)</div>
    `;
}

let clientTecnicosData = [];
let clientTecnicosSearch = '';
let clientTecnicosSortField = 'nome';
let clientTecnicosSortAsc = true;

async function fetchAndRenderClientTecnicos(provedorTiId) {
    try {
        if (!provedorTiId) {
            const container = document.getElementById('tecnicos-table-container');
            if (container) container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum provedor associado a este cliente.</p></div>`;
            return;
        }

        const { data: tecnicos, error } = await db.from('tecnicos')
            .select('*')
            .eq('provedor_ti_id', provedorTiId)
            .order('nome');

        if (error) throw error;

        clientTecnicosData = tecnicos || [];
        renderClientTecnicosTableInner();
    } catch (e) {
        console.warn(e);
        const container = document.getElementById('tecnicos-table-container');
        if (container) container.innerHTML = `<p class="text-red-400 text-sm p-6 font-medium">Erro ao carregar técnicos: ${e.message}</p>`;
    }
}

function filterClientTecnicos(val, provedorTiId) {
    clientTecnicosSearch = val.toLowerCase().trim();
    renderClientTecnicosTableInner();
}

function sortClientTecnicos(field) {
    if (clientTecnicosSortField === field) {
        clientTecnicosSortAsc = !clientTecnicosSortAsc;
    } else {
        clientTecnicosSortField = field;
        clientTecnicosSortAsc = true;
    }
    renderClientTecnicosTableInner();
}

function renderClientTecnicosTableInner() {
    const container = document.getElementById('tecnicos-table-container');
    if (!container) return;

    // 1. Filtrar
    let filtered = clientTecnicosData.filter(t => 
        (t.nome || '').toLowerCase().includes(clientTecnicosSearch) || 
        (t.username || '').toLowerCase().includes(clientTecnicosSearch)
    );

    // 2. Ordenar
    filtered.sort((a, b) => {
        let valA = String(a[clientTecnicosSortField] || '').toLowerCase();
        let valB = String(b[clientTecnicosSortField] || '').toLowerCase();
        return clientTecnicosSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // 3. KPIs
    const total = clientTecnicosData.length;
    const gestores = clientTecnicosData.filter(t => t.perfil === 'gestor_ti').length;

    const totalEl = document.getElementById('kpi-tecnicos-total');
    const gestoresEl = document.getElementById('kpi-tecnicos-gestores');
    if (totalEl) totalEl.textContent = total;
    if (gestoresEl) gestoresEl.textContent = gestores;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state py-12"><p class="text-sm">Nenhum técnico encontrado.</p></div>`;
        return;
    }

    const sortIndicator = (field) => {
        if (clientTecnicosSortField !== field) return '';
        return clientTecnicosSortAsc ? ' ▲' : ' ▼';
    };

    const roleLabels = {
        'saas_admin': 'Administrador SaaS',
        'tecnico': 'Técnico de Suporte',
        'gestor_ti': 'Gestor de TIC',
    };

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="border-b border-eva-border bg-slate-800/30">
                    <th onclick="sortClientTecnicos('nome')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Nome${sortIndicator('nome')}</th>
                    <th onclick="sortClientTecnicos('username')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Username${sortIndicator('username')}</th>
                    <th onclick="sortClientTecnicos('perfil')" class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider cursor-pointer hover:text-white select-none">Função/Perfil${sortIndicator('perfil')}</th>
                    <th class="py-3 px-5 text-xs font-semibold text-eva-muted uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(t => `
                    <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td class="py-3.5 px-5">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs select-none">
                                    ${t.nome ? t.nome.substring(0,2).toUpperCase() : '?'}
                                </div>
                                <span class="text-sm text-white font-medium">${t.nome}</span>
                            </div>
                        </td>
                        <td class="py-3.5 px-5 text-sm text-slate-300 font-mono">@${t.username}</td>
                        <td class="py-3.5 px-5">
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${t.perfil === 'gestor_ti' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}">
                                ${roleLabels[t.perfil] || t.perfil}
                            </span>
                        </td>
                        <td class="py-3.5 px-5">
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                                Ativo
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="p-4 border-t border-eva-border text-xs text-slate-500">${filtered.length} técnico(s) exibido(s)</div>
    `;
}

console.log('✅ Módulo Cadastros carregado');


