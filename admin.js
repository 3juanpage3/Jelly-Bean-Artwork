import "./admin.css";
import { isSupabaseConfigured, ownerIds, supabase } from "./supabase-client.js";
const elements = {
  configurationError: document.getElementById("configuration-error"),
  loginView: document.getElementById("login-view"),
  adminView: document.getElementById("admin-view"),
  loginForm: document.getElementById("login-form"),
  loginMessage: document.getElementById("login-message"),
  signOutButton: document.getElementById("sign-out-button"),
  pageMessage: document.getElementById("page-message"),
  rows: document.getElementById("painting-rows"),
  count: document.getElementById("painting-count"),
  emptyState: document.getElementById("empty-state"),
  form: document.getElementById("painting-form"),
  formHeading: document.getElementById("form-heading"),
  formMessage: document.getElementById("form-message"),
  saveButton: document.getElementById("save-painting-button"),
  newButton: document.getElementById("new-painting-button"),
  cancelButton: document.getElementById("cancel-edit-button"),
  imageInput: document.getElementById("painting-image"),
  imagePreview: document.getElementById("image-preview"),
  imageRequiredNote: document.getElementById("image-required-note"),
  reviewRows: document.getElementById("review-rows"),
  reviewCount: document.getElementById("review-count"),
  reviewEmptyState: document.getElementById("review-empty-state"),
  refreshReviewsButton: document.getElementById("refresh-reviews-button"),
  reviewEditForm: document.getElementById("review-edit-form"),
  reviewEditHeading: document.getElementById("review-edit-heading"),
  cancelReviewEditButton: document.getElementById("cancel-review-edit-button"),
  reviewEditMessage: document.getElementById("review-edit-message"),
  reviewConsentNote: document.getElementById("review-consent-note"),
  reviewEditStatus: document.getElementById("review-edit-status"),
};

let paintings = [];
let reviews = [];
let editingPainting = null;
let editingReview = null;
let previewObjectUrl = null;
let sessionCheckId = 0;

function setFormMessage(message, success = false) {
  elements.formMessage.textContent = message;
  elements.formMessage.classList.toggle("success", success);
}

function setPageMessage(message, isError = false) {
  elements.pageMessage.textContent = message;
  elements.pageMessage.classList.toggle("error", isError);
  elements.pageMessage.hidden = !message;
}

function showLogin(message = "") {
  elements.adminView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginMessage.textContent = message;
}

function storageImageUrl(path) {
  return supabase.storage.from("artwork").getPublicUrl(path).data.publicUrl;
}

function appendCell(row, content) {
  const cell = document.createElement("td");
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  row.append(cell);
  return cell;
}

function renderPaintings() {
  elements.rows.replaceChildren();
  elements.count.textContent = String(paintings.length);
  elements.emptyState.hidden = paintings.length !== 0;

  for (const painting of paintings) {
    const row = document.createElement("tr");
    const artworkCell = document.createElement("div");
    artworkCell.className = "artwork-cell";
    const thumbnail = document.createElement("img");
    thumbnail.className = "thumb";
    thumbnail.src = storageImageUrl(painting.image_path);
    thumbnail.alt = painting.image_alt;
    thumbnail.loading = "lazy";
    const titleBlock = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = painting.title;
    const dimensions = document.createElement("small");
    dimensions.textContent = `${painting.dimensions} · ${painting.medium}`;
    titleBlock.append(title, dimensions);
    artworkCell.append(thumbnail, titleBlock);
    appendCell(row, artworkCell);
    appendCell(row, painting.category);
    appendCell(row, `R ${painting.price_zar.toLocaleString("en-ZA")}`);

    const status = document.createElement("span");
    status.className = `badge ${painting.status}`;
    status.textContent = painting.status;
    appendCell(row, status);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      createActionButton("Edit", "edit", painting.id),
      createActionButton(
        painting.status === "archived" ? "Restore" : "Archive",
        painting.status === "archived" ? "restore" : "archive",
        painting.id,
      ),
      createActionButton("Delete", "delete", painting.id, true),
    );
    appendCell(row, actions);
    elements.rows.append(row);
  }
}

function renderReviews() {
  elements.reviewRows.replaceChildren();
  elements.reviewCount.textContent = String(reviews.length);
  elements.reviewEmptyState.hidden = reviews.length !== 0;

  for (const review of reviews) {
    const row = document.createElement("tr");
    const submittedAt = new Date(review.created_at).toLocaleDateString(
      "en-ZA",
      { year: "numeric", month: "short", day: "numeric" },
    );
    appendCell(row, submittedAt);
    appendCell(
      row,
      [review.display_name || "Customer", review.artwork]
        .filter(Boolean)
        .join(" · "),
    );
    appendCell(
      row,
      `Painting ${review.painting_rating}/5 · Service ${review.service_rating}/5`,
    );
    const commentCell = appendCell(row, review.comment);
    commentCell.className = "review-comment-cell";
    const status = document.createElement("span");
    status.className = `badge review-${review.status}`;
    status.textContent = review.status;
    appendCell(row, status);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      createActionButton("Edit", "edit-review", review.id),
      createActionButton(
        review.status === "published" ? "Hide" : "Publish",
        review.status === "published" ? "hide-review" : "publish-review",
        review.id,
      ),
      createActionButton("Delete", "delete-review", review.id, true),
    );
    appendCell(row, actions);
    elements.reviewRows.append(row);
  }
}

