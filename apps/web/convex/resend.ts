'use node';
import { components } from './_generated/api';
import { Resend } from '@convex-dev/resend';
import { internalAction } from './_generated/server';
import { getEmailSubject, renderEmail } from '../emails';
import { v } from 'convex/values';

export const resend: Resend = new Resend(components.resend, {
    testMode: false,
});

export const sendWelcomeEmail = internalAction({
    args: {
        userFirstName: v.string(),
        userEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const html = await renderEmail('welcome', {
            userFirstName: args.userFirstName,
        });

        const subject = getEmailSubject('welcome');

        await resend.sendEmail(ctx, {
            from: 'Igor from Unlingo <igor@unlingo.com>',
            to: args.userEmail,
            subject,
            html,
            replyTo: ['welcome@unlingo.com'],
        });
    },
});

export const sendLimitsEmail = internalAction({
    args: {
        userEmail: v.string(),
        currentUsage: v.number(),
    },
    handler: async (ctx, args) => {
        const template =
            args.currentUsage === 80
                ? 'usage-warning-80'
                : args.currentUsage === 100
                  ? 'usage-limit-reached'
                  : 'usage-over-limit';

        const html = await renderEmail(template, {});

        const subject = getEmailSubject(template);

        await resend.sendEmail(ctx, {
            from: 'Unlingo <support@unlingo.com>',
            to: args.userEmail,
            subject,
            html,
            replyTo: ['support@unlingo.com'],
        });
    },
});
