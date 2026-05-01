
export type Role = 'Admin' | 'Manager' | 'Agent';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type LeadType = 'lead' | 'partner';

export interface Tier {
  id: string;
  name: string;
  rankLevel: number;
  rankLabel: string;
  commissionPct: number;
  productLimit: number;
  productLimitLabel: string;
  upgradeTargetLabel: string;
  upgradeCriteria: {
    leadsTarget: number;
    closedTarget: number;
    revenueTarget: number;
    activityScoreTarget: number;
    conversionRateTarget: number;
  };
}

export interface AgentPaymentDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentMethod: string;
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
  paymentDetails?: AgentPaymentDetails;
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

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  timestamp: string;
}

export interface LeadDoc {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  agentId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  companyName?: string;
  industry?: string;
  businessCountry: string;
  businessCounty?: string;
  businessRegion: string;
  estimatedBudget: number;
  productId: string;
  status: LeadStatus;
  type: LeadType;
  firstContactChannel: string;
  firstContactSubchannel: string;
  createdAt: string;
  lastActivityAt: string;
  wonAt?: string;
  firstResponseAt?: string;
  clientBrief?: string;
  painPoints?: string;
  serviceOffering?: string;
  location?: GeoLocation;
  documents?: LeadDoc[];
}

export type ActivityType = 
  | 'Call made' | 'Intro meeting' | 'Follow up' | 'Proposal send' | 'Demo done' 
  | 'Presentation done' | 'Negotiation' | 'Quotation shared' | 'Contract send' 
  | 'Invoice send' | 'Closed won' | 'Closed lost' | 'Outreach' | 'Site visit';

export interface LeadActivity {
  id: string;
  leadId: string;
  clientName?: string;
  agentId: string;
  agentName?: string;
  type: ActivityType;
  remark: string;
  dateDone?: string;
  nextActionType?: string;
  nextActionDate?: string;
  outcomeStatus: string;
  createdAt: string;
  location?: GeoLocation;
}

export interface UserNote {
  id: string;
  agentId: string;
  content: string;
  reminderAt?: string;
  createdAt: string;
  isPinned: boolean;
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
  bankDetails?: AgentPaymentDetails;
}
