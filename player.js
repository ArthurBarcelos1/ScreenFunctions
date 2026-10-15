
import { db } from "./firebase-config.js";
import {
    ref,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") || "sala-principal";

const player = document.getElementById("player");
const winnerRef = ref(db, `rooms/${roomId}/winner`);

const storageKey = `click-detector-${roomId}`;

let playerId = sessionStorage.getItem(storageKey);

if (!playerId) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, playerId);
}

let winner = null;
let clicked = false;

onValue(winnerRef, snapshot => {
    winner = snapshot.val();

    if (winner === null) {
        player.style.backgroundColor = "white";
        clicked = false;
        return;
    }

    player.style.backgroundColor =
        winner.playerId === playerId ? "#00cc44" : "#ff3333";
}, console.error);

player.addEventListener("click", async () => {
    if (clicked || winner !== null) return;

    clicked = true;

    try {
        const result = await runTransaction(winnerRef, current => {
            if (current !== null) return;

            return {
                playerId: playerId,
                timestamp: Date.now()
            };
        });

        if (!result.committed) {
            // Outro jogador venceu.
            // A cor será sincronizada pelo onValue.
        }
    } catch (error) {
        clicked = false;
        console.error("Erro ao registrar clique:", error);
    }
});
