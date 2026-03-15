import { kv } from '@vercel/kv';

// Функция экранирования HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    // Проверяем открыта ли запись
    const isOpen = await kv.get('registration_open');
    
    if (!isOpen) {
      return res.status(200).json({ 
        ok: false,
        closed: true,
        message: 'Prayer registration is closed'
      });
    }

    const { name, last, city, telegramId, phone, countryCode, username } = req.body;

    // Получаем текущий номер и увеличиваем счётчик
    let counter = await kv.get('request_counter');
    counter = parseInt(counter) || 0;
    counter = counter + 1;
    
    // Если достигнули 100 - автоматически закрываем
    if (counter > 100) {
      await kv.set('registration_open', false);
      
      return res.status(200).json({ 
        ok: false,
        closed: true,
        message: 'Prayer registration is now closed (100 slots filled)'
      });
    }

    // Сохраняем обновленный счётчик
    await kv.set('request_counter', counter);

    // Формируем сообщение для группы (на русском, с экранированием)
    let message = `📋 <b>Новая заявка №${counter}</b>\n\n`;
    message += `👤 <b>Имя:</b> ${escapeHtml(name)}\n`;
    message += `👤 <b>Фамилия:</b> ${escapeHtml(last)}\n`;
    message += `🏙 <b>Город:</b> ${escapeHtml(city)}\n`;

    if (telegramId) {
      const usernameText = username ? `@${escapeHtml(username)}` : '(контакт поделен)';
      message += `📱 <b>Telegram:</b> ${usernameText}\n`;
      message += `🆔 <b>ID:</b> ${telegramId}`;
    } else if (phone) {
      message += `📞 <b>Телефон:</b> ${escapeHtml(countryCode)}${escapeHtml(phone)}`;
    }

    // Создаём inline кнопки для админа
    const replyMarkup = {
      inline_keyboard: [
        [
          { 
            text: '💬 Написать', 
            callback_data: `write_${counter}_${telegramId || 'phone'}`
          },
          { 
            text: '✅ Принять', 
            callback_data: `accept_${counter}`
          },
          { 
            text: '❌ Отклонить', 
            callback_data: `reject_${counter}`
          }
        ]
      ]
    };

    // Отправляем в Telegram
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const payload = {
      chat_id: GROUP_ID,
      text: message,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Telegram API error - HTTP', response.status);
      return res.status(500).json({ error: 'Telegram API error' });
    }

    const data = await response.json();

    if (data.ok) {
      // Сохраняем заявку в KV для отслеживания
      await kv.set(`request_${counter}`, JSON.stringify({
        number: counter,
        name: escapeHtml(name),
        last: escapeHtml(last),
        city: escapeHtml(city),
        telegramId,
        phone: escapeHtml(phone),
        countryCode: escapeHtml(countryCode),
        username: escapeHtml(username),
        status: 'pending',
        createdAt: new Date().toISOString(),
        messageId: data.result.message_id
      }));

      return res.status(200).json({ 
        ok: true,
        requestNumber: counter,
        maxSlots: 100,
        message: 'Prayer request received'
      });
    } else {
      console.error('Telegram error:', data);
      return res.status(500).json({ error: 'Failed to send to Telegram' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
