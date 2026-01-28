import CodeBlock from "@/components/code-block"
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { BundledLanguage } from 'shiki/bundle/web'

type CodeBlockType = 'i18next' | 'next-intl' | 'fetch'

export default function CodeBlockIllustration() {
    const [code, setCode] = useState<CodeBlockType>('i18next')
    const i18nextRef = useRef<HTMLButtonElement>(null)
    const nextIntlRef = useRef<HTMLButtonElement>(null)
    const fetchRef = useRef<HTMLButtonElement>(null)
    const [indicatorLeft, setIndicatorLeft] = useState(0)
    const [indicatorWidth, setIndicatorWidth] = useState(0)

    const langMap: { [key in CodeBlockType]: BundledLanguage } = {
        i18next: 'javascript',
        'next-intl': 'javascript',
        fetch: 'javascript',
    }

    const codeBlockConfigs = useMemo(
        () => [
            { name: 'i18next', value: 'i18next' as CodeBlockType, ref: i18nextRef, lang: 'javascript' as BundledLanguage },
            { name: 'next-intl', value: 'next-intl' as CodeBlockType, ref: nextIntlRef, lang: 'javascript' as BundledLanguage },
            { name: 'fetch', value: 'fetch' as CodeBlockType, ref: fetchRef, lang: 'javascript' as BundledLanguage },
        ],
        []
    )

    useEffect(() => {
        const activeConfig = codeBlockConfigs.find((config) => config.value === code)
        const activeRef = activeConfig ? activeConfig.ref : i18nextRef

        if (activeRef.current) {
            const parentElement = activeRef.current.parentElement
            if (parentElement) {
                const parentLeft = parentElement.getBoundingClientRect().left
                const buttonLeft = activeRef.current.getBoundingClientRect().left
                const buttonWidth = activeRef.current.offsetWidth

                const newIndicatorLeft = buttonLeft - parentLeft + 16
                const newIndicatorWidth = buttonWidth
                setIndicatorLeft(newIndicatorLeft)
                setIndicatorWidth(newIndicatorWidth)
            }
        }
    }, [code, codeBlockConfigs])

    const codes: { [key in CodeBlockType]: string } = {
        i18next: `import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

class UnlingoBackend {
    constructor() {
        this.type = 'backend';
        // You can add own options if needed
        this.init();
    }

    init() {}

    async read(language, namespace, callback) {
        try {
            const url = new URL('/v1/translations', 'https://api.unlingo.com');
            url.searchParams.set('release', process.env.UNLINGO_RELEASE_TAG);
            url.searchParams.set('namespace', namespace);
            url.searchParams.set('lang', language);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'x-api-key': process.env.UNLINGO_API_KEY,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return callback(new Error(errorData.error), null);
            }

            const data = await response.json();
            callback(null, data.translations);
        } catch (error) {
            console.error('Unlingo Backend Error:', error);
            callback(error, null);
        }
    }
}

export default UnlingoBackend;

i18next
  .use(UnlingoBackend)
  .use(initReactI18next)
  .init({
    ...
  });

export default i18next;`,
        'next-intl': `import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

    const url = new URL('/v1/translations', 'https://api.unlingo.com');
    url.searchParams.set('release', process.env.UNLINGO_RELEASE_TAG);
    url.searchParams.set('namespace', process.env.UNLINGO_NAMESPACE);
    url.searchParams.set('lang', locale);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-api-key': process.env.UNLINGO_API_KEY,
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();

  return {
    locale,
    messages: data.translations,
  };
});`,
        fetch: `const response = await fetch(
 'https://api.unlingo.com/v1/translations?release=YOUR_RELEASE_TAG&namespace=YOUR_NAMESPACE&lang=YOUR_LANGUAGE', {
 headers: {
  'Authorization': 'Bearer your-api-key',
 }
});

const data = await response.json();

console.log(data.translations.welcome);`,
    }

    const currentLang = langMap[code]

    return (
        <div className="ring-foreground/5 relative z-10 overflow-hidden rounded-2xl border border-transparent bg-zinc-900/35 pt-6 shadow-lg shadow-black/10 ring-1 backdrop-blur">
            <div className="relative z-10 px-3">
                <div className="flex gap-1.5 px-3">
                    <div className="bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border"></div>
                    <div className="bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border"></div>
                    <div className="bg-muted-foreground/10 border-foreground/5 size-2 rounded-full border"></div>
                </div>

                <div className="relative mt-4 flex gap-1">
                    <motion.span
                        animate={{ x: indicatorLeft, width: indicatorWidth }}
                        layout
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                        className="bg-foreground/5 border-foreground/5 absolute inset-y-0 -left-4 flex rounded-full border"
                    />

                    {codeBlockConfigs.map(({ name, value, ref }) => {
                        return (
                            <button
                                key={name}
                                ref={ref}
                                onClick={() => setCode(value)}
                                data-state={code === value ? 'active' : ''}
                                className="data-[state=active]:text-foreground z-10 flex h-8 items-center gap-1 rounded-full px-3 text-sm duration-150 hover:opacity-50 data-[state=active]:hover:opacity-100">
                                <span className="text-nowrap font-medium">{name}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
            <div className="h-82">
                <CodeBlock
                    code={codes[code]}
                    lang={currentLang}
                    maxHeight={360}
                    lineNumbers
                    className="[&_pre]:mask-y-from-85% -mx-1 [&_pre]:h-80 [&_pre]:min-h-[12rem] [&_pre]:rounded-xl [&_pre]:border-none [&_pre]:!bg-transparent"
                />
            </div>
        </div>
    )
}