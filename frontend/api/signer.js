import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import { mnemonicToAccount } from 'viem/accounts';

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  // --- YENİ SIGNER OLUŞTURMA (POST) ---
  if (req.method === 'POST') {
    try {
      console.log("📝 Yeni Signer isteği alındı...");

      // A) Ham signer oluştur
      const signer = await client.createSigner();
      console.log("✅ Ham Signer oluştu:", signer.signer_uuid);
      
      // B) Managed Mode (İmzalı Kayıt)
      if (process.env.FARCASTER_DEVELOPER_MNEMONIC && process.env.FARCASTER_DEVELOPER_FID) {
        try {
          console.log("🔐 İmza üretiliyor...");
          const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);
          const appFid = parseInt(process.env.FARCASTER_DEVELOPER_FID);
          const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 saat geçerli

          const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
            name: "Farcaster SignedKeyRequestValidator",
            version: "1",
            chainId: 10,
            verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
          };

          const SIGNED_KEY_REQUEST_TYPE = [
            { name: "requestFid", type: "uint256" },
            { name: "key", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ];

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

          // DÜZELTME BURADA: Parametreleri TEK BİR NESNE olarak gönderiyoruz
          const registeredSigner = await client.registerSignedKey({
            signerUuid: signer.signer_uuid,
            appFid: appFid,
            deadline: deadline,
            signature: signature
          });

          console.log("🎉 Onay Linki alındı:", registeredSigner.signer_approval_url);
          return res.status(200).json(registeredSigner);

        } catch (signError) {
          console.error("❌ İmzalama veya Kayıt hatası:", signError.message);
          if (signError.response) console.error("API Yanıtı:", signError.response.data);
          
          // Hata olsa bile ham signer dönüyoruz ki kullanıcı en azından UUID görsün
          return res.status(200).json(signer);
        }
      } else {
        console.warn("⚠️ Mnemonic eksik, onaysız signer dönülüyor.");
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
      // DÜZELTME BURADA: Parametreyi nesne olarak gönderiyoruz
      const signer = await client.lookupSigner({ signerUuid: signer_uuid });
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Signer sorgulama hatası:", error);
      return res.status(500).json({ error: 'Failed to fetch signer status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}