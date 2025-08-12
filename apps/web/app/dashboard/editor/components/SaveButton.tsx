import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { hasUnsavedChanges$ } from '../store';
import { use$ } from '@legendapp/state/react';

interface Props {
    isSaving: boolean;
    emptyValueNodesLength: number;
    onSave: () => void;
}

export default function SaveButton({ isSaving, emptyValueNodesLength, onSave }: Props) {
    const hasUnsavedChanges = use$(hasUnsavedChanges$);

    return (
        <Button
            size='sm'
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving || emptyValueNodesLength > 0}
            className={`cursor-pointer ${
                hasUnsavedChanges && emptyValueNodesLength === 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 cursor-not-allowed text-white'
            }`}>
            <Save className='h-4 w-4 mr-2' />
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </Button>
    );
}
