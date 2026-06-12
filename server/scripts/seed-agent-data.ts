import { UserModel, ApplicationModel, TransactionModel, SubscriptionPaymentModel, WithdrawalModel } from '../models/index.js';
import crypto from 'crypto';

async function seed() {
    console.log("Starting seed process...");
    
    // Find the first agent user
    const agents = await UserModel.find({ role: 'agent' });
    if (!agents || agents.length === 0) {
        console.error("No agent found in database.");
        process.exit(1);
    }
    
    // Use the first agent
    const agent = agents[0];
    const agentId = agent.id || agent._id;
    console.log(`Found agent: ${agent.fullName} (${agentId})`);

    // 1. Seed History Apps
    const app1Id = `APP-${crypto.randomUUID().substring(0,6)}`;
    const app2Id = `APP-${crypto.randomUUID().substring(0,6)}`;
    
    await ApplicationModel.create({
        id: app1Id,
        schemeName: "PM Kisan Samman Nidhi",
        agentId: agentId,
        status: "approved",
        paymentStatus: "paid",
        formData: { fullName: "Ramesh Kumar", state: "Maharashtra", phone: "9876543210" },
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    });

    await ApplicationModel.create({
        id: app2Id,
        schemeName: "Atal Pension Yojana",
        agentId: agentId,
        status: "rejected",
        paymentStatus: "paid",
        formData: { fullName: "Sunita Sharma", state: "Delhi", phone: "9123456780" },
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
    });
    console.log("Seeded Application History.");

    // 2. Seed Transactions (Commissions)
    await TransactionModel.create({
        id: crypto.randomUUID(),
        agentId: agentId,
        type: 'credit',
        amount: 15000, // ₹150
        description: "Commission for PM Kisan application",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    });
    await TransactionModel.create({
        id: crypto.randomUUID(),
        agentId: agentId,
        type: 'credit',
        amount: 15000, // ₹150
        description: "Commission for Atal Pension application",
        status: "completed",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    });
    console.log("Seeded Transactions.");

    // 3. Seed Subscription Purchase
    await SubscriptionPaymentModel.create({
        id: crypto.randomUUID(),
        agentId: agentId,
        planKey: "professional",
        amount: 199900, // ₹1999
        status: "paid",
        orderId: `ORDER-${crypto.randomUUID().substring(0,6)}`,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString() // 30 days ago
    });
    console.log("Seeded Subscription Payments.");

    // 4. Seed Withdrawal
    await WithdrawalModel.create({
        id: crypto.randomUUID(),
        agentId: agentId,
        amount: 50000, // ₹500
        method: "UPI",
        status: "paid",
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
    });
    await WithdrawalModel.create({
        id: crypto.randomUUID(),
        agentId: agentId,
        amount: 30000, // ₹300
        method: "Bank Transfer",
        status: "pending",
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    });
    console.log("Seeded Withdrawals.");

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(console.error);
