import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GROUP_ID = process.env.GROUP_ID;

  if (!BOT_TOKEN || !GROUP_ID) {
    console.error('Missing BOT_TOKEN or GROUP_ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const body = req.body;
    
    if (!body.callback_query) {
      return res.status(200).json({ ok: true });
    }

    const callbackQuery = body.callback_query;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id;
    const username = callbackQuery.from.username || 'Unknown';

    console.log('Callback data:', data);

    // ✅ ACCEPT - Принять заявку
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
        text: `✅ <b>ЗАЯВКА №${requestNumber} ПРИНЯТА</b>\nПринято: @${username}`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] }
      };

      await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload)
      });

      // Отвечаем на callback
      await answerCallback(BOT_TOKEN, callbackQuery.id, '✓');
    }

    // ❌ REJECT - Отклонить заявку
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
      await answerCallback(BOT_TOKEN, callbackQuery.id, '✓');
    }

    // 💬 WRITE - Написать человеку
    else if (data.startsWith('write_')) {
      const parts = data.split('_');
      if (parts.length < 3) {
        return res.status(200).json({ ok: true });
      }
      
      const requestNumber = parts[1];
      const contactType = parts.slice(2).join('_'); // Берём всё остальное после второго '_'

      if (contactType !== 'phone' && contactType) {
        // Это Telegram ID - отправляем уведомление
        try {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: contactType,
              text: `📲 Администратор хочет написать вам по поводу заявки №${requestNumber}`,
              parse_mode: 'HTML'
            })
          });
        } catch (e) {
          console.warn('Failed to send notification:', e);
        }
        
        await answerCallback(BOT_TOKEN, callbackQuery.id, '✓ Уведомление отправлено');
      } else {
        await answerCallback(BOT_TOKEN, callbackQuery.id, '☎️ Контакт по телефону');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
}

async function answerCallback(botToken, callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  const payload = {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: false
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('Failed to answer callback:', e);
  }
}

