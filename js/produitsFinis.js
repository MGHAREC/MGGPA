// js/produitsFinis.js
class ProduitsFinisManager {
    constructor() {
        this.initProduitsFinis();
    }

    initProduitsFinis() {
        this.loadProduitsFinisList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('add-produit-fini').addEventListener('click', () => {
            this.showAddProduitFiniModal();
        });
    }

    async loadProduitsFinisList() {
        try {
            const snapshot = await db.collection('produitsFinis')
                .where('actif', '==', true)
                .orderBy('nom')
                .get();

            this.updateProduitsFinisTable(snapshot);
        } catch (error) {
            console.error('Erreur chargement produits finis:', error);
        }
    }

    updateProduitsFinisTable(snapshot) {
        const tbody = document.getElementById('produits-finis-table-body');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucun produit fini</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const produit = { id: doc.id, ...doc.data() };
            const row = this.createProduitFiniRow(produit);
            tbody.appendChild(row);
        });
    }

    createProduitFiniRow(produit) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${produit.reference || 'N/A'}</td>
            <td><strong>${produit.nom}</strong></td>
            <td>${produit.stockActuel || 0} ${produit.uniteStock || 'UNITE'}</td>
            <td>${produit.stockCible || 0}</td>
            <td>${produit.prixVente ? produit.prixVente + '€' : 'N/A'}</td>
            <td class="actions">
                <button class="btn-small btn-primary" onclick="produitsFinisManager.editProduit('${produit.id}')">✏️</button>
                <button class="btn-small btn-warning" onclick="produitsFinisManager.ajusterStock('${produit.id}')">📊</button>
            </td>
        `;

        return row;
    }

    showAddProduitFiniModal() {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content" style="max-width: 500px">
                    <h3>🏷️ Nouveau Produit Fini</h3>
                    <form id="add-produit-fini-form">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input type="text" id="pf-nom" placeholder="Sauce Tomate Basilic" required>
                        </div>
                        <div class="form-group">
                            <label>Référence *</label>
                            <input type="text" id="pf-reference" placeholder="PF-001" required>
                        </div>
                        <div class="form-group">
                            <label>Code-barres</label>
                            <input type="text" id="pf-code-barres" placeholder="1234567890123">
                        </div>
                        <div class="form-group">
                            <label>Catégorie</label>
                            <input type="text" id="pf-categorie" placeholder="SAUCES">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Unité de production</label>
                                <select id="pf-unite-production">
                                    <option value="LITRE">Litre</option>
                                    <option value="KG">Kilogramme</option>
                                    <option value="UNITE">Unité</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Temps production (h)</label>
                                <input type="number" id="pf-temps-production" step="0.1" value="1">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Stock cible</label>
                                <input type="number" id="pf-stock-cible" value="100">
                            </div>
                            <div class="form-group">
                                <label>Prix de vente (€)</label>
                                <input type="number" id="pf-prix-vente" step="0.01">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Instructions de production</label>
                            <textarea id="pf-instructions" rows="3" placeholder="Instructions de fabrication..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Créer</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('add-produit-fini-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewProduitFini();
        });
    }

    async addNewProduitFini() {
        try {
            const produitData = {
                nom: document.getElementById('pf-nom').value,
                reference: document.getElementById('pf-reference').value,
                codeBarres: document.getElementById('pf-code-barres').value || '',
                categorie: document.getElementById('pf-categorie').value,
                uniteProduction: document.getElementById('pf-unite-production').value,
                tempsProduction: parseFloat(document.getElementById('pf-temps-production').value),
                stockCible: parseInt(document.getElementById('pf-stock-cible').value),
                stockActuel: 0,
                prixVente: document.getElementById('pf-prix-vente').value ? 
                    parseFloat(document.getElementById('pf-prix-vente').value) : null,
                instructionsProduction: document.getElementById('pf-instructions').value,
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            await db.collection('produitsFinis').add(produitData);

            document.querySelector('.modal').remove();
            this.loadProduitsFinisList();
            this.showSuccess('Produit fini créé avec succès');

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        document.querySelector('.main-content').prepend(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.textContent = message;
        document.querySelector('.main-content').prepend(alert);
        setTimeout(() => alert.remove(), 5000);
    }
}

const produitsFinisManager = new ProduitsFinisManager();