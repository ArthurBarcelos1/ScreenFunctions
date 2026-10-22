import { db } from "./firebase-config.js";
import {
    onValue,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const canvas = document.getElementById("roulette-wheel");
const context = canvas.getContext("2d");
const optionsField = document.getElementById("roulette-options");
const spinButton = document.getElementById("spin-roulette");
const result = document.getElementById("roulette-result");
const resultDialog = document.getElementById("roulette-result-dialog");
const dialogItem = document.getElementById("roulette-dialog-item");
const keepOptionButton = document.getElementById("keep-roulette-option");
const removeOptionButton = document.getElementById("remove-roulette-option");
const rouletteOptionsRef = ref(db, "roulette/options");
const localOptionsKey = "screen-functions-roulette-options";

const colors = [
    "#f94144", "#f3722c", "#f9c74f", "#90be6d",
    "#43aa8b", "#4d96d8", "#845ec2", "#d65db1"
];
const radius = canvas.width / 2;
const defaultOptions = ["Option 1", "Option 2", "Option 3", "Option 4"];
let options = [];
let rotation = 0;
let isSpinning = false;
let chosenIndex = -1;
let hasInitializedOptions = false;
let hasReceivedInitialOptions = false;
let hasUserEditedOptions = false;
let databaseAvailable = true;
let saveTimeout = null;

function readOptions() {
    return optionsField.value
        .split(/\r?\n/)
        .map(option => option.trim())
        .filter(Boolean);
}

function drawWheel() {
    const slice = (Math.PI * 2) / Math.max(options.length, 1);
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (options.length === 0) {
        context.beginPath();
        context.arc(radius, radius, radius - 8, 0, Math.PI * 2);
        context.fillStyle = "#e5e7eb";
        context.fill();
        context.fillStyle = "#444";
        context.font = "bold 26px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("Add options", radius, radius);
        return;
    }

    options.forEach((option, index) => {
        const startAngle = -Math.PI / 2 + rotation + index * slice;
        const endAngle = startAngle + slice;

        context.beginPath();
        context.moveTo(radius, radius);
        context.arc(radius, radius, radius - 8, startAngle, endAngle);
        context.closePath();
        context.fillStyle = colors[index % colors.length];
        context.fill();
        context.strokeStyle = "#fff";
        context.lineWidth = 3;
        context.stroke();

        context.save();
        context.translate(radius, radius);
        context.rotate(startAngle + slice / 2);
        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillStyle = "#fff";
        context.shadowColor = "rgba(0, 0, 0, 0.35)";
        context.shadowBlur = 3;
        context.font = `bold ${Math.max(12, Math.min(22, 360 / options.length))}px Arial`;
        const maxLabelWidth = radius * 0.68;
        let label = option;
        while (context.measureText(label).width > maxLabelWidth && label.length > 3) {
            label = `${label.slice(0, -4)}...`;
        }
        context.fillText(label, radius - 28, 0, maxLabelWidth);
        context.restore();
    });

    context.beginPath();
    context.arc(radius, radius, 25, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.strokeStyle = "#333";
    context.lineWidth = 4;
    context.stroke();
}

function updateOptions() {
    options = readOptions();
    drawWheel();
    spinButton.disabled = isSpinning || options.length < 2;
    canvas.setAttribute(
        "aria-label",
        options.length
            ? `Roulette wheel with ${options.length} options: ${options.join(", ")}`
                : "Empty roulette wheel"
    );

    if (!isSpinning) {
        result.textContent = options.length < 2
            ? "Add at least two options to get started."
            : "Ready to draw.";
    }
}

function saveOptionsLocally() {
    try {
        localStorage.setItem(localOptionsKey, JSON.stringify(options));
        return true;
    } catch (error) {
        console.error("Error saving roulette options in this browser:", error);
        return false;
    }
}

function loadLocalOptions() {
    if (!hasUserEditedOptions) {
        try {
            const savedOptions = JSON.parse(localStorage.getItem(localOptionsKey) || "null");
            if (Array.isArray(savedOptions) && savedOptions.every(option => typeof option === "string")) {
                optionsField.value = savedOptions.join("\n");
            } else {
                optionsField.value = defaultOptions.join("\n");
            }
        } catch (error) {
            console.error("Error loading roulette options from this browser:", error);
            optionsField.value = defaultOptions.join("\n");
        }
    }

    updateOptions();
    result.textContent =
        "Database access is unavailable. Options are saved in this browser only.";
}

function scheduleOptionsSave() {
    if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
    }

    result.textContent = "Saving options...";
    saveTimeout = window.setTimeout(async () => {
        saveTimeout = null;
        const savedLocally = saveOptionsLocally();
        if (!databaseAvailable) {
            result.textContent = savedLocally
                ? "Database access is unavailable. Options are saved in this browser only."
                : "Could not save options in the database or this browser.";
            return;
        }

        const savedOptions = {
            initialized: true,
            items: Object.fromEntries(
                options.map((option, index) => [index, option])
            )
        };

        try {
            await set(rouletteOptionsRef, savedOptions);
            result.textContent = "Options saved.";
        } catch (error) {
            console.error("Error saving roulette options:", error);
            databaseAvailable = false;
            result.textContent = savedLocally
                ? "Database access is unavailable. Options are saved in this browser only."
                : "Could not save options in the database or this browser.";
        }
    }, 300);
}

onValue(rouletteOptionsRef, async snapshot => {
    const isInitialSnapshot = !hasReceivedInitialOptions;
    hasReceivedInitialOptions = true;

    if (!snapshot.exists() && !hasInitializedOptions) {
        hasInitializedOptions = true;
        if (hasUserEditedOptions) {
            scheduleOptionsSave();
            return;
        }

        try {
            await set(
                rouletteOptionsRef,
                {
                    initialized: true,
                    items: Object.fromEntries(
                        defaultOptions.map((option, index) => [index, option])
                    )
                }
            );
        } catch (error) {
            console.error("Error initializing roulette options:", error);
            databaseAvailable = false;
            loadLocalOptions();
        }
        return;
    }

    hasInitializedOptions = true;
    if (hasUserEditedOptions) {
        if (isInitialSnapshot) scheduleOptionsSave();
        return;
    }

    const savedValue = snapshot.val();
    const savedItems = savedValue?.items;
    const savedOptions = savedItems && typeof savedItems === "object"
        ? Object.values(savedItems)
        : [];

    if (
        !savedValue ||
        savedValue.initialized !== true ||
        !savedOptions.every(option => typeof option === "string")
    ) {
        console.error("Saved roulette options have an invalid format.");
        result.textContent = "Saved options have an invalid format and could not be loaded.";
        return;
    }

    options = savedOptions;
    const currentFieldOptions = readOptions();
    if (currentFieldOptions.join("\n") !== options.join("\n")) {
        optionsField.value = options.join("\n");
    }
    updateOptions();
}, error => {
    console.error("Error loading roulette options:", error);
    databaseAvailable = false;
    hasReceivedInitialOptions = true;
    hasInitializedOptions = true;
    optionsField.disabled = false;
    loadLocalOptions();
});

function animateSpin(targetRotation, duration) {
    const startingRotation = rotation;
    const startedAt = performance.now();

    return new Promise(resolve => {
        function frame(now) {
            const progress = Math.min((now - startedAt) / duration, 1);
            const easedProgress = 1 - (1 - progress) ** 4;
            rotation = startingRotation +
                (targetRotation - startingRotation) * easedProgress;
            drawWheel();

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                rotation %= Math.PI * 2;
                drawWheel();
                resolve();
            }
        }

        requestAnimationFrame(frame);
    });
}

