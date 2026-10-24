import { isSupabaseConfigured, supabase } from "./supabase-client.js";

const galleryItems = [];
let currentCategory = "all";
let reviewRotationTimer;

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
window.addEventListener("load", async () => {
  updateCartUI();
  await Promise.all([loadGallery(), loadReviews()]);
});

async function loadReviews() {
  const status = document.getElementById("reviews-status");
  const list = document.getElementById("reviews-list");
  if (!isSupabaseConfigured) {
    status.textContent = "Customer reviews are temporarily unavailable.";
    return;
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, artwork, display_name, painting_rating, service_rating, comment, created_at",
    )
    .eq("status", "published")
    .eq("publication_consent", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Could not load customer reviews:", error);
    status.textContent = "Customer reviews could not be loaded right now.";
    return;
  }

  if (!data.length) {
    list.replaceChildren();
    status.textContent =
      "No customer reviews have been published yet. If you have received your painting, you can be the first to share your feedback.";
    return;
  }

  const visibleCount = Math.min(3, data.length);
  let previousIds = [];
  const renderRandomReviews = () => {
    const reviews = [...data];
    for (let index = reviews.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [reviews[index], reviews[randomIndex]] = [
        reviews[randomIndex],
        reviews[index],
      ];
    }

    const selection = reviews.slice(0, visibleCount);
    if (
      data.length > visibleCount &&
      selection.every((review) => previousIds.includes(review.id))
    ) {
      selection[selection.length - 1] = data.find(
        (review) => !previousIds.includes(review.id),
      );
    }

    previousIds = selection.map((review) => review.id);
    list.replaceChildren(...selection.map(createReviewCard));
  };

  renderRandomReviews();
  window.clearInterval(reviewRotationTimer);
  if (data.length > visibleCount) {
    reviewRotationTimer = window.setInterval(renderRandomReviews, 30_000);
  }
  status.textContent =
    data.length > visibleCount
      ? ""
      : `Showing ${data.length} recent customer review${data.length === 1 ? "" : "s"}.`;
}

function createReviewCard(review) {
  const card = document.createElement("article");
  card.className =
    "rounded-2xl border border-purple-800/50 bg-brand-card/80 p-6";
  const author = escapeHTML(review.display_name.trim() || "Customer");
  const artwork = review.artwork
    ? `<p class="mt-2 text-xs text-teal-300">${escapeHTML(review.artwork)}</p>`
    : "";
  const date = new Date(review.created_at).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  card.innerHTML = `
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 class="font-bold text-white">${author}</h3>
          ${artwork}
        </div>
        <time class="shrink-0 text-xs text-slate-400" datetime="${escapeHTML(review.created_at)}">${escapeHTML(date)}</time>
      </div>
      <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">${escapeHTML(review.comment)}</p>
      <div class="mt-5 grid grid-cols-2 gap-3 border-t border-purple-800/50 pt-4 text-xs">
        <p class="text-slate-400">Painting <span class="ml-1 font-semibold text-pink-300" aria-label="${review.painting_rating} out of 5">${"★".repeat(review.painting_rating)}${"☆".repeat(5 - review.painting_rating)}</span></p>
        <p class="text-slate-400">Service <span class="ml-1 font-semibold text-teal-300" aria-label="${review.service_rating} out of 5">${"★".repeat(review.service_rating)}${"☆".repeat(5 - review.service_rating)}</span></p>
      </div>
    `;
  return card;
}

function setGalleryStatus(message, isError = false) {
  const status = document.getElementById("gallery-status");
  status.textContent = message;
  status.classList.toggle("text-pink-300", isError);
  status.hidden = !message;
}

async function loadGallery() {
  if (!isSupabaseConfigured) {
    setGalleryStatus(
      "The artwork catalogue is temporarily unavailable because Supabase is not configured.",
      true,
    );
    return;
  }

  setGalleryStatus("Loading available paintings...");
  const { data, error } = await supabase
    .from("paintings")
    .select(
      "id, title, category, dimensions, medium, description, price_zar, image_path, image_alt, created_at",
    )
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) {
    setGalleryStatus(
      "We could not load the artwork catalogue. Please try again later.",
      true,
    );
    return;
  }

  galleryItems.splice(
    0,
    galleryItems.length,
    ...data.map((painting) => ({
      ...painting,
      image: supabase.storage.from("artwork").getPublicUrl(painting.image_path)
        .data.publicUrl,
      price: painting.price_zar,
    })),
  );
  setGalleryStatus(
    galleryItems.length ? "" : "No paintings are currently available.",
  );
  renderGallery(currentCategory);
}

