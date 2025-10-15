// js/stock.js
class StockManager {
    constructor() {
        this.initStock();
    }

    initStock() {
        this.loadStockList();
        document.getElementById('add-matiere-premiere').addEventListener('click', () => {
            this.showAddProductModal();
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
        }
    }

    updateStockTable(snapshot) {
        const tbody = document.getElementById('stock-table-body');
        tbody.innerHTML = '';

        snapshot.forEach(doc => {
            const produit = { id: doc.id, ...doc.data() };
            const row = this.createStockRow(produit);
            tbody.appendChild(row);
        });
    }

    createStockRow(produit) {
        const row = document.createElement('tr');
        
        // Formater la DLC
        const dlcText = produit.dlc ? 
            new Date(produit.dlc.seconds * 1000).toLocaleDateString() : 'N/A';

        row.innerHTML = `
            <td>${produit.codeBarres || 'N/A'}</td>
            <td>${produit.nom}</td>
            <td>${produit.quantite} ${produit.unite}</td>
            <td>${produit.fournisseurNom || 'N/A'}</td>
            <td>${dlcText}</td>
            <td>
                <button onclick="stockManager.editProduct('${produit.id}')">✏️</button>
                <button onclick="stockManager.adjustStock('${produit.id}')">📊</button>
            </td>
        `;

        return row;
    }

    showAddProductModal() {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>➕ Nouvelle Matière Première</h3>
                    <form id="add-product-form">
                        <input type="text" id="product-name" placeholder="Nom du produit" required>
                        <input type="text" id="product-reference" placeholder="Référence">
                        <input type="text" id="product-barcode" placeholder="Code-barres">
                        <select id="product-unite" required>
                            <option value="KG">KG</option>
                            <option value="LITRE">Litre</option>
                            <option value="UNITE">Unité</option>
                        </select>
                        <input type="number" id="product-quantite" placeholder="Quantité" step="0.01" required>
                        <input type="number" id="product-stock-min" placeholder="Stock minimum" required>
                        <button type="submit">Ajouter</button>
                        <button type="button" onclick="this.closest('.modal').remove()">Annuler</button>
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
                codeBarres: document.getElementById('product-barcode').value,
                unite: document.getElementById('product-unite').value,
                quantite: parseFloat(document.getElementById('product-quantite').value),
                stockMin: parseFloat(document.getElementById('product-stock-min').value),
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            await db.collection('matieresPremieres').add(productData);
            
            // Fermer le modal et recharger la liste
            document.querySelector('.modal').remove();
            this.loadStockList();
            
            alert('Produit ajouté avec succès !');
            
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
}

const stockManager = new StockManager();