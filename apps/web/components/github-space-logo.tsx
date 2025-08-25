const GithubSpaceLogo: React.FC = () => {
    return (
        <div className='w-full bg-[#000] flex items-center justify-center overflow-hidden'>
            <svg width='500' height='500' viewBox='0 0 300 300'>
                <defs>
                    <radialGradient id='starGradient'>
                        <stop offset='0%' stopColor='white' stopOpacity='1' />
                        <stop offset='100%' stopColor='white' stopOpacity='0' />
                    </radialGradient>
                    <filter id='glow'>
                        <feGaussianBlur stdDeviation='2.5' result='coloredBlur' />
                        <feMerge>
                            <feMergeNode in='coloredBlur' />
                            <feMergeNode in='SourceGraphic' />
                        </feMerge>
                    </filter>
                </defs>

                {/* GitHub Logo */}
                <g transform='translate(100, 100) scale(1)' fill='#ffffff' filter='url(#glow)'>
                    <animateTransform
                        attributeName='transform'
                        type='translate'
                        values='100,100; 105,105; 100,100'
                        dur='4s'
                        repeatCount='indefinite'
                    />
                    <path
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M50 0C22.4 0 0 22.4 0 50c0 22.1 14.3 40.8 34.2 47.4 2.5 0.5 3.4-1.1 3.4-2.4 0-1.2 0-4.4-0.1-8.7-13.9 3-16.8-6.7-16.8-6.7-2.3-5.8-5.6-7.3-5.6-7.3-4.5-3.1 0.3-3 0.3-3 5 0.4 7.7 5.2 7.7 5.2 4.5 7.6 11.7 5.4 14.5 4.1 0.5-3.2 1.7-5.4 3.1-6.7-11.1-1.3-22.8-5.6-22.8-24.7 0-5.5 1.9-9.9 5.1-13.4-0.5-1.3-2.2-6.3 0.5-13.2 0 0 4.2-1.3 13.7 5.1 4-1.1 8.2-1.7 12.5-1.7 4.2 0 8.5 0.6 12.5 1.7 9.5-6.5 13.7-5.1 13.7-5.1 2.7 6.9 1 12 0.5 13.2 3.2 3.5 5.1 8 5.1 13.4 0 19.2-11.7 23.4-22.8 24.7 1.8 1.5 3.4 4.6 3.4 9.3 0 6.7-0.1 12.1-0.1 13.7 0 1.3 0.9 2.9 3.4 2.4C85.7 90.8 100 72.1 100 50 100 22.4 77.6 0 50 0z'
                    />
                </g>

                {/* Flying Stars */}
                {[...Array(150)].map((_, i) => (
                    <g key={i}>
                        <circle r='1' fill='url(#starGradient)'>
                            <animateMotion
                                path={`M${Math.random() * 600 - 150},${Math.random() * 600 - 150} L150,150`}
                                dur={`${Math.random() * 5 + 3}s`}
                                repeatCount='indefinite'
                                suppressHydrationWarning
                            />
                            <animate
                                attributeName='opacity'
                                values='0;1;0'
                                dur={`${Math.random() * 3 + 2}s`}
                                repeatCount='indefinite'
                                begin={`${Math.random() * 5}s`}
                                suppressHydrationWarning
                            />
                        </circle>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default GithubSpaceLogo;
