// js/fournisseurs.js
class FournisseursManager {
    constructor() {
        this.initFournisseurs();
    }

    initFournisseurs() {
        this.loadFournisseursList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('add-fournisseur').addEventListener('click', () => {
            this.showAddFournisseurModal();
        });
    }

    async loadFournisseursList() {
        try {
            const snapshot = await db.collection('fournisseurs')
                .where('actif', '==', true)
                .orderBy('nom')
                .get();

            this.updateFournisseursTable(snapshot);
        } catch (error) {
            console.error('Erreur chargement fournisseurs:', error);
        }
    }

    updateFournisseursTable(snapshot) {
        const tbody = document.getElementById('fournisseurs-table-body');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucun fournisseur</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const fournisseur = { id: doc.id, ...doc.data() };
            const row = this.createFournisseurRow(fournisseur);
            tbody.appendChild(row);
        });
    }

    createFournisseurRow(fournisseur) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${fournisseur.nom}</strong></td>
            <td>${fournisseur.contactPrincipal || 'N/A'}</td>
            <td>${fournisseur.email || 'N/A'}</td>
            <td>${fournisseur.telephone || 'N/A'}</td>
            <td>${fournisseur.delaiLivraisonMoyen ? fournisseur.delaiLivraisonMoyen + ' jours' : 'N/A'}</td>
            <td class="actions">
                <button class="btn-small btn-primary" onclick="fournisseursManager.editFournisseur('${fournisseur.id}')">✏️</button>
                <button class="btn-small btn-danger" onclick="fournisseursManager.deleteFournisseur('${fournisseur.id}')">🗑️</button>
            </td>
        `;

        return row;
    }

    showAddFournisseurModal() {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content" style="max-width: 500px">
                    <h3>🏢 Nouveau Fournisseur</h3>
                    <form id="add-fournisseur-form">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input type="text" id="fournisseur-nom" placeholder="FRUITS ET LEGUMES FRESH" required>
                        </div>
                        <div class="form-group">
                            <label>Contact principal</label>
                            <input type="text" id="fournisseur-contact" placeholder="Jean Dupont">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="fournisseur-email" placeholder="contact@fournisseur.fr">
                        </div>
                        <div class="form-group">
                            <label>Téléphone</label>
                            <input type="tel" id="fournisseur-telephone" placeholder="01 23 45 67 89">
                        </div>
                        <div class="form-group">
                            <label>Adresse</label>
                            <textarea id="fournisseur-adresse" rows="2" placeholder="123 Rue des Halles, 75001 Paris"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Délai livraison moyen (jours)</label>
                            <input type="number" id="fournisseur-delai" value="2">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Ajouter</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('add-fournisseur-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewFournisseur();
        });
    }

    async addNewFournisseur() {
        try {
            const fournisseurData = {
                nom: document.getElementById('fournisseur-nom').value,
                contactPrincipal: document.getElementById('fournisseur-contact').value || '',
                email: document.getElementById('fournisseur-email').value || '',
                telephone: document.getElementById('fournisseur-telephone').value || '',
                adresse: document.getElementById('fournisseur-adresse').value || '',
                delaiLivraisonMoyen: parseInt(document.getElementById('fournisseur-delai').value),
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            await db.collection('fournisseurs').add(fournisseurData);

            document.querySelector('.modal').remove();
            this.loadFournisseursList();
            this.showSuccess('Fournisseur ajouté avec succès');

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

const fournisseursManager = new FournisseursManager();