function createActionButton(label, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `text-button${danger ? " danger" : ""}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

async function loadPaintings() {
  setPageMessage("");
  const { data, error } = await supabase
    .from("paintings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    setPageMessage(`Could not load the catalogue: ${error.message}`, true);
    return;
  }
  paintings = data;
  renderPaintings();
}

async function loadReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const message =
      error.code === "PGRST205" || error.code === "42P01"
        ? "The reviews table is missing from Supabase. In your Supabase SQL Editor, run supabase/migrations/005_customer_reviews.sql, then refresh this page."
        : `Could not load customer reviews: ${error.message}`;
    setPageMessage(message, true);
    return;
  }
  reviews = data;
  renderReviews();
}

async function handleSession(session) {
  const checkId = ++sessionCheckId;
  if (!session) {
    elements.adminView.hidden = true;
    elements.loginView.hidden = false;
    return;
  }

  if (!ownerIds.includes(session.user.id)) {
    supabase.auth.signOut().catch(() => {});
    showLogin(
      "This signed-in account is not authorized to manage the catalogue. Check the configured catalogue admin UUIDs.",
    );
    return;
  }

  elements.adminView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginMessage.textContent = "Checking owner access...";

  let timeoutId;
  try {
    const result = await Promise.race([
      supabase.from("paintings").select("id").limit(1),
      new Promise((resolve) => {
        timeoutId = window.setTimeout(
          () => resolve({ error: new Error("The database check timed out.") }),
          12000,
        );
      }),
    ]);
    if (checkId !== sessionCheckId) return;
    if (result.error) {
      showLogin(
        `Could not verify owner access: ${result.error.message} Check that the owner policies include this account's UUID.`,
      );
      return;
    }
  } catch (error) {
    if (checkId !== sessionCheckId) return;
    showLogin(
      `Could not verify owner access: ${error.message || "request failed"}. Check your Supabase URL, network, migration, and owner UUID.`,
    );
    return;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (checkId !== sessionCheckId) return;
  elements.loginView.hidden = true;
  elements.adminView.hidden = false;
  await Promise.all([loadPaintings(), loadReviews()]);
}

function resetEditor() {
  editingPainting = null;
  elements.form.reset();
  elements.formHeading.textContent = "New painting";
  elements.saveButton.textContent = "Save painting";
  elements.imageRequiredNote.textContent = "(required)";
  elements.imageInput.required = true;
  elements.imagePreview.hidden = true;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
  setFormMessage("");
  elements.form.hidden = true;
}