function renderGallery(categoryFilter = currentCategory) {
  currentCategory = categoryFilter;
  const grid = document.getElementById("gallery-grid");
  grid.innerHTML = "";

  const filtered =
    categoryFilter === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === categoryFilter);

  if (!filtered.length && galleryItems.length) {
    setGalleryStatus("No available paintings in this category.");
    return;
  }
  if (filtered.length) setGalleryStatus("");

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "bg-brand-card/80 rounded-2xl overflow-hidden border border-purple-800/40 glow-box-hover transition-all duration-300 flex flex-col justify-between";
    card.innerHTML = `
                    <div>
                        <button type="button" data-open-product="${escapeHTML(item.id)}" class="relative h-64 w-full overflow-hidden group cursor-pointer bg-brand-dark">
                          <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.image_alt)}" loading="lazy" decoding="async" class="w-full h-full object-contain">
                            <span aria-hidden="true" class="pointer-events-none absolute bottom-3 left-3 rounded bg-brand-dark/70 px-2 py-1 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-sm select-none">© Jelly Bean Artwork</span>
                            <div class="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span class="bg-brand-dark/90 text-teal-300 border border-teal-400/40 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                                    <i class="fa-solid fa-eye"></i> Quick View
                                </span>
                            </div>
                            <span class="absolute top-3 right-3 bg-brand-dark/80 text-pink-300 font-mono text-xs px-2.5 py-1 rounded-full border border-pink-500/30">
                                ${escapeHTML(item.dimensions)}
                            </span>
                        </button>
                        <div class="p-5">
                          <h3 class="font-heading text-2xl text-white leading-tight mb-1">${escapeHTML(item.title)}</h3>
                          <p class="text-xs text-teal-300/90 mb-3">${escapeHTML(item.medium)}</p>
                          <p class="text-xs text-slate-400 line-clamp-2">${escapeHTML(item.description)}</p>
                        </div>
                    </div>
                    <div class="p-5 pt-0 flex items-center justify-between border-t border-purple-900/30 mt-2">
                        <div>
                            <span class="text-xs text-slate-400 block">Original Art</span>
                            <span class="text-xl font-bold font-mono text-lime-400">R ${item.price.toLocaleString("en-ZA")}</span>
                        </div>
                        <button type="button" data-add-to-cart="${escapeHTML(item.id)}" class="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-pink to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                            <i class="fa-solid fa-cart-plus"></i> Add to Request
                        </button>
                    </div>
                `;
    grid.appendChild(card);
  });
}

document
  .getElementById("gallery-grid")
  .addEventListener("click", (clickEvent) => {
    const productButton = clickEvent.target.closest("[data-open-product]");
    const cartButton = clickEvent.target.closest("[data-add-to-cart]");
    if (productButton) openProductModal(productButton.dataset.openProduct);
    if (cartButton) addToCart(cartButton.dataset.addToCart);
  });

// Filter Buttons Switcher
function filterGallery(category, activeButton) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("bg-brand-pink", "text-white", "border-pink-400/30");
    btn.classList.add(
      "bg-brand-card",
      "text-slate-300",
      "border-purple-800/40",
    );
  });

  activeButton.classList.remove(
    "bg-brand-card",
    "text-slate-300",
    "border-purple-800/40",
  );
  activeButton.classList.add(
    "bg-brand-pink",
    "text-white",
    "border-pink-400/30",
  );

  renderGallery(category);
}

document
  .getElementById("filter-buttons")
  .addEventListener("click", (clickEvent) => {
    const button = clickEvent.target.closest("[data-gallery-filter]");
    if (!button) return;
    filterGallery(button.dataset.galleryFilter, button);
  });

