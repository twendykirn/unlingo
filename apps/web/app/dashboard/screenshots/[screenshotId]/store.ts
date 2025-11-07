import { Id } from '@/convex/_generated/dataModel';
import { observable } from '@legendapp/state';

export const selectedContainerId$ = observable<Id<'screenshotContainers'> | null>(null);
export const isAddingContainer$ = observable(false);
