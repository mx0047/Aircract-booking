import DataStore from './data.js';

const Auth = {
    currentUser: null,

    renderLoginScreen() {
        return `
            <div class="login-screen">
                <header class="login__logo-container">
                    <img src="img/logo-spacek.png" alt="ŠPAČEK" class="login__logo" onerror="this.style.display='none';">
                    <h1 class="login__title" style="display:none;">ŠPAČEK</h1>
                    <h2 class="login__title">Rezervačný Systém</h2>
                    <p class="login__subtitle">Holíč LZHL</p>
                </header>
                
                <div class="auth-tabs" style="display:flex; gap:10px; margin-bottom: 20px; justify-content: center;">
                    <button type="button" class="btn btn--primary auth-tab" data-target="login-form">Prihlásenie</button>
                    <button type="button" class="btn btn--secondary auth-tab" data-target="register-form">Registrácia</button>
                </div>

                <div class="auth-forms">
                    <form id="login-form" class="auth-form active">
                        <div class="form-group">
                            <label for="login-name" class="form-label">Meno</label>
                            <input type="text" id="login-name" name="name" required minlength="2" class="form-input">
                        </div>
                        <div class="form-group">
                            <label for="login-pin" class="form-label">PIN</label>
                            <input type="password" id="login-pin" name="pin" required pattern="\\d{4}" maxlength="4" class="form-input">
                        </div>
                        <button type="submit" class="btn btn--primary btn--block">Prihlásiť sa</button>
                    </form>

                    <form id="register-form" class="auth-form" style="display: none;">
                        <div class="form-group">
                            <label for="register-name" class="form-label">Meno</label>
                            <input type="text" id="register-name" name="name" required minlength="2" class="form-input">
                        </div>
                        <div class="form-group">
                            <label for="register-pin" class="form-label">PIN (4 číslice)</label>
                            <input type="password" id="register-pin" name="pin" required pattern="\\d{4}" maxlength="4" class="form-input">
                        </div>
                        <div class="form-group">
                            <label for="register-pin-confirm" class="form-label">PIN znova</label>
                            <input type="password" id="register-pin-confirm" name="pinConfirm" required pattern="\\d{4}" maxlength="4" class="form-input">
                        </div>
                        <button type="submit" class="btn btn--primary btn--block">Registrovať sa</button>
                    </form>
                </div>
            </div>
        `;
    },

    handleLogin(name, pin) {
        if (!name || name.length < 2) {
            return { success: false, message: 'Meno musí mať aspoň 2 znaky.' };
        }
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return { success: false, message: 'PIN musí obsahovať presne 4 číslice.' };
        }

        const users = DataStore.getUsers();
        const user = users.find(u => u.name === name && u.pin === pin);

        if (!user) {
            return { success: false, message: 'Nesprávne meno alebo PIN.' };
        }

        if (!user.approved && user.role !== 'owner' && user.role !== 'deputy') {
            return { success: false, message: 'Váš účet čaká na schválenie administrátorom.' };
        }

        this.currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return { success: true, user, message: 'Úspešne prihlásený.' };
    },

    handleRegister(name, pin, pinConfirm) {
        if (!name || name.length < 2) {
            return { success: false, message: 'Meno musí mať aspoň 2 znaky.' };
        }
        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return { success: false, message: 'PIN musí obsahovať presne 4 číslice.' };
        }
        if (pin !== pinConfirm) {
            return { success: false, message: 'PIN kódy sa nezhodujú.' };
        }

        const users = DataStore.getUsers();
        if (users.some(u => u.name === name)) {
            return { success: false, message: 'Používateľ s týmto menom už existuje.' };
        }

        const newUser = {
            id: 'u' + Date.now().toString(),
            name,
            pin,
            role: 'pilot',
            approved: false,
            status: 'pending'
        };

        DataStore.addUser(newUser);

        return { success: true, message: 'Registrácia bola úspešná. Váš účet čaká na schválenie.' };
    },

    isLoggedIn() {
        return !!this.getCurrentUser();
    },

    getCurrentUser() {
        if (!this.currentUser) {
            const savedUser = sessionStorage.getItem('currentUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }
        }
        return this.currentUser;
    },

    isAdmin() {
        const user = this.getCurrentUser();
        return user && (user.role === 'owner' || user.role === 'deputy');
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
    },

    init() {
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-tab')) {
                document.querySelectorAll('.auth-tab').forEach(t => {
                    t.classList.remove('btn--primary');
                    t.classList.add('btn--secondary');
                });
                e.target.classList.remove('btn--secondary');
                e.target.classList.add('btn--primary');
                
                const targetId = e.target.getAttribute('data-target');
                document.querySelectorAll('.auth-form').forEach(f => {
                    f.style.display = f.id === targetId ? 'block' : 'none';
                    if (f.id === targetId) f.classList.add('active');
                    else f.classList.remove('active');
                });
            }
        });

        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'login-form') {
                e.preventDefault();
                const name = document.getElementById('login-name').value.trim();
                const pin = document.getElementById('login-pin').value;
                const result = this.handleLogin(name, pin);
                if (result.success) {
                    this.showToast(result.message, 'success');
                    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { loggedIn: true, user: result.user } }));
                } else {
                    this.showToast(result.message, 'error');
                }
            } else if (e.target.id === 'register-form') {
                e.preventDefault();
                const name = document.getElementById('register-name').value.trim();
                const pin = document.getElementById('register-pin').value;
                const pinConfirm = document.getElementById('register-pin-confirm').value;
                const result = this.handleRegister(name, pin, pinConfirm);
                if (result.success) {
                    this.showToast(result.message, 'success');
                    document.getElementById('register-form').reset();
                    document.querySelector('.auth-tab[data-target="login-form"]').click();
                } else {
                    this.showToast(result.message, 'error');
                }
            }
        });
    },
    
    showToast(message, type) {
        // Implementation of toast notification
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

export default Auth;
