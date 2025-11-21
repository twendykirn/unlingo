// Email templates
export { default as WelcomeEmail } from './templates/welcome';
export { default as UsageWarning80Email } from './templates/usage-warning-80';
export { default as UsageLimitReachedEmail } from './templates/usage-limit-reached';
export { default as UsageOverLimitEmail } from './templates/usage-over-limit';
export { renderEmail, getEmailSubject } from './render';

// Email template types
export type EmailTemplate = 'welcome' | 'usage-warning-80' | 'usage-limit-reached' | 'usage-over-limit';

// Common email props interface
export interface BaseEmailProps {
    userEmail?: string;
    dashboardUrl?: string;
    supportEmail?: string;
}

export interface UsageEmailProps extends BaseEmailProps {
    upgradeUrl?: string;
}

export interface WelcomeEmailProps extends BaseEmailProps {
    docsUrl?: string;
}
