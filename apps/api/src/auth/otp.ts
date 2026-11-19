import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { maskMobile, type OtpRequestedDTO } from '@torbat/contracts';
import { toLatinDigits } from '@torbat/i18n';
import type { AppContext } from '../context';
import { otpChallenges } from '../db/schema';
import { AppError, badRequest } from '../lib/errors';
import { hmac, randomDigits, safeEqual } from '../lib/crypto';
import type { SessionKind } from './sessions';
export const OTP_LENGTH = 5;
export const OTP_TTL_SEC = 120;
export const OTP_RESEND_SEC = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 6;
const codeHash = (secret: string, mobile: string, purpose: SessionKind, code: string) => hmac(secret, `${purpose}:${mobile}:${code}`);
/**
 * Issue a one-time code. The response is identical whether or not an account exists,
 * so the endpoint cannot be used to enumerate registered numbers.
 */
export async function issueOtp(ctx: AppContext, mobile: string, purpose: SessionKind, log: {
    info: (o: object, m: string) => void;
}): Promise<OtpRequestedDTO> {
    const { db, env } = ctx;
    if (!env.otpDevEcho) {
        // No SMS provider is integrated yet (phase 3). Refuse honestly instead of pretending to send.
        throw new AppError(503, 'SMS_NOT_CONFIGURED', 'ارسال پیامک هنوز راه‌اندازی نشده است.');
    }
    const [last] = await db
        .select({ createdAt: otpChallenges.createdAt })
        .from(otpChallenges)
        .where(and(eq(otpChallenges.mobile, mobile), eq(otpChallenges.purpose, purpose)))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);
    if (last) {
        const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
        if (elapsed < OTP_RESEND_SEC) {
            throw new AppError(429, 'OTP_RESEND_TOO_SOON', `برای دریافت کد جدید ${Math.ceil(OTP_RESEND_SEC - elapsed)} ثانیه صبر کنید.`);
        }
    }
    const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number> `count(*)::int` })
        .from(otpChallenges)
        .where(and(eq(otpChallenges.mobile, mobile), gt(otpChallenges.createdAt, new Date(Date.now() - 3600000))));
    if (count >= OTP_MAX_PER_HOUR) {
        throw new AppError(429, 'OTP_HOURLY_LIMIT', 'تعداد درخواست کد برای این شماره زیاد بوده است. یک ساعت دیگر تلاش کنید.');
    }
    const code = randomDigits(OTP_LENGTH);
    await db.insert(otpChallenges).values({
        mobile,
        purpose,
        codeHash: codeHash(env.SESSION_SECRET, mobile, purpose, code),
        expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
    });
    log.info({ mobile: maskMobile(mobile), purpose }, 'otp issued (dev echo, no SMS sent)');
    return {
        ok: true,
        expiresInSec: OTP_TTL_SEC,
        resendInSec: OTP_RESEND_SEC,
        ...(env.otpDevEcho ? { devCode: code } : {}),
    };
}
/** Verify and consume a code. Throws an AppError with a user-friendly message on failure. */
export async function verifyOtp(ctx: AppContext, mobile: string, rawCode: string, purpose: SessionKind) {
    const { db, env } = ctx;
    const code = toLatinDigits(rawCode).replace(/\D/g, '');
    const [challenge] = await db
        .select()
        .from(otpChallenges)
        .where(and(eq(otpChallenges.mobile, mobile), eq(otpChallenges.purpose, purpose), isNull(otpChallenges.consumedAt), gt(otpChallenges.expiresAt, new Date())))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);
    if (!challenge)
        throw badRequest('OTP_EXPIRED', 'کد منقضی شده است. کد جدید بگیرید.');
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        throw new AppError(429, 'OTP_LOCKED', 'تعداد تلاش‌ها زیاد بود. کد جدید بگیرید.');
    }
    const ok = code.length === OTP_LENGTH && safeEqual(codeHash(env.SESSION_SECRET, mobile, purpose, code), challenge.codeHash);
    if (!ok) {
        await db
            .update(otpChallenges)
            .set({ attempts: sql `${otpChallenges.attempts} + 1` })
            .where(eq(otpChallenges.id, challenge.id));
        const left = OTP_MAX_ATTEMPTS - challenge.attempts - 1;
        throw badRequest('OTP_INVALID', left > 0 ? `کد درست نیست. ${left} بار دیگر می‌توانید تلاش کنید.` : 'کد درست نیست. کد جدید بگیرید.');
    }
    // Atomic consume: a concurrent verify of the same code cannot succeed twice.
    const consumed = await db
        .update(otpChallenges)
        .set({ consumedAt: new Date() })
        .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt)))
        .returning({ id: otpChallenges.id });
    if (consumed.length === 0)
        throw badRequest('OTP_EXPIRED', 'کد قبلاً استفاده شده است. کد جدید بگیرید.');
}
