'use client'

import { useState } from 'react'
import {
    ArrowLeft,
    ChevronDownIcon,
    CopyIcon,
    KeyRound,
    LanguagesIcon,
    Newspaper,
    PencilRulerIcon,
    PlusIcon,
    RocketIcon,
    SearchIcon,
    StarIcon,
} from 'lucide-react'

interface TranslationKey {
    id: string
    key: string
    values: {
        en: string
        fr: string
        de: string
    }
}

const initialMockTranslationKeys: TranslationKey[] = [
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
            fr: 'Deconnexion',
            de: 'Abmelden',
        },
    },
    {
        id: '3',
        key: 'common.save',
        values: {
            en: 'Save changes',
            fr: 'Enregistrer',
            de: 'Anderungen speichern',
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
    { code: 'EN', key: 'en' as const, isPrimary: true },
    { code: 'FR', key: 'fr' as const, isPrimary: false },
    { code: 'DE', key: 'de' as const, isPrimary: false },
]

const sidebarItems = [
    { icon: LanguagesIcon, label: 'Languages', active: false },
    { icon: Newspaper, label: 'Namespaces', active: true },
    { icon: PencilRulerIcon, label: 'Glossary', active: false },
    { icon: RocketIcon, label: 'Releases', active: false },
    { icon: KeyRound, label: 'Api Keys', active: false },
]

function EditableCell({
    value,
    onSave,
    isKey = false,
}: {
    value: string
    onSave?: (newValue: string) => void
    isKey?: boolean
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(value)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (value !== editValue && editValue.trim()) {
                onSave?.(editValue)
            }
            setIsEditing(false)
        } else if (e.key === 'Escape') {
            setEditValue(value)
            setIsEditing(false)
        }
    }

    if (isEditing && !isKey) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (value !== editValue && editValue.trim()) {
                        onSave?.(editValue)
                    }
                    setIsEditing(false)
                }}
                autoFocus
                className="w-full px-1 py-0.5 text-[10px] bg-zinc-800 border border-primary rounded outline-none"
            />
        )
    }

    return (
        <div
            onClick={() => {
                if (!isKey) {
                    setIsEditing(true)
                }
            }}
            className={`truncate flex items-center gap-1 group ${!isKey ? 'cursor-pointer hover:bg-zinc-800/50 rounded px-1 -mx-1' : ''}`}
        >
            <span className={`truncate ${!isKey && 'text-muted-foreground'}`}>
                {value || <span className="text-zinc-500 italic">Empty</span>}
            </span>
            {isKey && value && (
                <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded"
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    <CopyIcon className="size-2 text-muted-foreground" />
                </button>
            )}
        </div>
    )
}

