import type { SVGProps } from 'react'

export default function I18next(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
            {...props}>
            <rect
                width="256"
                height="256"
                rx="32"
                fill="#009688"
            />
            <text
                x="128"
                y="160"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize="100"
                fontWeight="bold"
                fill="#FFF">
                i18n
            </text>
        </svg>
    )
}
