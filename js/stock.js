// js/stock.js
class StockManager {
    constructor() {
        this.initStock();
    }

    initStock() {
        this.loadStockList();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('add-matiere-premiere').addEventListener('click', () => {
            this.showAddProductModal();
        });

        // Recherche en temps réel
        document.getElementById('search-stock').addEventListener('input', (e) => {
            this.filterStock(e.target.value);
        });
    }

    async loadStockList() {
        try {
            const snapshot = await db.collection('matieresPremieres')
                .where('actif', '==', true)
                .orderBy('nom')
                .get();

            this.updateStockTable(snapshot);
        } catch (error) {
            console.error('Erreur chargement stock:', error);
            this.showError('Erreur lors du chargement du stock');
        }
    }

    updateStockTable(snapshot) {
        const tbody = document.getElementById('stock-table-body');
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune matière première</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const produit = { id: doc.id, ...doc.data() };
            const row = this.createStockRow(produit);
            tbody.appendChild(row);
        });
    }

    createStockRow(produit) {
        const row = document.createElement('tr');
        
        const dlcText = produit.dlc ? 
            new Date(produit.dlc.seconds * 1000).toLocaleDateString() : 'N/A';

        // Déterminer la classe de statut du stock
        let stockClass = 'stock-ok';
        if (produit.quantite <= 0) stockClass = 'stock-rupture';
        else if (produit.quantite <= produit.stockMin) stockClass = 'stock-faible';

        row.innerHTML = `
            <td>${produit.codeBarres || 'N/A'}</td>
            <td><strong>${produit.nom}</strong></td>
            <td class="${stockClass}">${produit.quantite} ${produit.unite}</td>
            <td>${produit.fournisseurNom || 'N/A'}</td>
            <td>${dlcText}</td>
            <td class="actions">
                <button class="btn-small btn-primary" onclick="stockManager.editProduct('${produit.id}')">✏️</button>
                <button class="btn-small btn-warning" onclick="stockManager.adjustStock('${produit.id}')">📊</button>
                <button class="btn-small btn-danger" onclick="stockManager.deleteProduct('${produit.id}')">🗑️</button>
            </td>
        `;

        return row;
    }

    showAddProductModal() {
        const modalHTML = `
            <div class="modal" id="add-product-modal" style="display: block">
                <div class="modal-content" style="max-width: 500px">
                    <h3>➕ Nouvelle Matière Première</h3>
                    <form id="add-product-form">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input type="text" id="product-name" placeholder="Tomates pelées" required>
                        </div>
                        <div class="form-group">
                            <label>Référence *</label>
                            <input type="text" id="product-reference" placeholder="TOM-001" required>
                        </div>
                        <div class="form-group">
                            <label>Code-barres</label>
                            <input type="text" id="product-barcode" placeholder="1234567890123">
                        </div>
                        <div class="form-group">
                            <label>Catégorie</label>
                            <select id="product-category">
                                <option value="FRUITS_LEGUMES">Fruits et Légumes</option>
                                <option value="PRODUITS_LAITIERS">Produits Laitiers</option>
                                <option value="VIANDES">Viandes</option>
                                <option value="PRODUITS_SECS">Produits Secs</option>
                                <option value="AUTRE">Autre</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Quantité *</label>
                                <input type="number" id="product-quantite" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label>Unité *</label>
                                <select id="product-unite" required>
                                    <option value="KG">KG</option>
                                    <option value="LITRE">Litre</option>
                                    <option value="UNITE">Unité</option>
                                    <option value="CARTON">Carton</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Stock minimum *</label>
                            <input type="number" id="product-stock-min" step="0.01" required>
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
        
        document.getElementById('add-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewProduct();
        });
    }

    async addNewProduct() {
        try {
            const productData = {
                nom: document.getElementById('product-name').value,
                reference: document.getElementById('product-reference').value,
                codeBarres: document.getElementById('product-barcode').value || '',
                categorie: document.getElementById('product-category').value,
                unite: document.getElementById('product-unite').value,
                quantite: parseFloat(document.getElementById('product-quantite').value),
                stockMin: parseFloat(document.getElementById('product-stock-min').value),
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            await db.collection('matieresPremieres').add(productData);
            
            document.getElementById('add-product-modal').remove();
            this.loadStockList();
            
            this.showSuccess('Matière première ajoutée avec succès !');
            
        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    async adjustStock(productId) {
        const produitRef = db.collection('matieresPremieres').doc(productId);
        const produitDoc = await produitRef.get();
        const produit = produitDoc.data();

        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>📊 Ajuster Stock: ${produit.nom}</h3>
                    <p>Stock actuel: <strong>${produit.quantite} ${produit.unite}</strong></p>
                    <form id="adjust-stock-form">
                        <div class="form-group">
                            <label>Type de mouvement</label>
                            <select id="adjustment-type" required>
                                <option value="entree">Entrée de stock</option>
                                <option value="sortie">Sortie de stock</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantité *</label>
                            <input type="number" id="adjustment-quantity" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Motif</label>
                            <input type="text" id="adjustment-reason" placeholder="Réception commande, production...">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Valider</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('adjust-stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.confirmStockAdjustment(productId, produit);
        });
    }

    async confirmStockAdjustment(productId, produit) {
        try {
            const type = document.getElementById('adjustment-type').value;
            const quantite = parseFloat(document.getElementById('adjustment-quantity').value);
            const motif = document.getElementById('adjustment-reason').value;

            if (quantite <= 0) {
                this.showError('La quantité doit être positive');
                return;
            }

            const nouvelleQuantite = type === 'entree' 
                ? produit.quantite + quantite
                : produit.quantite - quantite;

            if (nouvelleQuantite < 0) {
                this.showError('Stock insuffisant');
                return;
            }

            await db.collection('matieresPremieres').doc(productId).update({
                quantite: nouvelleQuantite,
                dateModification: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Enregistrer le mouvement
            await db.collection('mouvements').add({
                type: type,
                produitId: productId,
                produitType: 'matiere_premiere',
                produitNom: produit.nom,
                quantite: quantite,
                ancienStock: produit.quantite,
                nouveauStock: nouvelleQuantite,
                unite: produit.unite,
                motif: motif,
                utilisateur: auth.currentUser.uid,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.querySelector('.modal').remove();
            this.loadStockList();
            this.showSuccess('Stock ajusté avec succès');

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    filterStock(searchTerm) {
        const rows = document.querySelectorAll('#stock-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
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

const stockManager = new StockManager();