"use client";

import { useState, useRef, useEffect } from "react";

import Head from "next/head";

// =============================
// CONFIGURATION
// =============================
const CONFIG = {
  TOAST_DURATION: 3000,
  ANIMATION_DELAY: 300,
  SEARCH_DEBOUNCE: 300,
};

// =============================
// DATA STORE
// =============================
const PRODUCTS = [
  {
    id: 1,
    name: "Ethiopian Yirgacheffe",
    description:
      "Bright, floral notes with citrus undertones. Light to medium roast.",
    price: 18.99,
    category: "single-origin",
    image: "☕",
    details:
      "Grown at high altitude in the Yirgacheffe region of Ethiopia, this coffee offers a complex flavor profile with wine-like acidity and a clean finish.",
  },
  {
    id: 2,
    name: "Colombian Supremo",
    description:
      "Rich, full-bodied with chocolate and caramel notes. Medium roast.",
    price: 16.99,
    category: "single-origin",
    image: "☕",
    details:
      "Hand-picked from the mountains of Colombia, this premium grade coffee delivers a perfect balance of sweetness and acidity.",
  },
  {
    id: 3,
    name: "House Blend",
    description:
      "Our signature blend combining beans from three continents. Medium-dark roast.",
    price: 14.99,
    category: "blend",
    image: "☕",
    details:
      "A carefully crafted blend of Central American, African, and Indonesian beans, creating a smooth and balanced cup.",
  },
  {
    id: 4,
    name: "French Roast",
    description: "Bold, smoky flavor with low acidity. Dark roast.",
    price: 15.99,
    category: "blend",
    image: "☕",
    details:
      "Roasted to perfection with a deep, rich flavor and bold character. Perfect for espresso or strong coffee lovers.",
  },
  {
    id: 5,
    name: "Decaf Colombian",
    description: "All the flavor without the caffeine. Swiss water processed.",
    price: 17.99,
    category: "decaf",
    image: "☕",
    details:
      "Decaffeinated using the Swiss Water Process to maintain the original flavor while removing 99.9% of caffeine.",
  },
  {
    id: 6,
    name: "Guatemalan Antigua",
    description: "Full-bodied with spicy and smoky undertones. Medium-dark roast.",
    price: 19.99,
    category: "single-origin",
    image: "☕",
    details:
      "Grown in the volcanic soil of Antigua, Guatemala, this coffee offers a distinctive spicy flavor with hints of smoke.",
  },
  {
    id: 7,
    name: "Breakfast Blend",
    description: "Smooth and mild, perfect for starting your day. Light-medium roast.",
    price: 13.99,
    category: "blend",
    image: "☕",
    details:
      "A gentle blend designed for morning enjoyment, featuring bright acidity and smooth finish.",
  },
  {
    id: 8,
    name: "Decaf House Blend",
    description: "Our popular house blend in decaffeinated form. Medium roast.",
    price: 16.99,
    category: "decaf",
    image: "☕",
    details:
      "The same great taste as our house blend, carefully decaffeinated to preserve flavor and aroma.",
  },
];

// =============================
// TOAST COMPONENT
// =============================
type ToastProps = {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
};

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, CONFIG.TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div
      className={`toast ${type}`}
      role="status"
      aria-live="polite"
      style={{ marginBottom: 8 }}
    >
      <span className="toast-icon" aria-hidden="true">
        {type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  );
}

