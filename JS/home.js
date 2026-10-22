const description = document.getElementById("activity-description");
const cards = document.querySelectorAll(".game-card[data-description]");

function showDescription(card) {
    description.textContent = card.dataset.description;
    description.classList.add("is-visible");
}

function hideDescription(card) {
    if (card.matches(":hover") || card === document.activeElement) return;

    description.classList.remove("is-visible");
}

cards.forEach(card => {
    card.addEventListener("pointerenter", () => showDescription(card));
    card.addEventListener("pointerleave", () => hideDescription(card));
    card.addEventListener("focus", () => showDescription(card));
    card.addEventListener("blur", () => hideDescription(card));
});
