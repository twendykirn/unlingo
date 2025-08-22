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
        <div className='h-screen overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800'>
            <div className='container mx-auto h-full flex flex-col px-4 sm:px-6 py-4 sm:py-6'>
                <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm mb-4 sm:mb-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3 sm:space-x-4'>
                            <Button
                                onClick={onGoBack}
                                variant='ghost'
                                size='icon'
                                className='text-gray-400 hover:text-white'>
                                <ArrowLeft className='h-4 w-4' />
                            </Button>
                            <div className='w-12 h-12 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-purple-500/20'>
                                <Languages className='h-6 w-6 text-purple-400' />
                            </div>
                            <div>
                                <h3 className='text-2xl font-semibold text-white'>Choose Editor Mode</h3>
                                <p className='text-gray-400 text-sm'>{screenshotName}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='flex-1 max-w-4xl mx-auto flex flex-col'>
                    <div className='grid md:grid-cols-2 gap-6'>
                        <div className='group bg-gray-950/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-500/5'>
                            <div className='flex items-center space-x-4 mb-6'>
                                <div className='w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors'>
                                    <Edit3 className='h-8 w-8 text-blue-400' />
                                </div>
                                <div>
                                    <h2 className='text-xl font-bold text-white transition-colors'>Edit Mode</h2>
                                    <p className='text-blue-400 text-sm font-medium'>Container Placement</p>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <p className='text-gray-300 leading-relaxed'>
                                    Place and configure translation containers on your screenshot. Perfect for setting
                                    up the visual mapping before translation work begins.
                                </p>

                                <div className='space-y-2'>
                                    <h3 className='text-sm font-medium text-blue-400'>What you can do:</h3>
                                    <ul className='space-y-1 text-sm text-gray-400'>
                                        <li>• Add containers to mark text elements</li>
                                        <li>• Resize and position containers precisely</li>
                                        <li>• Customize container colors</li>
                                        <li>• Add optional descriptions for context</li>
                                    </ul>
                                </div>

                                <div className='pt-4'>
                                    <Button
                                        className='w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-500 transition-colors'
                                        onClick={() => onModeSelect('edit')}>
                                        <Edit3 className='h-4 w-4 mr-2' />
                                        Start Editing Containers
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className='group bg-gray-950/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-200 hover:border-pink-500/50 hover:bg-pink-500/5'>
                            <div className='flex items-center space-x-4 mb-6'>
                                <div className='w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/20 transition-colors'>
                                    <Languages className='h-8 w-8 text-pink-400' />
                                </div>
                                <div>
                                    <h2 className='text-xl font-bold text-white transition-colors'>Translate Mode</h2>
                                    <p className='text-pink-400 text-sm font-medium'>Key Assignment & Translation</p>
                                </div>
                            </div>

                            <div className='space-y-4'>
                                <p className='text-gray-300 leading-relaxed'>
                                    Work with existing containers to assign translation keys and edit values. Ideal for
                                    the actual translation workflow.
                                </p>

                                <div className='space-y-2'>
                                    <h3 className='text-sm font-medium text-pink-400'>What you can do:</h3>
                                    <ul className='space-y-1 text-sm text-gray-400'>
                                        <li>• Select namespace, version, and language</li>
                                        <li>• Assign translation keys to containers</li>
                                        <li>• Edit translation values inline</li>
                                        <li>• Save changes back to language files</li>
                                    </ul>
                                </div>

                                <div className='pt-4'>
                                    <Button
                                        className='w-full bg-pink-600 hover:bg-pink-700 text-white group-hover:bg-pink-500 transition-colors'
                                        onClick={() => onModeSelect('translate')}>
                                        <Languages className='h-4 w-4 mr-2' />
                                        Start Translating
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='mt-8 p-6 bg-gray-950/30 border border-gray-800/30 rounded-xl'>
                        <div className='flex items-center space-x-3 mb-3'>
                            <div className='w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center'>
                                <span className='text-yellow-400 text-sm'>💡</span>
                            </div>
                            <h3 className='text-sm font-medium text-yellow-400'>Workflow Tip</h3>
                        </div>
                        <p className='text-sm text-gray-400 leading-relaxed'>
                            <strong className='text-white'>Recommended workflow:</strong> Start with{' '}
                            <span className='text-blue-400'>Edit Mode</span> to place and configure all your containers
                            first, then switch to <span className='text-pink-400'>Translate Mode</span> to assign keys
                            and translate content. You can switch between modes at any time.
                        </p>
                    </div>

                    <div className='mt-8 mb-4'>
                        <h3 className='text-lg font-semibold text-white mb-4'>Screenshot Preview</h3>
                        <div className='bg-gray-900 rounded-xl p-4 border border-gray-700'>
                            {screenshotUrl ? (
                                <div className='relative w-full h-64'>
                                    <Image
                                        src={screenshotUrl}
                                        alt={screenshotName}
                                        fill
                                        className='object-contain rounded-lg'
                                        sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