// =============================
// MAIN COMPONENT
// =============================
export default function RoastRevelExample() {
  // Add enterprise CSS via <Head>
  // This ensures the CSS is loaded for this page only
  type CartItem = Product & { quantity: number };
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart logic
  type Product = {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
    details: string;
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setToast({ message: "Product added to cart!", type: "success" });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setToast({ message: "Item removed from cart", type: "info" });
  };

  const updateQuantity = (id: number, change: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + change } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  // Filtering
  const filteredProducts = PRODUCTS.filter((p) => {
    if (filter !== "all" && p.category !== filter) return false;
    if (
      search &&
      !(
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      )
    )
      return false;
    return true;
  });

  // Modal
  const openModal = (product: Product) => setModalProduct(product);
  const closeModal = () => setModalProduct(null);

  // Accessibility: focus search on mount
  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  // Toast close handler
  const handleToastClose = () => setToast(null);

  // Cart total
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
      <>
        <Head>
          <link rel="stylesheet" href="/roast-revel-enterprise.css" />
        </Head>
        <div className="min-h-screen bg-white dark:bg-gray-900 py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Roast & Revel Coffee Shop (Enterprise Example)</h1>
      {/* Toast Container */}
      <div id="toastContainer" aria-live="polite" style={{ position: "fixed", top: 20, right: 20, zIndex: 50 }}>
        {toast && <Toast {...toast} onClose={handleToastClose} />}
      </div>
      {/* Search & Filter */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm"
          aria-label="Search products"
        />
        <div className="flex gap-2">
          {[
            { label: "All", value: "all" },
            { label: "Single Origin", value: "single-origin" },
            { label: "Blend", value: "blend" },
            { label: "Decaf", value: "decaf" },
          ].map((f) => (
            <button
              key={f.value}
              className={`filter-btn px-3 py-1 rounded ${filter === f.value ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setFilter(f.value)}
              data-filter={f.value}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className="ml-auto px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => alert("Checkout not implemented in demo.")}
          aria-label="Checkout"
        >
          Cart ({cartCount}) - ${cartTotal.toFixed(2)}
        </button>
      </div>
      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No products found.</div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card border rounded-lg p-4 flex flex-col"
              data-category={product.category}
              role="listitem"
            >
              <div className="text-6xl text-center mb-2" aria-hidden="true">{product.image}</div>
              <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <div className="font-bold mb-2">${product.price.toFixed(2)}</div>
              <div className="flex gap-2 mt-auto">
                <button
                  className="add-to-cart-btn bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => addToCart(product)}
                  data-product-id={product.id}
                  aria-label={`Add ${product.name} to cart`}
                >
                  Add to Cart
                </button>
                <button
                  className="view-details-btn bg-gray-200 px-3 py-1 rounded"
                  onClick={() => openModal(product)}
                  data-product-id={product.id}
                  aria-label={`View details for ${product.name}`}
                >
                  Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Cart Items */}
      <div className="mt-10 max-w-xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Cart</h2>
        {cart.length === 0 ? (
          <div className="cart-empty text-gray-500">Your cart is empty</div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="cart-item flex items-center gap-4 border-b py-2">
              <div className="text-3xl" aria-hidden="true">{item.image}</div>
              <div className="flex-1">
                <div className="font-semibold">{item.name}</div>
                <div className="text-gray-600">${item.price.toFixed(2)} each</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="quantity-btn px-2 py-1 bg-gray-200 rounded"
                  onClick={() => updateQuantity(item.id, -1)}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="font-bold">{item.quantity}</span>
                <button
                  className="quantity-btn px-2 py-1 bg-gray-200 rounded"
                  onClick={() => updateQuantity(item.id, 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <button
                  className="quantity-btn remove px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Remove from cart"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Modal */}
      {modalProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={closeModal}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="text-center mb-4">
              <div className="text-6xl mb-2" aria-hidden="true">{modalProduct.image}</div>
              <h2 className="text-2xl font-bold mb-2">{modalProduct.name}</h2>
              <div className="text-lg font-bold text-blue-600 mb-2">${modalProduct.price.toFixed(2)}</div>
              <p className="text-gray-700 mb-4">{modalProduct.details}</p>
              <button
                className="add-to-cart-btn bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  addToCart(modalProduct);
                  closeModal();
                }}
                data-product-id={modalProduct.id}
                aria-label={`Add ${modalProduct.name} to cart`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
