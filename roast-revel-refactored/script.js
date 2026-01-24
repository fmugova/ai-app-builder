// Roast & Revel Refactored - Modular Enterprise JS

class AppState {
    constructor() {
        this.cart = [];
        this.loadCartFromStorage();
    }
    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem('roastAndRevelCart');
            if (saved) this.cart = JSON.parse(saved);
        } catch (e) {
            this.cart = [];
        }
    }
    saveCartToStorage() {
        try {
            localStorage.setItem('roastAndRevelCart', JSON.stringify(this.cart));
        } catch (e) {
            ToastManager.show('Failed to save cart', 'error');
        }
    }
    addToCart(productId) {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return false;
        const existing = this.cart.find(item => item.id === productId);
        if (existing) existing.quantity += 1;
        else this.cart.push({ ...product, quantity: 1 });
        this.saveCartToStorage();
        return true;
    }
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCartToStorage();
    }
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return false;
        item.quantity += change;
        if (item.quantity <= 0) this.removeFromCart(productId);
        else this.saveCartToStorage();
        return true;
    }
    getCartTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    getCartItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }
    clearCart() {
        this.cart = [];
        this.saveCartToStorage();
    }
}

const PRODUCTS = [
    { id: 1, name: "Ethiopian Yirgacheffe", description: "Bright, floral notes with citrus undertones.", price: 18.99 },
    { id: 2, name: "Colombian Supremo", description: "Rich, full-bodied with chocolate and caramel notes.", price: 16.99 },
    { id: 3, name: "House Blend", description: "Signature blend from three continents.", price: 14.99 }
];

class ToastManager {
    static show(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconMap = { success: '✓', error: '✕', info: 'ℹ' };
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = iconMap[type] || iconMap.info;
        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;
        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

class UIRenderer {
    static renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        grid.innerHTML = products.map(product => `
            <div class="product-card" role="listitem">
                <h3>${UIRenderer.escapeHtml(product.name)}</h3>
                <p>${UIRenderer.escapeHtml(product.description)}</p>
                <div>$${product.price.toFixed(2)}</div>
                <button class="add-to-cart-btn" data-product-id="${product.id}" aria-label="Add ${UIRenderer.escapeHtml(product.name)} to cart">Add to Cart</button>
            </div>
        `).join('');
        this.attachProductEventListeners();
    }
    static attachProductEventListeners() {
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                ProductController.addToCart(productId, e.target);
            });
        });
    }
    static renderCart(cart) {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;
        if (cart.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <span>${UIRenderer.escapeHtml(item.name)}</span>
                    <span>Qty: ${item.quantity}</span>
                    <button class="remove" data-product-id="${item.id}">Remove</button>
                </div>
            `).join('');
        }
    }
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

class ProductController {
    static addToCart(productId, button) {
        button.classList.add('btn-loading');
        button.disabled = true;
        setTimeout(() => {
            const success = appState.addToCart(productId);
            button.classList.remove('btn-loading');
            button.disabled = false;
            if (success) {
                UIRenderer.renderCart(appState.cart);
                ToastManager.show('Product added to cart!', 'success');
            } else {
                ToastManager.show('Failed to add product', 'error');
            }
        }, 300);
    }
}

const appState = new AppState();
UIRenderer.renderProducts(PRODUCTS);
UIRenderer.renderCart(appState.cart);

// Global error handlers
window.addEventListener('error', (event) => {
    ToastManager.show('An unexpected error occurred', 'error');
});
window.addEventListener('unhandledrejection', (event) => {
    ToastManager.show('An unexpected error occurred', 'error');
});
