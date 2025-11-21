import { pretty, render } from '@react-email/render';
import {
    WelcomeEmail,
    UsageWarning80Email,
    UsageLimitReachedEmail,
    UsageOverLimitEmail,
    type EmailTemplate,
    type WelcomeEmailProps,
    type UsageEmailProps,
} from './index';

export async function renderEmail(
    template: EmailTemplate,
    props: WelcomeEmailProps | UsageEmailProps
): Promise<string> {
    switch (template) {
        case 'welcome':
            return pretty(await render(WelcomeEmail(props)));

        case 'usage-warning-80':
            return pretty(await render(UsageWarning80Email(props)));

        case 'usage-limit-reached':
            return pretty(await render(UsageLimitReachedEmail(props)));

        case 'usage-over-limit':
            return pretty(await render(UsageOverLimitEmail(props)));

        default:
            throw new Error(`Unknown email template: ${template}`);
    }
}

export const emailSubjects: Record<EmailTemplate, string> = {
    welcome: "Welcome to Unlingo! Let's get you started 🚀",
    'usage-warning-80': "Heads up: You're at 80% of your plan limit",
    'usage-limit-reached': 'Plan limit reached - but your apps keep working',
    'usage-over-limit': "Action needed: You're over your plan limit",
};

export function getEmailSubject(template: EmailTemplate): string {
    return emailSubjects[template];
}
