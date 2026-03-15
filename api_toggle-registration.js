import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { action, key } = req.query;
  const ADMIN_KEY = process.env.ADMIN_KEY;

  if (!ADMIN_KEY) {
    console.error('ADMIN_KEY is not configured in Vercel!');
    return res.status(500).json({ error: 'ADMIN_KEY not configured' });
  }

  try {
    // Статус - доступен всем (без проверки ключа)
    if (action === 'status') {
      const isOpen = await kv.get('registration_open');
      const counter = await kv.get('request_counter');
      const counterNum = parseInt(counter) || 0;
      
      return res.status(200).json({
        open: !!isOpen,
        counter: counterNum,
        maxSlots: 100,
        available: Math.max(0, 100 - counterNum)
      });
    }

    // Запуск и остановка - требуют ADMIN_KEY
    if (action === 'start') {
      if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin key' });
      }
      
      await kv.set('registration_open', true);
      await kv.set('request_counter', 0);
      
      return res.status(200).json({ 
        ok: true,
        message: 'Registration started',
        open: true,
        counter: 0
      });
    }

    if (action === 'stop') {
      if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin key' });
      }
      
      await kv.set('registration_open', false);
      
      return res.status(200).json({ 
        ok: true,
        message: 'Registration stopped',
        open: false
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
