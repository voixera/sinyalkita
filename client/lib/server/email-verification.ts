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

type VerificationRecord = {
  id: string;
  storage: "emailVerification" | "passwordReset";
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

  try {
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
  } catch (error) {
    if (isMissingEmailVerificationStorage(error) && purpose === "PROFILE_EMAIL_CHANGE" && userId) {
      await issueProfileEmailChangeFallbackCode({
        userId,
        targetEmail: normalizedTargetEmail,
        sendTo: normalizedSendTo,
        name,
        code,
        title,
        intro,
        note,
        expiresAt
      });
    } else {
      throw error;
    }
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
  const normalizedTargetEmail = normalizeEmail(targetEmail);
  let record;

  try {
    record = await prisma.emailVerificationCode.findFirst({
      where: {
        ...identityWhere,
        targetEmail: normalizedTargetEmail,
        ...(currentEmail ? { currentEmail: normalizeEmail(currentEmail) } : {}),
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    if (isMissingEmailVerificationStorage(error) && purpose === "PROFILE_EMAIL_CHANGE" && userId) {
      return validateProfileEmailChangeFallbackCode({
        userId,
        targetEmail: normalizedTargetEmail,
        code
      });
    }

    throw error;
  }

  if (!record) return null;

  const valid = await bcrypt.compare(code, record.codeHash);
  return valid ? ({ id: record.id, storage: "emailVerification" } satisfies VerificationRecord) : null;
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

async function issueProfileEmailChangeFallbackCode({
  userId,
  targetEmail,
  sendTo,
  name,
  code,
  title,
  intro,
  note,
  expiresAt
}: {
  userId: string;
  targetEmail: string;
  sendTo: string;
  name: string;
  code: string;
  title: string;
  intro: string;
  note: string;
  expiresAt: Date;
}) {
  const codeHash = await bcrypt.hash(createFallbackCodeSecret(code, targetEmail), 10);
  const now = new Date();

  await prisma.passwordResetCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now }
  });

  const created = await prisma.passwordResetCode.create({
    data: {
      userId,
      codeHash,
      expiresAt
    }
  });

  try {
    await sendEmailVerificationEmail({
      to: sendTo,
      name,
      code,
      expiresInMinutes: EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
      title,
      intro,
      note
    });
  } catch (error) {
    await prisma.passwordResetCode
      .update({ where: { id: created.id }, data: { usedAt: new Date() } })
      .catch(() => undefined);
    throw error;
  }
}

async function validateProfileEmailChangeFallbackCode({
  userId,
  targetEmail,
  code
}: {
  userId: string;
  targetEmail: string;
  code: string;
}) {
  const record = await prisma.passwordResetCode.findFirst({
    where: {
      userId,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) return null;

  const valid = await bcrypt.compare(createFallbackCodeSecret(code, targetEmail), record.codeHash);
  return valid ? ({ id: record.id, storage: "passwordReset" } satisfies VerificationRecord) : null;
}

function createFallbackCodeSecret(code: string, targetEmail: string) {
  return `${code}:${normalizeEmail(targetEmail)}`;
}

function isMissingEmailVerificationStorage(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    (message.includes("EmailVerificationCode") && (message.includes("does not exist") || message.includes("column")))
  );
}
