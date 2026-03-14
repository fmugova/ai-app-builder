// lib/scaffold/ecommerce-scaffold.ts
// Pre-built scaffold for Next.js e-commerce apps.
// Injected when selectScaffold() returns 'ecommerce'.
// Provides: CartContext (provider + hook), CartDrawer, CartButton, ProductCard
// + SQL migration for products / orders / promo_codes tables.

import { getScaffoldFiles } from './nextjs-scaffold';

// ── app/layout.tsx override — wraps app with CartProvider ─────────────────────

const ECOMMERCE_LAYOUT = `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { CartProvider } from '@/components/cart/CartContext'
import { CartDrawer } from '@/components/cart/CartDrawer'

const inter = Inter({ subsets: ['latin'] })

// Force all pages to render dynamically so cookies() / Supabase auth always
// has a request context. Without this, Next.js 15.5+ throws:
// "Invariant: Expected workUnitAsyncStorage to have a store"
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Store',
  description: 'Built with BuildFlow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          {children}
          <CartDrawer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  )
}
`;

// ── CartContext ────────────────────────────────────────────────────────────────

const CART_CONTEXT = `"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variant?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "id" | "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Persist cart across page reloads
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bf_cart");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("bf_cart", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "id" | "quantity">, qty = 1) => {
      setItems((prev) => {
        const key = item.productId + (item.variant ?? "");
        const existing = prev.find(
          (i) => i.productId + (i.variant ?? "") === key
        );
        if (existing) {
          return prev.map((i) =>
            i.productId + (i.variant ?? "") === key
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [...prev, { ...item, id: key, quantity: qty }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
`;

// ── CartDrawer ─────────────────────────────────────────────────────────────────

const CART_DRAWER = `"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";

export function CartDrawer() {
  const {
    items,
    count,
    subtotal,
    removeItem,
    updateQty,
    clearCart,
    isOpen,
    closeCart,
  } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-gray-700 dark:text-gray-300" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Your basket
              {count > 0 && (
                <span className="text-gray-400 font-normal ml-1">({count})</span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close basket"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <ShoppingBag size={40} className="text-gray-200 dark:text-gray-700" />
              <p className="text-gray-500 text-sm">Your basket is empty</p>
              <button
                onClick={closeCart}
                className="text-sm text-indigo-600 hover:underline"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {item.image && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </p>
                  {item.variant && (
                    <p className="text-xs text-gray-400">{item.variant}</p>
                  )}
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    £{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-sm w-5 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                £{subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-400">Shipping calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              Checkout · £{subtotal.toFixed(2)}
            </Link>
            <button
              onClick={() => {
                clearCart();
                closeCart();
              }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
            >
              Clear basket
            </button>
          </div>
        )}
      </div>
    </>
  );
}
`;

// ── CartButton ─────────────────────────────────────────────────────────────────

const CART_BUTTON = `"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";

export function CartButton({ className }: { className?: string }) {
  const { count, openCart } = useCart();
  return (
    <button
      onClick={openCart}
      className={
        "relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors " +
        (className ?? "")
      }
      aria-label={count > 0 ? \`Open basket, \${count} items\` : "Open basket"}
    >
      <ShoppingBag size={20} className="text-gray-700 dark:text-gray-300" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
`;

// ── ProductCard ────────────────────────────────────────────────────────────────

const PRODUCT_CARD = `"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Heart } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart/CartContext";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  image: string;
  category?: string;
  badge?: string;
  inStock?: boolean;
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round((1 - product.price / product.comparePrice) * 100)
      : 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    toast.success(\`\${product.name} added to basket\`);
  }

  return (
    <Link href={\`/products/\${product.slug}\`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 aspect-[4/3] mb-3">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {product.badge && (
          <span className="absolute top-2.5 left-2.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
            {product.badge}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute top-2.5 right-2.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
            -{discount}%
          </span>
        )}
        {/* Quick-add strip — slides up on hover */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.inStock === false}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-2 rounded-xl text-xs font-medium shadow hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={12} />
            {product.inStock === false ? "Out of stock" : "Add to basket"}
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            className="p-2 bg-white dark:bg-gray-900 rounded-xl shadow hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Save to wishlist"
          >
            <Heart size={14} className="text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      <div className="px-0.5">
        {product.category && (
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
            {product.category}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            £{product.price.toFixed(2)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-gray-400 line-through">
              £{product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
`;

// ── SQL migration ──────────────────────────────────────────────────────────────

