import type { SVGProps } from 'react'

export default function ReactNative(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="-11.5 -10.232 23 20.463"
            xmlns="http://www.w3.org/2000/svg"
            {...props}>
            <circle
                r="2.05"
                fill="#61dafb"
            />
            <g
                fill="none"
                stroke="#61dafb"
                strokeWidth="1">
                <ellipse
                    rx="11"
                    ry="4.2"
                />
                <ellipse
                    rx="11"
                    ry="4.2"
                    transform="rotate(60)"
                />
                <ellipse
                    rx="11"
                    ry="4.2"
                    transform="rotate(120)"
                />
            </g>
        </svg>
    )
}
