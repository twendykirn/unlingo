import { PlusIcon, SearchIcon, StarIcon } from 'lucide-react'

interface TranslationKey {
    id: string
    key: string
    values: {
        en: string
        fr: string
        de: string
    }
}

const mockTranslationKeys: TranslationKey[] = [
    {
        id: '1',
        key: 'common.welcome',
        values: {
            en: 'Welcome to our app',
            fr: 'Bienvenue dans notre app',
            de: 'Willkommen in unserer App',
        },
    },
    {
        id: '2',
        key: 'common.logout',
        values: {
            en: 'Logout',
            fr: 'Déconnexion',
            de: 'Abmelden',
        },
    },
    {
        id: '3',
        key: 'common.save',
        values: {
            en: 'Save changes',
            fr: 'Enregistrer',
            de: 'Änderungen speichern',
        },
    },
    {
        id: '4',
        key: 'common.cancel',
        values: {
            en: 'Cancel',
            fr: 'Annuler',
            de: 'Abbrechen',
        },
    },
    {
        id: '5',
        key: 'errors.required',
        values: {
            en: 'This field is required',
            fr: 'Ce champ est requis',
            de: 'Dieses Feld ist erforderlich',
        },
    },
]

const languages = [
    { code: 'EN', isPrimary: true },
    { code: 'FR', isPrimary: false },
    { code: 'DE', isPrimary: false },
]

export default function EditorMockup() {
    return (
        <div
            aria-hidden
            className="bg-background/90 inset-ring-1 inset-ring-background border-foreground/10 m-auto max-w-lg translate-y-12 rounded-2xl border shadow-xl backdrop-blur-3xl overflow-hidden"
        >
            {/* Window dots */}
            <div className="flex gap-1 p-4 pb-0">
                <div className="bg-foreground/10 size-2 rounded-full" />
                <div className="bg-foreground/10 size-2 rounded-full" />
                <div className="bg-foreground/10 size-2 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium">common • 5 keys</h3>
                        <span className="text-[10px] text-muted-foreground">
                            Click on any cell to edit
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="bg-foreground/5 flex items-center gap-1.5 rounded-md px-2 py-1">
                            <SearchIcon className="size-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Search keys</span>
                        </div>
                        <div className="bg-primary flex items-center gap-1 rounded-md px-2 py-1">
                            <PlusIcon className="size-3" />
                            <span className="text-[10px]">Add Key</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden">
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="bg-zinc-900">
                            <th className="px-3 py-1.5 text-left font-semibold uppercase tracking-wider border-b border-r border-foreground/5">
                                Keys
                            </th>
                            {languages.map((lang) => (
                                <th
                                    key={lang.code}
                                    className="px-3 py-1.5 text-left font-semibold uppercase tracking-wider border-b border-r border-foreground/5"
                                >
                                    <div className="flex items-center gap-1">
                                        {lang.code}
                                        {lang.isPrimary && (
                                            <StarIcon className="size-2 text-yellow-400 fill-yellow-400" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {mockTranslationKeys.map((row) => (
                            <tr key={row.id} className="border-b border-foreground/5">
                                <td className="px-3 py-1.5 border-r border-foreground/5 font-medium">
                                    {row.key}
                                </td>
                                <td className="px-3 py-1.5 border-r border-foreground/5 text-muted-foreground">
                                    {row.values.en}
                                </td>
                                <td className="px-3 py-1.5 border-r border-foreground/5 text-muted-foreground">
                                    {row.values.fr}
                                </td>
                                <td className="px-3 py-1.5 text-muted-foreground">
                                    {row.values.de}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
