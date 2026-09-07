import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Sample Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'techcorp' },
    update: {},
    create: {
      name: 'TechCorp Global',
      slug: 'techcorp'
    }
  });
  console.log(`✅ Created Organization: ${org.name} (${org.id})`);

  // 2. Hash Development Passwords (12 Salt Rounds)
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 12);
  const recruiterPasswordHash = await bcrypt.hash('RecruiterPassword123!', 12);

  // 3. Create Sample Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@techcorp.com' },
    update: {},
    create: {
      email: 'admin@techcorp.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      role: UserRole.ADMIN,
      organizationId: org.id
    }
  });
  console.log(`✅ Created Admin User: ${admin.email} (Role: ${admin.role})`);

  // 4. Create Sample Recruiter User
  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@techcorp.com' },
    update: {},
    create: {
      email: 'recruiter@techcorp.com',
      passwordHash: recruiterPasswordHash,
      name: 'Jane Recruiter',
      role: UserRole.RECRUITER,
      organizationId: org.id
    }
  });
  console.log(`✅ Created Recruiter User: ${recruiter.email} (Role: ${recruiter.role})`);

  // 5. Create Sample Job Role
  const jobRole = await prisma.jobRole.create({
    data: {
      title: 'Senior Backend Engineer L4',
      department: 'Core Infrastructure',
      targetLevel: 'L4',
      requiredSkills: ['Node.js', 'PostgreSQL', 'System Design', 'Distributed Systems'],
      organizationId: org.id
    }
  });
  console.log(`✅ Created Job Role: ${jobRole.title} (${jobRole.id})`);

  // 6. Create Sample Interview Template
  const template = await prisma.interviewTemplate.create({
    data: {
      title: 'Backend L4 Technical Interview',
      targetDifficulty: 2,
      durationMinutes: 30,
      rubricWeights: {
        technicalDepth: 35,
        problemSolving: 25,
        practicalExp: 20,
        communication: 20
      },
      organizationId: org.id,
      jobRoleId: jobRole.id
    }
  });
  console.log(`✅ Created Interview Template: ${template.title} (${template.id})`);

  // 7. Create Sample Candidate Invite
  const invite = await prisma.candidateInvite.create({
    data: {
      email: 'candidate.alex@example.com',
      candidateName: 'Alex Chen',
      inviteToken: 'dev-sample-invite-token-12345',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      interviewTemplateId: template.id
    }
  });
  console.log(`✅ Created Sample Candidate Invite: ${invite.candidateName} (Token: ${invite.inviteToken})`);

  console.log('\n======================================================');
  console.log('🎉 Seed completed successfully!');
  console.log('DEVELOPMENT CREDENTIALS:');
  console.log('  Admin User:     admin@techcorp.com / AdminPassword123!');
  console.log('  Recruiter User: recruiter@techcorp.com / RecruiterPassword123!');
  console.log('  Invite Token:   dev-sample-invite-token-12345');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
