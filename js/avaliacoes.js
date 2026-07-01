// ============================================================
// Sistema de Avaliação — 5 Estrelas (Estilo Uber)
// ============================================================
// Fluxo:
// 1. Usuário loga → sistema verifica chamados resolvidos sem avaliação
// 2. Modal obrigatório aparece (não fecha sem avaliar)
// 3. Usuário clica de 1 a 5 estrelas → envia
// 4. Animação de joinha + "Obrigado!" → fecha automaticamente
// 5. Se houver mais chamados pendentes, mostra o próximo
// ============================================================

let pendingRatings = [];
let selectedRating = 0;

/**
 * Verifica se o usuário tem chamados resolvidos sem avaliação.
 * Chamado pelo router após cada navegação (para usuários).
 */
async function checkPendingRatings() {
    const session = getSession();
    if (!session || session.tipo !== 'usuario') return;

    try {
        // Busca chamados resolvidos do usuário
        const { data: resolvidos, error: errRes } = await db
            .from('chamados')
            .select('id, descricao, tecnico_id, provedor_ti_id')
            .eq('usuario_id', session.id)
            .eq('status', 'Resolvido');

        if (errRes || !resolvidos || resolvidos.length === 0) return;

        // Busca avaliações já existentes para esses chamados
        const chamadoIds = resolvidos.map(c => c.id);
        const { data: avaliacoes } = await db
            .from('avaliacoes')
            .select('chamado_id')
            .in('chamado_id', chamadoIds);

        const ratedIds = new Set((avaliacoes || []).map(a => a.chamado_id));
        pendingRatings = resolvidos.filter(c => !ratedIds.has(c.id));

        if (pendingRatings.length > 0) {
            showRatingModal(pendingRatings[0]);
        }
    } catch (e) {
        console.warn('Erro ao verificar avaliações pendentes:', e);
    }
}

/**
 * Exibe o modal obrigatório de avaliação (não pode ser fechado sem avaliar).
 */
