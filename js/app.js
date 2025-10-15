// js/app.js
class App {
    constructor() {
        this.currentTab = 'dashboard';
        this.initApp();
    }

    initApp() {
        this.initNavigation();
        this.loadInitialData();
    }

    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        // Désactiver l'onglet actuel
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Activer le nouvel onglet
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
        this.currentTab = tabName;

        // Charger les données spécifiques à l'onglet
        this.loadTabData(tabName);
    }

    loadInitialData() {
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            // Compter les matières premières
            const mpSnapshot = await db.collection('matieresPremieres')
                .where('actif', '==', true)
                .get();
            document.getElementById('stat-mp').textContent = mpSnapshot.size;

            // Compter les OF du jour
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ofSnapshot = await db.collection('ordresFabrication')
                .where('dateCreation', '>=', today)
                .get();
            document.getElementById('stat-of').textContent = ofSnapshot.size;

            // Charger les alertes
            this.loadAlerts();

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }

    async loadAlerts() {
        const alertsContainer = document.getElementById('alerts-container');
        alertsContainer.innerHTML = '';

        // Alertes stock faible
        const stockAlertes = await db.collection('matieresPremieres')
            .where('quantite', '<=', firebase.firestore.FieldValue('stockMin'))
            .where('actif', '==', true)
            .get();

        stockAlertes.forEach(doc => {
            const produit = doc.data();
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.textContent = `Stock faible: ${produit.nom} - ${produit.quantite} ${produit.unite}`;
            alertsContainer.appendChild(alertDiv);
        });

        document.getElementById('stat-alertes').textContent = stockAlertes.size;
    }
}

// Démarrer l'application quand l'utilisateur est connecté
auth.onAuthStateChanged((user) => {
    if (user) {
        new App();
    }
});