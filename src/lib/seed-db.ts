import { Firestore, doc, setDoc, collection, addDoc, getDocs, limit, query } from 'firebase/firestore';
import { TIERS, PRODUCTS, AGENTS, LEADS } from './mock-data';

export async function seedDatabase(db: Firestore) {
  console.log('Starting database seed...');

  // Seed Tiers
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
      companyName: leadData.clientName + " Group", // Ensure seeds have company names
      createdAt: leadData.createdAt || new Date().toISOString(),
      lastActivityAt: leadData.lastActivityAt || new Date().toISOString()
    });
  }

  // Seed Channels (Hierarchical)
  const channelsRef = collection(db, 'channels');
  const channelCheck = await getDocs(query(channelsRef, limit(1)));
  
  if (channelCheck.empty) {
    const defaultChannels = [
      { name: 'Physical visit', sub: [] },
      { name: 'Referral', sub: ['Exiting client', 'Friend', 'Consultant', 'NGO', 'Partner', 'Auditor', 'Accountant'] },
      { name: 'Social media', sub: ['TikTok', 'Facebook', 'Instagram', 'LinkedIn', 'X', 'Website Look up'] },
      { name: 'Email', sub: [] },
      { name: 'Website Inquiry', sub: [] },
      { name: 'Partnership', sub: [] },
      { name: 'Events or Expos', sub: [] },
      { name: 'Webinars', sub: [] },
      { name: 'Workshops', sub: [] },
      { name: 'Walk in', sub: [] },
      { name: 'Meeting', sub: ['First meeting', 'Follow up meeting', 'Physical meeting', 'Zoom meeting'] },
    ];

    for (const main of defaultChannels) {
      const mainId = `ch_${main.name.toLowerCase().replace(/\s/g, '_')}`;
      await setDoc(doc(db, 'channels', mainId), { name: main.name, active: true, usageCount: 0 });
      
      for (const sub of main.sub) {
        const subId = `sub_${sub.toLowerCase().replace(/\s/g, '_')}`;
        await setDoc(doc(db, 'channels', subId), { name: sub, active: true, parentId: mainId, usageCount: 0 });
      }
    }
  }

  console.log('Seeding complete!');
}
