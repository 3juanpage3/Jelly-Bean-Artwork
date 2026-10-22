import { isSupabaseConfigured, supabase } from "./supabase-client.js";

const form = document.getElementById("review-form");
const message = document.getElementById("review-message");
const submitButton = document.getElementById("review-submit");

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("text-red-300", isError);
  message.classList.toggle("text-lime-300", !isError);
}

if (!isSupabaseConfigured) {
  submitButton.disabled = true;
  setMessage("Reviews are temporarily unavailable. Please try again later.", true);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || !isSupabaseConfigured) return;

  const formData = new FormData(form);
  const comment = String(formData.get("comment")).trim();
  if (!comment) {
    setMessage("Please enter a comment before submitting.", true);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  setMessage("");
  try {
    const { error } = await supabase.from("reviews").insert({
      artwork: String(formData.get("artwork")).trim(),
      painting_rating: Number(formData.get("painting_rating")),
      service_rating: Number(formData.get("service_rating")),
      comment,
      display_name: String(formData.get("display_name")).trim(),
      publication_consent: formData.get("publication_consent") === "on",
    });
    if (error) throw error;

    form.reset();
    setMessage(
      "Thank you for your feedback. It will stay private until the artist reviews and approves it.",
    );
  } catch (error) {
    console.error("Could not submit customer review:", error);
    setMessage(
      "Your review could not be submitted. Please try again later or contact the artist.",
      true,
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit review";
  }
});
