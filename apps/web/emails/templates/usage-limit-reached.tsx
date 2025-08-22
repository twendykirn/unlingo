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

interface UsageLimitReachedProps {
    upgradeUrl?: string;
    supportEmail?: string;
}

export const UsageLimitReachedEmail = ({
    upgradeUrl = `https://${process.env.BASE_URL}/dashboard/settings`,
    supportEmail = 'support@unlingo.com',
}: UsageLimitReachedProps) => {
    const previewText = `Hey there! You've reached your current plan limit. Your apps keep working, but let's get you more capacity.`;

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
                            <Heading className='text-white text-2xl font-bold mb-6'>Hey there! 🚦</Heading>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Igor here. You've just hit 100% of your current plan limits. First things first - your
                                apps are still working fine and your users won't notice anything.
                            </Text>

                            {/* Status Alert */}
                            <Section className='my-8 bg-orange-900/20 border border-orange-500/30 rounded-lg p-6'>
                                <Heading className='text-orange-400 text-lg font-semibold mb-4 flex items-center'>
                                    🎯 Limit Reached
                                </Heading>
                                <Text className='text-white text-base leading-6 my-2'>
                                    <strong>Status:</strong> Current plan at 100% capacity
                                </Text>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                This is actually a good problem to have - it means Unlingo is working well for your
                                projects! You've got one quick option to get back to full capacity:
                            </Text>

                            <Section className='my-6 bg-gray-900/50 rounded-lg p-6'>
                                <Text className='text-white text-base font-semibold mb-3'>Option: Upgrade</Text>
                                <Text className='text-gray-400 text-sm leading-6'>
                                    Get more capacity with a paid plan. Upgrades are instant - you'll be back to
                                    creating projects within minutes.
                                </Text>
                            </Section>

                            {/* CTA Section */}
                            <Section className='text-center my-8'>
                                <Button
                                    href={upgradeUrl}
                                    className='bg-orange-500 text-white rounded-lg text-base no-underline text-center inline-block py-3 px-6 font-semibold mr-4'>
                                    Upgrade now
                                </Button>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Stuck or not sure which plan you need? Just reply to this email. I'll take a look at
                                your usage and recommend the best option - no sales pressure, promise.
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Thanks for being a great user of Unlingo. Let's get you back to building awesome stuff!
                            </Text>

                            <Hr className='border-gray-700 my-8' />

                            {/* Quick stats */}
                            <Section className='my-6'>
                                <Text className='text-gray-400 text-sm leading-6'>
                                    <strong>Reminder:</strong> Your existing translations and API endpoints continue
                                    working normally.
                                </Text>
                            </Section>
                        </Section>

                        {/* Footer */}
                        <Section className='mt-8 px-5'>
                            <Text className='text-gray-300 text-sm leading-6 m-0'>
                                Best,
                                <br />
                                Igor
                                <br />
                                <span className='text-gray-500'>Founder & Creator, Unlingo</span>
                            </Text>

                            <Hr className='border-gray-700 my-5' />

                            <Text className='text-gray-400 text-xs my-2'>
                                Questions? Just reply or email{' '}
                                <Link href={`mailto:${supportEmail}`} className='text-purple-400 underline'>
                                    {supportEmail}
                                </Link>
                            </Text>

                            <Text className='text-gray-500 text-xs my-2'>
                                © {new Date().getFullYear()} Igor Kirnosov s.p. Translation management that scales with
                                you.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default UsageLimitReachedEmail;
