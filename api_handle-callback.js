import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GROUP_ID = process.env.GROUP_ID;

  try {
    const body = req.body;
    
    // Проверяем что это callback query
    if (!body.callback_query) {
      return res.status(200).json({ ok: true });
    }

    const callbackQuery = body.callback_query;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;
    const username = callbackQuery.from.username || 'Unknown';

    console.log('Callback data:', data);

    // ACCEPT - Принять заявку
    if (data.startsWith('accept_')) {
      const requestNumber = data.split('_')[1];
      
      // Обновляем статус заявки
      const requestData = await kv.get(`request_${requestNumber}`);
      if (requestData) {
        const parsed = JSON.parse(requestData);
        parsed.status = 'accepted';
        parsed.acceptedBy = username;
        parsed.acceptedAt = new Date().toISOString();
        await kv.set(`request_${requestNumber}`, JSON.stringify(parsed));
      }

      // Редактируем сообщение в группе
      const editUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
      const editPayload = {
        chat_id: GROUP_ID,
        message_id: messageId,
        text: `✅ <b>ACCEPTED</b> by @${username} at ${new Date().toLocaleTimeString()}\n\n📋 Prayer Request #${requestNumber}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] } // Удаляем кнопки
      };

      await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload)
      });

      // Отвечаем на callback
      await answerCallback(BOT_TOKEN, callbackQuery.id, '✅ Request accepted');
    }

    // REJECT - Отклонить заявку
    else if (data.startsWith('reject_')) {
      const requestNumber = data.split('_')[1];
      
      // Обновляем статус заявки
      const requestData = await kv.get(`request_${requestNumber}`);
      if (requestData) {
        const parsed = JSON.parse(requestData);
        parsed.status = 'rejected';
        parsed.rejectedBy = username;
        parsed.rejectedAt = new Date().toISOString();
        await kv.set(`request_${requestNumber}`, JSON.stringify(parsed));
      }

      // Удаляем сообщение из группы
      const deleteUrl = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
      const deletePayload = {
        chat_id: GROUP_ID,
        message_id: messageId
      };

      await fetch(deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletePayload)
      });

      // Отвечаем на callback
      await answerCallback(BOT_TOKEN, callbackQuery.id, '❌ Request rejected and deleted');
    }

    // WRITE - Написать человеку
    else if (data.startsWith('write_')) {
      const parts = data.split('_');
      const requestNumber = parts[1];
      const contactType = parts[2];

      // Получаем данные заявки
      const requestData = await kv.get(`request_${requestNumber}`);
      
      if (requestData && contactType !== 'phone') {
        const parsed = JSON.parse(requestData);
        const telegramId = parsed.telegramId;

        // Создаём URL для открытия чата
        const chatUrl = `tg://user?id=${telegramId}`;
        
        // Отвечаем с URL кнопкой
        await answerCallback(BOT_TOKEN, callbackQuery.id, '💬 Opening chat...', chatUrl);
      } else {
        await answerCallback(BOT_TOKEN, callbackQuery.id, '📱 Contact via phone number');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
}

async function answerCallback(botToken, callbackQueryId, text, url = null) {
  const url_ = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: false
  };

  if (url) {
    payload.url = url;
  }

  await fetch(url_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
