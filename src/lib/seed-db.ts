import { Firestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { TIERS, PRODUCTS, AGENTS, LEADS } from './mock-data';

export async function seedDatabase(db: Firestore) {
  console.log('Starting database seed...');

  // Seed Tiers - Fixed mapping from mock-data (camelCase)
  for (const tier of TIERS) {
    await setDoc(doc(db, 'tiers', tier.id), {
      name: tier.name,
      rankLevel: tier.rankLevel,
      rankLabel: tier.rankLabel,
      commissionPct: tier.commissionPct,
      productLimit: tier.productLimit,
      productLimitLabel: tier.productLimitLabel,
      upgradeTargetLabel: tier.upgradeTargetLabel,
      upgradeCriteria: tier.upgradeCriteria
    });
  }

  // Seed Products
  for (const product of PRODUCTS) {
    await setDoc(doc(db, 'products', product.id), {
      name: product.name,
      description: product.description,
      commissionStructure: product.commissionStructure,
      tierRequired: product.tierRequired,
      status: 'active',
      resources: { scripts: [], docs: [], videos: [], manuals: [], faqs: [] }
    });
  }

  // Seed Agents
  for (const agent of AGENTS) {
    await setDoc(doc(db, 'agents', agent.id), {
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      region: agent.region,
      status: agent.status,
      role: agent.role,
      tierId: agent.tierId,
      managerId: agent.managerId,
      joinDate: agent.joinDate || new Date().toISOString()
    });

    // Create initial wallet
    await setDoc(doc(db, 'wallets', agent.id), {
      agentId: agent.id,
      totalEarned: Math.floor(Math.random() * 5000),
      pending: Math.floor(Math.random() * 1000),
      withdrawable: Math.floor(Math.random() * 2000),
      withdrawn: Math.floor(Math.random() * 500)
    });
  }

  // Seed Leads
  for (const lead of LEADS) {
    const { id, ...leadData } = lead;
    await setDoc(doc(db, 'leads', id), {
      ...leadData,
      createdAt: leadData.createdAt || new Date().toISOString(),
      lastActivityAt: leadData.lastActivityAt || new Date().toISOString()
    });
  }

  console.log('Seeding complete!');
}
