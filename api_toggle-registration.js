import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action || req.body.action;
  const adminKey = req.query.key || req.body.key;
  
  // Простая защита ключом
  const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (action === 'start') {
      // Открыть запись и обнулить счётчик
      await kv.set('registration_open', true);
      await kv.set('request_counter', 0);
      
      return res.status(200).json({ 
        status: 'opened',
        message: '✅ Prayer registration OPENED',
        counter: 0
      });
    }
    
    else if (action === 'stop') {
      // Закрыть запись
      const currentCounter = await kv.get('request_counter') || 0;
      await kv.set('registration_open', false);
      
      return res.status(200).json({ 
        status: 'closed',
        message: '🔴 Prayer registration CLOSED',
        requests: currentCounter
      });
    }
    
    else if (action === 'status') {
      // Получить текущий статус
      const isOpen = await kv.get('registration_open');
      const counter = await kv.get('request_counter') || 0;
      
      return res.status(200).json({
        open: isOpen,
        counter: counter,
        maxSlots: 100,
        available: 100 - counter
      });
    }
    
    else {
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
