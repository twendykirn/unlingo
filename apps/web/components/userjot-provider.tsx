'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare module 'react-aria-components' {
    interface RouterConfig {
        routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;
    }
}

export function UserjotProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <Script id='load-userjot'>{`window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));`}</Script>
        </>
    );
}
