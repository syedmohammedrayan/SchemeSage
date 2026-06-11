import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { WithdrawalModel, AgentWalletModel, TransactionModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = Router();

router.use(authMiddleware);

// Agent: Request a withdrawal
router.post('/request', roleGuard('agent', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount < 50000) return res.status(400).json({ error: 'Minimum withdrawal is ₹500' }); // amount in paise
    if (!method) return res.status(400).json({ error: 'Withdrawal method is required' });

    const agentId = req.userId!;
    
    // Check wallet balance
    const walletSnap = await AgentWalletModel.find({ agentId });
    if (walletSnap.length === 0) return res.status(400).json({ error: 'Wallet not found' });
    
    const wallet = walletSnap[0];
    const available = wallet.pendingEarnings || 0; // Everything earned is pending until withdrawn
    
    if (available < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct from wallet immediately
    await AgentWalletModel.findOneAndUpdate(
        { id: wallet.id },
        { $inc: { pendingEarnings: -amount } } // Decrease pending earnings
    );

    // Create withdrawal request
    const withdrawalId = crypto.randomUUID();
    const withdrawal = await WithdrawalModel.create({
      id: withdrawalId,
      agentId,
      amount,
      method,
      status: 'pending'
    });

    // Create transaction
    await TransactionModel.create({
        id: crypto.randomUUID(),
        agentId,
        type: 'debit',
        amount: amount,
        referenceId: withdrawalId,
        description: `Withdrawal request via ${method}`,
        status: 'pending'
    });

    res.json({ success: true, withdrawal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Agent: Get history
router.get('/history', roleGuard('agent', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const history = await WithdrawalModel.find({ agentId: req.userId });
        res.json({ withdrawals: history });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all pending
router.get('/admin/pending', roleGuard('admin', 'government'), async (req: AuthRequest, res: Response) => {
    try {
        const pending = await WithdrawalModel.find({ status: 'pending' });
        res.json({ withdrawals: pending });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Resolve withdrawal
router.patch('/:id/resolve', roleGuard('admin', 'government'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, remarks } = req.body;
        if (!['approved', 'rejected', 'paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const withdrawal = await WithdrawalModel.findOne({ id: req.params.id });
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

        await WithdrawalModel.findOneAndUpdate(
            { id: withdrawal.id },
            { status, remarks, resolvedAt: new Date().toISOString() }
        );

        await TransactionModel.updateMany(
            { referenceId: withdrawal.id },
            { status: status === 'rejected' ? 'failed' : status }
        );

        // Refund wallet if rejected
        if (status === 'rejected') {
            const walletSnap = await AgentWalletModel.find({ agentId: withdrawal.agentId });
            if (walletSnap.length > 0) {
                await AgentWalletModel.findOneAndUpdate(
                    { id: walletSnap[0].id },
                    { $inc: { pendingEarnings: withdrawal.amount } }
                );
            }
        }

        res.json({ success: true, status });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
