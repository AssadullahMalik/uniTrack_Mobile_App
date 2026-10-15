import crypto from "crypto";

type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

// In‑memory OTP store keyed by identifier (e.g. email or phone)
const otpStore = new Map<string, OtpRecord>();

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

function generateNumericOtp(length: number): string {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max).toString().padStart(length, "0");
  return code;
}

export function requestOtp(identifier: string) {
  const now = Date.now();
  const existing = otpStore.get(identifier);

  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const retryAfterMs = RESEND_COOLDOWN_MS - (now - existing.lastSentAt);
    return {
      success: false as const,
      reason: "cooldown",
      retryAfterMs,
    };
  }

  const code = generateNumericOtp(OTP_LENGTH);
  const record: OtpRecord = {
    code,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  };

  otpStore.set(identifier, record);

  // For now we don't integrate with an external email/SMS provider.
  // Log the OTP to the server console so it can be tested easily.
  // In production, replace this with a call to your email/SMS service.
  // eslint-disable-next-line no-console
  console.log(`OTP for ${identifier}: ${code}`);

  return {
    success: true as const,
    expiresInMs: OTP_TTL_MS,
  };
}

export function verifyOtp(identifier: string, code: string) {
  const record = otpStore.get(identifier);
  const now = Date.now();

  if (!record) {
    return {
      success: false as const,
      reason: "not_found" as const,
    };
  }

  if (now > record.expiresAt) {
    otpStore.delete(identifier);
    return {
      success: false as const,
      reason: "expired" as const,
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(identifier);
    return {
      success: false as const,
      reason: "too_many_attempts" as const,
    };
  }

  record.attempts += 1;

  if (record.code !== code) {
    otpStore.set(identifier, record);
    return {
      success: false as const,
      reason: "invalid_code" as const,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
    };
  }

  // Successful verification – consume OTP
  otpStore.delete(identifier);

  return {
    success: true as const,
  };
}
