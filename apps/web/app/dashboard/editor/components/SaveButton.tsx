import { Button } from '@/components/ui/button';
import { Save, CheckCircle, Loader2 } from 'lucide-react';
import { hasUnsavedChanges$ } from '../store';
import { use$ } from '@legendapp/state/react';

interface Props {
    isSaving: boolean;
    emptyValueNodesLength: number;
    onSave: () => void;
}

export default function SaveButton({ isSaving, emptyValueNodesLength, onSave }: Props) {
    const hasUnsavedChanges = use$(hasUnsavedChanges$);

    const canSave = hasUnsavedChanges && emptyValueNodesLength === 0 && !isSaving;
    const hasErrors = emptyValueNodesLength > 0;

    return (
        <Button
            size='sm'
            onClick={onSave}
            disabled={!canSave}
            className={`transition-all px-4 ${
                canSave
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/30'
                    : hasErrors
                      ? 'bg-red-600/20 border-red-500/30 text-red-400 cursor-not-allowed'
                      : isSaving
                        ? 'bg-blue-600/50 border-blue-500/30 text-blue-300 cursor-not-allowed'
                        : 'bg-green-600/20 border-green-500/30 text-green-400 cursor-not-allowed'
            } border`}>
            {isSaving ? (
                <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Saving...
                </>
            ) : hasUnsavedChanges ? (
                hasErrors ? (
                    <>
                        Fix {emptyValueNodesLength} Error{emptyValueNodesLength !== 1 ? 's' : ''}
                    </>
                ) : (
                    <>
                        <Save className='h-4 w-4 mr-2' />
                        Save Changes
                    </>
                )
            ) : (
                <>
                    <CheckCircle className='h-4 w-4 mr-2' />
                    Saved
                </>
            )}
        </Button>
    );
}
