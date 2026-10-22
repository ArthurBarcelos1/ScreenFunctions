const description = document.getElementById("activity-description");
const cards = document.querySelectorAll(".game-card[data-description]");
const searchField = document.getElementById("activity-search");
const noActivities = document.getElementById("no-activities");
const hideTimers = new Map();
let filterVersion = 0;

function filterActivities() {
    filterVersion += 1;
    const currentVersion = filterVersion;
    const query = searchField.value.trim().toLocaleLowerCase();
    const matchingCards = [];

    cards.forEach(card => {
        const searchableText =
            `${card.textContent} ${card.dataset.description}`.toLocaleLowerCase();
        const matches = searchableText.includes(query);
        card.classList.remove("is-last-visible");

        const existingTimer = hideTimers.get(card);
        if (existingTimer !== undefined) {
            window.clearTimeout(existingTimer);
            hideTimers.delete(card);
        }

        if (matches) {
            card.hidden = false;
            requestAnimationFrame(() => card.classList.remove("is-filtered-out"));
            matchingCards.push(card);
        } else if (!card.hidden) {
            card.classList.add("is-filtered-out");
            const timer = window.setTimeout(() => {
                if (currentVersion === filterVersion) {
                    card.hidden = true;
                    hideTimers.delete(card);
                }
            }, 200);
            hideTimers.set(card, timer);
        }
    });

    if (matchingCards.length % 2 === 1) {
        matchingCards[matchingCards.length - 1].classList.add("is-last-visible");
    }

    noActivities.classList.toggle("is-visible", matchingCards.length === 0);
    noActivities.setAttribute("aria-hidden", String(matchingCards.length > 0));
    description.classList.remove("is-visible");
}

searchField.addEventListener("input", filterActivities);

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

filterActivities();
