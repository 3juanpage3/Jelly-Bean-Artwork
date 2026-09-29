// Pre-made Paintings Database
const galleryItems = [
  {
    id: 1,
    title: "Dragon Ball Super Saiyan Spark",
    category: "anime",
    dimensions: '16" x 20"',
    medium: "Acrylic on Stretched Canvas",
    price: 185,
    image:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
    description:
      "High-energy portrait featuring fiery vibrant paint splatters, bold comic linework, and neon glowing acrylic aura effects.",
  },
  {
    id: 2,
    title: "Flame Turtle Dreaming",
    category: "nature",
    dimensions: '12" x 12"',
    medium: "Mixed Media & Acrylic",
    price: 120,
    image:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80",
    description:
      "Inspired by the Jelly Bean mascot turtle sleeping on a vibrant magenta pillow surrounded by colorful paint splash swirls.",
  },
  {
    id: 3,
    title: "Charizard Ember Burst",
    category: "anime",
    dimensions: '18" x 24"',
    medium: "Acrylic & Metallic Gold Foil",
    price: 240,
    image:
      "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
    description:
      "Dynamic fantasy dragon flame artwork with deep black background and intense orange and cyan fiery contrasts.",
  },
  {
    id: 4,
    title: "Neon Cyber Kitty",
    category: "nature",
    dimensions: '11" x 14"',
    medium: "Blacklight Neon Acrylic",
    price: 110,
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
    description:
      "Whimsical stylized cat portrait with glowing teal eyes and blacklight fluorescent splash highlights.",
  },
  {
    id: 5,
    title: "Cosmic Astral Phoenix",
    category: "fantasy",
    dimensions: '20" x 24"',
    medium: "Acrylic on Gallery Canvas",
    price: 260,
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    description:
      "Ethereal mythical bird artwork flowing through purple nebulas and stardust bursts.",
  },
  {
    id: 6,
    title: "Cyberpunk Cityscape Canvas",
    category: "fantasy",
    dimensions: '16" x 20"',
    medium: "Acrylic & Paint Pen",
    price: 195,
    image:
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80",
    description:
      "Sleek futuristic city alley with rain reflections, glowing neon signage, and dark deep purple tones.",
  },
];

// Shopping Cart State
let cart = [];
let cartCloseTimer;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

// Initialize App
window.onload = function () {
  renderGallery("all");
  updateCartUI();
};

// Render Gallery Items
function renderGallery(categoryFilter) {
  const grid = document.getElementById("gallery-grid");
  grid.innerHTML = "";

  const filtered =
    categoryFilter === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === categoryFilter);

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "bg-brand-card/80 rounded-2xl overflow-hidden border border-purple-800/40 glow-box-hover transition-all duration-300 flex flex-col justify-between";
    card.innerHTML = `
                    <div>
                        <div class="relative h-64 overflow-hidden group cursor-pointer" onclick="openProductModal(${item.id})">
                            <img src="${item.image}" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                            <div class="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span class="bg-brand-dark/90 text-teal-300 border border-teal-400/40 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                                    <i class="fa-solid fa-eye"></i> Quick View
                                </span>
                            </div>
                            <span class="absolute top-3 right-3 bg-brand-dark/80 text-pink-300 font-mono text-xs px-2.5 py-1 rounded-full border border-pink-500/30">
                                ${item.dimensions}
                            </span>
                        </div>
                        <div class="p-5">
                            <h3 class="font-heading text-2xl text-white leading-tight mb-1">${item.title}</h3>
                            <p class="text-xs text-teal-300/90 mb-3">${item.medium}</p>
                            <p class="text-xs text-slate-400 line-clamp-2">${item.description}</p>
                        </div>
                    </div>
                    <div class="p-5 pt-0 flex items-center justify-between border-t border-purple-900/30 mt-2">
                        <div>
                            <span class="text-xs text-slate-400 block">Original Art</span>
                            <span class="text-xl font-bold font-mono text-lime-400">R ${item.price}</span>
                        </div>
                        <button onclick="addToCart(${item.id})" class="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-pink to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                            <i class="fa-solid fa-cart-plus"></i> Add to Request
                        </button>
                    </div>
                `;
    grid.appendChild(card);
  });
}

// Filter Buttons Switcher
function filterGallery(category) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("bg-brand-pink", "text-white", "border-pink-400/30");
    btn.classList.add(
      "bg-brand-card",
      "text-slate-300",
      "border-purple-800/40",
    );
  });

  event.target.classList.remove(
    "bg-brand-card",
    "text-slate-300",
    "border-purple-800/40",
  );
  event.target.classList.add(
    "bg-brand-pink",
    "text-white",
    "border-pink-400/30",
  );

  renderGallery(category);
}

