// ============================================================
// Tela A — Login de Acesso Único
// ============================================================
// Comportamento:
// 1. Usuário digita username + senha
// 2. JS busca nas tabelas 'tecnicos' e 'usuarios'
// 3. Valida senha e salva sessão no localStorage
// 4. Redireciona para a tela correspondente ao perfil
// ============================================================

function renderLogin() {
    // Esconde sidebar no login
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('app-container').classList.remove('ml-64');

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="login-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden select-none">
            <!-- Glow interativo de fundo suave (Estilo antigravity) -->
            <div id="login-glow-1" class="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none transition-transform duration-300 ease-out" style="top: -10%; left: -10%;"></div>
            <div id="login-glow-2" class="absolute w-[450px] h-[450px] rounded-full bg-emerald-600/5 blur-[100px] pointer-events-none transition-transform duration-500 ease-out" style="bottom: 10%; right: 10%;"></div>

            <div id="login-card-container" class="w-full max-w-md animate-slide-up relative z-10 transition-transform duration-200 ease-out">
                
                <!-- Logo + Título -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-500/20 mb-4">
                        <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-white tracking-wide">Help Desk</h1>
                    <p class="text-eva-muted text-sm mt-1">Juntos Educação — Selfware</p>
                </div>

                <!-- Card de Login -->
                <div class="glass-strong rounded-2xl p-8 shadow-2xl">
                    <form id="login-form" onsubmit="handleLogin(event)" class="space-y-5 select-text">
                        
                        <!-- Campo Username -->
                        <div>
                            <label for="login-username" class="block text-sm font-medium text-slate-300 mb-2">
                                Usuário
                            </label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                </span>
                                <input 
                                    type="text" 
                                    id="login-username" 
                                    placeholder="seu.usuario" 
                                    required
                                    autocomplete="username"
                                    class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <!-- Campo Senha -->
                        <div>
                            <label for="login-password" class="block text-sm font-medium text-slate-300 mb-2">
                                Senha
                            </label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                    </svg>
                                </span>
                                <input 
                                    type="password" 
                                    id="login-password" 
                                    placeholder="••••••••" 
                                    required
                                    autocomplete="current-password"
                                    class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                />
                                <button type="button" onclick="togglePasswordVisibility()" class="password-toggle" tabindex="-1" aria-label="Mostrar senha">
                                    <svg id="eye-icon-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <svg id="eye-icon-closed" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Mensagem de Erro -->
                        <div id="login-error" class="hidden text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-xl py-2 px-4">
                        </div>

                        <!-- Botão Login -->
                        <button 
                            type="submit" 
                            id="btn-login"
                            class="btn-primary w-full py-3 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2"
                        >
                            <span id="login-btn-text">Entrar</span>
                            <div id="login-spinner" class="spinner hidden"></div>
                        </button>
                    </form>
                </div>

                <!-- Footer -->
                <p class="text-center text-slate-600 text-xs mt-6 select-none">
                    Selfware © ${new Date().getFullYear()} — Evaflow
                </p>
            </div>
        </div>
    `;

    // Efeito de Parallax Interativo Super Leve no Mouse (Evita qualquer gargalo/travamento)
    initInteractiveGlow();

    // Foco automático no campo de usuário
    setTimeout(() => {
        const usernameInput = document.getElementById('login-username');
        if (usernameInput) usernameInput.focus();
    }, 100);
}

/** Efeito de Movimento Interativo (Mouse Parallax) */
function initInteractiveGlow() {
    const wrapper = document.querySelector('.login-bg');
    const glow1 = document.getElementById('login-glow-1');
    const glow2 = document.getElementById('login-glow-2');
    const card = document.getElementById('login-card-container');

    if (!wrapper || !glow1 || !glow2 || !card) return;

    wrapper.addEventListener('mousemove', (e) => {
        const { width, height } = wrapper.getBoundingClientRect();
        // Normaliza de -0.5 a 0.5
        const x = (e.clientX / width) - 0.5;
        const y = (e.clientY / height) - 0.5;

        // Move os focos de luz suavemente em direções opostas
        glow1.style.transform = `translate(${x * 60}px, ${y * 60}px)`;
        glow2.style.transform = `translate(${-x * 40}px, ${-y * 40}px)`;

        // Efeito sutil de rotação 3D no login card (Estilo Antigravity)
        card.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
    });

    wrapper.addEventListener('mouseleave', () => {
        // Retorna suavemente ao estado original
        glow1.style.transform = 'translate(0px, 0px)';
        glow2.style.transform = 'translate(0px, 0px)';
        card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    });
}

/** Alterna visibilidade da senha */
function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const iconOpen = document.getElementById('eye-icon-open');
    const iconClosed = document.getElementById('eye-icon-closed');

    if (input.type === 'password') {
        input.type = 'text';
        iconOpen.classList.add('hidden');
        iconClosed.classList.remove('hidden');
    } else {
        input.type = 'password';
        iconOpen.classList.remove('hidden');
        iconClosed.classList.add('hidden');
    }
}

/** Handler de login */
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    const btnLogin = document.getElementById('btn-login');

    // Reset erro
    errorDiv.classList.add('hidden');

    // Estado de loading
    btnLogin.disabled = true;
    btnText.textContent = 'Autenticando...';
    spinner.classList.remove('hidden');

    try {
        // 1. Busca na tabela de técnicos
        const { data: tecnico, error: errTec } = await db
            .from('tecnicos')
            .select('*')
            .eq('username', username)
            .single();

        if (tecnico && !errTec) {
            // Valida senha (texto simples no MVP)
            if (tecnico.senha_hash !== password) {
                throw new Error('Senha incorreta.');
            }
            // Salva sessão como técnico
            saveSession({
                id: tecnico.id,
                nome: tecnico.nome,
                username: tecnico.username,
                tipo: 'tecnico',
                perfil: tecnico.perfil,
                unidade_id: tecnico.unidade_id,
                nivel_hierarquico: null,
            });
            showToast(`Bem-vindo, ${tecnico.nome}!`, 'success');
            
            // Redireciona: gestor_ti → dashboard, técnico → kanban
            if (tecnico.perfil === 'gestor_ti') {
                window.location.hash = '#/dashboard';
            } else {
                window.location.hash = '#/kanban';
            }
            return;
        }

        // 2. Busca na tabela de usuários
        const { data: usuario, error: errUsr } = await db
            .from('usuarios')
            .select('*')
            .eq('username', username)
            .single();

        if (usuario && !errUsr) {
            // Valida senha (texto simples no MVP)
            if (usuario.senha_hash !== password) {
                throw new Error('Senha incorreta.');
            }
            // Salva sessão como usuário
            saveSession({
                id: usuario.id,
                nome: usuario.nome,
                username: usuario.username,
                tipo: 'usuario',
                perfil: null,
                unidade_id: usuario.unidade_id,
                nivel_hierarquico: usuario.nivel_hierarquico,
            });
            showToast(`Bem-vindo, ${usuario.nome}!`, 'success');
            window.location.hash = '#/portal';
            return;
        }

        // 3. Não encontrado em nenhuma tabela
        throw new Error('Usuário não encontrado no sistema.');

    } catch (err) {
        errorDiv.textContent = err.message || 'Erro ao autenticar. Tente novamente.';
        errorDiv.classList.remove('hidden');
    } finally {
        btnLogin.disabled = false;
        btnText.textContent = 'Entrar';
        spinner.classList.add('hidden');
    }
}

/** Renderiza a tela de alteração de senha */
function renderChangePassword() {
    const session = getSession();
    if (!session) return;

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="p-6 lg:p-8 animate-slide-up">
            <div class="max-w-md mx-auto">
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-white">Alterar Senha</h2>
                    <p class="text-eva-muted text-sm mt-1">Mantenha sua conta segura alterando sua credencial de acesso</p>
                </div>

                <div class="glass-strong rounded-2xl p-6 border border-eva-border">
                    <form onsubmit="handleChangePassword(event)" class="space-y-5">
                        <div>
                            <label for="change-pwd-current" class="block text-sm font-medium text-slate-300 mb-2">Senha Atual</label>
                            <div class="relative">
                                <input type="password" id="change-pwd-current" required placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                                <button type="button" onclick="toggleLocalPasswordVisibility('change-pwd-current', this)" class="password-toggle" tabindex="-1" aria-label="Mostrar senha">
                                    <svg class="w-5 h-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <svg class="w-5 h-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label for="change-pwd-new" class="block text-sm font-medium text-slate-300 mb-2">Nova Senha</label>
                            <div class="relative">
                                <input type="password" id="change-pwd-new" required placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                                <button type="button" onclick="toggleLocalPasswordVisibility('change-pwd-new', this)" class="password-toggle" tabindex="-1" aria-label="Mostrar senha">
                                    <svg class="w-5 h-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <svg class="w-5 h-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label for="change-pwd-confirm" class="block text-sm font-medium text-slate-300 mb-2">Confirmar Nova Senha</label>
                            <div class="relative">
                                <input type="password" id="change-pwd-confirm" required placeholder="••••••••" class="w-full bg-slate-800/80 border border-slate-600 rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"/>
                                <button type="button" onclick="toggleLocalPasswordVisibility('change-pwd-confirm', this)" class="password-toggle" tabindex="-1" aria-label="Mostrar senha">
                                    <svg class="w-5 h-5 eye-open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <svg class="w-5 h-5 eye-closed hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button type="submit" id="btn-change-password" class="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                                <span id="change-pwd-btn-text">Atualizar Senha</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

/** Alterna visibilidade da senha localmente no form de alteração */
function toggleLocalPasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');

    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
    } else {
        input.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
    }
}

/** Salva a alteração da senha no Supabase */
async function handleChangePassword(event) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const currentPwd = document.getElementById('change-pwd-current').value;
    const newPwd = document.getElementById('change-pwd-new').value;
    const confirmPwd = document.getElementById('change-pwd-confirm').value;
    const btnText = document.getElementById('change-pwd-btn-text');
    const btn = document.getElementById('btn-change-password');

    if (newPwd !== confirmPwd) {
        showToast('A confirmação da nova senha não confere.', 'warning');
        return;
    }

    if (newPwd.length < 4) {
        showToast('A nova senha deve ter pelo menos 4 caracteres.', 'warning');
        return;
    }

    btn.disabled = true;
    btnText.textContent = 'Salvando...';

    try {
        const table = session.tipo === 'tecnico' ? 'tecnicos' : 'usuarios';

        // 1. Verifica se a senha atual está correta
        const { data, error: fetchErr } = await db
            .from(table)
            .select('senha_hash')
            .eq('id', session.id)
            .single();

        if (fetchErr || !data) throw new Error('Não foi possível verificar os dados atuais.');

        if (data.senha_hash !== currentPwd) {
            throw new Error('A senha atual informada está incorreta.');
        }

        // 2. Atualiza a nova senha
        const { error: updateErr } = await db
            .from(table)
            .update({ senha_hash: newPwd })
            .eq('id', session.id);

        if (updateErr) throw updateErr;

        showToast('Senha alterada com sucesso! 🎉', 'success');

        // Limpa campos
        document.getElementById('change-pwd-current').value = '';
        document.getElementById('change-pwd-new').value = '';
        document.getElementById('change-pwd-confirm').value = '';

        // Redireciona de volta após 1.5s
        setTimeout(() => {
            if (session.tipo === 'tecnico') {
                window.location.hash = session.perfil === 'gestor_ti' ? '#/dashboard' : '#/kanban';
            } else {
                window.location.hash = '#/portal';
            }
        }, 1500);

    } catch (err) {
        showToast(err.message || 'Erro ao alterar a senha.', 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Atualizar Senha';
    }
}

console.log('✅ Módulo Auth carregado');