function showRatingModal(chamado) {
    selectedRating = 0;

    const overlay = document.getElementById('rating-overlay');
    const content = document.getElementById('rating-content');

    const descCurta = chamado.descricao && chamado.descricao.length > 100
        ? chamado.descricao.substring(0, 100) + '...'
        : (chamado.descricao || '');

    content.innerHTML = `
        <!-- Formulário de Avaliação -->
        <div id="rating-form" class="text-center animate-scale-in">
            <!-- Ícone de Resolvido -->
            <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
            </div>

            <h3 class="text-xl font-bold text-white mb-1">Chamado #${chamado.id} Resolvido!</h3>
            <p class="text-slate-500 text-xs mb-5 px-4">${descCurta}</p>

            <p class="text-slate-300 text-sm mb-6 font-medium">Qual o seu nível de satisfação com esse atendimento?</p>

            <!-- Estrelas -->
            <div class="flex justify-center gap-3 mb-4" id="star-container">
                <button type="button" class="star-btn" onclick="selectStar(1)" onmouseenter="hoverStar(1)" onmouseleave="resetStarHover()" data-value="1">★</button>
                <button type="button" class="star-btn" onclick="selectStar(2)" onmouseenter="hoverStar(2)" onmouseleave="resetStarHover()" data-value="2">★</button>
                <button type="button" class="star-btn" onclick="selectStar(3)" onmouseenter="hoverStar(3)" onmouseleave="resetStarHover()" data-value="3">★</button>
                <button type="button" class="star-btn" onclick="selectStar(4)" onmouseenter="hoverStar(4)" onmouseleave="resetStarHover()" data-value="4">★</button>
                <button type="button" class="star-btn" onclick="selectStar(5)" onmouseenter="hoverStar(5)" onmouseleave="resetStarHover()" data-value="5">★</button>
            </div>

            <!-- Label dinâmico -->
            <p id="rating-label" class="text-sm text-slate-500 mb-4 h-5 transition-all duration-200"></p>

            <!-- Campo de Comentário -->
            <div class="mb-5 text-left">
                <label for="rating-comment" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comentário opcional</label>
                <textarea 
                    id="rating-comment" 
                    rows="2" 
                    placeholder="Adicione observações sobre o atendimento..." 
                    class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                ></textarea>
            </div>

            <!-- Botão Enviar (desabilitado até selecionar estrela) -->
            <button id="btn-send-rating" onclick="submitRating(${chamado.id}, '${chamado.provedor_ti_id || ''}', '${chamado.tecnico_id || ''}')"
                disabled
                class="btn-primary w-full py-3.5 rounded-xl text-sm font-bold opacity-40 cursor-not-allowed transition-all duration-300">
                Enviar Avaliação
            </button>

            <p class="text-[11px] text-slate-600 mt-4">A avaliação é obrigatória para continuar.</p>
        </div>

        <!-- Tela de Agradecimento (hidden inicialmente) -->
        <div id="rating-thanks" class="hidden text-center py-4">
            <div class="text-7xl mb-5 rating-thumbs-up">👍</div>
            <h3 class="text-xl font-bold text-white mb-2 rating-thanks-text">Obrigado!</h3>
            <p class="text-slate-400 text-sm rating-thanks-sub">Seu feedback é muito importante para nós.</p>
        </div>
    `;

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/** Efeito hover nas estrelas */
function hoverStar(value) {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((star, i) => {
        if (i < value) {
            star.style.color = '#fbbf24';
            star.style.transform = 'scale(1.15)';
            star.style.textShadow = '0 0 12px rgba(251, 191, 36, 0.4)';
        } else if (!star.classList.contains('selected')) {
            star.style.color = '#475569';
            star.style.transform = 'scale(1)';
            star.style.textShadow = 'none';
        }
    });
}

/** Reseta hover ao sair das estrelas */
function resetStarHover() {
    if (selectedRating > 0) {
        selectStar(selectedRating);
    } else {
        const stars = document.querySelectorAll('.star-btn');
        stars.forEach(star => {
            star.style.color = '#475569';
            star.style.transform = 'scale(1)';
            star.style.textShadow = 'none';
        });
    }
}

/** Seleciona uma nota (1-5) */
function selectStar(value) {
    selectedRating = value;

    const labels = ['', 'Péssimo 😞', 'Ruim 😕', 'Regular 😐', 'Bom 😊', 'Excelente! 🤩'];
    const stars = document.querySelectorAll('.star-btn');

    stars.forEach((star, i) => {
        if (i < value) {
            star.classList.add('selected');
            star.style.color = '#fbbf24';
            star.style.transform = 'scale(1.2)';
            star.style.textShadow = '0 0 18px rgba(251, 191, 36, 0.5)';
        } else {
            star.classList.remove('selected');
            star.style.color = '#475569';
            star.style.transform = 'scale(1)';
            star.style.textShadow = 'none';
        }
    });

    // Atualiza label
    const label = document.getElementById('rating-label');
    if (label) {
        label.textContent = labels[value] || '';
        label.style.color = value >= 4 ? '#34d399' : value >= 3 ? '#fbbf24' : '#f87171';
    }

    // Habilita botão
    const btn = document.getElementById('btn-send-rating');
    if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
}

/** Envia a avaliação para o Supabase */
async function submitRating(chamadoId, provedorTiId, tecnicoId) {
    const btn = document.getElementById('btn-send-rating');
    const commentEl = document.getElementById('rating-comment');
    const comentario = commentEl ? commentEl.value.trim() : '';

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
    }

    try {
        const { error } = await db.from('avaliacoes').insert({
            chamado_id: chamadoId,
            nota: selectedRating,
            comentario: comentario || null,
            tecnico_id: tecnicoId || null,
            provedor_ti_id: provedorTiId || null
        });

        if (error) throw error;

        // Transição para tela de agradecimento
        const form = document.getElementById('rating-form');
        const thanks = document.getElementById('rating-thanks');

        form.style.opacity = '0';
        form.style.transform = 'scale(0.9)';

        setTimeout(() => {
            form.classList.add('hidden');
            thanks.classList.remove('hidden');
        }, 300);

        // Fecha após animação de agradecimento
        setTimeout(() => {
            const overlay = document.getElementById('rating-overlay');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';

            // Remove da fila e verifica próximo
            pendingRatings = pendingRatings.filter(c => c.id !== chamadoId);
            if (pendingRatings.length > 0) {
                setTimeout(() => showRatingModal(pendingRatings[0]), 600);
            }
        }, 2800);

    } catch (err) {
        showToast(`Erro ao enviar avaliação: ${err.message}`, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Enviar Avaliação';
        }
    }
}

/**
 * Renderiza estrelas visuais (para o dashboard).
 * @param {number} avg - Média (ex: 4.3)
 * @param {string} size - 'sm', 'md', 'lg'
 */
function renderStars(avg, size = 'md') {
    const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
    const sizeClass = sizes[size] || sizes.md;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(avg)) {
            stars += `<span class="${sizeClass} text-amber-400" style="text-shadow: 0 0 8px rgba(251,191,36,0.3)">★</span>`;
        } else if (i - avg < 1 && i - avg > 0) {
            // Meia estrela: mostra cheia com opacidade menor
            stars += `<span class="${sizeClass} text-amber-400/50">★</span>`;
        } else {
            stars += `<span class="${sizeClass} text-slate-600">★</span>`;
        }
    }
    return stars;
}

console.log('✅ Módulo Avaliações carregado');
