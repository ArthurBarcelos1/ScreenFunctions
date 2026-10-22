
import { db } from "./firebase-config.js";
import {
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const roomId = "sala-principal";
const winnerRef = ref(db, `rooms/${roomId}/winner`);

const playerUrl = new URL("SpeedClickPlayer.html", window.location.href);
playerUrl.searchParams.set("room", roomId);

new QRCode(document.getElementById("qrcode"), {
    text: playerUrl.href,
    width: 200,
    height: 200
});

// Initialize the room only if it does not exist yet.
get(winnerRef).then(snapshot => {
    if (!snapshot.exists()) {
        return set(winnerRef, null);
    }
}).catch(console.error);

// Reset da rodada.
document.getElementById("reset").addEventListener("click", async () => {
    try {
        await set(winnerRef, null);
    } catch (error) {
        console.error("Error resetting the round:", error);
    }
});
