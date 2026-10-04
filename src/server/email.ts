import nodemailer from 'nodemailer';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, STORE_CONTACT } from '@/shared';
import { logger } from './logger';

/** Public site address for links in emails. */
const siteUrl = () =>
  (
    process.env.CLIENT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
import { Resend } from 'resend';

// ─── Resend API client (HTTPS-based, works on all cloud providers) ───────────
const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

// ─── SMTP fallback (for local dev or non-cloud environments) ─────────────────
let transporterInstance: ReturnType<typeof nodemailer.createTransport> | null = null;

const createTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
  
  transporterInstance = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    socketTimeout: 15000,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
  
  return transporterInstance;
};

export const canSendEmail = (): boolean => {
  if (process.env.RESEND_API_KEY) return true;
  return Boolean((process.env.EMAIL_USER || '').trim() && (process.env.EMAIL_PASSWORD || '').trim());
};

const baseEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AZEEORA COSMETICS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a0a0f 0%, #2d1520 100%); padding: 32px 40px; text-align: center; }
    .header img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 16px; border: 3px solid #C9956A; }
    .header h1 { color: #C9956A; font-family: Georgia, serif; font-size: 26px; margin: 0 0 4px; letter-spacing: 4px; text-transform: uppercase; }
    .header p { color: #c8a0a0; font-size: 11px; margin: 0; letter-spacing: 3px; text-transform: uppercase; }
    .content { padding: 40px; }
    .content h2 { color: #0a0a0a; font-size: 22px; margin-bottom: 16px; }
    .content p { color: #555; line-height: 1.6; margin-bottom: 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #C9956A, #b8845a); color: #fff !important; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 16px 0; letter-spacing: 0.5px; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #C9956A55, transparent); margin: 24px 0; }
    .footer { background: #faf7f5; padding: 24px 40px; text-align: center; border-top: 1px solid #f0e8e0; }
    .footer p { color: #999; font-size: 12px; margin: 4px 0; }
    .footer a { color: #C9956A; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${siteUrl()}/icon.png" alt="AZEEORA COSMETICS Logo">
      <h1>AZEEORA COSMETICS</h1>
      <p>Luxury Beauty, Redefined</p>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AZEEORA COSMETICS. All rights reserved.</p>
      <p><a href="${siteUrl()}">${siteUrl().replace(/^https?:\/\//, '')}</a></p>
    </div>
  </div>
</body>
</html>
`;


const sendMail = async (
  to: string,
  subject: string,
  content: string,
  options?: { softFail?: boolean }
): Promise<void> => {
  if (!canSendEmail()) {
    logger.warn(`[EMAIL SKIPPED] ${subject} → ${to}`);
    return;
  }
  
  const sendTask = async () => {
    const resend = getResendClient();

    if (resend) {
      // ── Primary: Resend API (HTTPS, no port blocking) ──────────────────
      const fromAddress = process.env.RESEND_FROM || 'AZEEORA COSMETICS <onboarding@resend.dev>';
      const { error } = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html: baseEmailTemplate(content),
      });
      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }
      logger.info(`Email sent via Resend: ${subject} → ${to}`);
    } else {
      // ── Fallback: SMTP (for local dev) ──────────────────────────────────
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html: baseEmailTemplate(content),
      });
      logger.info(`Email sent via SMTP: ${subject} → ${to}`);
    }
  };

  try {
    if (options?.softFail === false) {
      await sendTask();
    } else {
      sendTask().catch(e => logger.error('Background email error', { error: String(e) }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Email failed: ${subject} → ${to}`, { error: message });
    if (options?.softFail === false) {
      throw error;
    }
  }
};

export const sendVerificationEmail = async (email: string, firstName: string, token: string): Promise<void> => {
  const verifyUrl = `${siteUrl()}/auth/verify-email?token=${token}`;
  await sendMail(
    email,
    'Welcome to AZEEORA COSMETICS — Verify Your Email',
    `
      <h2>Welcome, ${firstName}!</h2>
      <p>Please verify your email to activate your account.</p>
      <p style="text-align:center;"><a href="${verifyUrl}" class="btn">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p><small>${verifyUrl}</small></p>
    `,
    { softFail: false }
  );
};

export const sendOtpEmail = async (email: string, firstName: string, otp: string): Promise<void> => {
  await sendMail(
    email,
    'AZEEORA COSMETICS — Your Verification Code',
    `
      <h2>Verify Your Email</h2>
      <p>Hi ${firstName}, your verification code is:</p>
      <div style="text-align:center; margin: 24px 0;">
        <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:12px; color:#0a0a0a; background:#f5f0ed; padding:16px 32px; border-radius:12px; border:2px solid #C9956A;">${otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#999; font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
    `,
    { softFail: false }
  );
};

export const sendPasswordResetOtpEmail = async (email: string, firstName: string, otp: string): Promise<void> => {
  await sendMail(
    email,
    'AZEEORA COSMETICS — Password Reset Verification Code',
    `
      <h2>Reset Your Password</h2>
      <p>Hi ${firstName}, we received a password reset request for your account.</p>
      <p>Please enter the following 6-digit code to verify your request:</p>
      <div style="text-align:center; margin: 24px 0;">
        <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:12px; color:#0a0a0a; background:#f5f0ed; padding:16px 32px; border-radius:12px; border:2px solid #C9956A;">${otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#999; font-size:13px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    `,
    { softFail: false }
  );
};

const formatPkr = (amount: number) => `Rs.${Number(amount).toLocaleString('en-PK')}`;

const orderItemsTable = (items: Array<{ name: string; quantity: number; total: number; price: number }>) => `
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="background:#f9f9f9;">
        <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;">Product</th>
        <th style="text-align:center;padding:10px;border-bottom:1px solid #eee;">Qty</th>
        <th style="text-align:right;padding:10px;border-bottom:1px solid #eee;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;">${item.name}</td>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPkr(item.total)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
`;

export const sendOrderConfirmationEmail = async (
  email: string,
  firstName: string,
  order: {
    _id: { toString(): string } | string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; total: number; price: number }>;
    shippingAddress: {
      firstName: string;
      lastName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: string;
    subtotal: number;
    productDiscount?: number;
    shippingCost: number;
    discount: number;
    manualDiscount?: number;
    tax?: number;
    total: number;
    status: string;
    estimatedDelivery?: Date;
    createdAt?: Date;
  }
): Promise<void> => {
  const orderId = typeof order._id === 'string' ? order._id : order._id.toString();
  const trackUrl = `${siteUrl()}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(email)}`;
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const paymentLabel = PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod;
  const addr = order.shippingAddress;
  const estDelivery = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '3–7 business days';

  await sendMail(
    email,
    `AZEEORA COSMETICS — Order Confirmed #${order.orderNumber}`,
    `
      <h2>Thank you, ${firstName}!</h2>
      <p>Your order has been placed successfully. Here are your order details:</p>

      <div style="background:#faf7f5;border:1px solid #e8ddd6;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p style="margin:0 0 8px;"><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-PK') : new Date().toLocaleString('en-PK')}</p>
        <p style="margin:0 0 8px;"><strong>Status:</strong> ${statusLabel}</p>
        <p style="margin:0 0 8px;"><strong>Payment:</strong> ${paymentLabel}</p>
        <p style="margin:0;"><strong>Estimated Delivery:</strong> ${estDelivery}</p>
      </div>

      <h3 style="margin-top:24px;">Order Summary</h3>
      ${orderItemsTable(order.items)}
      <p><strong>Subtotal:</strong> ${formatPkr(order.subtotal)}</p>
      ${(order.productDiscount && order.productDiscount > 0) ? `<p style="color:#22c55e;"><strong>Product Discount:</strong> -${formatPkr(order.productDiscount)}</p>` : ''}
      ${order.discount > 0 ? `<p style="color:#22c55e;"><strong>Coupon Discount:</strong> -${formatPkr(order.discount)}</p>` : ''}
      ${(order.manualDiscount && order.manualDiscount > 0) ? `<p style="color:#f97316;"><strong>Manual Discount:</strong> -${formatPkr(order.manualDiscount)}</p>` : ''}
      <p><strong>Shipping:</strong> ${order.shippingCost === 0 ? 'FREE' : '+' + formatPkr(order.shippingCost)}</p>
      ${(order.tax && order.tax > 0) ? `<p><strong>Tax:</strong> +${formatPkr(order.tax)}</p>` : ''}
      <p style="font-size:18px;"><strong>Total:</strong> ${formatPkr(order.total)}</p>

      <h3 style="margin-top:24px;">Shipping Address</h3>
      <p>
        ${addr.firstName} ${addr.lastName}<br/>
        ${addr.street}<br/>
        ${addr.city}, ${addr.state} ${addr.postalCode}<br/>
        ${addr.country}<br/>
        Phone: ${addr.phone}
      </p>

      <p style="text-align:center;margin:32px 0;">
        <a href="${trackUrl}" class="btn" style="font-size:16px;padding:16px 40px;">TRACK MY ORDER</a>
      </p>

      <p style="color:#666;font-size:13px;text-align:center;">
        Need help? Contact us at ${STORE_CONTACT.phone} or ${STORE_CONTACT.email}
      </p>
    `
  );
};

export const sendNewOrderNotificationEmail = async (
  adminEmail: string,
  order: any
): Promise<void> => {
  const orderUrl = `${siteUrl()}/admin/orders?id=${order._id}`;
  const statusLabel = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status;
  const paymentLabel = PAYMENT_METHOD_LABELS[order.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || order.paymentMethod;

  await sendMail(
    adminEmail,
    `New Order Received #${order.orderNumber}`,
    `
      <h2>New Order Received!</h2>
      <p>A new order has been placed on AZEEORA COSMETICS.</p>

      <div style="background:#faf7f5;border:1px solid #e8ddd6;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;"><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p style="margin:0 0 8px;"><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
        <p style="margin:0 0 8px;"><strong>Total Amount:</strong> ${formatPkr(order.total)}</p>
        <p style="margin:0 0 8px;"><strong>Payment Method:</strong> ${paymentLabel}</p>
        <p style="margin:0;"><strong>Current Status:</strong> ${statusLabel}</p>
      </div>

      <p style="text-align:center;margin:32px 0;">
        <a href="${orderUrl}" class="btn" style="font-size:16px;padding:16px 40px;">VIEW ORDER IN ADMIN</a>
      </p>
    `,
    { softFail: true }
  );
};

export const sendPaymentStatusEmail = async (
  email: string,
  firstName: string,
  orderNumber: string,
  orderId: string,
  approved: boolean,
  reason?: string
): Promise<void> => {
  const orderUrl = `${siteUrl()}/account/orders/${orderId}`;
  await sendMail(
    email,
    approved
      ? `AZEEORA COSMETICS — Payment Approved #${orderNumber}`
      : `AZEEORA COSMETICS — Payment Rejected #${orderNumber}`,
    approved
      ? `
        <h2>Payment Approved</h2>
        <p>Hi ${firstName}, your payment for order <strong>${orderNumber}</strong> has been approved. We are preparing your order.</p>
        <p style="text-align:center;"><a href="${orderUrl}" class="btn">View Order</a></p>
      `
      : `
        <h2>Payment Rejected</h2>
        <p>Hi ${firstName}, your payment for order <strong>${orderNumber}</strong> was rejected.</p>
        <p>${reason ? `Reason: ${reason}` : 'Please upload a new payment proof with a valid transaction ID and screenshot.'}</p>
        <p style="text-align:center;"><a href="${orderUrl}/pay" class="btn">Resubmit Payment</a></p>
      `
  );
};

export const sendOrderStatusEmail = async (
  email: string,
  firstName: string,
  orderNumber: string,
  orderId: string,
  statusLabel: string,
  order?: {
    trackingNumber?: string;
    courierName?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
  }
): Promise<void> => {
  const trackUrl = `${siteUrl()}/track-order?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`;
  const trackingBlock = `
      <div style="background:#faf7f5;border:1px solid #e8ddd6;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>Order ID:</strong> ${orderNumber}</p>
        ${order?.trackingNumber ? `<p style="margin:0 0 8px;"><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
        ${order?.courierName ? `<p style="margin:0 0 8px;"><strong>Courier:</strong> ${order.courierName}</p>` : ''}
        ${order?.estimatedDelivery ? `<p style="margin:0 0 8px;"><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString('en-PK')}</p>` : ''}
        ${order?.trackingUrl ? `<p style="margin:0;"><a href="${order.trackingUrl}">Track with courier →</a></p>` : ''}
      </div>
    `;

  await sendMail(
    email,
    `AZEEORA COSMETICS — ${statusLabel} #${orderNumber}`,
    `
      <h2>${statusLabel}</h2>
      <p>Hi ${firstName}, your order <strong>${orderNumber}</strong> is now: <strong>${statusLabel}</strong>.</p>
      ${trackingBlock}
      <p style="text-align:center;margin:32px 0;">
        <a href="${trackUrl}" class="btn" style="font-size:16px;padding:16px 40px;">TRACK MY ORDER</a>
      </p>
      <p style="color:#666;font-size:13px;text-align:center;">
        Support: ${STORE_CONTACT.phone} · ${STORE_CONTACT.email}
      </p>
    `
  );
};

export const sendWelcomeEmail = async (email: string, firstName: string): Promise<void> => {
  await sendMail(
    email,
    'Welcome to AZEEORA COSMETICS',
    `
      <h2>Welcome, ${firstName}!</h2>
      <p>Your email is verified. Explore our luxury beauty collection.</p>
      <p style="text-align:center;"><a href="${siteUrl()}/shop" class="btn">Start Shopping</a></p>
    `
  );
};

export const testSmtpConnection = async (): Promise<{
  ok: boolean;
  message: string;
  provider?: string;
  host?: string;
  port?: number;
  user?: string;
}> => {
  // Check Resend first
  const resend = getResendClient();
  if (resend) {
    return { ok: true, message: 'Resend API key configured', provider: 'resend' };
  }

  if (!canSendEmail()) {
    return { ok: false, message: 'No email provider configured (RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD)' };
  }
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = (process.env.EMAIL_USER || '').trim();
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { ok: true, message: 'SMTP connection verified', provider: 'smtp', host, port, user };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'SMTP verify failed',
      provider: 'smtp',
      host,
      port,
      user,
    };
  }
};

export const sendAdminReplyEmail = async (
  email: string,
  firstName: string,
  productName: string,
  productSlug: string,
  replyBody: string
): Promise<void> => {
  const productUrl = `${siteUrl()}/products/${productSlug}`;
  await sendMail(
    email,
    `AZEEORA COSMETICS — Admin Reply to Your Review on ${productName}`,
    `
      <h2>Hi ${firstName},</h2>
      <p>An admin has replied to your review on <strong>${productName}</strong>:</p>
      
      <div style="background:#faf7f5;border-left:4px solid #C9956A;padding:16px;margin:20px 0;font-style:italic;">
        "${replyBody}"
      </div>
      
      <p style="text-align:center;margin:32px 0;">
        <a href="${productUrl}" class="btn" style="font-size:16px;padding:16px 40px;">VIEW ON WEBSITE</a>
      </p>
      
      <p style="color:#666;font-size:13px;text-align:center;margin-top:32px;">
        Thank you for being a part of AZEEORA COSMETICS!
      </p>
    `
  );
};