export default function EditorMockup() {
    const [translationKeys, setTranslationKeys] = useState<TranslationKey[]>(initialMockTranslationKeys)
    const [searchValue, setSearchValue] = useState('')
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    const handleCellUpdate = (
        keyId: string,
        langKey: 'en' | 'fr' | 'de',
        newValue: string
    ) => {
        setTranslationKeys((prev) =>
            prev.map((key) =>
                key.id === keyId
                    ? { ...key, values: { ...key.values, [langKey]: newValue } }
                    : key
            )
        )
    }

    const toggleRowSelection = (keyId: string) => {
        setSelectedRows((prev) => {
            const next = new Set(prev)
            if (next.has(keyId)) {
                next.delete(keyId)
            } else {
                next.add(keyId)
            }
            return next
        })
    }

    const toggleAllRows = () => {
        if (selectedRows.size === translationKeys.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(translationKeys.map((k) => k.id)))
        }
    }

    const filteredKeys = translationKeys.filter(
        (key) =>
            key.key.toLowerCase().includes(searchValue.toLowerCase()) ||
            Object.values(key.values).some((v) =>
                v.toLowerCase().includes(searchValue.toLowerCase())
            )
    )

    return (
        <div
            aria-hidden
            className="bg-background/90 inset-ring-1 inset-ring-background border-foreground/10 m-auto max-w-2xl translate-y-12 rounded-2xl border shadow-xl backdrop-blur-3xl overflow-hidden"
        >
            {/* Window dots */}
            <div className="flex gap-1 p-3 pb-0">
                <div className="bg-foreground/10 size-2 rounded-full" />
                <div className="bg-foreground/10 size-2 rounded-full" />
                <div className="bg-foreground/10 size-2 rounded-full" />
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-36 border-r border-foreground/5 p-2 flex flex-col gap-1">
                    {/* Workspace switcher */}
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-zinc-800 text-left w-full mb-1"
                    >
                        <div className="size-5 rounded bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                            U
                        </div>
                        <span className="text-[10px] font-medium truncate flex-1">Unlingo</span>
                        <ChevronDownIcon className="size-2.5 text-muted-foreground" />
                    </button>

                    {/* Back to dashboard */}
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 text-[9px] text-muted-foreground"
                    >
                        <ArrowLeft className="size-2.5" />
                        <span>Back to dashboard</span>
                    </button>

                    <div className="h-px bg-foreground/5 my-1" />

                    {/* Nav items */}
                    {sidebarItems.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] ${
                                item.active
                                    ? 'bg-zinc-800 text-foreground'
                                    : 'text-muted-foreground hover:bg-zinc-800/50'
                            }`}
                        >
                            <item.icon className="size-2.5" />
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* User */}
                    <div className="mt-auto pt-2 border-t border-foreground/5">
                        <button
                            type="button"
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800 w-full"
                        >
                            <div className="size-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                            <span className="text-[9px] text-muted-foreground truncate">user@example.com</span>
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="p-3 pb-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-[11px] font-medium">common</h3>
                                <span className="text-[9px] text-muted-foreground">
                                    {filteredKeys.length} keys
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="bg-foreground/5 flex items-center gap-1 rounded-md px-2 py-1">
                                    <SearchIcon className="size-2.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        className="text-[9px] bg-transparent outline-none w-12 placeholder:text-muted-foreground"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="bg-primary flex items-center gap-0.5 rounded-md px-2 py-1 hover:bg-primary/90"
                                >
                                    <PlusIcon className="size-2.5" />
                                    <span className="text-[9px]">Add Key</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden flex-1">
                        <table className="w-full text-[9px]">
                            <thead>
                                <tr className="bg-zinc-900">
                                    <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider border-b border-r border-foreground/5 w-6">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.size === translationKeys.length && translationKeys.length > 0}
                                            onChange={toggleAllRows}
                                            className="size-2.5 rounded border-foreground/20"
                                        />
                                    </th>
                                    <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider border-b border-r border-foreground/5">
                                        Keys
                                    </th>
                                    {languages.map((lang) => (
                                        <th
                                            key={lang.code}
                                            className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider border-b border-r border-foreground/5"
                                        >
                                            <div className="flex items-center gap-0.5">
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
                                {filteredKeys.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-foreground/5 ${
                                            selectedRows.has(row.id) ? 'bg-primary/5' : ''
                                        }`}
                                    >
                                        <td className="px-2 py-1.5 border-r border-foreground/5">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(row.id)}
                                                onChange={() => toggleRowSelection(row.id)}
                                                className="size-2.5 rounded border-foreground/20"
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-foreground/5 font-medium max-w-[100px]">
                                            <EditableCell value={row.key} isKey />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-foreground/5 max-w-[100px]">
                                            <EditableCell
                                                value={row.values.en}
                                                onSave={(newValue) =>
                                                    handleCellUpdate(row.id, 'en', newValue)
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 border-r border-foreground/5 max-w-[100px]">
                                            <EditableCell
                                                value={row.values.fr}
                                                onSave={(newValue) =>
                                                    handleCellUpdate(row.id, 'fr', newValue)
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 max-w-[100px]">
                                            <EditableCell
                                                value={row.values.de}
                                                onSave={(newValue) =>
                                                    handleCellUpdate(row.id, 'de', newValue)
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
