import type { SVGProps } from 'react'

export default function TanStack(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="0 0 633 633"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}>
            <path
                d="M316.5 633C491.283 633 633 491.283 633 316.5S491.283 0 316.5 0 0 141.717 0 316.5 141.717 633 316.5 633Z"
                fill="#002840"
            />
            <path
                d="M316.5 574.875C459.029 574.875 574.875 459.029 574.875 316.5S459.029 58.125 316.5 58.125 58.125 173.971 58.125 316.5 173.971 574.875 316.5 574.875Z"
                stroke="url(#paint0_linear)"
                strokeWidth="12"
            />
            <path
                d="M316.5 504.75C420.394 504.75 504.75 420.394 504.75 316.5S420.394 128.25 316.5 128.25 128.25 212.606 128.25 316.5 212.606 504.75 316.5 504.75Z"
                stroke="url(#paint1_linear)"
                strokeWidth="8"
            />
            <path
                d="M316.5 434.625C381.759 434.625 434.625 381.759 434.625 316.5S381.759 198.375 316.5 198.375 198.375 251.241 198.375 316.5 251.241 434.625 316.5 434.625Z"
                stroke="url(#paint2_linear)"
                strokeWidth="6"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M316.5 391.875C358.127 391.875 391.875 358.127 391.875 316.5S358.127 241.125 316.5 241.125 241.125 274.873 241.125 316.5 274.873 391.875 316.5 391.875Z"
                fill="url(#paint3_linear)"
            />
            <defs>
                <linearGradient
                    id="paint0_linear"
                    x1="316.5"
                    y1="58.125"
                    x2="316.5"
                    y2="574.875"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#84CC16" />
                    <stop
                        offset="1"
                        stopColor="#22C55E"
                    />
                </linearGradient>
                <linearGradient
                    id="paint1_linear"
                    x1="316.5"
                    y1="128.25"
                    x2="316.5"
                    y2="504.75"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22D3EE" />
                    <stop
                        offset="1"
                        stopColor="#3B82F6"
                    />
                </linearGradient>
                <linearGradient
                    id="paint2_linear"
                    x1="316.5"
                    y1="198.375"
                    x2="316.5"
                    y2="434.625"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A855F7" />
                    <stop
                        offset="1"
                        stopColor="#EC4899"
                    />
                </linearGradient>
                <linearGradient
                    id="paint3_linear"
                    x1="316.5"
                    y1="241.125"
                    x2="316.5"
                    y2="391.875"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FBBF24" />
                    <stop
                        offset="1"
                        stopColor="#F97316"
                    />
                </linearGradient>
            </defs>
        </svg>
    )
}
