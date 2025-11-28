import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { mnemonicToAccount } from 'viem/accounts';

// 1. Neynar İstemcisini Başlat
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  // --- YENİ SIGNER OLUŞTURMA (POST) ---
  if (req.method === 'POST') {
    try {
      console.log("📝 Yeni Signer isteği alındı...");

      // A) Önce Neynar'dan ham bir signer al
      const signer = await client.createSigner();
      console.log("✅ Ham Signer oluştu:", signer.signer_uuid);
      
      // B) Eğer Developer Mnemonic tanımlıysa, imzalı kayıt yap (Managed Mode)
      if (process.env.FARCASTER_DEVELOPER_MNEMONIC && process.env.FARCASTER_DEVELOPER_FID) {
        try {
          console.log("🔐 İmza üretiliyor...");
          const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);
          const appFid = parseInt(process.env.FARCASTER_DEVELOPER_FID);
          const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 saat geçerli

          // EIP-712 İmzası için Gerekli Tanımlar
          const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
            name: "Farcaster SignedKeyRequestValidator",
            version: "1",
            chainId: 10, // Optimism
            verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
          };

          const SIGNED_KEY_REQUEST_TYPE = [
            { name: "requestFid", type: "uint256" },
            { name: "key", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ];

          // İmzayı oluştur (Sizin Mnemonic'inizle)
          const signature = await account.signTypedData({
            domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
            types: { SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE },
            primaryType: "SignedKeyRequest",
            message: {
              requestFid: BigInt(appFid),
              key: signer.public_key,
              deadline: BigInt(deadline),
            },
          });

          // İmzalı anahtarı Neynar'a kaydet ve ONAY LİNKİNİ al
          const registeredSigner = await client.registerSignedKey(
            signer.signer_uuid,
            appFid,
            deadline,
            signature
          );

          console.log("🎉 Onay Linki (URL) başarıyla alındı.");
          
          // Başarılı! Linki React tarafına gönder.
          return res.status(200).json(registeredSigner);

        } catch (signError) {
          console.error("❌ İmzalama hatası:", signError);
          // İmza hatası olsa bile ham signer'ı dön (Link eksik olur ama hata patlamaz)
          return res.status(200).json(signer);
        }
      } else {
        console.warn("⚠️ Mnemonic veya FID eksik, onaysız signer dönülüyor.");
        return res.status(200).json(signer);
      }

    } catch (error) {
      console.error("Genel Hata:", error);
      return res.status(500).json({ error: 'Failed to create signer' });
    }
  }

  // --- DURUM KONTROLÜ (GET) ---
  if (req.method === 'GET') {
    const { signer_uuid } = req.query;
    if (!signer_uuid) {
      return res.status(400).json({ error: 'signer_uuid is required' });
    }

    try {
      const signer = await client.lookupSigner(signer_uuid);
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Signer sorgulama hatası:", error);
      return res.status(500).json({ error: 'Failed to fetch signer status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}