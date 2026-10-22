import { db } from "./firebase-config.js";
import {
    get,
    onValue,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const roomId = "sala-aleatoria";
const participantsRef = ref(db, `rooms/${roomId}/participants`);
const drawRef = ref(db, `rooms/${roomId}/draw`);
const countInput = document.getElementById("winner-count");
const durationInput = document.getElementById("draw-duration");
const participantCount = document.getElementById("participant-count");
const startButton = document.getElementById("start-draw");
const resetButton = document.getElementById("reset-draw");
const status = document.getElementById("draw-status");

const playerUrl = new URL("SpeedClickPlayer.html", window.location.href);
playerUrl.searchParams.set("room", roomId);
playerUrl.searchParams.set("mode", "random");

new QRCode(document.getElementById("qrcode"), {
    text: playerUrl.href,
    width: 200,
    height: 200
});

let participantIds = [];
let isDrawing = false;

onValue(participantsRef, snapshot => {
    participantIds = Object.keys(snapshot.val() || {});
    participantCount.textContent =
        participantIds.length === 1
            ? "1 participant connected"
            : `${participantIds.length} participants connected`;
    countInput.max = String(Math.max(participantIds.length, 1));

    if (participantIds.length > 0) {
        const selectedCount = Number(countInput.value);
        if (selectedCount > participantIds.length) {
            countInput.value = String(participantIds.length);
        }
    }

    startButton.disabled = isDrawing || participantIds.length === 0;
}, error => {
    console.error("Error loading participants:", error);
    participantCount.textContent = "Could not load participants.";
});

function shuffle(values) {
    const shuffled = [...values];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] =
            [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
}

function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function waitUntil(timestamp) {
    const remaining = timestamp - performance.now();
    if (remaining > 0) {
        await wait(remaining);
    }
}

startButton.addEventListener("click", async () => {
    if (isDrawing) return;

    const requestedCount = Number(countInput.value);
    if (!Number.isInteger(requestedCount) || requestedCount < 1) {
        status.textContent = "Enter a valid number of screens to turn green.";
        return;
    }

    const requestedDurationSeconds = Number(durationInput.value);
    if (
        !Number.isInteger(requestedDurationSeconds) ||
        requestedDurationSeconds < 1 ||
        requestedDurationSeconds > 120
    ) {
        status.textContent = "Enter a draw duration between 1 and 120 seconds.";
        return;
    }

    isDrawing = true;
    startButton.disabled = true;
    resetButton.disabled = true;
    countInput.disabled = true;
    durationInput.disabled = true;
    status.textContent = "Preparing the draw...";

    try {
        const snapshot = await get(participantsRef);
        const connectedIds = Object.keys(snapshot.val() || {});

        if (connectedIds.length === 0) {
            status.textContent = "No participants are connected.";
            return;
        }

        if (requestedCount > connectedIds.length) {
            status.textContent =
                `Only ${connectedIds.length} participant(s) are connected.`;
            return;
        }

        const animationOrder = shuffle(connectedIds);
        const selectedPlayerIds = shuffle(connectedIds).slice(0, requestedCount);
        const drawDurationMs = requestedDurationSeconds * 1000;
        const stepDurationMs = drawDurationMs / animationOrder.length;

        await set(drawRef, {
            status: "spinning",
            currentPlayerId: null,
            selectedPlayerIds: []
        });
        const drawStartedAt = performance.now();

        for (const [index, currentPlayerId] of animationOrder.entries()) {
            await waitUntil(drawStartedAt + stepDurationMs * index);
            await set(drawRef, {
                status: "spinning",
                currentPlayerId,
                selectedPlayerIds: []
            });
        }

        await waitUntil(drawStartedAt + drawDurationMs);
        await set(drawRef, {
            status: "complete",
            currentPlayerId: null,
            selectedPlayerIds
        });
        status.textContent = `${requestedCount} screen(s) selected.`;
    } catch (error) {
        console.error("Error running the draw:", error);
        status.textContent = "Could not complete the draw.";
    } finally {
        isDrawing = false;
        countInput.disabled = false;
        durationInput.disabled = false;
        resetButton.disabled = false;
        startButton.disabled = participantIds.length === 0;
    }
});

resetButton.addEventListener("click", async () => {
    if (isDrawing) return;

    resetButton.disabled = true;
    try {
        await set(drawRef, null);
        status.textContent = "Draw cleared. Ready to start.";
    } catch (error) {
        console.error("Error clearing the draw:", error);
        status.textContent = "Could not clear the draw.";
    } finally {
        resetButton.disabled = false;
    }
});