// Add Original Painting to Cart
function addToCart(itemId) {
  const item = galleryItems.find((p) => p.id === itemId);
  if (!item) return;

  const existingIndex = cart.findIndex((c) => c.id === item.id && !c.isCustom);
  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      id: item.id,
      title: item.title,
      price: item.price,
      details: `${item.dimensions} • ${item.medium}`,
      qty: 1,
      isCustom: false,
      image: item.image,
    });
  }

  updateCartUI();
  showToast(`Added "${item.title}" to request cart!`);
}

// Handle Custom Commission Form Submit
function handleCommissionSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const style = form.elements["art_style"].value;
  const size = form.elements["canvas_size"].value;
  const medium = document.getElementById("medium-select").value;
  const budget = document.getElementById("budget-select").value;
  const desc = document.getElementById("commission-desc").value;

  // Base price estimation based on size selection string
  let estPrice = 140;
  if (size.includes("R 75")) estPrice = 75;
  if (size.includes("R 230")) estPrice = 230;

  const customItem = {
    id: "custom-" + Date.now(),
    title: `Custom Art Request: ${style}`,
    price: estPrice,
    details: `Size: ${size} | Medium: ${medium} | Budget: ${budget}`,
    notes: desc,
    qty: 1,
    isCustom: true,
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80",
  };

  cart.push(customItem);
  updateCartUI();
  form.reset();

  showToast("Custom commission request added to cart!");
  toggleCart(); // Open cart to show item
}

// Update Cart UI
function updateCartUI() {
  const badge = document.getElementById("cart-badge");
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.innerText = totalItems;

  const container = document.getElementById("cart-items-container");
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
                    <div class="text-center py-10 text-slate-500">
                        <i class="fa-solid fa-paint-brush text-4xl mb-3 text-purple-800"></i>
                        <p class="text-sm">Your order request cart is empty.</p>
                        <p class="text-xs text-slate-600 mt-1">Add pre-made art or a custom commission request!</p>
                    </div>
                `;
    return;
  }

  let grandTotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    grandTotal += itemTotal;

    const card = document.createElement("div");
    card.className =
      "bg-brand-dark/90 rounded-xl p-3 border border-purple-800/50 flex gap-3 relative";
    card.innerHTML = `
                    <img src="${item.image}" loading="lazy" decoding="async" class="w-16 h-16 rounded-lg object-cover border border-purple-700/40">
                    <div class="flex-grow">
                        <div class="flex justify-between items-start pr-4">
                            <h4 class="font-heading text-lg text-white leading-tight">${item.title}</h4>
                        </div>
                        <p class="text-xs text-teal-300 font-mono mt-0.5">${item.details}</p>
                        ${item.notes ? `<p class="text-xs text-slate-400 mt-1 italic border-l-2 border-pink-500 pl-2">"${escapeHTML(item.notes)}"</p>` : ""}

                        <div class="flex justify-between items-center mt-3">
                            <span class="text-sm font-bold font-mono text-lime-400">Est. R ${itemTotal}</span>

                            <div class="flex items-center gap-2 bg-brand-card rounded-lg border border-purple-800 px-2 py-0.5">
                                <button onclick="changeQty(${index}, -1)" class="text-slate-400 hover:text-white text-xs px-1">-</button>
                                <span class="text-xs font-mono text-white">${item.qty}</span>
                                <button onclick="changeQty(${index}, 1)" class="text-slate-400 hover:text-white text-xs px-1">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="removeItem(${index})" class="absolute top-2 right-2 text-slate-500 hover:text-pink-400 text-xs p-1">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
    container.appendChild(card);
  });

  // Total Summary line
  const totalDiv = document.createElement("div");
  totalDiv.className =
    "pt-3 border-t border-purple-800/60 flex justify-between items-center font-bold text-sm text-white";
  totalDiv.innerHTML = `
                <span>Estimated Total Inquiry:</span>
                <span class="text-lg font-mono text-lime-400">R ${grandTotal}</span>
            `;
  container.appendChild(totalDiv);
}

// Qty adjust
function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  updateCartUI();
}

