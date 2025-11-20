'use client';

import { Button } from '@/components/ui/button';
import { PencilSquareIcon, LanguageIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Mode = 'edit' | 'translate';

interface ModeSelectionViewProps {
    screenshotName: string;
    screenshotUrl: string;
    onModeSelect: (mode: Mode) => void;
}

export default function ModeSelectionView({ screenshotName, screenshotUrl, onModeSelect }: ModeSelectionViewProps) {
    return (
        <div className='flex flex-col gap-6 p-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Choose Editor Mode</CardTitle>
                    <CardDescription>{screenshotName}</CardDescription>
                </CardHeader>
            </Card>

            <div className='grid md:grid-cols-2 gap-6'>
                <Card>
                    <CardHeader>
                        <div className='flex items-center gap-3'>
                            <PencilSquareIcon className='size-6' />
                            <div>
                                <CardTitle>Edit Mode</CardTitle>
                                <CardDescription>Container Placement</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            <p className='text-sm'>
                                Place and configure translation containers on your screenshot. Perfect for setting up
                                the visual mapping before translation work begins.
                            </p>

                            <div>
                                <h3 className='text-sm font-medium mb-2'>What you can do:</h3>
                                <ul className='space-y-1 text-sm text-muted-fg list-disc list-inside'>
                                    <li>Add containers to mark text elements</li>
                                    <li>Resize and position containers precisely</li>
                                    <li>Customize container colors</li>
                                    <li>Add optional descriptions for context</li>
                                </ul>
                            </div>

                            <Button className='w-full' onClick={() => onModeSelect('edit')}>
                                <PencilSquareIcon />
                                Start Editing Containers
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className='flex items-center gap-3'>
                            <LanguageIcon className='size-6' />
                            <div>
                                <CardTitle>Translate Mode</CardTitle>
                                <CardDescription>Key Assignment & Translation</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            <p className='text-sm'>
                                Work with existing containers to assign translation keys and edit values. Ideal for the
                                actual translation workflow.
                            </p>

                            <div>
                                <h3 className='text-sm font-medium mb-2'>What you can do:</h3>
                                <ul className='space-y-1 text-sm text-muted-fg list-disc list-inside'>
                                    <li>Select namespace, version, and language</li>
                                    <li>Assign translation keys to containers</li>
                                    <li>Edit translation values inline</li>
                                    <li>Save changes back to language files</li>
                                </ul>
                            </div>

                            <Button className='w-full' onClick={() => onModeSelect('translate')}>
                                <LanguageIcon />
                                Start Translating
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Workflow Tip</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-sm text-muted-fg'>
                        <strong className='font-medium text-foreground'>Recommended workflow:</strong> Start with Edit
                        Mode to place and configure all your containers first, then switch to Translate Mode to assign
                        keys and translate content. You can switch between modes at any time.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Screenshot Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    {screenshotUrl ? (
                        <div className='relative w-full h-64 border rounded-lg overflow-hidden'>
                            <Image
                                src={screenshotUrl}
                                alt={screenshotName}
                                fill
                                className='object-contain'
                                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                            />
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
