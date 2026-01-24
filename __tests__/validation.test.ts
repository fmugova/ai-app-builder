import CodeValidator from '../lib/validator';

describe('CodeValidator', () => {
    let validator: CodeValidator;

    beforeEach(() => {
        validator = new CodeValidator();
    });

    test('should pass valid enterprise-grade code', () => {
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; script-src 'self';">
            </head>
            <body>
                <header>Header</header>
                <main>
                    <h1>Roast & Revel Coffee Shop</h1>
                    <button class="add-to-cart-btn" data-action="add-to-cart" data-product-id="1" aria-label="Add Ethiopian Yirgacheffe to cart">Add to Cart</button>
                    <div id="toastContainer" class="toast-container"></div>
                </main>
                <footer>Footer</footer>
            </body>
            </html>
        `;
        const css = `
            :root {
                --primary: #2563eb;
                --radius: 8px;
            }
            .btn-loading { opacity: 0.5; pointer-events: none; }
            .toast-container { position: fixed; top: 100px; right: 20px; }
            @media (prefers-reduced-motion: reduce) {
                * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
            }
        `;
        const js = 'class AppState { constructor() { this.cart = []; } addToCart(productId) { this.cart.push(productId); } }; ' +
            'class UIRenderer { static escapeHtml(text) { var div = document.createElement("div"); div.textContent = text; return div.innerHTML; } }; ' +
            'class ToastManager { static show(message, type) { if(type===undefined){type="info";} var toast = document.createElement("div"); toast.className = "toast " + type; var msg = document.createElement("span"); msg.className = "toast-message"; msg.innerHTML = UIRenderer.escapeHtml(message); toast.appendChild(msg); document.getElementById("toastContainer").appendChild(toast); setTimeout(function() { toast.remove(); }, 3000); } }; ' +
            'document.querySelectorAll(".add-to-cart-btn").forEach(function(btn) { btn.addEventListener("click", function(e) { e.preventDefault(); ToastManager.show("Added to cart!"); }); }); ' +
            'window.addEventListener("error", function(event) { ToastManager.show("An unexpected error occurred", "error"); }); ' +
            'window.addEventListener("unhandledrejection", function(event) { ToastManager.show("An unexpected error occurred", "error"); });';
        const results = validator.validateAll(html, css, js);
        if (!results.passed) {
            console.error('Validation errors:', results.errors);
        }
        expect(results.passed).toBe(true);
        expect(results.score).toBeGreaterThan(70);
    });

    test('should fail code with inline styles', () => {
        const html = '<div style="color: red;">Test</div>';
        const css = '';
        const js = '';

        const results = validator.validateAll(html, css, js);
        expect(results.passed).toBe(false);
        expect(results.errors).toContainEqual(
            expect.objectContaining({ type: 'CSP' })
        );
    });

    test('should fail code with eval', () => {
        const html = '<div>Test</div>';
        const css = '';
        const js = 'eval("alert(1)")';

        const results = validator.validateAll(html, css, js);
        expect(results.passed).toBe(false);
        expect(results.errors).toContainEqual(
            expect.objectContaining({ type: 'Security' })
        );
    });
});