export const ECOMMERCE_MIGRATION = `-- ============================================================
-- E-commerce: product_categories, products, promo_codes,
--             orders, order_items
-- ============================================================

-- Product categories (self-referential for nested categories)
CREATE TABLE IF NOT EXISTS product_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  parent_id  UUID        REFERENCES product_categories(id) ON DELETE SET NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT         NOT NULL,
  slug          TEXT         NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_price NUMERIC(10,2),
  images        TEXT[]       NOT NULL DEFAULT '{}',
  category_id   UUID         REFERENCES product_categories(id) ON DELETE SET NULL,
  badge         TEXT,
  in_stock      BOOLEAN      NOT NULL DEFAULT true,
  stock_qty     INTEGER,
  sku           TEXT         UNIQUE,
  tags          TEXT[]       NOT NULL DEFAULT '{}',
  metadata      JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT         NOT NULL UNIQUE,
  type        TEXT         NOT NULL DEFAULT 'percentage'
                           CHECK (type IN ('percentage', 'fixed')),
  value       NUMERIC(10,2) NOT NULL CHECK (value > 0),
  min_order   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses    INTEGER,
  uses_count  INTEGER      NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email              TEXT,
  status                   TEXT         NOT NULL DEFAULT 'pending'
                                        CHECK (status IN (
                                          'pending','paid','processing',
                                          'shipped','delivered','cancelled','refunded'
                                        )),
  subtotal                 NUMERIC(10,2) NOT NULL,
  discount                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                    NUMERIC(10,2) NOT NULL,
  promo_code_id            UUID         REFERENCES promo_codes(id),
  shipping_address         JSONB,
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Order items (snapshot of product at time of purchase)
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID         REFERENCES products(id) ON DELETE SET NULL,
  name       TEXT         NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  quantity   INTEGER      NOT NULL CHECK (quantity > 0),
  image_url  TEXT,
  variant    TEXT
);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;

-- Products / categories: public read
CREATE POLICY "products_public_select"    ON products            FOR SELECT USING (true);
CREATE POLICY "categories_public_select"  ON product_categories  FOR SELECT USING (true);

-- Orders: users can see and create their own
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (
  user_id = auth.uid() OR guest_email = (auth.jwt() ->> 'email')
);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

-- Order items: visible if the parent order is visible
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders
    WHERE user_id = auth.uid()
       OR guest_email = (auth.jwt() ->> 'email')
  )
);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);

-- Promo codes: authenticated users can read active codes
CREATE POLICY "promo_codes_select" ON promo_codes FOR SELECT USING (
  active = true AND auth.uid() IS NOT NULL
);

-- ── Helper function ─────────────────────────────────────────────────────────

-- Validate and apply a promo code, returns discount amount
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_code      TEXT,
  p_subtotal  NUMERIC
) RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_promo promo_codes;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_promo
  FROM   promo_codes
  WHERE  code = UPPER(p_code)
    AND  active = true
    AND  (expires_at IS NULL OR expires_at > NOW())
    AND  (max_uses IS NULL OR uses_count < max_uses)
    AND  p_subtotal >= min_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired promo code';
  END IF;

  IF v_promo.type = 'percentage' THEN
    v_discount := ROUND(p_subtotal * v_promo.value / 100, 2);
  ELSE
    v_discount := LEAST(v_promo.value, p_subtotal);
  END IF;

  UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = v_promo.id;

  RETURN v_discount;
END;
$$;

-- ── Seed data ───────────────────────────────────────────────────────────────

INSERT INTO product_categories (id, name, slug, sort_order) VALUES
  ('cat-0001-0000-0000-0000-000000000001', 'All',         'all',         0),
  ('cat-0001-0000-0000-0000-000000000002', 'New Arrivals','new-arrivals', 1),
  ('cat-0001-0000-0000-0000-000000000003', 'Bestsellers', 'bestsellers',  2),
  ('cat-0001-0000-0000-0000-000000000004', 'Sale',        'sale',         3)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, name, slug, description, price, compare_price, images, badge, in_stock) VALUES
  (
    'prod-0001-0000-0000-0000-000000000001',
    'Classic White Tee',
    'classic-white-tee',
    'A timeless essential crafted from 100% organic cotton.',
    29.00, NULL,
    ARRAY['https://picsum.photos/seed/prod1/800/600'],
    'New',
    true
  ),
  (
    'prod-0001-0000-0000-0000-000000000002',
    'Slim Fit Chinos',
    'slim-fit-chinos',
    'Tailored chinos that work from office to weekend.',
    79.00, 99.00,
    ARRAY['https://picsum.photos/seed/prod2/800/600'],
    'Sale',
    true
  ),
  (
    'prod-0001-0000-0000-0000-000000000003',
    'Leather Minimalist Wallet',
    'leather-minimalist-wallet',
    'Full-grain leather, holds up to 8 cards.',
    45.00, NULL,
    ARRAY['https://picsum.photos/seed/prod3/800/600'],
    'Bestseller',
    true
  ),
  (
    'prod-0001-0000-0000-0000-000000000004',
    'Canvas Weekend Bag',
    'canvas-weekend-bag',
    'Waxed canvas with leather trim. Fits a 3-day trip.',
    120.00, NULL,
    ARRAY['https://picsum.photos/seed/prod4/800/600'],
    NULL,
    true
  ),
  (
    'prod-0001-0000-0000-0000-000000000005',
    'Merino Roll-neck Sweater',
    'merino-roll-neck',
    'Extra-fine merino wool. Surprisingly lightweight.',
    95.00, 130.00,
    ARRAY['https://picsum.photos/seed/prod5/800/600'],
    'Sale',
    true
  ),
  (
    'prod-0001-0000-0000-0000-000000000006',
    'Polarised Sunglasses',
    'polarised-sunglasses',
    'Acetate frames, CR-39 polarised lenses, UV400.',
    65.00, NULL,
    ARRAY['https://picsum.photos/seed/prod6/800/600'],
    'New',
    true
  )
ON CONFLICT DO NOTHING;

INSERT INTO promo_codes (code, type, value, min_order) VALUES
  ('WELCOME10', 'percentage', 10, 0),
  ('SAVE20',    'fixed',      20, 75)
ON CONFLICT DO NOTHING;
`;

