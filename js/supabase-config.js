// ============================================================
// Supabase Client — Configuração
// ============================================================
// INSTRUÇÕES: Substitua os valores abaixo pelas credenciais
// do seu projeto Supabase (Settings → API).
// ============================================================

const SUPABASE_URL = 'https://supabase.evaflow.com.br';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3ODk4ODQyMCwiZXhwIjo0OTM0NjYyMDIwLCJyb2xlIjoiYW5vbiJ9.d-eMBIpyvXpC-MJto1yIWjWiuBo9jcBdo4n-uorUUfs';

// Inicializa o client do Supabase (disponível globalmente como `db`)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Utilitários Globais
// ============================================================

/** Exibe uma notificação toast */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const colors = {
        success: 'bg-emerald-600 border-emerald-500',
        error: 'bg-red-600 border-red-500',
        warning: 'bg-amber-600 border-amber-500',
        info: 'bg-blue-600 border-blue-500',
    };
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-white text-sm ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <span class="text-lg">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/** Abre o modal global */
function openModal(htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = htmlContent;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/** Fecha o modal global */
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
}

// Fechar modal ao clicar no overlay
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// Fechar modal com Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

/** Retorna a sessão do localStorage ou null */
function getSession() {
    try {
        return JSON.parse(localStorage.getItem('user_session'));
    } catch {
        return null;
    }
}

/** Salva a sessão no localStorage */
function saveSession(sessionData) {
    localStorage.setItem('user_session', JSON.stringify(sessionData));
}

/** Limpa a sessão */
function clearSession() {
    localStorage.removeItem('user_session');
}

/** Faz logout e redireciona para login */
function handleLogout() {
    clearSession();
    window.location.hash = '#/login';
}

/** Formata data para exibição */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/** Retorna a classe CSS do status */
function getStatusClass(status) {
    const map = {
        'Novo': 'status-novo',
        'Em Atendimento': 'status-em-atendimento',
        'Pendente': 'status-pendente',
        'Resolvido': 'status-resolvido',
    };
    return map[status] || 'status-novo';
}

/** Retorna a classe CSS da coluna do kanban */
function getKanbanColClass(status) {
    const map = {
        'Novo': 'kanban-col-novo',
        'Em Atendimento': 'kanban-col-em-atendimento',
        'Pendente': 'kanban-col-pendente',
        'Resolvido': 'kanban-col-resolvido',
    };
    return map[status] || '';
}

console.log('✅ Supabase Client inicializado');
