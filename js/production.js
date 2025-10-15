// js/production.js
class ProductionManager {
    constructor() {
        this.produitsFinis = [];
        this.initProduction();
    }

    async initProduction() {
        await this.loadProduitsFinis();
        this.setupEventListeners();
        this.loadOFList();
    }

    setupEventListeners() {
        document.getElementById('add-of').addEventListener('click', () => {
            this.showCreateOFModal();
        });
    }

    async loadProduitsFinis() {
        try {
            const snapshot = await db.collection('produitsFinis')
                .where('actif', '==', true)
                .orderBy('nom')
                .get();

            this.produitsFinis = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur chargement produits finis:', error);
        }
    }

    async loadOFList() {
        try {
            const snapshot = await db.collection('ordresFabrication')
                .orderBy('dateCreation', 'desc')
                .limit(50)
                .get();

            this.updateOFTable(snapshot);
        } catch (error) {
            console.error('Erreur chargement OF:', error);
        }
    }

    updateOFTable(snapshot) {
        const tbody = document.getElementById('of-table-body');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Aucun ordre de fabrication</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const of = { id: doc.id, ...doc.data() };
            const row = this.createOFRow(of);
            tbody.appendChild(row);
        });
    }

    createOFRow(of) {
        const row = document.createElement('tr');
        
        const dateCreation = of.dateCreation ? 
            new Date(of.dateCreation.seconds * 1000).toLocaleDateString() : 'N/A';

        const statutClass = `statut-${of.statut}`;
        const statutText = this.getStatutText(of.statut);

        row.innerHTML = `
            <td><strong>${of.numero || 'N/A'}</strong></td>
            <td>${of.produitFiniNom || 'N/A'}</td>
            <td>${of.quantite || 0}</td>
            <td>${of.quantiteProduite || 0}</td>
            <td class="${statutClass}">${statutText}</td>
            <td>${dateCreation}</td>
            <td class="actions">
                ${of.statut === 'planifie' ? 
                    `<button class="btn-small btn-primary" onclick="productionManager.lancerOF('${of.id}')">🚀</button>` : ''}
                ${of.statut === 'en_cours' ? 
                    `<button class="btn-small btn-success" onclick="productionManager.terminerOF('${of.id}')">✅</button>` : ''}
                <button class="btn-small btn-secondary" onclick="productionManager.voirDetails('${of.id}')">👁️</button>
            </td>
        `;

        return row;
    }

    getStatutText(statut) {
        const statuts = {
            'planifie': 'Planifié',
            'en_cours': 'En Cours',
            'termine': 'Terminé',
            'annule': 'Annulé'
        };
        return statuts[statut] || statut;
    }

    showCreateOFModal() {
        if (this.produitsFinis.length === 0) {
            this.showError('Aucun produit fini disponible. Créez d\'abord un produit fini.');
            return;
        }

        const optionsHTML = this.produitsFinis.map(produit => 
            `<option value="${produit.id}">${produit.nom} (${produit.reference})</option>`
        ).join('');

        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>🏭 Nouvel Ordre de Fabrication</h3>
                    <form id="create-of-form">
                        <div class="form-group">
                            <label>Produit à fabriquer *</label>
                            <select id="of-produit-fini" required>
                                <option value="">Sélectionnez un produit</option>
                                ${optionsHTML}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantité à produire *</label>
                            <input type="number" id="of-quantite" step="1" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>Date de fin prévue</label>
                            <input type="date" id="of-date-fin">
                        </div>
                        <div class="form-group">
                            <label>Priorité</label>
                            <select id="of-priorite">
                                <option value="normale">Normale</option>
                                <option value="haute">Haute</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Instructions</label>
                            <textarea id="of-instructions" rows="3" placeholder="Instructions particulières..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Créer l'OF</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('create-of-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createOF();
        });
    }

    async createOF() {
        try {
            const produitFiniId = document.getElementById('of-produit-fini').value;
            const produitFini = this.produitsFinis.find(p => p.id === produitFiniId);
            
            const ofData = {
                produitFiniId: produitFiniId,
                produitFiniNom: produitFini.nom,
                produitFiniReference: produitFini.reference,
                quantite: parseInt(document.getElementById('of-quantite').value),
                dateFinPrevue: document.getElementById('of-date-fin').value || null,
                priorite: document.getElementById('of-priorite').value,
                instructions: document.getElementById('of-instructions').value,
                statut: 'planifie',
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            // Générer numéro OF
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const countSnapshot = await db.collection('ordresFabrication')
                .where('dateCreation', '>=', new Date(new Date().setHours(0,0,0,0)))
                .get();
            
            ofData.numero = `OF-${today}-${(countSnapshot.size + 1).toString().padStart(3, '0')}`;

            await db.collection('ordresFabrication').add(ofData);

            document.querySelector('.modal').remove();
            this.loadOFList();
            this.showSuccess('Ordre de fabrication créé avec succès');

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    async lancerOF(ofId) {
        try {
            await db.collection('ordresFabrication').doc(ofId).update({
                statut: 'en_cours',
                dateLancement: firebase.firestore.FieldValue.serverTimestamp(),
                operateur: auth.currentUser.uid
            });

            this.loadOFList();
            this.showSuccess('OF lancé avec succès');

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    async terminerOF(ofId) {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>✅ Terminer l'Ordre de Fabrication</h3>
                    <form id="terminer-of-form">
                        <div class="form-group">
                            <label>Quantité réellement produite *</label>
                            <input type="number" id="of-quantite-produite" step="1" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>Taux de rebus (%)</label>
                            <input type="number" id="of-taux-rebus" step="0.1" min="0" max="100" value="0">
                        </div>
                        <div class="form-group">
                            <label>Observations</label>
                            <textarea id="of-observations" rows="3" placeholder="Observations sur la production..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Terminer l'OF</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('terminer-of-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.confirmTerminerOF(ofId);
        });
    }

    async confirmTerminerOF(ofId) {
        try {
            const quantiteProduite = parseInt(document.getElementById('of-quantite-produite').value);
            const tauxRebus = parseFloat(document.getElementById('of-taux-rebus').value);
            const observations = document.getElementById('of-observations').value;

            await db.collection('ordresFabrication').doc(ofId).update({
                statut: 'termine',
                quantiteProduite: quantiteProduite,
                tauxRebus: tauxRebus,
                observations: observations,
                dateFinReelle: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.querySelector('.modal').remove();
            this.loadOFList();
            this.showSuccess('OF terminé avec succès');

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

const productionManager = new ProductionManager();