// ── System prompt addon ────────────────────────────────────────────────────────

export const ECOMMERCE_NEXTJS_SYSTEM_PROMPT_ADDON = `
════════════════════════════════════════════════════════════════════
🛒 ECOMMERCE SCAFFOLD — ALWAYS APPLY FOR NEXT.JS SHOP PROJECTS
════════════════════════════════════════════════════════════════════

Pre-built components already in the scaffold — USE THEM:

\`\`\`
components/cart/CartContext.tsx  → CartProvider (in layout), useCart() hook
components/cart/CartDrawer.tsx   → Slide-out basket panel (rendered in layout)
components/cart/CartButton.tsx   → <CartButton /> with live count badge (for navbar)
components/products/ProductCard.tsx → <ProductCard product={…} /> with quick-add
\`\`\`

CartProvider + CartDrawer are already in app/layout.tsx — do NOT add them again.

**useCart() API:**
\`\`\`typescript
const { items, count, subtotal, addItem, removeItem, updateQty, clearCart,
        isOpen, openCart, closeCart } = useCart();

// Add to cart:
addItem({ productId: "abc", name: "T-shirt", price: 29, image: "..." });
\`\`\`

**Database schema (already in supabase/migrations/001_ecommerce.sql):**
- \`product_categories\`  — id, name, slug, parent_id, sort_order
- \`products\`            — id, name, slug, description, price, compare_price, images[], category_id, badge, in_stock, stock_qty, sku, tags[], metadata
- \`promo_codes\`         — id, code, type (percentage/fixed), value, min_order, max_uses, uses_count, expires_at, active
- \`orders\`              — id, user_id, guest_email, status, subtotal, discount, shipping, total, promo_code_id, shipping_address, stripe_payment_intent_id
- \`order_items\`         — id, order_id, product_id, name, price, quantity, image_url, variant

**Supabase helper:**
- \`apply_promo_code(code, subtotal)\` → returns discount amount or throws

**MANDATORY page structure:**

1. \`app/page.tsx\` — Hero + featured products + brand story
   \`\`\`tsx
   import { ProductCard } from "@/components/products/ProductCard";
   // fetch from products table, pass to ProductCard
   \`\`\`

2. \`app/shop/page.tsx\` — Product grid with category filter sidebar
   - Fetch all products + categories from Supabase (Server Component)
   - Client component for filter state (\`"use client"\`)
   - Use \`ProductCard\` for each product

3. \`app/products/[slug]/page.tsx\` — Product detail page
   - Full image gallery, description, add-to-basket button using \`useCart()\`
   - Related products section

4. \`app/basket/page.tsx\` OR \`app/checkout/page.tsx\` — Checkout flow
   - Read cart from \`useCart()\`
   - Promo code input calls \`apply_promo_code()\` via API route
   - Order summary with subtotal / discount / shipping / total
   - Call Stripe or store order via \`/api/orders\` route

5. Navbar MUST include \`<CartButton />\` — renders count badge automatically

**VISUAL STANDARDS:**
- Clean, minimal aesthetic — let products breathe
- Large product images, consistent aspect ratios (4:3 grid, square detail)
- Sticky navbar with CartButton
- Mobile-first grid: 1 col → 2 col (sm) → 3 col (lg) → 4 col (xl)
- Hover effects on ProductCard already built in — do not recreate them
`;

// ── Scaffold file assembly ─────────────────────────────────────────────────────

export function getEcommerceScaffoldFiles(): Record<string, string> {
  return {
    ...getScaffoldFiles(),
    // Override layout to wrap app in CartProvider
    'app/layout.tsx': ECOMMERCE_LAYOUT,
    // Cart system
    'components/cart/CartContext.tsx': CART_CONTEXT,
    'components/cart/CartDrawer.tsx':  CART_DRAWER,
    'components/cart/CartButton.tsx':  CART_BUTTON,
    // Product components
    'components/products/ProductCard.tsx': PRODUCT_CARD,
    // SQL migration
    'supabase/migrations/001_ecommerce.sql': ECOMMERCE_MIGRATION,
  };
}
