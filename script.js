
import { db } from "./firebase-config.js";
import {
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const roomId = "sala-principal";
const winnerRef = ref(db, `rooms/${roomId}/winner`);

const playerUrl = new URL("player.html", window.location.href);
playerUrl.searchParams.set("room", roomId);

new QRCode(document.getElementById("qrcode"), {
    text: playerUrl.href,
    width: 200,
    height: 200
});

// Inicializa a sala apenas se ainda não existir.
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
        console.error("Erro ao resetar:", error);
    }
});
