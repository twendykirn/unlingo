'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useOrganization } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import ModeSelectionView from './components/ModeSelectionView';
import EditModeView from './components/EditModeView';
import TranslateModeView from './components/TranslateModeView';
import dynamic from 'next/dynamic';
import { isAddingContainer$, selectedContainerId$ } from './store';

type Mode = 'edit' | 'translate';

const ScreenshotCanvas = dynamic(() => import('@/components/konva'), {
    ssr: false,
    loading: () => (
        <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
            <div className='text-center py-16'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4'></div>
                <p className='text-gray-400'>Loading canvas...</p>
            </div>
        </div>
    ),
});

export default function ScreenshotEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { organization } = useOrganization();
    const params = useParams();

    const projectId = params?.projectId as Id<'projects'>;
    const screenshotId = params?.screenshotId as Id<'screenshots'>;

    const urlMode = searchParams.get('mode') as Mode;
    const mode: Mode = urlMode || 'edit';
    const showModeSelection = !urlMode;

    const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);

    const clerkId = organization?.id;
    const currentWorkspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const currentScreenshot = useQuery(
        api.screenshots.getScreenshot,
        screenshotId && currentWorkspace ? { screenshotId, workspaceId: currentWorkspace._id } : 'skip'
    );

    const containers = useQuery(
        api.screenshots.getContainersForScreenshot,
        screenshotId && currentWorkspace ? { screenshotId, workspaceId: currentWorkspace._id } : 'skip'
    );

    useEffect(() => {
        if (currentScreenshot?.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setCanvasImage(img);
            };
            img.src = currentScreenshot.imageUrl;
        }
    }, [currentScreenshot?.imageUrl]);

    const handleGoBack = () => {
        if (projectId) {
            router.push(`/dashboard/projects/${projectId}`);
        }
    };

    const handleModeSelect = (selectedMode: Mode) => {
        router.push(`/dashboard/projects/${projectId}/screenshots/${screenshotId}?mode=${selectedMode}`);
    };

    useEffect(() => {
        return () => {
            selectedContainerId$.set(null);
            isAddingContainer$.set(false);
        };
    }, []);

    if (!currentWorkspace || !currentScreenshot || !canvasImage) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    if (showModeSelection) {
        return (
            <ModeSelectionView
                screenshotName={currentScreenshot.name}
                screenshotUrl={currentScreenshot.imageUrl ?? ''}
                onGoBack={handleGoBack}
                onModeSelect={handleModeSelect}
            />
        );
    }

    return (
        <>
            {mode === 'edit' ? (
                <EditModeView
                    projectId={projectId}
                    workspaceId={currentWorkspace._id}
                    screenshotName={currentScreenshot.name}
                    containers={containers}
                    onSwitchToTranslate={() => handleModeSelect('translate')}>
                    <ScreenshotCanvas
                        workspaceId={currentWorkspace._id}
                        screenshotId={screenshotId}
                        canvasImage={canvasImage}
                        mode='edit'
                        containers={containers || []}
                    />
                </EditModeView>
            ) : (
                <TranslateModeView
                    projectId={projectId}
                    workspaceId={currentWorkspace._id}
                    screenshotName={currentScreenshot.name}
                    containers={containers}
                    onSwitchToEdit={() => handleModeSelect('edit')}>
                    <ScreenshotCanvas
                        workspaceId={currentWorkspace._id}
                        screenshotId={screenshotId}
                        canvasImage={canvasImage}
                        mode='translate'
                        containers={containers || []}
                    />
                </TranslateModeView>
            )}
        </>
    );
}
