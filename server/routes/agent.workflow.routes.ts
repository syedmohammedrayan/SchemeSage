import { Router, Response } from 'express';
import { ApplicationModel } from '../models/index.js';

const router = Router();

router.get('/applications/:agentId', async (req, res) => {
  try {
    const apps = await ApplicationModel.find({ 
      $or: [
        { agentId: req.params.agentId },
        { 
          status: 'submitted', 
          $or: [{ agentId: { $exists: false } }, { agentId: null }, { agentId: "" }]
        }
      ]
    }).sort({ paymentStatus: -1, updatedAt: -1 });

    const { UserModel } = await import('../models/index.js');
    const popApps = await Promise.all(apps.map(async (app: any) => {
      const user = await UserModel.findOne({ id: app.userId });
      return {
        ...app.toObject(),
        userName: user?.fullName || app.formData?.fullName || 'Guest',
        userEmail: user?.email || '',
      };
    }));

    res.json(popApps);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.patch('/update-status/:applicationId', async (req, res) => {
  try {
    const { status } = req.body;
    
    // As per requirement: "once agent successfully finishes the request remove it from database"
    if (status === 'approved') {
      await ApplicationModel.deleteOne({ id: req.params.applicationId });
      return res.json({ success: true, application: { id: req.params.applicationId, status: 'approved' } });
    }

    const updated = await ApplicationModel.findOneAndUpdate(
      { id: req.params.applicationId }, 
      { status, updatedAt: new Date() }, 
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/accept/:applicationId', async (req, res) => {
  try {
    const { agentId } = req.body;
    const updated = await ApplicationModel.findOneAndUpdate(
      { id: req.params.applicationId, status: 'submitted' }, 
      { agentId, status: 'in_review', updatedAt: new Date() }, 
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Application already taken or not found' });
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/reject/:applicationId', async (req, res) => {
  try {
    const updated = await ApplicationModel.findOneAndUpdate(
      { id: req.params.applicationId }, 
      { status: 'rejected', updatedAt: new Date() }, 
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

export default router;
