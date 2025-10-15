// js/scan.js
class ScanManager {
    constructor() {
        this.initScan();
    }

    initScan() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.openScanner();
        });

        document.getElementById('confirm-scan').addEventListener('click', () => {
            this.handleManualInput();
        });

        // Fermer modal
        document.querySelector('.close')?.addEventListener('click', () => {
            this.closeScanner();
        });
    }

    openScanner() {
        document.getElementById('scan-modal').style.display = 'block';
        this.showManualInput(); // Pour l'instant, on utilise que la saisie manuelle
    }

    closeScanner() {
        document.getElementById('scan-modal').style.display = 'none';
    }

    showManualInput() {
        document.getElementById('manual-barcode').style.display = 'block';
        document.getElementById('manual-barcode').focus();
    }

    handleManualInput() {
        const code = document.getElementById('manual-barcode').value.trim();
        if (code) {
            this.processScannedCode(code);
        } else {
            alert('Veuillez saisir un code-barres');
        }
    }

    async processScannedCode(code) {
        try {
            console.log('Code scanné:', code);

            // Chercher dans les matières premières
            let produit = await this.findProductByBarcode(code);
            
            if (produit) {
                this.handleProductFound(produit);
                return;
            }

            // Chercher dans les produits finis
            produit = await this.findFinishedProductByBarcode(code);
            
            if (produit) {
                this.handleFinishedProductFound(produit);
                return;
            }

            // Produit non trouvé
            this.handleProductNotFound(code);
            
        } catch (error) {
            this.showError('Erreur scan: ' + error.message);
        }
    }

    async findProductByBarcode(code) {
        const snapshot = await db.collection('matieresPremieres')
            .where('codeBarres', '==', code)
            .where('actif', '==', true)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    async findFinishedProductByBarcode(code) {
        const snapshot = await db.collection('produitsFinis')
            .where('codeBarres', '==', code)
            .where('actif', '==', true)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    handleProductFound(produit) {
        this.showSuccess(`Produit trouvé: ${produit.nom} - Stock: ${produit.quantite} ${produit.unite}`);
        this.openStockAdjustment(produit);
        this.closeScanner();
    }

    handleFinishedProductFound(produit) {
        this.showSuccess(`Produit fini: ${produit.nom} - Stock: ${produit.stockActuel} ${produit.uniteStock}`);
        this.closeScanner();
    }

    handleProductNotFound(code) {
        const create = confirm(`Code "${code}" non trouvé. Voulez-vous créer un nouveau produit ?`);
        if (create) {
            this.openCreateProductModal(code);
        }
        this.closeScanner();
    }

    openStockAdjustment(produit) {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>📊 Ajuster Stock: ${produit.nom}</h3>
                    <p>Stock actuel: <strong>${produit.quantite} ${produit.unite}</strong></p>
                    <form id="scan-adjust-form">
                        <div class="form-group">
                            <label>Type de mouvement</label>
                            <select id="scan-adjustment-type" required>
                                <option value="entree">Entrée Stock</option>
                                <option value="sortie">Sortie Stock</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantité *</label>
                            <input type="number" id="scan-adjustment-qty" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Motif</label>
                            <input type="text" id="scan-adjustment-reason" placeholder="Réception, production...">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Confirmer</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('scan-adjust-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.confirmScanAdjustment(produit.id, produit);
        });
    }

    async confirmScanAdjustment(produitId, produit) {
        try {
            const quantite = parseFloat(document.getElementById('scan-adjustment-qty').value);
            const type = document.getElementById('scan-adjustment-type').value;
            const motif = document.getElementById('scan-adjustment-reason').value;

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

            // Mettre à jour le stock
            await db.collection('matieresPremieres').doc(produitId).update({
                quantite: nouvelleQuantite,
                dateModification: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Enregistrer le mouvement
            await db.collection('mouvements').add({
                type: type,
                produitId: produitId,
                produitType: 'matiere_premiere',
                produitNom: produit.nom,
                quantite: quantite,
                ancienStock: produit.quantite,
                nouveauStock: nouvelleQuantite,
                unite: produit.unite,
                motif: motif || 'Ajustement scan',
                utilisateur: auth.currentUser.uid,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.querySelector('.modal').remove();
            this.showSuccess(`Stock ajusté: ${nouvelleQuantite} ${produit.unite}`);

            // Recharger la liste si on est dans l'onglet stock
            if (typeof stockManager !== 'undefined') {
                stockManager.loadStockList();
            }

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    openCreateProductModal(code) {
        const modalHTML = `
            <div class="modal" style="display: block">
                <div class="modal-content">
                    <h3>➕ Nouveau Produit</h3>
                    <p>Code-barres: <strong>${code}</strong></p>
                    <form id="create-product-form">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input type="text" id="new-product-name" required>
                        </div>
                        <div class="form-group">
                            <label>Référence *</label>
                            <input type="text" id="new-product-reference" required>
                        </div>
                        <div class="form-group">
                            <label>Unité</label>
                            <select id="new-product-unite">
                                <option value="KG">KG</option>
                                <option value="LITRE">Litre</option>
                                <option value="UNITE">Unité</option>
                            </select>
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

        document.getElementById('create-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createNewProduct(code);
        });
    }

    async createNewProduct(code) {
        try {
            const productData = {
                nom: document.getElementById('new-product-name').value,
                reference: document.getElementById('new-product-reference').value,
                codeBarres: code,
                unite: document.getElementById('new-product-unite').value,
                quantite: 0,
                stockMin: 0,
                actif: true,
                dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
                createur: auth.currentUser.uid
            };

            await db.collection('matieresPremieres').add(productData);

            document.querySelector('.modal').remove();
            this.showSuccess('Produit créé avec succès');

        } catch (error) {
            this.showError('Erreur: ' + error.message);
        }
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

const scanManager = new ScanManager();