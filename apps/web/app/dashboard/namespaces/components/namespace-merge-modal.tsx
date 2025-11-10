import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useAction } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Note } from '@/components/ui/note';

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    workspace: Doc<'workspaces'>;
    namespace: Doc<'namespaces'>;
}

const branches = [
    {
        id: 'development',
        name: 'Development',
    },
    {
        id: 'production',
        name: 'Production',
    },
];

const NamespaceMergeModal = ({ isOpen, setIsOpen, workspace, namespace }: Props) => {
    const [sourceVersion, setSourceVersion] = useState<'development' | 'production'>('development');
    const [targetVersion, setTargetVersion] = useState<'development' | 'production'>('production');
    const [isLoading, setIsLoading] = useState(false);

    const mergeNamespaceVersions = useAction(api.namespaceVersions.mergeNamespaceVersions);

    const handleMerge = async () => {
        if (!workspace) return;

        if (sourceVersion === targetVersion) {
            toast.error('Source and target versions must be different');
            return;
        }

        setIsLoading(true);

        try {
            await mergeNamespaceVersions({
                namespaceId: namespace._id,
                workspaceId: workspace._id,
                sourceVersion,
                targetVersion,
            });

            toast.success(`Successfully started merging ${sourceVersion} into ${targetVersion}`);
            setIsOpen(false);
        } catch (error) {
            toast.error(`Failed to merge versions: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSourceChange = (key: string | null) => {
        if (!key) return;
        const newSource = key as 'development' | 'production';
        setSourceVersion(newSource);

        if (newSource === targetVersion) {
            setTargetVersion(newSource === 'development' ? 'production' : 'development');
        }
    };

    const handleTargetChange = (key: string | null) => {
        if (!key) return;
        const newTarget = key as 'development' | 'production';
        setTargetVersion(newTarget);

        if (newTarget === sourceVersion) {
            setSourceVersion(newTarget === 'development' ? 'production' : 'development');
        }
    };

    return (
        <ModalContent isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalHeader>
                <ModalTitle>Merge Namespace Versions</ModalTitle>
                <ModalDescription>
                    Merge the content of one version into another. All files in the target version will be replaced with
                    files from the source version. Languages that exist only in the target will be removed. Languages
                    that exist only in the source will be created in the target.
                </ModalDescription>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div>
                        <Label>Source Version (merge from)</Label>
                        <Select value={sourceVersion} onChange={key => handleSourceChange(key ? key.toString() : null)}>
                            <SelectTrigger />
                            <SelectContent items={branches}>
                                {item => (
                                    <SelectItem id={item.id} textValue={item.name}>
                                        {item.name}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Target Version (merge into)</Label>
                        <Select value={targetVersion} onChange={key => handleTargetChange(key ? key.toString() : null)}>
                            <SelectTrigger />
                            <SelectContent items={branches}>
                                {item => (
                                    <SelectItem id={item.id} textValue={item.name}>
                                        {item.name}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <Note intent='danger'>
                        Warning: This will replace all content in <strong>{targetVersion}</strong> with content from{' '}
                        <strong>{sourceVersion}</strong>. This action cannot be undone.
                    </Note>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalClose>Cancel</ModalClose>
                <Button intent='warning' isPending={isLoading} onClick={handleMerge}>
                    {isLoading ? <Loader /> : 'Merge Versions'}
                </Button>
            </ModalFooter>
        </ModalContent>
    );
};

export default NamespaceMergeModal;
