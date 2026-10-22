
import { db } from "./firebase-config.js";
import {
    ref,
    onValue,
    onDisconnect,
    runTransaction,
    set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") || "sala-principal";
const mode = params.get("mode") || "speed";

const player = document.getElementById("player");
const loading = document.getElementById("loading");
const winnerRef = ref(db, `rooms/${roomId}/winner`);
const drawRef = ref(db, `rooms/${roomId}/draw`);

const storageKey = `click-detector-${roomId}-${mode}`;

let playerId = sessionStorage.getItem(storageKey);

if (!playerId) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, playerId);
}

if (mode === "random") {
    const participantRef = ref(db, `rooms/${roomId}/participants/${playerId}`);
    const connectedRef = ref(db, ".info/connected");

    onValue(connectedRef, async snapshot => {
        if (snapshot.val() !== true) return;

        try {
            await onDisconnect(participantRef).remove();
            await set(participantRef, true);
        } catch (error) {
            console.error("Error registering participant:", error);
        }
    }, error => console.error("Error checking connection:", error));

    onValue(drawRef, snapshot => {
        const draw = snapshot.val();

        if (!draw) {
            player.style.backgroundColor = "white";
        } else if (draw.status === "spinning") {
            player.style.backgroundColor =
                draw.currentPlayerId === playerId ? "#00cc44" : "#ff3333";
        } else {
            const selectedPlayerIds = draw.selectedPlayerIds || [];
            player.style.backgroundColor =
                selectedPlayerIds.includes(playerId) ? "#00cc44" : "#ff3333";
        }
    }, error => console.error("Error syncing draw:", error));
} else {
    let winner = null;
    let clicked = false;
    let waitingForResult = false;

    function renderWinner(value) {
        winner = value;

        if (winner === null) {
            player.style.backgroundColor = "white";
            clicked = false;
            return;
        }

        player.style.backgroundColor =
            winner.playerId === playerId ? "#00cc44" : "#ff3333";
    }

    onValue(winnerRef, snapshot => {
        const value = snapshot.val();

        if (waitingForResult) return;

        loading.hidden = true;
        renderWinner(value);
    }, console.error);

    player.addEventListener("click", async () => {
        if (clicked || winner !== null) return;

        clicked = true;
        waitingForResult = true;
        loading.hidden = false;

        try {
            const result = await runTransaction(winnerRef, current => {
                if (current !== null) return;

                return {
                    playerId: playerId,
                    timestamp: Date.now()
                };
            });
            waitingForResult = false;
            loading.hidden = true;
            renderWinner(result.snapshot.val());
        } catch (error) {
            waitingForResult = false;
            clicked = false;
            loading.hidden = true;
            console.error("Error registering click:", error);
        }
    });
}
