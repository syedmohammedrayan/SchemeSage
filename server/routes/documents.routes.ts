import { Router, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { UserDocumentModel } from '../models/index.js';

const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const userDir = path.join(uploadsDir, req.userId || 'guest');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: File upload only supports images (jpg, png) and pdfs!"));
  }
});

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await UserDocumentModel.find({ userId: req.userId }).sort({ uploadedAt: -1 });
    const normalized = docs.map(d => ({
       id: d.id,
       userId: d.userId,
       type: (d as any).type || (d as any).documentType,
       fileName: d.fileName,
       uploadedAt: d.uploadedAt
    }));
    res.json({ documents: normalized });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/upload', optionalAuthMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ error: 'documentType is required' });
    }

    const doc = await UserDocumentModel.create({
      id: crypto.randomUUID(),
      userId: req.userId!,
      type: documentType,
      fileName: req.file.originalname,
      storagePath: `${req.userId || 'guest'}/${req.file.filename}`,
      uploadedAt: new Date(),
    });

    const docWithUrl = {
       ...doc.toObject(),
       url: `/uploads/${req.userId || 'guest'}/${req.file.filename}`
    };

    res.status(201).json({ document: docWithUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server Error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await UserDocumentModel.findOneAndDelete({ id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
