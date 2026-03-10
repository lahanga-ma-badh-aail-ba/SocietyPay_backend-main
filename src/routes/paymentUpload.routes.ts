// routes/paymentUpload.ts
import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const upload = multer(); // memory storage

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

router.post('/upload-payment', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = `payment-screenshots/${Date.now()}_${file.originalname}`;

  const { data, error } = await supabaseAdmin.storage
    .from('payments')
    .upload(filePath, file.buffer);

  if (error) return res.status(500).json({ error: error.message });

  const { data: urlData } = supabaseAdmin.storage
    .from('payments')
    .getPublicUrl(filePath);

  res.json({ publicUrl: urlData.publicUrl });
});

export default router;