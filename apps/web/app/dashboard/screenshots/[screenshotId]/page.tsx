'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import ModeSelectionView from './components/ModeSelectionView';
import EditModeView from './components/EditModeView';
import TranslateModeView from './components/TranslateModeView';
import dynamic from 'next/dynamic';
import { isAddingContainer$, selectedContainerId$ } from './store';
import DashboardSidebar, { WorkspaceWithPremium } from '../../components/dashboard-sidebar';
import { Loader } from '@/components/ui/loader';

type Mode = 'edit' | 'translate';

const ScreenshotCanvas = dynamic(() => import('@/components/konva'), {
    ssr: false,
    loading: () => (
        <div className='flex items-center justify-center py-16'>
            <Loader isIndeterminate aria-label='Loading canvas...' />
        </div>
    ),
});

export default function ScreenshotEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();

    const screenshotId = params?.screenshotId as Id<'screenshots'>;

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);

    const urlMode = searchParams.get('mode') as Mode;
    const mode: Mode = urlMode || 'edit';
    const showModeSelection = !urlMode;

    const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);

    const currentScreenshot = useQuery(
        api.screenshots.getScreenshot,
        screenshotId && workspace ? { screenshotId, workspaceId: workspace._id } : 'skip'
    );

    const containers = useQuery(
        api.screenshots.getContainersForScreenshot,
        screenshotId && workspace ? { screenshotId, workspaceId: workspace._id } : 'skip'
    );

    const projectId = currentScreenshot?.projectId;

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

    const handleModeSelect = (selectedMode: Mode) => {
        router.push(`/dashboard/screenshots/${screenshotId}?mode=${selectedMode}`);
    };

    useEffect(() => {
        return () => {
            selectedContainerId$.set(null);
            isAddingContainer$.set(false);
        };
    }, []);

    return (
        <DashboardSidebar activeItem='screenshots' onWorkspaceChange={setWorkspace}>
            {workspace && currentScreenshot && canvasImage ? (
                <>
                    {showModeSelection ? (
                        <ModeSelectionView
                            screenshotName={currentScreenshot.name}
                            screenshotUrl={currentScreenshot.imageUrl ?? ''}
                            onModeSelect={handleModeSelect}
                        />
                    ) : (
                        <>
                            {mode === 'edit' ? (
                                <EditModeView
                                    workspaceId={workspace._id}
                                    screenshotName={currentScreenshot.name}
                                    containers={containers}
                                    onSwitchToTranslate={() => handleModeSelect('translate')}>
                                    <ScreenshotCanvas
                                        workspaceId={workspace._id}
                                        screenshotId={screenshotId}
                                        canvasImage={canvasImage}
                                        mode='edit'
                                        containers={containers || []}
                                    />
                                </EditModeView>
                            ) : (
                                <TranslateModeView
                                    projectId={projectId}
                                    workspaceId={workspace._id}
                                    screenshotName={currentScreenshot.name}
                                    containers={containers}
                                    onSwitchToEdit={() => handleModeSelect('edit')}>
                                    <ScreenshotCanvas
                                        workspaceId={workspace._id}
                                        screenshotId={screenshotId}
                                        canvasImage={canvasImage}
                                        mode='translate'
                                        containers={containers || []}
                                    />
                                </TranslateModeView>
                            )}
                        </>
                    )}
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