// Remove single item
function removeItem(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// Cart Drawer Toggle
function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  const panel = document.getElementById("cart-panel");
  const isOpen = drawer.classList.contains("opacity-100");

  clearTimeout(cartCloseTimer);

  if (!isOpen) {
    drawer.classList.remove("pointer-events-none", "opacity-0");
    drawer.classList.add("opacity-100");
    panel.classList.remove("translate-x-full");
  } else {
    panel.classList.add("translate-x-full");
    drawer.classList.remove("opacity-100");
    drawer.classList.add("opacity-0");
    cartCloseTimer = setTimeout(() => {
      drawer.classList.add("pointer-events-none");
      cartCloseTimer = undefined;
    }, 300);
  }
}

// Submit Order Request (Direct Inquiry - No credit card required)
function submitOrderRequest(event) {
  event.preventDefault();

  if (cart.length === 0) {
    alert(
      "Please add at least one painting or custom commission request to your cart before submitting.",
    );
    return;
  }

  const name = document.getElementById("client-name").value;
  const email = document.getElementById("client-email").value;
  const phone = document.getElementById("client-phone").value || "N/A";
  const address = document.getElementById("client-address").value;
  const notes = document.getElementById("client-notes").value || "None";

  let summaryHTML = `
                <div class="mb-3 border-b border-purple-800 pb-2">
                    <strong class="text-white">Client:</strong> ${escapeHTML(name)}<br>
                    <strong class="text-white">Email:</strong> ${escapeHTML(email)} | <strong class="text-white">Phone:</strong> ${escapeHTML(phone)}<br>
                    <strong class="text-white">Address:</strong> ${escapeHTML(address)}
                </div>
                <div class="space-y-2">
                    <strong class="text-pink-300 block">Requested Items:</strong>
            `;

  let total = 0;
  cart.forEach((item) => {
    const sub = item.price * item.qty;
    total += sub;
    summaryHTML += `
                    <div class="flex justify-between text-xs py-1 border-b border-purple-900/40">
                        <span>${item.qty}x ${item.title}</span>
                        <span class="font-mono text-lime-400">R ${sub}</span>
                    </div>
                `;
  });

  summaryHTML += `
                </div>
                <div class="mt-3 pt-2 border-t border-purple-800 flex justify-between font-bold text-white text-sm">
                    <span>Total Estimated Quote:</span>
                    <span class="text-lime-400 font-mono">R ${total}</span>
                </div>
                <div class="mt-2 text-xs text-slate-400">
                    <strong>Special Notes:</strong> ${escapeHTML(notes)}
                </div>
            `;

  document.getElementById("invoice-summary").innerHTML = summaryHTML;

  // Reset cart & close drawer
  cart = [];
  updateCartUI();
  toggleCart();

  // Reset checkout form
  document.getElementById("checkout-form").reset();

  // Show invoice modal
  document.getElementById("invoice-modal").classList.remove("hidden");
  document.getElementById("invoice-modal").classList.add("flex");
}

// Close Invoice Modal
function closeInvoiceModal() {
  document.getElementById("invoice-modal").classList.add("hidden");
  document.getElementById("invoice-modal").classList.remove("flex");
}

// Modal Quick View for Gallery Item
function openProductModal(id) {
  const item = galleryItems.find((p) => p.id === id);
  if (!item) return;

  const modalContent = document.getElementById("product-modal-content");
  modalContent.innerHTML = `
                <div class="h-64 sm:h-auto overflow-hidden">
                    <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover">
                </div>
                <div class="p-6 flex flex-col justify-between">
                    <div>
                        <span class="text-xs uppercase tracking-wider text-pink-400 font-bold">Pre-Made Canvas Painting</span>
                        <h3 class="font-heading text-3xl text-white mt-1">${item.title}</h3>
                        <p class="text-xs text-teal-300 font-mono mt-1">${item.dimensions} • ${item.medium}</p>
                        <p class="text-sm text-slate-300 mt-4 leading-relaxed">${item.description}</p>
                    </div>

                    <div class="mt-6 pt-4 border-t border-purple-800/50 flex items-center justify-between">
                        <div>
                            <span class="text-xs text-slate-400 block">Price</span>
                            <span class="text-2xl font-bold font-mono text-lime-400">R ${item.price}</span>
                        </div>
                        <button onclick="addToCart(${item.id}); closeProductModal();" class="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-2">
                            <i class="fa-solid fa-cart-plus"></i> Add To Order Request
                        </button>
                    </div>
                </div>
            `;

  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-modal").classList.add("flex");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
  document.getElementById("product-modal").classList.remove("flex");
}

// Toast Popup Helper
function showToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-message").innerText = message;
  toast.classList.remove("translate-y-20", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3000);
}