function editPainting(painting) {
  editingPainting = painting;
  elements.form.reset();
  elements.formHeading.textContent = "Edit painting";
  elements.saveButton.textContent = "Save changes";
  elements.imageRequiredNote.textContent = "(optional; keep current image)";
  elements.imageInput.required = false;
  for (const [field, value] of Object.entries({
    title: painting.title,
    category: painting.category,
    status: painting.status,
    dimensions: painting.dimensions,
    medium: painting.medium,
    price_zar: painting.price_zar,
    description: painting.description,
    image_alt: painting.image_alt,
  })) {
    elements.form.elements[field].value = value;
  }
  elements.imagePreview.src = storageImageUrl(painting.image_path);
  elements.imagePreview.hidden = false;
  setFormMessage("");
  elements.form.hidden = false;
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReviewEditor() {
  editingReview = null;
  elements.reviewEditForm.reset();
  elements.reviewEditForm.hidden = true;
  elements.reviewEditStatus.querySelector(
    'option[value="published"]',
  ).disabled = false;
  elements.reviewEditMessage.textContent = "";
  elements.reviewConsentNote.textContent = "";
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function editReview(review) {
  editingReview = review;
  elements.reviewEditForm.reset();
  elements.reviewEditHeading.textContent = `Review from ${
    review.display_name || "Customer"
  }`;
  elements.reviewEditForm.elements.display_name.value = review.display_name;
  elements.reviewEditForm.elements.artwork.value = review.artwork;
  elements.reviewEditForm.elements.created_at.value = toDateTimeLocal(
    review.created_at,
  );
  elements.reviewEditForm.elements.painting_rating.value =
    String(review.painting_rating);
  elements.reviewEditForm.elements.service_rating.value =
    String(review.service_rating);
  elements.reviewEditForm.elements.comment.value = review.comment;
  elements.reviewEditStatus.value = review.status;
  const publishOption = elements.reviewEditStatus.querySelector(
    'option[value="published"]',
  );
  publishOption.disabled = !review.publication_consent;
  elements.reviewConsentNote.textContent = review.publication_consent
    ? "The customer agreed to publication. Their name is shown only if provided."
    : "The customer did not provide publication consent. This review cannot be published.";
  elements.reviewEditMessage.textContent = "";
  elements.reviewEditForm.hidden = false;
  elements.reviewEditForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveReview(event) {
  event.preventDefault();
  if (!editingReview) return;
  const formData = new FormData(elements.reviewEditForm);
  const status = String(formData.get("status"));
  if (status === "published" && !editingReview.publication_consent) {
    elements.reviewEditMessage.textContent =
      "This review cannot be published without the customer's recorded consent.";
    return;
  }

  const comment = String(formData.get("comment")).trim();
  if (!comment) {
    elements.reviewEditMessage.textContent = "A review comment is required.";
    return;
  }
  const reviewDate = new Date(String(formData.get("created_at")));
  if (Number.isNaN(reviewDate.getTime())) {
    elements.reviewEditMessage.textContent =
      "Enter a valid date and time for this review.";
    return;
  }

  const saveButton = elements.reviewEditForm.querySelector(
    'button[type="submit"]',
  );
  saveButton.disabled = true;
  elements.reviewEditMessage.textContent = "Saving review...";
  try {
    const { error } = await supabase
      .from("reviews")
      .update({
        display_name: String(formData.get("display_name")).trim(),
        artwork: String(formData.get("artwork")).trim(),
        created_at: reviewDate.toISOString(),
        painting_rating: Number(formData.get("painting_rating")),
        service_rating: Number(formData.get("service_rating")),
        comment,
        status,
      })
      .eq("id", editingReview.id);
    if (error) throw error;

    resetReviewEditor();
    await loadReviews();
    setPageMessage(
      status === "published"
        ? "Review saved and published."
        : status === "rejected"
          ? "Review saved and rejected."
          : "Review saved as private.",
    );
  } catch (error) {
    elements.reviewEditMessage.textContent =
      `Could not save the review: ${error.message}`;
  } finally {
    saveButton.disabled = false;
  }
}

async function changeReviewStatus(review, status) {
  if (status === "published" && !review.publication_consent) {
    setPageMessage(
      "This review cannot be published because the customer has not given publication consent.",
      true,
    );
    return;
  }
  const confirmation =
    status === "published"
      ? "Publish this review on the public website?"
      : "Hide this review from the public website?";
  if (!window.confirm(confirmation)) return;

  const { error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", review.id);
  if (error) {
    setPageMessage(`Could not update review status: ${error.message}`, true);
    return;
  }
  await loadReviews();
  setPageMessage(
    status === "published" ? "Review published." : "Review hidden from the website.",
  );
}

async function deleteReview(review) {
  if (!window.confirm("Permanently delete this customer review?")) return;
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", review.id);
  if (error) {
    setPageMessage(`Could not delete the review: ${error.message}`, true);
    return;
  }
  if (editingReview?.id === review.id) resetReviewEditor();
  await loadReviews();
  setPageMessage("Review deleted.");
}

function validateImage(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The image must be 5 MB or smaller.");
  }
}

function makeImagePath(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return `paintings/${crypto.randomUUID()}/${crypto.randomUUID()}.${extensions[file.type]}`;
}

async function uploadImage(file) {
  validateImage(file);
  const path = makeImagePath(file);
  const { error } = await supabase.storage.from("artwork").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function savePainting(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const file = formData.get("image");
  const price = Number(formData.get("price_zar"));
  if (!Number.isSafeInteger(price) || price < 0) {
    setFormMessage("Enter a non-negative whole-number price in ZAR.");
    return;
  }

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Saving...";
  setFormMessage("");
  let newImagePath = null;
  let cleanupWarning = "";
  try {
    if (file.size > 0) newImagePath = await uploadImage(file);
    if (!editingPainting && !newImagePath) {
      throw new Error("Choose an artwork image before saving.");
    }

    const record = {
      title: String(formData.get("title")).trim(),
      category: formData.get("category"),
      dimensions: String(formData.get("dimensions")).trim(),
      medium: String(formData.get("medium")).trim(),
      description: String(formData.get("description")).trim(),
      price_zar: price,
      image_path: newImagePath || editingPainting?.image_path,
      image_alt: String(formData.get("image_alt")).trim(),
      status: formData.get("status"),
    };

    let result;
    if (editingPainting) {
      result = await supabase
        .from("paintings")
        .update(record)
        .eq("id", editingPainting.id)
        .select("id")
        .single();
    } else {
      record.slug = `${
        record.title
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80) || "painting"
      }-${crypto.randomUUID().slice(0, 8)}`;
      result = await supabase
        .from("paintings")
        .insert(record)
        .select("id")
        .single();
    }

    if (result.error) throw result.error;
    if (newImagePath && editingPainting?.image_path) {
      const { error: cleanupError } = await supabase.storage
        .from("artwork")
        .remove([editingPainting.image_path]);
      if (cleanupError) {
        cleanupWarning =
          "Saved the new image, but the previous file could not be removed from Storage.";
      }
    }
    resetEditor();
    await loadPaintings();
    setPageMessage(
      cleanupWarning || "Painting saved.",
      Boolean(cleanupWarning),
    );
  } catch (error) {
    if (newImagePath)
      await supabase.storage.from("artwork").remove([newImagePath]);
    setFormMessage(
      error.message || "Could not save the painting. Please try again.",
    );
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = editingPainting
      ? "Save changes"
      : "Save painting";
  }
}

async function updateStatus(painting, status) {
  const { error } = await supabase
    .from("paintings")
    .update({ status })
    .eq("id", painting.id);
  if (error) {
    setPageMessage(`Could not update status: ${error.message}`, true);
    return;
  }
  setPageMessage(
    status === "archived"
      ? "Painting archived."
      : "Painting restored as a draft.",
  );
  await loadPaintings();
}

async function deletePainting(painting) {
  if (
    !window.confirm(
      `Permanently delete “${painting.title}” and its stored image? This cannot be undone.`,
    )
  )
    return;
  const { error } = await supabase
    .from("paintings")
    .delete()
    .eq("id", painting.id);
  if (error) {
    setPageMessage(`Could not delete the painting: ${error.message}`, true);
    return;
  }
  const { error: storageError } = await supabase.storage
    .from("artwork")
    .remove([painting.image_path]);
  await loadPaintings();
  setPageMessage(
    storageError
      ? "Painting record deleted, but its image remains in Storage and must be removed manually."
      : "Painting and image deleted.",
    Boolean(storageError),
  );
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  elements.loginMessage.textContent = "Signing in...";
  const formData = new FormData(elements.loginForm);
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (error) elements.loginMessage.textContent = error.message;
    else elements.loginMessage.textContent = "Checking owner access...";
  } catch (error) {
    elements.loginMessage.textContent =
      error.message || "Sign-in failed. Check your connection and try again.";
  } finally {
    submitButton.disabled = false;
  }
});

elements.signOutButton.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) setPageMessage(`Could not sign out: ${error.message}`, true);
});

