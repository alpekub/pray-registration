const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID  = process.env.GROUP_ID;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    const { name, last, telegramId, phone, username, num } = req.body;

    let msg, replyMarkup;

    if (telegramId) {
      msg = `📋 <b>Новая заявка №${num}</b>\n\n👤 Имя: ${name}\n👤 Фамилия: ${last}\n📱 Telegram: ${username || '—'}\n🆔 ID: ${telegramId}`;
      replyMarkup = {
        inline_keyboard: [[
          { text: '💬 Написать', url: `tg://user?id=${telegramId}` },
          { text: '❌ Отклонить', callback_data: `reject_${num}` }
        ]]
      };
    } else {
      msg = `📋 <b>Новая заявка №${num}</b>\n\n👤 Имя: ${name}\n👤 Фамилия: ${last}\n📞 Телефон: ${phone}`;
      replyMarkup = {
        inline_keyboard: [[
          { text: '❌ Отклонить', callback_data: `reject_${num}` }
        ]]
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });

    const data = await response.json();
    return res.status(200).json({ ok: true, telegram: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
