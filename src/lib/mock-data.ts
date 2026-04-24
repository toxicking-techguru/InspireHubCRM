
import { Tier, Agent, Product, Lead, LeadActivity, Wallet, Target } from '@/types/crm';

export const TIERS: Tier[] = [
  { id: 't1', name: 'Silver', rank_level: 1, commission_pct: 5, product_limit: 5, upgrade_criteria: { leads_target: 10, closed_target: 2, revenue_target: 5000 } },
  { id: 't2', name: 'Gold', rank_level: 2, commission_pct: 8, product_limit: 10, upgrade_criteria: { leads_target: 20, closed_target: 5, revenue_target: 15000 } },
  { id: 't3', name: 'Diamond', rank_level: 3, commission_pct: 12, product_limit: 20, upgrade_criteria: { leads_target: 50, closed_target: 10, revenue_target: 40000 } },
  { id: 't4', name: 'Platinum', rank_level: 4, commission_pct: 15, product_limit: 99, upgrade_criteria: { leads_target: 100, closed_target: 25, revenue_target: 100000 } },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Premium Cloud Host', description: 'Enterprise-grade cloud hosting solutions', commission_structure: {}, tier_required: 't1' },
  { id: 'p2', name: 'Nexus ERP Suite', description: 'Integrated resource planning for SMEs', commission_structure: {}, tier_required: 't2' },
  { id: 'p3', name: 'DataSecure Firewall', description: 'Next-gen security for corporate networks', commission_structure: {}, tier_required: 't1' },
  { id: 'p4', name: 'Al-Powered Analytics', description: 'Predictive modeling and reporting tools', commission_structure: {}, tier_required: 't3' },
  { id: 'p5', name: 'Edge Gateway X', description: 'IoT connectivity and edge computing', commission_structure: {}, tier_required: 't2' },
];

export const AGENTS: Agent[] = [
  { id: 'a1', name: 'John Doe', email: 'agent@nexus.com', phone: '+123456789', region: 'North', status: 'active', join_date: '2024-01-15', tier_id: 't2', manager_id: 'm1', role: 'Agent' },
  { id: 'a2', name: 'Sarah Smith', email: 'sarah@nexus.com', phone: '+123456780', region: 'South', status: 'active', join_date: '2023-11-20', tier_id: 't3', manager_id: 'm1', role: 'Agent' },
  { id: 'm1', name: 'Robert King', email: 'manager@nexus.com', phone: '+123456700', region: 'Global', status: 'active', join_date: '2023-01-01', tier_id: 't4', manager_id: null, role: 'Manager' },
  { id: 'adm', name: 'Admin Nexus', email: 'admin@nexus.com', phone: '+000000000', region: 'Global', status: 'active', join_date: '2022-12-01', tier_id: 't4', manager_id: null, role: 'Admin' },
];

export const LEADS: Lead[] = [
  { id: 'l1', agent_id: 'a1', client_name: 'TechFlow Inc.', client_email: 'contact@techflow.io', client_phone: '555-0101', business_country: 'USA', business_region: 'West', estimated_budget: 12000, product_id: 'p2', status: 'qualified', first_contact_channel: 'LinkedIn', first_contact_subchannel: 'InMail', created_at: '2024-03-01T10:00:00Z', last_activity_at: '2024-03-05T14:30:00Z' },
  { id: 'l2', agent_id: 'a1', client_name: 'Green Energy Ltd', client_email: 'info@greenenergy.com', client_phone: '555-0202', business_country: 'Germany', business_region: 'EU', estimated_budget: 25000, product_id: 'p1', status: 'proposal', first_contact_channel: 'Social media', first_contact_subchannel: 'Facebook', created_at: '2024-02-15T09:00:00Z', last_activity_at: '2024-03-04T11:20:00Z' },
  { id: 'l3', agent_id: 'a2', client_name: 'Global Logistics', client_email: 'ops@globallog.net', client_phone: '555-0303', business_country: 'Singapore', business_region: 'APAC', estimated_budget: 45000, product_id: 'p4', status: 'won', first_contact_channel: 'Referral', first_contact_subchannel: 'Partner', created_at: '2024-01-10T08:30:00Z', last_activity_at: '2024-02-28T16:45:00Z', won_at: '2024-02-28T16:45:00Z' },
  { id: 'l4', agent_id: 'a1', client_name: 'StartupX', client_email: 'ceo@startupx.co', client_phone: '555-0404', business_country: 'UK', business_region: 'EMEA', estimated_budget: 5000, product_id: 'p3', status: 'new', first_contact_channel: 'Website Inquiry', first_contact_subchannel: 'Contact Form', created_at: '2024-03-06T15:00:00Z', last_activity_at: '2024-03-06T15:00:00Z' },
];

export const ACTIVITIES: LeadActivity[] = [
  { id: 'ac1', lead_id: 'l1', agent_id: 'a1', type: 'Call made', scheduled_at: '2024-03-02T10:00:00Z', nextActionType: 'Intro meeting', nextActionDate: '2024-03-05', remark: 'Initial discovery call. Client interested in ERP module.', outcomeStatus: 'positive', createdAt: '2024-03-02T10:30:00Z' },
];

export const WALLETS: Wallet[] = [
  { id: 'w1', agent_id: 'a1', total_earned: 4500, pending: 1200, withdrawable: 3000, withdrawn: 300 },
];
