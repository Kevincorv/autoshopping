import "dotenv/config";
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Agregá estas líneas a tu .env:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("\nGuardá las keys en un lugar seguro: si se pierden, los suscriptores dejan de recibir notificaciones.");
