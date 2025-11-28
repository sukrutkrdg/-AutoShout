import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Initialize Neynar Client securely on the server side
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const client = new NeynarAPIClient(config);

export default async function handler(req, res) {
  // 1. Create Signer (POST)
  if (req.method === 'POST') {
    try {
      const signer = await client.createSigner();
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Error creating signer:", error);
      return res.status(500).json({ error: 'Failed to create signer' });
    }
  }

  // 2. Check Signer Status (GET)
  if (req.method === 'GET') {
    const { signer_uuid } = req.query;
    if (!signer_uuid) {
      return res.status(400).json({ error: 'signer_uuid is required' });
    }

    try {
      const signer = await client.lookupSigner(signer_uuid);
      return res.status(200).json(signer);
    } catch (error) {
      console.error("Error looking up signer:", error);
      return res.status(500).json({ error: 'Failed to fetch signer status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}