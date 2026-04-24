export type Role = 'Admin' | 'Manager' | 'Agent';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Tier {
  id: string;
  name: string;
  rank_level: number;
  commission_pct: number;
  product_limit: number;
  upgrade_criteria: {
    leads_target: number;
    closed_target: number;
    revenue_target: number;
  };
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  region: string;
  status: UserStatus;
  join_date: string;
  manager_id: string | null;
  tier_id: string;
  role: Role;
}

export interface Wallet {
  id: string;
  agent_id: string;
  total_earned: number;
  pending: number;
  withdrawable: number;
  withdrawn: number;
  balance: number;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'dormant';

export interface Lead {
  id: string;
  agent_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  business_country: string;
  business_region: string;
  estimated_budget: number;
  product_id: string;
  status: LeadStatus;
  first_contact_channel: string;
  first_contact_subchannel: string;
  created_at: string;
  last_activity_at: string;
  won_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  commission_structure: any;
  tier_required: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  agent_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'proposal' | 'whatsapp';
  scheduled_at: string;
  next_action_type: string;
  next_action_date: string;
  remark: string;
  file_url?: string;
  outcome_status: string;
  created_at: string;
}

export interface Target {
  id: string;
  agent_id: string;
  month: string;
  leads_target: number;
  qualified_target: number;
  closed_target: number;
  revenue_target: number;
  activity_score_target: number;
}

export interface TargetProgress {
  id: string;
  target_id: string;
  leads_created: number;
  qualified_count: number;
  closed_count: number;
  revenue: number;
  activity_score: number;
  evaluated_at: string;
}

export interface Commission {
  id: string;
  agent_id: string;
  lead_id: string;
  amount: number;
  tier_pct: number;
  trigger_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Withdrawal {
  id: string;
  agent_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}
