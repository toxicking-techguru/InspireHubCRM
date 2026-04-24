
export type Role = 'Admin' | 'Manager' | 'Agent';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Tier {
  id: string;
  name: string;
  rankLevel: number;
  commissionPct: number;
  productLimit: number;
  upgradeCriteria: {
    leadsTarget: number;
    closedTarget: number;
    revenueTarget: number;
  };
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  region: string;
  status: UserStatus;
  joinDate: string;
  managerId: string | null;
  tierId: string;
  role: Role;
}

export interface Wallet {
  id: string;
  agentId: string;
  totalEarned: number;
  pending: number;
  withdrawable: number;
  withdrawn: number;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'dormant';

export interface Lead {
  id: string;
  agentId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  businessCountry: string;
  businessRegion: string;
  estimatedBudget: number;
  productId: string;
  status: LeadStatus;
  firstContactChannel: string;
  firstContactSubchannel: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  commissionStructure: any;
  tierRequired: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  agentId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'proposal' | 'whatsapp';
  scheduledAt: string;
  nextActionType: string;
  nextActionDate: string;
  remark: string;
  outcomeStatus: string;
  createdAt: string;
}

export interface Target {
  id: string;
  agentId: string;
  month: string;
  leadsTarget: number;
  qualifiedTarget: number;
  closedTarget: number;
  revenueTarget: number;
  activityScoreTarget: number;
}

export interface Commission {
  id: string;
  agentId: string;
  leadId: string;
  amount: number;
  status: 'pending' | 'approved';
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  agentId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
}
