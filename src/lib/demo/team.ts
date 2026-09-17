import type { MemberStatus, Role } from '@/lib/types'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  status: MemberStatus
  lastActive: string
}

export const demoMembers: TeamMember[] = [
  {
    id: 'm-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@labelmaster.io',
    role: 'owner',
    status: 'active',
    lastActive: 'Just now',
  },
  {
    id: 'm-2',
    name: 'David Miller',
    email: 'david.miller@company.com',
    role: 'admin',
    status: 'active',
    lastActive: '22 mins ago',
  },
  {
    id: 'm-3',
    name: 'Priya Sharma',
    email: 'p.sharma@logistics.net',
    role: 'admin',
    status: 'active',
    lastActive: '3 hours ago',
  },
  {
    id: 'm-4',
    name: 'Marcus Vance',
    email: 'marcus.v@acmelogistics.com',
    role: 'staff',
    status: 'active',
    lastActive: 'Yesterday',
  },
  {
    id: 'm-5',
    name: 'Liam Chen',
    email: 'liam.chen@dispatch.co',
    role: 'staff',
    status: 'active',
    lastActive: '4 days ago',
  },
  {
    id: 'm-6',
    name: 'Alex Morgan',
    email: 'alex.morgan@company.com',
    role: 'staff',
    status: 'invited',
    lastActive: 'Pending join',
  },
  {
    id: 'm-7',
    name: 'Jordan Taylor',
    email: 'j.taylor@company.com',
    role: 'staff',
    status: 'invited',
    lastActive: 'Pending join',
  },
  {
    id: 'm-8',
    name: 'Elena Rostova',
    email: 'elena.r@transithub.org',
    role: 'staff',
    status: 'suspended',
    lastActive: 'Oct 14, 2026',
  },
]
