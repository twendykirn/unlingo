'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, Languages } from 'lucide-react';
import Image from 'next/image';

type Mode = 'edit' | 'translate';

interface ModeSelectionViewProps {
    screenshotName: string;
    screenshotUrl: string;
    onGoBack: () => void;
    onModeSelect: (mode: Mode) => void;
}

export default function ModeSelectionView({
    screenshotName,
    screenshotUrl,
    onGoBack,
    onModeSelect,
}: ModeSelectionViewProps) {
    return (
        <div className='min-h-screen bg-black text-white'>
            <header className='fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800 px-6 py-4 backdrop-blur-sm'>
                <div className='flex items-center space-x-4'>
                    <Button onClick={onGoBack} variant='ghost' size='icon' className='text-gray-400 hover:text-white'>
                        <ArrowLeft className='h-4 w-4' />
                    </Button>
                    <h1 className='text-2xl font-bold'>
                        <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                            Unlingo
                        </span>
                    </h1>
                    <div className='h-6 w-px bg-gray-600' />
                    <div className='flex items-center space-x-2'>
                        <Languages className='h-5 w-5 text-gray-400' />
                        <h2 className='text-xl font-semibold text-white'>Choose Editor Mode</h2>
                    </div>
                </div>
            </header>

            <div className='flex-1 p-8 pt-24'>
                <div className='max-w-5xl mx-auto space-y-6'>
                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-center space-x-2'>
                            <h3 className='text-lg font-semibold text-white'>Screenshot</h3>
                            <span className='text-gray-400'>•</span>
                            <p className='text-gray-400'>{screenshotName}</p>
                        </div>
                    </div>

                    <div className='grid md:grid-cols-2 gap-6'>
                        <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm space-y-6'>
                            <div className='flex items-center space-x-4'>
                                <div className='w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center'>
                                    <Edit3 className='h-6 w-6 text-gray-400' />
                                </div>
                                <div>
                                    <h2 className='text-xl font-semibold text-white'>Edit Mode</h2>
                                    <p className='text-sm text-gray-400'>Container Placement</p>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <p className='text-gray-300 text-sm'>
                                    Place and configure translation containers on your screenshot. Perfect for setting
                                    up the visual mapping before translation work begins.
                                </p>

                                <div className='space-y-2'>
                                    <h3 className='text-sm font-medium text-white'>Features</h3>
                                    <ul className='space-y-1 text-sm text-gray-400'>
                                        <li>• Add containers to mark text elements</li>
                                        <li>• Resize and position containers precisely</li>
                                        <li>• Customize container colors</li>
                                        <li>• Add optional descriptions for context</li>
                                    </ul>
                                </div>

                                <Button className='w-full' onClick={() => onModeSelect('edit')}>
                                    <Edit3 className='h-4 w-4 mr-2' />
                                    Start Editing Containers
                                </Button>
                            </div>
                        </div>

                        <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm space-y-6'>
                            <div className='flex items-center space-x-4'>
                                <div className='w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center'>
                                    <Languages className='h-6 w-6 text-gray-400' />
                                </div>
                                <div>
                                    <h2 className='text-xl font-semibold text-white'>Translate Mode</h2>
                                    <p className='text-sm text-gray-400'>Key Assignment & Translation</p>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <p className='text-gray-300 text-sm'>
                                    Work with existing containers to assign translation keys and edit values. Ideal for
                                    the actual translation workflow.
                                </p>

                                <div className='space-y-2'>
                                    <h3 className='text-sm font-medium text-white'>Features</h3>
                                    <ul className='space-y-1 text-sm text-gray-400'>
                                        <li>• Select namespace, version, and language</li>
                                        <li>• Assign translation keys to containers</li>
                                        <li>• Edit translation values inline</li>
                                        <li>• Save changes back to language files</li>
                                    </ul>
                                </div>

                                <Button className='w-full' onClick={() => onModeSelect('translate')}>
                                    <Languages className='h-4 w-4 mr-2' />
                                    Start Translating
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <div className='flex items-start space-x-3'>
                            <div className='text-lg'>💡</div>
                            <div className='space-y-1'>
                                <h3 className='text-sm font-medium text-white'>Workflow Tip</h3>
                                <p className='text-sm text-gray-400'>
                                    Start with Edit Mode to place and configure all your containers first, then switch
                                    to Translate Mode to assign keys and translate content. You can switch between modes
                                    at any time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <h3 className='text-lg font-semibold text-white mb-4'>Screenshot Preview</h3>
                        {screenshotUrl ? (
                            <div className='relative w-full h-96 bg-black rounded-lg overflow-hidden'>
                                <Image
                                    src={screenshotUrl}
                                    alt={screenshotName}
                                    fill
                                    className='object-contain'
                                    sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
