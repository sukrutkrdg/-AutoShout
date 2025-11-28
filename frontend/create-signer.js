import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import dotenv from "dotenv";

dotenv.config();

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});

const client = new NeynarAPIClient(config);

async function generateSigner() {
  try {
    console.log("⏳ Signer oluşturuluyor... Lütfen bekleyin.");
    
    const signer = await client.createSigner();
    
    // --- DEBUG MODU: Tüm yanıtı görelim ---
    console.log("\n📦 API YANITI (TÜMÜ):");
    console.log(JSON.stringify(signer, null, 2));
    console.log("------------------------------------------------");

    // Olası doğru linkleri yakalamaya çalışalım
    const approvalUrl = signer.signer_approval_url || signer.link || signer.url || signer.signer_approval_link;

    console.log("\n🔑 Signer UUID:", signer.signer_uuid);
    
    if (approvalUrl) {
      console.log("\n✅ ONAY LİNKİ BULUNDU:");
      console.log(approvalUrl);
    } else {
      console.log("\n⚠️ Onay linki doğrudan bulunamadı. Yukarıdaki 'API YANITI' çıktısını inceleyin.");
    }

  } catch (error) {
    console.error("❌ Hata:", error);
  }
}

generateSigner();