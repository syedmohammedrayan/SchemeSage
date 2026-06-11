import crypto from 'crypto';
import { db } from '../config/db.js';
import { CommissionModel, AgentWalletModel, TransactionModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { invalidateAnalyticsCache } from './analytics.service.js';

export async function splitCommission(applicationId: string, agentId: string, totalPaid: number) {
  // Agent Commission: ₹150, Platform: ₹49 (from 199)
  const agentCommissionPaise = 15000;
  const platformCommissionPaise = totalPaid - agentCommissionPaise;

  const commId = crypto.randomUUID();
  await CommissionModel.create({
    id: commId,
    applicationId,
    agentId,
    amount: totalPaid,
    agentCommission: agentCommissionPaise,
    platformCommission: platformCommissionPaise,
    status: 'completed'
  });

  // Credit agent wallet
  let walletSnap = await AgentWalletModel.find({ agentId });
  let wallet;
  if (walletSnap.length === 0) {
    wallet = await AgentWalletModel.create({
      id: crypto.randomUUID(),
      agentId,
      availableBalance: 0,
      pendingEarnings: agentCommissionPaise,
      totalEarned: agentCommissionPaise
    });
  } else {
    wallet = walletSnap[0];
    await AgentWalletModel.findOneAndUpdate(
      { id: wallet.id },
      { 
        $inc: { 
          pendingEarnings: agentCommissionPaise,
          totalEarned: agentCommissionPaise 
        } 
      }
    );
  }

  // Create transaction record
  await TransactionModel.create({
    id: crypto.randomUUID(),
    agentId,
    type: 'credit',
    amount: agentCommissionPaise,
    referenceId: applicationId,
    description: `Commission for application ${applicationId.slice(0, 8)}`,
    status: 'completed'
  });

  invalidateAnalyticsCache();
  return { agentCommissionPaise, platformCommissionPaise };
}

export async function getAgentEarnings(agentId: string) {
  const walletSnap = await AgentWalletModel.find({ agentId });
  if (walletSnap.length === 0) return { availableBalance: 0, pendingEarnings: 0, totalEarned: 0 };
  return walletSnap[0];
}
