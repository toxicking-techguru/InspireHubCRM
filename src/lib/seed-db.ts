import { Firestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { TIERS, PRODUCTS, AGENTS, LEADS } from './mock-data';

export async function seedDatabase(db: Firestore) {
  console.log('Starting database seed...');

  // Seed Tiers
  for (const tier of TIERS) {
    await setDoc(doc(db, 'tiers', tier.id), {
      name: tier.name,
      rankLevel: tier.rank_level,
      commissionPct: tier.commission_pct,
      productLimit: tier.product_limit,
      upgradeCriteria: tier.upgrade_criteria
    });
  }

  // Seed Products
  for (const product of PRODUCTS) {
    await setDoc(doc(db, 'products', product.id), {
      name: product.name,
      description: product.description,
      commissionStructure: product.commission_structure,
      tierRequired: product.tier_required
    });
  }

  // Seed Agents
  // Note: For real auth users, IDs should match Firebase Auth UIDs. 
  // This seed sets up the data records.
  for (const agent of AGENTS) {
    await setDoc(doc(db, 'agents', agent.id), {
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      region: agent.region,
      status: agent.status,
      role: agent.role,
      tierId: agent.tier_id,
      managerId: agent.manager_id,
      joinDate: agent.join_date
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
    // Remap snake_case from mock to camelCase for DB
    const formattedLead = {
      agentId: lead.agent_id,
      clientName: lead.client_name,
      clientEmail: lead.client_email,
      clientPhone: lead.client_phone,
      businessCountry: lead.business_country,
      businessRegion: lead.business_region,
      estimatedBudget: lead.estimated_budget,
      productId: lead.product_id,
      status: lead.status,
      firstContactChannel: lead.first_contact_channel,
      firstContactSubchannel: lead.first_contact_subchannel,
      createdAt: lead.created_at,
      lastActivityAt: lead.last_activity_at
    };
    await setDoc(doc(db, 'leads', id), formattedLead);
  }

  console.log('Seeding complete!');
}
