
export type Role = 'Admin' | 'Manager' | 'Agent';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Tier {
  id: string;
  name: string;
  rankLevel: number;
  rankLabel: string; // Entry, Mid, Senior, Elite
  commissionPct: number;
  productLimit: number;
  productLimitLabel: string; // Few Products, More Products, etc.
  upgradeTargetLabel: string; // Monthly sales target, Retention metrics, etc.
  upgradeCriteria: {
    leadsTarget: number;
    closedTarget: number;
    revenueTarget: number;
    activityScoreTarget: number;
    conversionRateTarget: number;
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
  companyName?: string;
  businessCountry: string;
  businessRegion: string;
  estimatedBudget: number;
  productId: string;
  status: LeadStatus;
  firstContactChannel: string;
  firstContactSubchannel: string;
  createdAt: string;
  lastActivityAt: string;
  wonAt?: string;
  firstResponseAt?: string;
  contractSignedAt?: string;
}

export type ActivityType = 
  | 'Call made' 
  | 'Intro meeting' 
  | 'Follow up' 
  | 'Proposal send' 
  | 'Demo done' 
  | 'Presentation done' 
  | 'Negotiation' 
  | 'Quotation shared' 
  | 'Contract send' 
  | 'Invoice send' 
  | 'Closed won' 
  | 'Closed lost';

export interface Product {
  id: string;
  name: string;
  description: string;
  commissionStructure: Record<string, any>;
  tierRequired: string;
  resources: {
    scripts: any[];
    docs: any[];
    videos: any[];
    manuals: any[];
    faqs: any[];
  };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  agentId: string;
  agentName?: string;
  type: ActivityType;
  scheduledAt: string;
  nextActionType: string;
  nextActionDate: string;
  remark: string;
  outcomeStatus: string;
  createdAt: string;
  fileUrl?: string;
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
  clientName?: string;
  amount: number;
  dealAmount: number;
  commissionPct: number;
  status: 'pending' | 'approved';
  triggerType: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  agentId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: string;
}