document
  .getElementById("commission-form")
  .addEventListener("submit", handleCommissionSubmit);

// Add Original Painting to Cart
function addToCart(itemId) {
  const item = galleryItems.find((p) => String(p.id) === String(itemId));
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
  const selectedSize = form.elements["canvas_size"].value;
  const size =
    selectedSize === "custom"
      ? `Custom (${document.getElementById("custom-canvas-size").value.trim()})`
      : selectedSize;
  const desc = document.getElementById("commission-desc").value;

  const customItem = {
    id: "custom-" + Date.now(),
    title: `Custom Art Request: ${style}`,
    price: 0,
    details: `Size: ${size} | Quote sent by artist; 50% upfront deposit required before design work begins.`,
    notes: `${desc}\n\nReference photos are for inspiration and guidance only. The finished painting will be an original interpretation and will not look exactly like any reference. Attach reference photos directly in WhatsApp after this enquiry opens, if applicable.`,
    qty: 1,
    isCustom: true,
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80",
  };

  cart.push(customItem);
  updateCartUI();
  form.reset();
  updateCustomCanvasSizeField();

  showToast("Custom commission request added to cart!");
  toggleCart(); // Open cart to show item
}

function updateCustomCanvasSizeField() {
  const isCustom =
    document.querySelector('input[name="canvas_size"]:checked')?.value ===
    "custom";
  const field = document.getElementById("custom-canvas-size-field");
  const input = document.getElementById("custom-canvas-size");
  field.hidden = !isCustom;
  input.disabled = !isCustom;
  input.required = isCustom;
  if (!isCustom) input.value = "";
}

document
  .querySelectorAll('input[name="canvas_size"]')
  .forEach((input) =>
    input.addEventListener("change", updateCustomCanvasSizeField),
  );

document
  .getElementById("checkout-form")
  .addEventListener("submit", submitOrderRequest);

