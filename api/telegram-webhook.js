const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID  = process.env.GROUP_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body;

    // Обработка нажатия кнопки "Отклонить"
    if (body.callback_query) {
      const query    = body.callback_query;
      const data     = query.data || '';
      const msgId    = query.message?.message_id;
      const chatId   = query.message?.chat?.id;
      const adminName = query.from?.first_name || 'Администратор';

      if (data.startsWith('reject_')) {
        const num = data.replace('reject_', '');

        // Отвечаем на callback чтобы убрать "часики"
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: query.id,
            text: `✅ Заявка №${num} отклонена`,
            show_alert: false,
          }),
        });

        // Редактируем сообщение — убираем кнопки, добавляем статус
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: msgId,
            text: query.message.text + `\n\n🚫 Отклонено администратором (${adminName})`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          }),
        });

        // Уведомление в группу об освобождении места
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            text: `♻️ Место №${num} освобождено — заявка отклонена`,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
