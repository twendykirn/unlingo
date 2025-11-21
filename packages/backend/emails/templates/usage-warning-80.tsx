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

interface UsageWarning80Props {
    dashboardUrl?: string;
    upgradeUrl?: string;
    supportEmail?: string;
}

const baseUrl = `https://${process.env.BASE_URL!}`;

export const UsageWarning80Email = ({
    dashboardUrl = `${baseUrl}/dashboard/settings`,
    upgradeUrl = `${baseUrl}/dashboard/settings`,
    supportEmail = 'support@unlingo.com',
}: UsageWarning80Props) => {
    const previewText = `Hey there! You're at 80% of your current plan limit. Let's make sure you don't hit any walls.`;

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
                            <Heading className='text-white text-2xl font-bold mb-6'>Hey there! 📊</Heading>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Igor here from Unlingo. I noticed you're getting close to your plan limits, so I wanted
                                to give you a heads up before anything gets blocked.
                            </Text>

                            {/* Usage Stats */}
                            <Section className='my-8 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6'>
                                <Heading className='text-yellow-400 text-lg font-semibold mb-4 flex items-center'>
                                    ⚠️ Usage Alert
                                </Heading>
                                <Text className='text-white text-base leading-6 my-2'>
                                    <strong>Usage:</strong> 80% of your current plan
                                </Text>
                                <Text className='text-gray-300 text-sm leading-5 my-2'>
                                    You're doing great! Your projects are growing, which means Unlingo is working well
                                    for you. But at 80% usage, I want to make sure you don't hit any limits
                                    unexpectedly.
                                </Text>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Here's what happens when you reach 100%:
                            </Text>

                            <Section className='my-6 bg-gray-900/50 rounded-lg p-4'>
                                <Text className='text-gray-400 text-sm leading-6 my-2'>
                                    • API calls will continue working until around 130% usage
                                    <br />• You can still edit existing translations
                                </Text>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                The good news? You have an option:
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Get more capacity with a paid plan. Upgrades are instant - you'll be back to creating
                                projects within minutes.
                            </Text>

                            {/* CTA Section */}
                            <Section className='text-center my-8'>
                                <Button
                                    href={upgradeUrl}
                                    className='bg-yellow-500 text-gray-950 rounded-lg text-base no-underline text-center inline-block py-3 px-6 font-semibold mr-4'>
                                    View upgrade options
                                </Button>
                                <Button
                                    href={dashboardUrl}
                                    className='bg-gray-700 text-white rounded-lg text-base no-underline text-center inline-block py-3 px-6 font-semibold'>
                                    Check my usage
                                </Button>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Questions about your usage or need help deciding what plan works best? Just hit reply -
                                I'm happy to help you figure out the right setup.
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>Thanks for using Unlingo!</Text>

                            <Hr className='border-gray-700 my-8' />
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
                                Need help? Just reply or email me at{' '}
                                <Link href={`mailto:${supportEmail}`} className='text-purple-400 underline'>
                                    {supportEmail}
                                </Link>
                            </Text>

                            <Text className='text-gray-500 text-xs my-2'>
                                © {new Date().getFullYear()} Igor Kirnosov s.p. Built for developers who care about
                                their translations.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default UsageWarning80Email;
