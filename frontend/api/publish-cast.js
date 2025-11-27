import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// --- DÜZELTME BURADA ---
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);
// -----------------------

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, signerUuid } = request.body;

    if (!text) {
      return response.status(400).json({ error: 'Metin (text) gerekli.' });
    }

    const signer = signerUuid || process.env.NEYNAR_SIGNER_UUID;

    if (!signer) {
      return response.status(500).json({ error: 'Signer UUID bulunamadı.' });
    }

    const result = await client.publishCast({
      signerUuid: signer,
      text: text
    });

    return response.status(200).json({ 
      success: true, 
      hash: result.hash,
      message: 'Cast başarıyla paylaşıldı!' 
    });

  } catch (error) {
    console.error("Neynar Hatası:", error);
    return response.status(500).json({ error: error.message || 'Bir hata oluştu' });
  }
}