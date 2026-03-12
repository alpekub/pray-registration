export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GROUP_ID = process.env.GROUP_ID;

  if (!BOT_TOKEN || !GROUP_ID) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const { name, last, city, prayer, telegramId, phone, username, countryCode } = req.body;

  try {
    // Формируем сообщение в зависимости от источника контакта
    let msg;
    let replyMarkup = null;

    if (telegramId) {
      msg = `📋 <b>Новая запись на молитву</b>\n\n👤 Имя: ${name}\n👤 Фамилия: ${last}\n🏙 Город: ${city}\n📱 Telegram: ${username}\n🆔 ID: ${telegramId}`;
      replyMarkup = {
        inline_keyboard: [[
          { text: '💬 Написать', url: `tg://user?id=${telegramId}` }
        ]]
      };
    } else {
      msg = `📋 <b>Новая запись на молитву</b>\n\n👤 Имя: ${name}\n👤 Фамилия: ${last}\n🏙 Город: ${city}\n📞 Телефон: ${countryCode}${phone}`;
    }

    if (prayer) {
      msg += `\n\n💬 <b>Молитвенная просьба:</b>\n${prayer}`;
    }

    const payload = {
      chat_id: GROUP_ID,
      text: msg,
      parse_mode: 'HTML'
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json({ ok: true, message: 'Message sent' });
    } else {
      return res.status(500).json({ error: 'Telegram API error', details: data });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
