import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
    pixelBasedPreset,
} from '@react-email/components';
import * as React from 'react';

interface UsageOverLimitProps {
    upgradeUrl?: string;
    supportEmail?: string;
}

export const UsageOverLimitEmail = ({
    upgradeUrl = `https://${process.env.BASE_URL}/dashboard/settings`,
    supportEmail = 'support@unlingo.com',
}: UsageOverLimitProps) => {
    const previewText = `Hey there! You're at 130% of your current plan. Time to upgrade - I'll help you decide.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    presets: [pixelBasedPreset],
                }}>
                <Body className='bg-gray-950 font-sans'>
                    <Container className='mx-auto py-5 pb-12 max-w-xl'>
                        {/* Header */}
                        <Section className='py-8'>
                            <Img
                                src='https://o2xjkxudhl.ufs.sh/f/k57kIptYxTsA0qgsaMx85ghWLOa4qM3fDtsCpikFTn7Aw2Gm'
                                width='120'
                                height='120'
                                alt='Unlingo'
                                className='mx-auto block'
                            />
                        </Section>

                        {/* Main Content */}
                        <Section className='px-5'>
                            <Heading className='text-white text-2xl font-bold mb-6'>Hey there! 🚨</Heading>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Igor here with an important update about your Unlingo usage. You're currently at 130% of
                                your current plan limits, which means you're 30% over.
                            </Text>

                            {/* Critical Alert */}
                            <Section className='my-8 bg-red-900/20 border border-red-500/30 rounded-lg p-6'>
                                <Heading className='text-red-400 text-lg font-semibold mb-4 flex items-center'>
                                    🚨 Action Required
                                </Heading>
                                <Text className='text-white text-base leading-6 my-2'>
                                    <strong>Current usage:</strong> 130% (30% over limit)
                                </Text>
                                <Text className='text-red-300 text-sm leading-5 my-2'>
                                    <strong>Status:</strong> All API calls are blocked
                                </Text>
                                <Text className='text-gray-300 text-sm leading-5 my-2'>
                                    You won't be able to use any API calls until this is resolved.
                                </Text>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Here's how we can fix this together:
                            </Text>

                            <Section className='my-6 bg-gray-900/50 rounded-lg p-6'>
                                <Text className='text-white text-base font-semibold mb-3'>
                                    🚀 Upgrade for growth (2 minutes)
                                </Text>
                                <Text className='text-gray-400 text-sm leading-6'>
                                    If you're actively using most of your resources, it's time to upgrade. Plans start
                                    small and scale with your needs - no enterprise-only pricing tricks.
                                </Text>
                            </Section>

                            {/* CTA Section */}
                            <Section className='text-center my-8'>
                                <Button
                                    href={upgradeUrl}
                                    className='bg-red-500 text-white rounded-lg text-base no-underline text-center inline-block py-3 px-6 font-semibold mr-4'>
                                    Upgrade my plan
                                </Button>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Not sure which plan you need? Just reply to this email with "help me decide" and I'll
                                personally look at your account and give you specific recommendations.
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                I appreciate your understanding. Unlingo is designed to grow with your projects, and
                                hitting limits just means you're succeeding! Let's get you the right setup.
                            </Text>

                            <Hr className='border-gray-700 my-8' />

                            {/* Urgent notice */}
                            <Section className='my-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4'>
                                <Text className='text-yellow-400 text-sm font-semibold mb-2'>⏰ Time-sensitive</Text>
                                <Text className='text-gray-300 text-sm leading-6'>
                                    This might affect your development workflow, so let's resolve it quickly.
                                </Text>
                            </Section>
                        </Section>

                        {/* Footer */}
                        <Section className='mt-8 px-5'>
                            <Text className='text-gray-300 text-sm leading-6 m-0'>
                                Here to help,
                                <br />
                                Igor
                                <br />
                                <span className='text-gray-500'>Founder & Creator, Unlingo</span>
                            </Text>

                            <Hr className='border-gray-700 my-5' />

                            <Text className='text-gray-400 text-xs my-2'>
                                Need immediate help? Reply to this email or contact{' '}
                                <Link href={`mailto:${supportEmail}`} className='text-purple-400 underline'>
                                    {supportEmail}
                                </Link>
                            </Text>

                            <Text className='text-gray-500 text-xs my-2'>
                                © {new Date().getFullYear()} Igor Kirnosov s.p. Supporting your growth, one translation
                                at a time.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default UsageOverLimitEmail;
