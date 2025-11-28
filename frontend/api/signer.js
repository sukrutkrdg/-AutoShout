import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Vercel ortam değişkenlerinden API anahtarını al
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  // 1. Signer Oluşturma İsteği (POST)
  if (req.method === 'POST') {
    try {
      const signer = await client.createSigner();
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Signer Oluşturma Hatası:", error);
      return res.status(500).json({ error: 'Signer oluşturulamadı' });
    }
  }

  // 2. Durum Sorgulama İsteği (GET)
  if (req.method === 'GET') {
    const { signer_uuid } = req.query;
    if (!signer_uuid) {
      return res.status(400).json({ error: 'signer_uuid gerekli' });
    }

    try {
      const signer = await client.lookupSigner(signer_uuid);
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Signer Sorgu Hatası:", error);
      return res.status(500).json({ error: 'Signer durumu alınamadı' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}