optionsField.addEventListener("input", () => {
    hasUserEditedOptions = true;
    updateOptions();
    scheduleOptionsSave();
});

keepOptionButton.addEventListener("click", () => {
    resultDialog.close();
});

removeOptionButton.addEventListener("click", () => {
    if (chosenIndex < 0 || chosenIndex >= options.length) return;

    options.splice(chosenIndex, 1);
    optionsField.value = options.join("\n");
    chosenIndex = -1;
    updateOptions();
    scheduleOptionsSave();
    result.textContent = "Option removed from future draws.";
    resultDialog.close();
});

spinButton.addEventListener("click", async () => {
    if (isSpinning || options.length < 2) return;

    isSpinning = true;
    spinButton.disabled = true;
    optionsField.disabled = true;
    result.textContent = "The wheel is spinning...";

    chosenIndex = Math.floor(Math.random() * options.length);
    const slice = (Math.PI * 2) / options.length;
    const targetAngle = (Math.PI * 2 - (chosenIndex + 0.5) * slice) %
        (Math.PI * 2);
    const currentAngle = ((rotation % (Math.PI * 2)) + Math.PI * 2) %
        (Math.PI * 2);
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const targetRotation = rotation + extraTurns * Math.PI * 2 +
        ((targetAngle - currentAngle + Math.PI * 2) % (Math.PI * 2));

    await animateSpin(targetRotation, 5000);
    const chosenOption = options[chosenIndex];
    result.textContent = `Result: ${chosenOption}`;
    dialogItem.textContent = chosenOption;
    isSpinning = false;
    optionsField.disabled = false;
    spinButton.disabled = options.length < 2;
    resultDialog.showModal();
});

drawWheel();