elements.newButton.addEventListener("click", () => {
  resetEditor();
  elements.form.hidden = false;
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.form.elements.title.focus();
});
elements.cancelButton.addEventListener("click", resetEditor);
elements.form.addEventListener("submit", savePainting);
elements.reviewEditForm.addEventListener("submit", saveReview);
elements.cancelReviewEditButton.addEventListener("click", resetReviewEditor);
elements.refreshReviewsButton.addEventListener("click", loadReviews);
elements.imageInput.addEventListener("change", () => {
  const file = elements.imageInput.files[0];
  if (!file) return;
  try {
    validateImage(file);
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    elements.imagePreview.src = previewObjectUrl;
    elements.imagePreview.hidden = false;
    setFormMessage("");
  } catch (error) {
    elements.imageInput.value = "";
    setFormMessage(error.message);
  }
});

elements.reviewRows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const review = reviews.find((item) => item.id === button.dataset.id);
  if (!review) return;
  if (button.dataset.action === "edit-review") editReview(review);
  if (button.dataset.action === "publish-review")
    await changeReviewStatus(review, "published");
  if (button.dataset.action === "hide-review")
    await changeReviewStatus(review, "pending");
  if (button.dataset.action === "delete-review") await deleteReview(review);
});

elements.rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const painting = paintings.find((item) => item.id === button.dataset.id);
  if (!painting) return;
  if (button.dataset.action === "edit") editPainting(painting);
  if (button.dataset.action === "archive") {
    if (
      window.confirm(
        `Archive “${painting.title}”? It will no longer be publicly available.`,
      )
    ) {
      await updateStatus(painting, "archived");
    }
  }
  if (button.dataset.action === "restore")
    await updateStatus(painting, "draft");
  if (button.dataset.action === "delete") await deletePainting(painting);
});

if (!isSupabaseConfigured || ownerIds.length === 0) {
  elements.configurationError.hidden = false;
} else {
  elements.loginView.hidden = false;
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => handleSession(session), 0);
  });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) showLogin(`Could not restore sign-in: ${error.message}`);
    else handleSession(data.session);
  });
}
