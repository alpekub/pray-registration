export default async function handler(req, res) {
  const BOT_TOKEN = '8695311162:AAGFLNrqBa7nNd7Y_XsaGbcxcb6axh5uojM';
  const WEBHOOK_URL = 'https://pray-registration.vercel.app/api/telegram-webhook';
  
  try {
    if (req.query.setup === 'true') {
      const setupResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: WEBHOOK_URL })
      });
      
      const setupData = await setupResponse.json();
      
      return res.status(200).json({
        message: 'Webhook setup initiated',
        result: setupData
      });
    }
    
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookData = await webhookResponse.json();
    
    return res.status(200).json({
      webhook_status: webhookData.result
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
