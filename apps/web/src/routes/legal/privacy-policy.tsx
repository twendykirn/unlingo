import { createFileRoute } from '@tanstack/react-router'
import HeroHeader from "@/components/header";
import FooterSection from '@/components/footer';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/legal/privacy-policy')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="min-h-screen w-full">
            <HeroHeader />
            <div className='pt-24 pb-16 px-6'>
                <div className='max-w-4xl mx-auto'>
                    <div className='mb-12'>
                        <h1 className='text-4xl md:text-5xl font-bold mb-4'>Privacy Policy</h1>
                        <p className='text-gray-400 text-lg'>Last updated: 1/21/2026</p>
                    </div>

                    <div className='prose prose-invert prose-lg max-w-none space-y-8'>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>1. Introduction</h2>
                            <p className='text-gray-300 mb-4'>
                                Igor Kirnosov s.p. ("we," "our," or "us") operates Unlingo (the "Service"). This Privacy
                                Policy explains how we collect, use, disclose, and safeguard your information when you
                                use our Service.
                            </p>
                            <p className='text-gray-300'>
                                Please read this Privacy Policy carefully. If you do not agree with the terms of this
                                Privacy Policy, please do not access the Service.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>2. Information We Collect</h2>

                            <div className='space-y-4'>
                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Personal Information</h3>
                                    <p className='text-gray-300 mb-2'>
                                        We may collect personal information that you voluntarily provide to us when you:
                                    </p>
                                    <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                        <li>Register for an account</li>
                                        <li>Subscribe to our services</li>
                                        <li>Contact us for support</li>
                                        <li>Participate in surveys or promotions</li>
                                    </ul>
                                    <p className='text-gray-300 mt-2'>
                                        This may include: name, email address, payment information, and any other
                                        information you choose to provide.
                                    </p>
                                </div>

                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Usage Information</h3>
                                    <p className='text-gray-300 mb-2'>
                                        We automatically collect certain information about your use of our Service,
                                        including:
                                    </p>
                                    <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                        <li>Device information (IP address, browser type, operating system)</li>
                                        <li>Usage patterns and preferences</li>
                                        <li>API request logs and metrics</li>
                                        <li>Error logs and performance data</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Translation Data</h3>
                                    <p className='text-gray-300'>
                                        We store and process the translation content you upload to our Service. This
                                        includes translation keys, values, and associated metadata necessary to provide
                                        our translation hosting service.
                                    </p>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>3. How We Use Your Information</h2>
                            <p className='text-gray-300 mb-4'>We use the information we collect to:</p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Provide, operate, and maintain our Service</li>
                                <li>Process transactions and send related information</li>
                                <li>Send administrative information, including security updates</li>
                                <li>Respond to customer service requests</li>
                                <li>Improve our Service and develop new features</li>
                                <li>Monitor usage and analyze trends</li>
                                <li>Detect and prevent fraud or abuse</li>
                                <li>Comply with legal obligations</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>4. How We Share Your Information</h2>
                            <p className='text-gray-300 mb-4'>
                                We do not sell, trade, or rent your personal information to third parties. We may share
                                your information in the following circumstances:
                            </p>

                            <div className='space-y-4'>
                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Service Providers</h3>
                                    <p className='text-gray-300'>
                                        We may share your information with third-party service providers who help us
                                        operate our Service, such as hosting providers, payment processors, and
                                        analytics services. These providers are contractually obligated to protect your
                                        information.
                                    </p>
                                </div>

                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Legal Requirements</h3>
                                    <p className='text-gray-300'>
                                        We may disclose your information if required to do so by law or in response to
                                        valid requests by public authorities (e.g., court orders or government
                                        agencies).
                                    </p>
                                </div>

                                <div>
                                    <h3 className='text-xl font-medium mb-2 text-gray-200'>Business Transfers</h3>
                                    <p className='text-gray-300'>
                                        In the event of a merger, acquisition, or sale of assets, your information may
                                        be transferred as part of that transaction. We will provide notice before your
                                        information is transferred.
                                    </p>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>5. Data Security</h2>
                            <p className='text-gray-300 mb-4'>
                                We implement appropriate technical and organizational security measures to protect your
                                information against unauthorized access, alteration, disclosure, or destruction. These
                                measures include:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Encryption of data in transit and at rest</li>
                                <li>Regular security assessments and updates</li>
                                <li>Access controls and authentication mechanisms</li>
                                <li>Monitoring and logging of system activities</li>
                            </ul>
                            <p className='text-gray-300 mt-4'>
                                However, no method of transmission over the Internet or electronic storage is 100%
                                secure. While we strive to use commercially acceptable means to protect your
                                information, we cannot guarantee absolute security.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>6. Data Retention</h2>
                            <p className='text-gray-300 mb-4'>
                                We retain your information for as long as necessary to provide our Service and fulfill
                                the purposes outlined in this Privacy Policy. Specifically:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>Account information is retained while your account is active</li>
                                <li>Translation data is retained according to your subscription plan</li>
                                <li>Payment information is retained as required by law and payment processors</li>
                            </ul>
                            <p className='text-gray-300 mt-4'>
                                When you delete your account, we will delete your personal information immediately,
                                except where retention is required by law.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>7. Your Rights</h2>
                            <p className='text-gray-300 mb-4'>
                                Depending on your location, you may have certain rights regarding your personal
                                information:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>
                                    <strong>Access:</strong> Request access to the personal information we hold about
                                    you
                                </li>
                                <li>
                                    <strong>Correction:</strong> Request correction of inaccurate or incomplete
                                    information
                                </li>
                                <li>
                                    <strong>Deletion:</strong> Request deletion of your personal information
                                </li>
                                <li>
                                    <strong>Portability:</strong> Request transfer of your data to another service
                                </li>
                                <li>
                                    <strong>Objection:</strong> Object to certain types of processing
                                </li>
                                <li>
                                    <strong>Restriction:</strong> Request restriction of processing in certain
                                    circumstances
                                </li>
                            </ul>
                            <p className='text-gray-300 mt-4'>
                                To exercise these rights, please contact us at support@unlingo.com. We will respond to
                                your request within 30 days.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>
                                8. Analytics and Tracking Technologies
                            </h2>
                            <p className='text-gray-300 mb-4'>
                                We are committed to protecting your privacy and do not use cookies for tracking
                                purposes. Our analytics approach is designed to be privacy-first and GDPR compliant:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4'>
                                <li>
                                    <strong>Cookieless Analytics:</strong> We use privacy-focused analytics that do not
                                    require cookies or personal identifiers
                                </li>
                                <li>
                                    <strong>GDPR Compliant:</strong> Our analytics tools comply with GDPR and do not
                                    track individual users
                                </li>
                                <li>
                                    <strong>Essential Cookies Only:</strong> We only use strictly necessary cookies
                                    required for authentication and service functionality
                                </li>
                                <li>
                                    <strong>No Cross-Site Tracking:</strong> We do not track users across other websites
                                    or services
                                </li>
                            </ul>
                            <p className='text-gray-300 mt-4'>
                                <strong>Essential Cookies:</strong> The only cookies we use are essential for the
                                operation of our Service, such as authentication tokens to keep you logged in. These are
                                necessary for the Service to function properly.
                            </p>
                            <p className='text-gray-300 mt-4'>
                                <strong>Analytics Data:</strong> We collect aggregated, anonymous usage data to improve
                                our Service without using cookies or tracking individual users. This includes general
                                usage patterns, performance metrics, and error reporting.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>9. Third-Party Services</h2>
                            <p className='text-gray-300 mb-4'>
                                Our Service may contain links to third-party websites or integrate with third-party
                                services. We are not responsible for the privacy practices of these third parties. We
                                recommend reviewing their privacy policies before providing any information.
                            </p>
                            <p className='text-gray-300'>
                                We use the following third-party services that may collect information:
                            </p>
                            <ul className='list-disc list-inside text-gray-300 space-y-2 ml-4 mt-2'>
                                <li>Authentication services (Clerk)</li>
                                <li>Hosting and infrastructure (Vercel)</li>
                                <li>Database services (Convex)</li>
                                <li>Payment processing (Polar)</li>
                                <li>Analytics services (OpenPanel)</li>
                                <li>Email services (Resend)</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>10. International Data Transfers</h2>
                            <p className='text-gray-300'>
                                Your information may be transferred to and processed in countries other than your own.
                                These countries may have different data protection laws. When we transfer your
                                information internationally, we ensure appropriate safeguards are in place to protect
                                your information in accordance with applicable privacy laws.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>11. Children's Privacy</h2>
                            <p className='text-gray-300'>
                                Our Service is not intended for children under 18 years of age. We do not knowingly
                                collect personal information from children under 18. If you believe we have collected
                                information from a child under 18, please contact us immediately, and we will take steps
                                to remove such information.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>
                                12. Changes to This Privacy Policy
                            </h2>
                            <p className='text-gray-300'>
                                We may update this Privacy Policy from time to time. We will notify you of any material
                                changes by posting the new Privacy Policy on this page and updating the "Last updated"
                                date. We encourage you to review this Privacy Policy periodically for any changes.
                            </p>
                        </section>
                        <section>
                            <h2 className='text-2xl font-semibold mb-4 text-white'>13. Contact Us</h2>
                            <p className='text-gray-300 mb-4'>
                                If you have any questions about this Privacy Policy or our data practices, please
                                contact us:
                            </p>
                            <Card className='p-4'>
                                <div>
                                    <p className='text-gray-300 mb-2'>
                                        <strong>Email:</strong>{' '}
                                        <a
                                            href='mailto:support@unlingo.com'
                                            className='text-blue-400 hover:text-blue-300 underline'>
                                            support@unlingo.com
                                        </a>
                                    </p>
                                    <p className='text-gray-300'>
                                        <strong>Company:</strong> Igor Kirnosov s.p.
                                    </p>
                                </div>
                            </Card>
                        </section>
                    </div>
                </div>
            </div>
            <FooterSection />
        </div>
    )
}
