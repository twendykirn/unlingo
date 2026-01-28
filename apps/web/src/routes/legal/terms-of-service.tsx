import { createFileRoute, Link } from '@tanstack/react-router';
import FooterSection from '@/components/footer';
import HeroHeader from "@/components/header";

export const Route = createFileRoute('/legal/terms-of-service')({
    component: RouteComponent,
    head: () => ({
        meta: [
            {
                title: "Terms of Service - Unlingo",
            },
            {
                name: "description",
                content: "Read the Unlingo Terms of Service to understand the rules and conditions for using our platform.",
            },
            {
                property: "og:type",
                content: "website",
            },
            {
                property: "og:title",
                content: "Terms of Service - Unlingo",
            },
            {
                property: "og:description",
                content: "Read the Unlingo Terms of Service to understand the rules and conditions for using our platform.",
            },
            {
                property: "og:url",
                content: "https://unlingo.com/legal/terms-of-service",
            },
            {
                property: "og:image",
                content: "/og.png",
            },
            {
                name: "twitter:card",
                content: "summary_large_image",
            },
            {
                name: "twitter:title",
                content: "Terms of Service - Unlingo",
            },
            {
                name: "twitter:description",
                content: "Read the Unlingo Terms of Service to understand the rules and conditions for using our platform.",
            },
            {
                name: "twitter:image",
                content: "/og.png",
            },
        ],
    }),
})