document.querySelectorAll("[data-cart-toggle], [data-cart-backdrop]").forEach(
  (button) => {
    button.addEventListener("click", toggleCart);
  },
);

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
    if (!item.isCustom) grandTotal += itemTotal;

    const card = document.createElement("div");
    card.className =
      "bg-brand-dark/90 rounded-xl p-3 border border-purple-800/50 flex gap-3 relative";
    card.innerHTML = `
                    <img src="${escapeHTML(item.image)}" alt="" loading="lazy" decoding="async" class="w-16 h-16 rounded-lg object-contain bg-brand-dark border border-purple-700/40">
                    <div class="flex-grow">
                        <div class="flex justify-between items-start pr-4">
                            <h4 class="font-heading text-lg text-white leading-tight">${escapeHTML(item.title)}</h4>
                        </div>
                        <p class="text-xs text-teal-300 font-mono mt-0.5">${escapeHTML(item.details)}</p>
                        ${item.notes ? `<p class="text-xs text-slate-400 mt-1 italic border-l-2 border-pink-500 pl-2">"${escapeHTML(item.notes)}"</p>` : ""}

                        <div class="flex justify-between items-center mt-3">
                            <span class="text-sm font-bold font-mono text-lime-400">${item.isCustom ? "Quote on request" : `R ${itemTotal}`}</span>

                            <div class="flex items-center gap-2 bg-brand-card rounded-lg border border-purple-800 px-2 py-0.5">
                                <button type="button" data-cart-action="decrease" data-cart-index="${index}" aria-label="Decrease quantity" class="text-slate-400 hover:text-white text-xs px-1">-</button>
                                <span class="text-xs font-mono text-white">${item.qty}</span>
                                <button type="button" data-cart-action="increase" data-cart-index="${index}" aria-label="Increase quantity" class="text-slate-400 hover:text-white text-xs px-1">+</button>
                            </div>
                        </div>
                    </div>
                    <button type="button" data-cart-action="remove" data-cart-index="${index}" aria-label="Remove item" class="absolute top-2 right-2 text-slate-500 hover:text-pink-400 text-xs p-1">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
    container.appendChild(card);
  });

  // Total Summary line
  const totalDiv = document.createElement("div");
  totalDiv.className =
    "pt-3 border-t border-purple-800/60 flex justify-between items-center font-bold text-sm text-white";
  const totalLabel = cart.some((item) => !item.isCustom)
    ? `R ${grandTotal}`
    : "Quote on request";
  totalDiv.innerHTML = `
                <span>Estimated Total Inquiry:</span>
                <span class="text-lg font-mono text-lime-400">${totalLabel}</span>
            `;
  container.appendChild(totalDiv);
}

document
  .getElementById("cart-items-container")
  .addEventListener("click", (clickEvent) => {
    const button = clickEvent.target.closest("[data-cart-action]");
    if (!button) return;

    const index = Number(button.dataset.cartIndex);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;

    switch (button.dataset.cartAction) {
      case "decrease":
        changeQty(index, -1);
        break;
      case "increase":
        changeQty(index, 1);
        break;
      case "remove":
        removeItem(index);
        break;
    }
  });

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
  const phone = document.getElementById("client-phone").value || "N/A";
  const address = document.getElementById("client-address").value;
  const notes = document.getElementById("client-notes").value || "None";
  let total = 0;
  const requestedItems = cart.map((item) => {
    const sub = item.price * item.qty;
    total += sub;
    return `${item.qty} x ${item.title} (${item.details})${
      item.notes ? `\n  Commission details: ${item.notes}` : ""
    }${item.isCustom ? "" : ` - R ${sub}\n  Painting image: ${item.image}`}`;
  });

  const whatsappNumber = (
    import.meta.env.VITE_WHATSAPP_NUMBER || "+27723322677"
  ).replace(/\D/g, "");

  const message = [
    "Painting order request",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
    "",
    "Requested items:",
    ...requestedItems,
    total > 0 ? `Total estimate: R ${total}` : "Commission quote: requested",
    `Order notes: ${notes}`,
  ].join("\n");
  window.location.assign(
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
  );
}

// Modal Quick View for Gallery Item
function openProductModal(id) {
  const item = galleryItems.find((p) => String(p.id) === String(id));
  if (!item) return;

  const modalContent = document.getElementById("product-modal-content");
  modalContent.innerHTML = `
                <div class="relative h-80 sm:h-[70vh] sm:max-h-[600px] bg-brand-dark/60 overflow-hidden">
                  <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.image_alt)}" class="w-full h-full object-contain">
                  <span aria-hidden="true" class="pointer-events-none absolute bottom-4 left-4 rounded bg-brand-dark/70 px-2 py-1 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-sm select-none">© Jelly Bean Artwork</span>
                </div>
                <div class="p-6 flex flex-col justify-between">
                    <div>
                        <span class="text-xs uppercase tracking-wider text-pink-400 font-bold">Pre-Made Canvas Painting</span>
                        <h3 class="font-heading text-3xl text-white mt-1">${escapeHTML(item.title)}</h3>
                        <p class="text-xs text-teal-300 font-mono mt-1">${escapeHTML(item.dimensions)} • ${escapeHTML(item.medium)}</p>
                        <p class="text-sm text-slate-300 mt-4 leading-relaxed">${escapeHTML(item.description)}</p>
                    </div>

                    <div class="mt-6 pt-4 border-t border-purple-800/50 flex items-center justify-between">
                        <div>
                            <span class="text-xs text-slate-400 block">Price</span>
                            <span class="text-2xl font-bold font-mono text-lime-400">R ${item.price.toLocaleString("en-ZA")}</span>
                        </div>
                        <button type="button" data-modal-add-to-cart="${escapeHTML(item.id)}" class="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-pink-600 text-white font-bold text-xs flex items-center gap-2">
                            <i class="fa-solid fa-cart-plus"></i> Add To Order Request
                        </button>
                    </div>
                </div>
            `;

  document.getElementById("product-modal").classList.remove("hidden");
  document.getElementById("product-modal").classList.add("flex");
}

document
  .getElementById("product-modal-content")
  .addEventListener("click", (clickEvent) => {
    const button = clickEvent.target.closest("[data-modal-add-to-cart]");
    if (!button) return;
    addToCart(button.dataset.modalAddToCart);
    closeProductModal();
  });

document
  .querySelector("[data-close-product-modal]")
  .addEventListener("click", closeProductModal);

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
