// js/app.js - VERSION COMPLÉTÉE
class App {
    constructor() {
        this.currentTab = 'dashboard';
        this.initApp();
    }

    initApp() {
        this.initNavigation();
        this.loadInitialData();
        this.setupGlobalEvents();
    }

    setupGlobalEvents() {
        // Recharger les données quand on change d'onglet
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    initNavigation() {
        // Déjà fait dans setupGlobalEvents
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

    loadTabData(tabName) {
        switch(tabName) {
            case 'stock':
                if (typeof stockManager !== 'undefined') {
                    stockManager.loadStockList();
                }
                break;
            case 'production':
                if (typeof productionManager !== 'undefined') {
                    productionManager.loadOFList();
                }
                break;
            case 'produits-finis':
                if (typeof produitsFinisManager !== 'undefined') {
                    produitsFinisManager.loadProduitsFinisList();
                }
                break;
            case 'fournisseurs':
                if (typeof fournisseursManager !== 'undefined') {
                    fournisseursManager.loadFournisseursList();
                }
                break;
            case 'dashboard':
                this.loadDashboardData();
                break;
        }
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

            // Compter les alertes stock faible
            const alertesSnapshot = await db.collection('matieresPremieres')
                .where('quantite', '<=', firebase.firestore.FieldValue('stockMin'))
                .where('actif', '==', true)
                .get();
            document.getElementById('stat-alertes').textContent = alertesSnapshot.size;

            // Afficher les alertes
            this.displayAlerts(alertesSnapshot);

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }

    displayAlerts(alertesSnapshot) {
        const container = document.getElementById('alerts-container');
        container.innerHTML = '';

        if (alertesSnapshot.empty) {
            container.innerHTML = '<div class="alert alert-success">✅ Aucune alerte</div>';
            return;
        }

        alertesSnapshot.forEach(doc => {
            const produit = doc.data();
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <strong>${produit.nom}</strong> - Stock faible: 
                ${produit.quantite} ${produit.unite} (min: ${produit.stockMin})
                <button class="btn-small btn-primary" onclick="stockManager.adjustStock('${doc.id}')" style="margin-left: 10px;">
                    Ajuster
                </button>
            `;
            container.appendChild(alertDiv);
        });
    }
}

// Démarrer l'application quand l'utilisateur est connecté
auth.onAuthStateChanged((user) => {
    if (user) {
        new App();
        
        // Initialiser tous les managers
        if (typeof stockManager !== 'undefined') {
            stockManager.initStock();
        }
        if (typeof productionManager !== 'undefined') {
            productionManager.initProduction();
        }
        if (typeof produitsFinisManager !== 'undefined') {
            produitsFinisManager.initProduitsFinis();
        }
        if (typeof fournisseursManager !== 'undefined') {
            fournisseursManager.initFournisseurs();
        }
        if (typeof scanManager !== 'undefined') {
            scanManager.initScan();
        }
    }
});