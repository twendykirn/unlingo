import {
    Body,
    Button,
    Column,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Row,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
    userFirstName?: string;
    dashboardUrl?: string;
    docsUrl?: string;
    supportEmail?: string;
}

export const WelcomeEmail = ({
    userFirstName = 'there',
    dashboardUrl = `https://${process.env.BASE_URL}/dashboard`,
    docsUrl = 'https://docs.unlingo.com',
    supportEmail = 'support@unlingo.com',
}: WelcomeEmailProps) => {
    const previewText = `Hey ${userFirstName}! Igor here from Unlingo. Let's get you started with translation management that actually works.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className='bg-gray-950 font-sans'>
                    <Container className='mx-auto py-5 pb-12 max-w-xl'>
                        {/* Header */}
                        <Section className='py-8'>
                            <Row>
                                <Column>
                                    <Img
                                        src='https://o2xjkxudhl.ufs.sh/f/k57kIptYxTsA0qgsaMx85ghWLOa4qM3fDtsCpikFTn7Aw2Gm'
                                        width='120'
                                        height='36'
                                        alt='Unlingo'
                                        className='mx-auto block'
                                    />
                                </Column>
                            </Row>
                        </Section>

                        {/* Main Content */}
                        <Section className='px-5'>
                            <Heading className='text-white text-2xl font-bold mb-6'>Hey {userFirstName}! 👋</Heading>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Igor here, creator of Unlingo. I'm personally excited to welcome you to our platform!
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                I built Unlingo because I was frustrated with how complicated translation management had
                                become. As a developer, I wanted something that just <em>worked</em> - no complex
                                setups, no confusing workflows, just clean, simple translation management that scales
                                with your projects.
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Here's what makes Unlingo different (and why I think you'll love it):
                            </Text>

                            {/* Features Section */}
                            <Section className='my-8 bg-gray-900/50 rounded-lg p-6'>
                                <Row className='my-4'>
                                    <Column className='w-12 align-top'>
                                        <Text className='text-2xl m-0'>🎯</Text>
                                    </Column>
                                    <Column className='align-top pl-3'>
                                        <Text className='text-white text-base font-semibold m-0 mb-1'>
                                            Visual mapping that actually makes sense
                                        </Text>
                                        <Text className='text-gray-400 text-sm leading-5 m-0'>
                                            Upload screenshots, click on text elements, assign translation keys. Your
                                            designers will finally understand where text goes!
                                        </Text>
                                    </Column>
                                </Row>

                                <Row className='my-4'>
                                    <Column className='w-12 align-top'>
                                        <Text className='text-2xl m-0'>⚡</Text>
                                    </Column>
                                    <Column className='align-top pl-3'>
                                        <Text className='text-white text-base font-semibold m-0 mb-1'>
                                            Works with whatever you're already using
                                        </Text>
                                        <Text className='text-gray-400 text-sm leading-5 m-0'>
                                            i18next, next-intl, or even plain REST calls - just swap your endpoint and
                                            you're done.
                                        </Text>
                                    </Column>
                                </Row>

                                <Row className='my-4'>
                                    <Column className='w-12 align-top'>
                                        <Text className='text-2xl m-0'>🚀</Text>
                                    </Column>
                                    <Column className='align-top pl-3'>
                                        <Text className='text-white text-base font-semibold m-0 mb-1'>
                                            Actually developer-friendly
                                        </Text>
                                        <Text className='text-gray-400 text-sm leading-5 m-0'>
                                            Clean API, proper versioning, releases that don't break things. Built by a
                                            developer, for developers.
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                I recommend starting simple - create your first project, upload a screenshot of your
                                app, and see how the visual mapping works. It's honestly pretty magical when you see it
                                in action.
                            </Text>

                            {/* CTA Section */}
                            <Section className='text-center my-8'>
                                <Button
                                    href={dashboardUrl}
                                    className='bg-white text-gray-950 rounded-lg text-base no-underline text-center inline-block py-3 px-6 font-semibold hover:bg-gray-100'>
                                    Jump into your dashboard →
                                </Button>
                            </Section>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                Got questions? Hit reply - I read every email and usually respond within a few hours.
                                I'm genuinely curious about what you're building and how Unlingo can help.
                            </Text>

                            <Text className='text-gray-300 text-base leading-7 my-4'>
                                P.S. If you run into any issues or have ideas for improvements, please let me know.
                                Unlingo is still evolving, and your feedback directly shapes what I build next.
                            </Text>

                            <Hr className='border-gray-700 my-8' />

                            {/* Quick Start */}
                            <Section className='my-6'>
                                <Heading className='text-white text-lg font-semibold mb-4'>
                                    Quick start checklist:
                                </Heading>
                                <Text className='text-gray-400 text-sm leading-6 my-2'>
                                    ✓ Create your first project
                                    <br />
                                    ✓ Upload a screenshot of your app
                                    <br />
                                    ✓ Try the visual mapping feature
                                    <br />✓ Check out the{' '}
                                    <Link href={docsUrl} className='text-purple-400 underline'>
                                        integration docs
                                    </Link>
                                </Text>
                            </Section>
                        </Section>

                        {/* Footer */}
                        <Section className='mt-8 px-5'>
                            <Text className='text-gray-300 text-sm leading-6 m-0'>
                                Happy coding,
                                <br />
                                Igor
                                <br />
                                <span className='text-gray-500'>Founder & Creator, Unlingo</span>
                            </Text>

                            <Hr className='border-gray-700 my-5' />

                            <Text className='text-gray-400 text-xs my-2'>
                                Want to chat? Just reply to this email or reach me at{' '}
                                <Link href={`mailto:${supportEmail}`} className='text-purple-400 underline'>
                                    {supportEmail}
                                </Link>
                            </Text>

                            <Text className='text-gray-500 text-xs my-2'>
                                Unlingo - Translation management that actually works
                                <br />© {new Date().getFullYear()} Igor Kirnosov s.p. Made with ❤️ for developers.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