function RouteComponent() {
    return (
        <div className="min-h-screen w-full">
            <HeroHeader />
            <div className='pt-24 pb-16 px-6'>
                <div className='max-w-4xl mx-auto'>
                    <div className='mb-12'>
                        <h1 className='text-4xl md:text-5xl font-bold mb-4'>Terms of Service</h1>
                        <p className='text-gray-400 text-lg'>Last updated: 1/21/2026</p>
                    </div>

                    <div className='prose prose-invert prose-lg max-w-none space-y-8'>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>1. Introduction</h2>
                            <p className='text-gray-300 mb-4'>
                                Welcome to Unlingo ("we," "our," or "us"). These Terms of Service ("Terms") govern your
                                use of our website, services, and applications (collectively, the "Service") operated by
                                Igor Kirnosov s.p.
                            </p>
                            <p className='text-gray-300'>
                                By accessing or using our Service, you agree to be bound by these Terms. If you disagree
                                with any part of these terms, then you may not access the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>2. Acceptance of Terms</h2>
                            <p className='text-gray-300 mb-4'>
                                By creating an account or using our Service, you confirm that you:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Are at least 18 years old or have parental consent</li>
                                <li>Have the legal authority to enter into these Terms</li>
                                <li>Will comply with all applicable laws and regulations</li>
                                <li>Provide accurate and complete information when creating your account</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>3. Description of Service</h2>
                            <p className='text-gray-300 mb-4'>
                                Unlingo is a developer platform for internationalization that provides:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Translation hosting and management services</li>
                                <li>API access for translation delivery</li>
                                <li>Web-based translation management interface</li>
                                <li>Integration tools for various i18n libraries</li>
                                <li>Version control for translation projects</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>4. User Accounts</h2>
                            <p className='text-gray-300 mb-4'>
                                When you create an account with us, you must provide information that is accurate,
                                complete, and current at all times. You are responsible for:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Safeguarding your account access codes and API keys</li>
                                <li>All activities that occur under your account</li>
                                <li>Immediately notifying us of any unauthorized use</li>
                                <li>Ensuring your account information remains accurate and up-to-date</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>5. Acceptable Use</h2>
                            <p className='text-gray-300 mb-4'>You agree not to use the Service:</p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                                <li>
                                    To violate any international, federal, provincial, or state regulations, rules,
                                    laws, or local ordinances
                                </li>
                                <li>
                                    To infringe upon or violate our intellectual property rights or the intellectual
                                    property rights of others
                                </li>
                                <li>
                                    To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or
                                    discriminate
                                </li>
                                <li>To submit false or misleading information</li>
                                <li>To upload or transmit viruses or any other type of malicious code</li>
                                <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                                <li>For any obscene or immoral purpose</li>
                                <li>To interfere with or circumvent the security features of the Service</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>6. Billing and Payments</h2>
                            <div className='space-y-4'>
                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Free Plan</h3>
                                    <p className='text-gray-300'>
                                        We offer a free plan with limited features. You may upgrade to a paid plan at
                                        any time.
                                    </p>
                                </div>
                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Paid Plans</h3>
                                    <p className='text-gray-300 mb-2'>
                                        Paid plans are billed monthly in advance. By upgrading to a paid plan, you agree
                                        to:
                                    </p>
                                    <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                        <li>Pay all fees associated with your selected plan</li>
                                        <li>Provide accurate billing information</li>
                                        <li>Update your payment method if it expires or becomes invalid</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Refunds</h3>
                                    <p className='text-gray-300'>
                                        We do not provide refunds for unused portions of paid plans. You may cancel your
                                        subscription at any time, and it will remain active until the end of the current
                                        billing period.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>7. Intellectual Property Rights</h2>
                            <p className='text-gray-300 mb-4'>
                                The Service and its original content, features, and functionality are and will remain
                                the exclusive property of Igor Kirnosov s.p. and its licensors. The Service is protected
                                by copyright, trademark, and other laws.
                            </p>
                            <p className='text-gray-300'>
                                You retain ownership of your translation content and data. By using our Service, you
                                grant us a limited license to host, store, and serve your content as necessary to
                                provide the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>8. Privacy Policy</h2>
                            <p className='text-gray-300'>
                                Your privacy is important to us. Please review our{' '}
                                <Link
                                    to='/legal/privacy-policy'
                                    className='text-blue-400 hover:text-blue-300 underline'>
                                    Privacy Policy
                                </Link>
                                , which also governs your use of the Service, to understand our practices.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>9. Service Availability</h2>
                            <p className='text-gray-300'>
                                We strive to maintain high service availability, but we do not guarantee that the
                                Service will be available 100% of the time. We may experience downtime for maintenance,
                                updates, or unforeseen technical issues. We will make reasonable efforts to provide
                                advance notice of planned maintenance.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>10. Termination</h2>
                            <p className='text-gray-300 mb-4'>
                                We may terminate or suspend your account immediately, without prior notice or liability,
                                for any reason whatsoever, including without limitation if you breach the Terms.
                            </p>
                            <p className='text-gray-300'>
                                Upon termination, your right to use the Service will cease immediately. If you wish to
                                terminate your account, you may simply discontinue using the Service or contact us at
                                support@unlingo.com.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>11. Disclaimer</h2>
                            <p className='text-gray-300'>
                                The information on this Service is provided on an "as is" basis. To the fullest extent
                                permitted by law, this Company excludes all representations, warranties, conditions and
                                terms whether express or implied, statutory or otherwise.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>12. Limitation of Liability</h2>
                            <p className='text-gray-300'>
                                In no event shall Igor Kirnosov s.p., nor its directors, employees, partners, agents,
                                suppliers, or affiliates, be liable for any indirect, incidental, special,
                                consequential, or punitive damages, including without limitation, loss of profits, data,
                                use, goodwill, or other intangible losses, resulting from your use of the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>13. Governing Law</h2>
                            <p className='text-gray-300'>
                                These Terms shall be interpreted and governed by the laws of the jurisdiction in which
                                Igor Kirnosov s.p. operates, without regard to its conflict of law provisions.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>14. Changes to Terms</h2>
                            <p className='text-gray-300'>
                                We reserve the right, at our sole discretion, to modify or replace these Terms at any
                                time. If a revision is material, we will try to provide at least 30 days' notice prior
                                to any new terms taking effect.
                            </p>
                        </section>

                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>15. Contact Us</h2>
                            <p className='text-gray-300'>
                                If you have any questions about these Terms of Service, please contact us at{' '}
                                <a
                                    href='mailto:support@unlingo.com'
                                    className='text-blue-400 hover:text-blue-300 underline'>
                                    support@unlingo.com
                                </a>
                                .
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <FooterSection />
        </div>
    )
}
