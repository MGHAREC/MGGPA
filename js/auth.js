// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initAuthListeners();
    }

    initAuthListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.handleUserLogin(user);
            } else {
                this.handleUserLogout();
            }
        });
    }

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async setupAdmin(email, password, userData) {
        try {
            // Créer l'utilisateur Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Créer le document utilisateur dans Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                nom: userData.nom,
                prenom: userData.prenom,
                role: 'admin',
                permissions: ['lecture', 'ecriture', 'suppression', 'administration'],
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    handleUserLogin(user) {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('current-user').textContent = user.email;
    }

    handleUserLogout() {
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
    }
}

const authManager = new AuthManager();

// Événements
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const result = await authManager.login(email, password);
    if (!result.success) {
        alert('Erreur: ' + result.error);
    }
});

document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const nom = document.getElementById('admin-nom').value;
    const prenom = document.getElementById('admin-prenom').value;
    
    const result = await authManager.setupAdmin(email, password, { nom, prenom });
    if (!result.success) {
        alert('Erreur: ' + result.error);
    }
});

document.getElementById('show-setup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
});

document.getElementById('back-to-login').addEventListener('click', () => {
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut();
});