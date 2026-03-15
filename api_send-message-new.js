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
    // Проверяем открыта ли запись
    const isOpen = await kv.get('registration_open');
    
    if (!isOpen) {
      return res.status(200).json({ 
        ok: false,
        closed: true,
        message: 'Prayer registration is closed'
      });
    }

    const { name, surname, city, prayer, telegramId, phone, country, username } = req.body;

    // Получаем текущий номер и увеличиваем счётчик
    let counter = await kv.get('request_counter') || 0;
    counter = parseInt(counter) + 1;
    
    // Если достигнули 100 - автоматически закрываем
    if (counter > 100) {
      counter = 100; // Оставляем на 100
      await kv.set('registration_open', false);
      
      return res.status(200).json({ 
        ok: false,
        closed: true,
        message: 'Prayer registration is now closed (100 slots filled)'
      });
    }

    // Сохраняем обновленный счётчик
    await kv.set('request_counter', counter);

    // Формируем сообщение для группы
    let message = `📋 <b>Prayer Request #${counter}</b>\n\n`;
    message += `👤 <b>Name:</b> ${name}\n`;
    message += `👤 <b>Last Name:</b> ${surname}\n`;
    message += `🏙 <b>City:</b> ${city}\n`;

    if (telegramId) {
      message += `📱 <b>Telegram:</b> ${username}\n`;
      message += `🆔 <b>ID:</b> ${telegramId}`;
    } else if (phone) {
      message += `📞 <b>Phone:</b> ${country}${phone}`;
    }

    if (prayer) {
      message += `\n\n💬 <b>Prayer Request:</b>\n${prayer}`;
    }

    // Создаём inline кнопки
    const replyMarkup = {
      inline_keyboard: [
        [
          { 
            text: '💬 Write', 
            callback_data: `write_${counter}_${telegramId || 'phone'}`
          },
          { 
            text: '✅ Accept', 
            callback_data: `accept_${counter}`
          },
          { 
            text: '❌ Reject', 
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

    const data = await response.json();

    if (data.ok) {
      // Сохраняем заявку в KV для отслеживания
      await kv.set(`request_${counter}`, JSON.stringify({
        number: counter,
        name,
        surname,
        city,
        prayer,
        telegramId,
        phone,
        username,
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
