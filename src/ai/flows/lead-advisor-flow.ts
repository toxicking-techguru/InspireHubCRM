'use server';
/**
 * @fileOverview AI Lead Advisor Flow
 * Analyzes lead data to suggest sales strategies.
 */

import { ai, z } from '@/ai/genkit';

const LeadAdvisorInputSchema = z.object({
  clientName: z.string(),
  clientBrief: z.string().optional(),
  painPoints: z.string().optional(),
  serviceOffering: z.string().optional(),
});

const LeadAdvisorOutputSchema = z.object({
  strategicSummary: z.string().describe('A concise analysis of the opportunity.'),
  suggestedNextStep: z.string().describe('The immediate next action the agent should take.'),
  keyTalkingPoints: z.array(z.string()).describe('3-4 specific points to mention in the next interaction.'),
});

export async function getLeadAdvice(input: z.infer<typeof LeadAdvisorInputSchema>) {
  return leadAdvisorFlow(input);
}

const leadAdvisorPrompt = ai.definePrompt({
  name: 'leadAdvisorPrompt',
  input: { schema: LeadAdvisorInputSchema },
  output: { schema: LeadAdvisorOutputSchema },
  prompt: `You are a high-performance CRM sales strategist. 
Analyze the following lead information for "{{{clientName}}}":

Client Brief: {{{clientBrief}}}
Pain Points: {{{painPoints}}}
Our Proposed Offering: {{{serviceOffering}}}

Provide a strategic summary, a clear next step, and 3-4 powerful talking points that align our solution with their specific pain points. 
Be professional, encouraging, and focused on closing the deal.`,
});

const leadAdvisorFlow = ai.defineFlow(
  {
    name: 'leadAdvisorFlow',
    inputSchema: LeadAdvisorInputSchema,
    outputSchema: LeadAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await leadAdvisorPrompt(input);
    if (!output) throw new Error('Failed to generate advice');
    return output;
  }
);
