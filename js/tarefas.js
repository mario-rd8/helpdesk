// ============================================================
// Módulo de Tarefas — Gestão de Equipe (Gestor ↔ Técnico)
// ============================================================
// Funcionalidades:
// - Gestor: Kanban por técnico, criar tarefa, broadcast global
// - Técnico: Coluna lateral no kanban, chat, marcar concluída
// ============================================================

// ============================================================
// A. PAINEL DO GESTOR — Tela de Tarefas (#/tarefas)
// ============================================================

async function renderTarefas() {
    const session = getSession();
    if (!session || session.perfil !== 'gestor_ti') {
        document.getElementById('app-content').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <p class="text-red-400 font-bold mb-2">Acesso Negado</p>
                    <p class="text-xs text-slate-500">Apenas Gestores de TIC podem acessar o módulo de Tarefas.</p>
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
                    <h2 class="text-2xl font-bold text-white">Tarefas da Equipe</h2>
                    <p class="text-eva-muted text-sm mt-1">Delegue e acompanhe demandas internas dos técnicos</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="openTarefaModal(null, true)" class="btn-ghost px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                        📢 Tarefa para Todos
                    </button>
                    <button onclick="openTarefaModal()" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        Nova Tarefa
                    </button>
                </div>
            </div>

            <!-- Kanban por Técnico -->
            <div id="tarefas-board" class="flex gap-4 overflow-x-auto pb-4">
                <div class="flex items-center justify-center py-20 w-full">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    await loadTarefasBoard();
}

async function loadTarefasBoard() {
    const session = getSession();
    const board = document.getElementById('tarefas-board');

    try {
        // Busca técnicos do provedor
        const { data: tecnicos } = await db.from('tecnicos')
            .select('id, nome, foto_url')
            .eq('provedor_ti_id', session.provedor_ti_id)
            .order('nome');

        // Busca todas as tarefas do provedor
        const { data: tarefas, error } = await db.from('tarefas')
            .select('*')
            .eq('provedor_ti_id', session.provedor_ti_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Agrupa tarefas por técnico
        const tarefasPorTecnico = {};
        const tarefasGlobais = [];

        (tarefas || []).forEach(t => {
            if (t.is_global) {
                tarefasGlobais.push(t);
            } else if (t.tecnico_id) {
                if (!tarefasPorTecnico[t.tecnico_id]) tarefasPorTecnico[t.tecnico_id] = [];
                tarefasPorTecnico[t.tecnico_id].push(t);
            }
        });

        // Renderiza uma coluna "Global" + uma coluna por técnico
        let html = '';

        // Coluna de tarefas globais (broadcasting)
        html += renderTarefaColumn('📢 Todos', null, tarefasGlobais, true);

        // Colunas por técnico
        (tecnicos || []).forEach(tec => {
            const tarefasTec = tarefasPorTecnico[tec.id] || [];
            html += renderTarefaColumn(tec.nome, tec.id, tarefasTec, false, tec.foto_url);
        });

        board.innerHTML = html;

    } catch (err) {
        board.innerHTML = `<p class="text-red-400 text-sm">Erro ao carregar tarefas: ${err.message}</p>`;
    }
}

function renderTarefaColumn(nome, tecnicoId, tarefas, isGlobal = false, fotoUrl = null) {
    const pendentes = tarefas.filter(t => t.status === 'Pendente');
    const concluidas = tarefas.filter(t => t.status === 'Concluida');
    const initial = nome.charAt(0).toUpperCase();

    return `
        <div class="bg-eva-dark/50 rounded-2xl overflow-hidden min-w-[280px] max-w-[300px] flex-shrink-0 ${isGlobal ? 'border-t-3 border-purple-500' : 'border-t-3 border-emerald-500/50'}">
            <!-- Header -->
            <div class="p-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    ${isGlobal ? `
                        <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">📢</div>
                    ` : `
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs text-white font-bold">
                            ${fotoUrl ? `<img src="${fotoUrl}" class="w-full h-full rounded-lg object-cover" alt="${nome}"/>` : initial}
                        </div>
                    `}
                    <span class="text-sm font-semibold text-white truncate max-w-[160px]">${nome}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">${tarefas.length}</span>
                </div>
                ${!isGlobal && tecnicoId ? `
                    <button onclick="openTarefaModal('${tecnicoId}')" class="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Nova tarefa para ${nome}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </button>
                ` : ''}
            </div>

            <!-- Cards -->
            <div class="p-3 pt-0 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                ${pendentes.length === 0 && concluidas.length === 0 ? `
                    <div class="empty-state py-8">
                        <p class="text-xs">Nenhuma tarefa</p>
                    </div>
                ` : ''}
                ${pendentes.map(t => renderTarefaCard(t)).join('')}
                ${concluidas.length > 0 ? `
                    <div class="mt-3 pt-2 border-t border-slate-800">
                        <p class="text-[10px] text-slate-500 uppercase font-semibold mb-2">✅ Concluídas (${concluidas.length})</p>
                        ${concluidas.map(t => renderTarefaCard(t)).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderTarefaCard(tarefa) {
    const isDone = tarefa.status === 'Concluida';
    const prazoStr = tarefa.prazo ? formatDate(tarefa.prazo).split(' ')[0] : null;
    const isOverdue = tarefa.prazo && new Date(tarefa.prazo) < new Date() && !isDone;

    return `
        <div class="task-card ${isDone ? 'task-done' : ''}" onclick="openTarefaDetalheModal('${tarefa.id}')">
            <p class="text-sm text-white font-medium mb-1 ${isDone ? 'line-through opacity-60' : ''}">${tarefa.titulo}</p>
            <p class="text-xs text-slate-400 line-clamp-2 mb-2">${tarefa.descricao.substring(0, 80)}${tarefa.descricao.length > 80 ? '...' : ''}</p>
            <div class="flex items-center justify-between">
                ${prazoStr ? `
                    <span class="text-[10px] font-mono ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-500'}">
                        ${isOverdue ? '⚠️' : '📅'} ${prazoStr}
                    </span>
                ` : '<span></span>'}
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">
                    ${isDone ? 'Concluída' : 'Pendente'}
                </span>
            </div>
        </div>
    `;
}

// ============================================================
// Modal: Criar/Editar Tarefa
// ============================================================

async function openTarefaModal(tecnicoIdPadrao = null, forceGlobal = false) {
    const session = getSession();

    let tecnicosOptions = '';
    try {
        const { data: tecnicos } = await db.from('tecnicos')
            .select('id, nome')
            .eq('provedor_ti_id', session.provedor_ti_id)
            .eq('perfil', 'tecnico')
            .order('nome');

        tecnicosOptions = (tecnicos || []).map(t =>
            `<option value="${t.id}" ${tecnicoIdPadrao === t.id ? 'selected' : ''}>🔧 ${t.nome}</option>`
        ).join('');
    } catch (e) { console.warn(e); }

    openModal(`
        <div class="p-6 border-b border-eva-border">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">${forceGlobal ? '📢 Tarefa para Todos' : 'Nova Tarefa'}</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <form onsubmit="handleSaveTarefa(event, ${forceGlobal})" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Título <span class="text-red-400">*</span></label>
                <input type="text" id="tarefa-titulo" required placeholder="Ex: Atualizar antivírus nos PCs da filial" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Descrição <span class="text-red-400">*</span></label>
                <textarea id="tarefa-descricao" required rows="3" placeholder="Detalhe o que precisa ser feito..." class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Prazo</label>
                    <input type="date" id="tarefa-prazo" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"/>
                </div>
                ${!forceGlobal ? `
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1.5">Técnico Responsável <span class="text-red-400">*</span></label>
                    <select id="tarefa-tecnico" required class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all">
                        <option value="">Selecione...</option>
                        ${tecnicosOptions}
                    </select>
                </div>
                ` : `
                <div class="flex items-end">
                    <div class="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 w-full text-center">
                        <p class="text-xs text-purple-400 font-semibold">📢 Broadcast para toda a equipe</p>
                    </div>
                </div>
                `}
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="closeModal()" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">Criar Tarefa</button>
            </div>
        </form>
    `);
}

async function handleSaveTarefa(event, isGlobal = false) {
    event.preventDefault();
    const session = getSession();

    const data = {
        gestor_id: session.id,
        provedor_ti_id: session.provedor_ti_id,
        titulo: document.getElementById('tarefa-titulo').value.trim(),
        descricao: document.getElementById('tarefa-descricao').value.trim(),
        prazo: document.getElementById('tarefa-prazo').value || null,
        is_global: isGlobal,
        status: 'Pendente',
    };

    if (!isGlobal) {
        const tecId = document.getElementById('tarefa-tecnico')?.value;
        if (!tecId) { showToast('Selecione um técnico.', 'warning'); return; }
        data.tecnico_id = tecId;
    }

    try {
        const { error } = await db.from('tarefas').insert(data);
        if (error) throw error;
        showToast('Tarefa criada com sucesso! 📋', 'success');
        closeModal();
        await loadTarefasBoard();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// Modal: Detalhes da Tarefa + Chat Interno
// ============================================================

async function openTarefaDetalheModal(tarefaId) {
    const session = getSession();

    try {
        const { data: tarefa, error } = await db.from('tarefas')
            .select('*, gestor:gestor_id(nome), tecnico:tecnico_id(nome)')
            .eq('id', tarefaId)
            .single();

        if (error) throw error;

        // Busca comentários
        const { data: comentarios } = await db.from('tarefa_comentarios')
            .select('*')
            .eq('tarefa_id', tarefaId)
            .order('created_at', { ascending: true });

        const isDone = tarefa.status === 'Concluida';
        const prazoStr = tarefa.prazo ? formatDate(tarefa.prazo).split(' ')[0] : 'Sem prazo';
        const isGestor = session.perfil === 'gestor_ti';

        openModal(`
            <div class="p-6 border-b border-eva-border">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <h3 class="text-lg font-bold text-white">Tarefa</h3>
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isDone ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}">
                            ${isDone ? '✅ Concluída' : '⏳ Pendente'}
                        </span>
                        ${tarefa.is_global ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">📢 GLOBAL</span>' : ''}
                    </div>
                    <button onclick="closeModal()" class="text-slate-400 hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>

            <div class="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <!-- Título e Descrição -->
                <div>
                    <h4 class="text-white font-bold text-lg mb-2">${tarefa.titulo}</h4>
                    <p class="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl">${tarefa.descricao}</p>
                </div>

                <!-- Info Grid -->
                <div class="grid grid-cols-3 gap-3 text-sm">
                    <div class="bg-slate-800/50 rounded-xl p-3">
                        <p class="text-[10px] text-eva-muted uppercase font-semibold mb-1">Criado por</p>
                        <p class="text-white font-medium text-xs">${tarefa.gestor?.nome || 'Gestor'}</p>
                    </div>
                    <div class="bg-slate-800/50 rounded-xl p-3">
                        <p class="text-[10px] text-eva-muted uppercase font-semibold mb-1">Responsável</p>
                        <p class="text-white font-medium text-xs">${tarefa.is_global ? '📢 Todos' : (tarefa.tecnico?.nome || '—')}</p>
                    </div>
                    <div class="bg-slate-800/50 rounded-xl p-3">
                        <p class="text-[10px] text-eva-muted uppercase font-semibold mb-1">Prazo</p>
                        <p class="text-white font-medium text-xs">${prazoStr}</p>
                    </div>
                </div>

                <!-- Chat / Comentários -->
                <div>
                    <h4 class="text-xs font-semibold text-eva-muted uppercase tracking-wider mb-3">💬 Conversação</h4>
                    <div id="tarefa-chat-area" class="space-y-2 max-h-[250px] overflow-y-auto mb-3 p-2">
                        ${(!comentarios || comentarios.length === 0) ? `
                            <p class="text-xs text-slate-500 text-center py-4">Nenhuma mensagem ainda. Inicie a conversa!</p>
                        ` : comentarios.map(c => `
                            <div class="flex flex-col ${c.autor_id === session.id ? 'items-end' : 'items-start'}">
                                <div class="task-chat-bubble ${c.autor_id === session.id ? 'own' : 'other'}">
                                    <p class="text-slate-200">${c.comentario}</p>
                                </div>
                                <span class="text-[10px] text-slate-600 mt-0.5 px-1">${c.autor_nome} · ${formatDate(c.created_at)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Input de Comentário -->
                    <form onsubmit="handleSendComentario(event, '${tarefaId}')" class="flex gap-2">
                        <input type="text" id="tarefa-comentario-input" required placeholder="Escreva uma mensagem..." class="flex-1 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"/>
                        <button type="submit" class="btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0">Enviar</button>
                    </form>
                </div>

                <!-- Ações -->
                <div class="flex gap-3 pt-2">
                    ${!isDone ? `
                        <button onclick="marcarTarefaConcluida('${tarefaId}')" class="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                            ✅ Marcar como Concluída
                        </button>
                    ` : `
                        <button onclick="reabrirTarefa('${tarefaId}')" class="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                            🔄 Reabrir Tarefa
                        </button>
                    `}
                    ${isGestor ? `
                        <button onclick="deleteTarefa('${tarefaId}')" class="btn-ghost py-3 px-4 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10">
                            🗑️ Excluir
                        </button>
                    ` : ''}
                </div>
            </div>
        `);

        // Scroll para o final do chat
        setTimeout(() => {
            const chatArea = document.getElementById('tarefa-chat-area');
            if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        }, 100);

    } catch (err) {
        showToast(`Erro ao abrir tarefa: ${err.message}`, 'error');
    }
}

async function handleSendComentario(event, tarefaId) {
    event.preventDefault();
    const session = getSession();
    const input = document.getElementById('tarefa-comentario-input');
    const comentario = input.value.trim();
    if (!comentario) return;

    try {
        const { error } = await db.from('tarefa_comentarios').insert({
            tarefa_id: tarefaId,
            autor_id: session.id,
            autor_nome: session.nome,
            comentario: comentario,
        });
        if (error) throw error;

        // Reabre o modal para atualizar o chat
        await openTarefaDetalheModal(tarefaId);
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function marcarTarefaConcluida(tarefaId) {
    try {
        const { error } = await db.from('tarefas').update({ status: 'Concluida' }).eq('id', tarefaId);
        if (error) throw error;
        showToast('Tarefa concluída! ✅', 'success');
        closeModal();
        // Atualiza a view correta
        if (window.location.hash === '#/tarefas') {
            await loadTarefasBoard();
        } else {
            await loadKanbanData();
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function reabrirTarefa(tarefaId) {
    try {
        const { error } = await db.from('tarefas').update({ status: 'Pendente' }).eq('id', tarefaId);
        if (error) throw error;
        showToast('Tarefa reaberta.', 'info');
        closeModal();
        if (window.location.hash === '#/tarefas') {
            await loadTarefasBoard();
        } else {
            await loadKanbanData();
        }
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

async function deleteTarefa(tarefaId) {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
        const { error } = await db.from('tarefas').delete().eq('id', tarefaId);
        if (error) throw error;
        showToast('Tarefa excluída.', 'success');
        closeModal();
        await loadTarefasBoard();
    } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
    }
}

// ============================================================
// B. COLUNA DE TAREFAS DO TÉCNICO (dentro do Kanban)
// ============================================================

let tarefasTecnicoFilter = 'todos'; // 'todos', 'abertos', 'concluidos'
let tarefasColumnCollapsed = false;

async function renderTarefasTecnicoColumn() {
    const session = getSession();
    if (!session || session.tipo !== 'tecnico') return '';

    try {
        // Busca tarefas do técnico + globais do provedor
        let query = db.from('tarefas')
            .select('*, gestor:gestor_id(nome)')
            .eq('provedor_ti_id', session.provedor_ti_id)
            .order('created_at', { ascending: false });

        const { data: todasTarefas, error } = await query;
        if (error) throw error;

        // Filtra: tarefas atribuídas a mim OU globais
        let tarefas = (todasTarefas || []).filter(t => 
            t.tecnico_id === session.id || t.is_global === true
        );

        // Aplica filtro de visualização
        if (tarefasTecnicoFilter === 'abertos') {
            tarefas = tarefas.filter(t => t.status === 'Pendente');
        } else if (tarefasTecnicoFilter === 'concluidos') {
            tarefas = tarefas.filter(t => t.status === 'Concluida');
        }

        return `
            <div class="tasks-column ${tarefasColumnCollapsed ? 'collapsed' : ''} bg-eva-dark/50 rounded-2xl overflow-hidden" style="border-top: 3px solid #8b5cf6;">
                <!-- Toggle Button -->
                <div class="p-2 flex items-center ${tarefasColumnCollapsed ? 'justify-center' : 'justify-between'}">
                    <button onclick="toggleTarefasColumn()" class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="${tarefasColumnCollapsed ? 'Expandir' : 'Recolher'}">
                        <svg class="w-4 h-4 transition-transform ${tarefasColumnCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${tarefasColumnCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}"/>
                        </svg>
                    </button>
                    ${!tarefasColumnCollapsed ? `
                        <span class="text-xs font-semibold text-purple-400 flex items-center gap-1">📋 Tarefas do Gestor <span class="bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-300">${tarefas.length}</span></span>
                    ` : ''}
                </div>

                <div class="tasks-column-content">
                    <!-- Filtros rápidos -->
                    <div class="px-3 pb-2 flex gap-1.5">
                        <button onclick="setTarefasTecFilter('todos')" class="task-filter-btn ${tarefasTecnicoFilter === 'todos' ? 'active' : ''}">Todos</button>
                        <button onclick="setTarefasTecFilter('abertos')" class="task-filter-btn ${tarefasTecnicoFilter === 'abertos' ? 'active' : ''}">Abertos</button>
                        <button onclick="setTarefasTecFilter('concluidos')" class="task-filter-btn ${tarefasTecnicoFilter === 'concluidos' ? 'active' : ''}">Concluídos</button>
                    </div>

                    <!-- Cards de Tarefas -->
                    <div class="p-3 pt-0 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                        ${tarefas.length === 0 ? `
                            <div class="empty-state py-6">
                                <p class="text-xs">Nenhuma tarefa ${tarefasTecnicoFilter !== 'todos' ? 'neste filtro' : 'para você'}</p>
                            </div>
                        ` : tarefas.map(t => renderTarefaCard(t)).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.warn('Erro ao carregar tarefas do técnico:', err);
        return '';
    }
}

function toggleTarefasColumn() {
    tarefasColumnCollapsed = !tarefasColumnCollapsed;
    loadKanbanData();
}

function setTarefasTecFilter(filter) {
    tarefasTecnicoFilter = filter;
    loadKanbanData();
}

console.log('✅ Módulo Tarefas carregado');
