/**
 * Notification Service Stub
 * 
 * Future implementation will integrate with SendGrid/AWS SES or similar
 * to send actual email notifications with fallback logic.
 */

import { Resend } from 'resend';
import { logger } from '../utils/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@angelportal.co';

export async function sendEmail(to: string, subject: string, html: string) {
    if (resend) {
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to,
                subject,
                html,
            });
            logger.info(`Email sent to ${to}: ${subject}`);
        } catch (err) {
            logger.error(`Resend failed to send email to ${to}`, err);
        }
    } else {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`\n================= EMAIL NOTIFICATION =================`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${html}`);
            console.log(`======================================================\n`);
        }
    }
    return true;
}

export async function sendInviteEmail(to: string, startupName: string, inviteUrl: string) {
    const subject = `You've been invited to join ${startupName} on PortfolioOS`;
    const html = `
        <p>You have been invited to join ${startupName}'s company portal on PortfolioOS.</p>
        <p>Please click the link below to accept your invitation:</p>
        <a href="${inviteUrl}">${inviteUrl}</a>
    `;
    return sendEmail(to, subject, html);
}

export async function sendReminderEmail(to: string, startupName: string) {
    const subject = `Action Required: Submit your monthly update for ${startupName}`;
    const html = `
        <p>This is a reminder to submit your monthly operating update for ${startupName}.</p>
        <p>Keeping your investors informed helps them support you better.</p>
        <p>Please log in to your company portal to submit the update.</p>
    `;
    return sendEmail(to, subject, html);
}

export async function sendNewUpdateEmail(to: string, startupName: string, updateUrl: string) {
    const subject = `New Monthly Update available from ${startupName}`;
    const html = `
        <p>${startupName} has just submitted a new monthly update.</p>
        <p>You can view the full update and financials here:</p>
        <a href="${updateUrl}">${updateUrl}</a>
    `;
    return sendEmail(to, subject, html);
}

export async function sendNewMessageEmail(to: string, startupName: string, senderName: string, messagePreview: string, threadUrl: string) {
    const subject = `New Message from ${senderName} regarding ${startupName}`;
    const html = `
        <p>You have a new message from ${senderName} in the ${startupName} thread.</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
            ${messagePreview}
        </blockquote>
        <p><a href="${threadUrl}">Click here to reply</a></p>
    `;
    return sendEmail(to, subject, html);
}
