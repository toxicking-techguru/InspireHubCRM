
export const TIERS = [
  { 
    id: 't1', 
    name: 'Silver', 
    rankLevel: 1, 
    rankLabel: 'Entry',
    commissionPct: 5, 
    productLimit: 5, 
    productLimitLabel: 'Few Products',
    upgradeTargetLabel: 'Monthly sales target',
    upgradeCriteria: { leadsTarget: 10, closedTarget: 2, revenueTarget: 5000, activityScoreTarget: 80, conversionRateTarget: 15 } 
  },
  { 
    id: 't2', 
    name: 'Gold', 
    rankLevel: 2, 
    rankLabel: 'Mid',
    commissionPct: 8, 
    productLimit: 10, 
    productLimitLabel: 'More Products',
    upgradeTargetLabel: 'Higher target',
    upgradeCriteria: { leadsTarget: 20, closedTarget: 5, revenueTarget: 15000, activityScoreTarget: 85, conversionRateTarget: 20 } 
  },
  { 
    id: 't3', 
    name: 'Diamond', 
    rankLevel: 3, 
    rankLabel: 'Senior',
    commissionPct: 12, 
    productLimit: 20, 
    productLimitLabel: 'Premium Products',
    upgradeTargetLabel: 'Strong performance',
    upgradeCriteria: { leadsTarget: 50, closedTarget: 10, revenueTarget: 40000, activityScoreTarget: 90, conversionRateTarget: 25 } 
  },
  { 
    id: 't4', 
    name: 'Platinum', 
    rankLevel: 4, 
    rankLabel: 'Elite',
    commissionPct: 15, 
    productLimit: 99, 
    productLimitLabel: 'All Products',
    upgradeTargetLabel: 'Retention metrics',
    upgradeCriteria: { leadsTarget: 100, closedTarget: 25, revenueTarget: 100000, activityScoreTarget: 95, conversionRateTarget: 30 } 
  },
];

export const PRODUCTS = [
  { id: 'p1', name: 'Premium Cloud Host', description: 'Enterprise-grade cloud hosting solutions', commissionStructure: { base: 5, bonus: 2 }, tierRequired: 't1' },
  { id: 'p2', name: 'Nexus ERP Suite', description: 'Integrated resource planning for SMEs', commissionStructure: { base: 8 }, tierRequired: 't2' },
  { id: 'p3', name: 'DataSecure Firewall', description: 'Next-gen security for corporate networks', commissionStructure: { base: 5 }, tierRequired: 't1' },
  { id: 'p4', name: 'Al-Powered Analytics', description: 'Predictive modeling and reporting tools', commissionStructure: { base: 12, milestone: 1000 }, tierRequired: 't3' },
  { id: 'p5', name: 'Edge Gateway X', description: 'IoT connectivity and edge computing', commissionStructure: { base: 8 }, tierRequired: 't2' },
];

export const AGENTS = [
  { id: 'a1', name: 'John Doe', email: 'agent@nexus.com', phone: '+123456789', region: 'North', status: 'active', joinDate: '2024-01-15', tierId: 't2', managerId: 'm1', role: 'Agent' },
  { id: 'a2', name: 'Sarah Smith', email: 'sarah@nexus.com', phone: '+123456780', region: 'South', status: 'active', joinDate: '2023-11-20', tierId: 't3', managerId: 'm1', role: 'Agent' },
  { id: 'm1', name: 'Robert King', email: 'manager@nexus.com', phone: '+123456700', region: 'Global', status: 'active', joinDate: '2023-01-01', tierId: 't4', managerId: null, role: 'Manager' },
  { id: 'adm', name: 'Admin Nexus', email: 'admin@nexus.com', phone: '+000000000', region: 'Global', status: 'active', joinDate: '2022-12-01', tierId: 't4', managerId: null, role: 'Admin' },
];

export const LEADS = [
  { id: 'l1', agentId: 'a1', clientName: 'TechFlow Inc.', clientEmail: 'contact@techflow.io', clientPhone: '555-0101', businessCountry: 'USA', businessRegion: 'West', estimatedBudget: 12000, productId: 'p2', status: 'qualified', firstContactChannel: 'LinkedIn', firstContactSubchannel: 'InMail', createdAt: '2024-03-01T10:00:00Z', lastActivityAt: '2024-03-05T14:30:00Z' },
  { id: 'l2', agentId: 'a1', clientName: 'Green Energy Ltd', clientEmail: 'info@greenenergy.com', clientPhone: '555-0202', businessCountry: 'Germany', businessRegion: 'EU', estimatedBudget: 25000, productId: 'p1', status: 'proposal', firstContactChannel: 'Social media', firstContactSubchannel: 'Facebook', createdAt: '2024-02-15T09:00:00Z', lastActivityAt: '2024-03-04T11:20:00Z' },
  { id: 'l3', agentId: 'a2', clientName: 'Global Logistics', clientEmail: 'ops@globallog.net', clientPhone: '555-0303', businessCountry: 'Singapore', businessRegion: 'APAC', estimatedBudget: 45000, productId: 'p4', status: 'won', firstContactChannel: 'Referral', firstContactSubchannel: 'Partner', createdAt: '2024-01-10T08:30:00Z', lastActivityAt: '2024-02-28T16:45:00Z', wonAt: '2024-02-28T16:45:00Z' },
  { id: 'l4', agentId: 'a1', clientName: 'StartupX', clientEmail: 'ceo@startupx.co', clientPhone: '555-0404', businessCountry: 'UK', businessRegion: 'EMEA', estimatedBudget: 5000, productId: 'p3', status: 'new', firstContactChannel: 'Website Inquiry', firstContactSubchannel: 'Contact Form', createdAt: '2024-03-06T15:00:00Z', lastActivityAt: '2024-03-06T15:00:00Z' },
];
