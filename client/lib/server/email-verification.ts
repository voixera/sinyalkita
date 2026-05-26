import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { sendEmailVerificationEmail } from "@/lib/server/mail";

export const EMAIL_VERIFICATION_EXPIRES_IN_MINUTES = 15;

type VerificationPurpose = "PROFILE_EMAIL_CHANGE" | "CUSTOMER_EMAIL_LINK";

type IssueEmailVerificationCode = {
  userId?: string;
  targetEmail: string;
  currentEmail?: string;
  sendTo: string;
  name: string;
  purpose: VerificationPurpose;
  title: string;
  intro: string;
  note: string;
};

type ValidateEmailVerificationCode = {
  userId?: string;
  targetEmail: string;
  currentEmail?: string;
  purpose: VerificationPurpose;
  code: string;
};

export async function issueEmailVerificationCode({
  userId,
  targetEmail,
  currentEmail,
  sendTo,
  name,
  purpose,
  title,
  intro,
  note
}: IssueEmailVerificationCode) {
  const normalizedTargetEmail = normalizeEmail(targetEmail);
  const normalizedCurrentEmail = currentEmail ? normalizeEmail(currentEmail) : null;
  const normalizedSendTo = normalizeEmail(sendTo);
  const code = createVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_EXPIRES_IN_MINUTES * 60 * 1000);
  const identityWhere = userId ? { userId } : { userId: null };

  await prisma.emailVerificationCode.updateMany({
    where: {
      ...identityWhere,
      targetEmail: normalizedTargetEmail,
      purpose,
      usedAt: null
    },
    data: { usedAt: now }
  });

  const created = await prisma.emailVerificationCode.create({
    data: {
      userId: userId || null,
      targetEmail: normalizedTargetEmail,
      currentEmail: normalizedCurrentEmail,
      codeHash,
      purpose,
      expiresAt
    }
  });

  try {
    await sendEmailVerificationEmail({
      to: normalizedSendTo,
      name,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
      title,
      intro,
      note
    });
  } catch (error) {
    await prisma.emailVerificationCode
      .update({ where: { id: created.id }, data: { usedAt: new Date() } })
      .catch(() => undefined);
    throw error;
  }

  return {
    email: maskEmail(normalizedSendTo),
    expiresInMinutes: EMAIL_VERIFICATION_EXPIRES_IN_MINUTES
  };
}

export async function validateEmailVerificationCode({
  userId,
  targetEmail,
  currentEmail,
  purpose,
  code
}: ValidateEmailVerificationCode) {
  const identityWhere = userId ? { userId } : { userId: null };
  const record = await prisma.emailVerificationCode.findFirst({
    where: {
      ...identityWhere,
      targetEmail: normalizeEmail(targetEmail),
      ...(currentEmail ? { currentEmail: normalizeEmail(currentEmail) } : {}),
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) return null;

  const valid = await bcrypt.compare(code, record.codeHash);
  return valid ? record : null;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 3))}@${domain}`;
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
