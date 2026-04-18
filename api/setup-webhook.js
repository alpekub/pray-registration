const BOT_TOKEN   = '8695311162:AAGFLNrqBa7nNd7Y_XsaGbcxcb6axh5uojM';
const WEBHOOK_URL = 'https://pray8888.vercel.app/api/telegram-webhook';

export default async function handler(req, res) {
  if (req.query.setup !== 'true') {
    return res.status(200).json({ message: 'Добавьте ?setup=true для активации webhook' });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: WEBHOOK_URL }),
      }
    );
    const data = await response.json();
    return res.status(200).json({ ok: true, telegram: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
