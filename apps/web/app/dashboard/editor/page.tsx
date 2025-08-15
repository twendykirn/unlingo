'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, X, ArrowLeft, Code, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useAction } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { validateWithAjv } from '@/lib/zodSchemaGenerator';
import * as diff from 'json-diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import EmptyValuesButton from './components/EmptyValuesButton';
import { TranslationNode } from './types';
import { convertNodesToJson } from './utils/convertNodesToJson';
import { createNodesFromJson } from './utils/createNodesFromJson';
import JsonEditModeModal from './components/JsonEditModeModal';
import { isValidJson } from './utils/isValidJson';
import TreeView from './components/TreeView';
import { createStructuredChanges } from './utils/createStructuredChanges';
import { validateNodes } from './utils/validateNodes';
import { collectEmptyValueNodes } from './utils/collectEmptyValueNodes';
import { getUIValueAsJSON } from './utils/getUIValueAsJson';
import NodeInfoContainer from './components/NodeInfoContainer';
import AddKeyModal from './components/AddKeyModal';
import { useObserve } from '@legendapp/state/react';
import { expandedKeys$, filteredNodes$, hasUnsavedChanges$, nodes$, searchQuery$, selectedNode$ } from './store';
import SaveButton from './components/SaveButton';
import SearchField from './components/SearchField';
import AddNewTranslationKeyTitle from './components/AddNewTranslationKeyTitle';

interface LanguageChanges {
    changes: any; // The structured changes object
    timestamp: number;
    languageId: string;
    isPrimaryLanguage: boolean;
}

export default function TranslationEditor() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Extract URL parameters - only languageId is needed
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;

    const [showAddKeyModal, setShowAddKeyModal] = useState(false);
    const [addKeyParent, setAddKeyParent] = useState<string | null>(null);
    const [availableParents, setAvailableParents] = useState<{ id: string; key: string }[]>([]);
    const [emptyValueNodes, setEmptyValueNodes] = useState<TranslationNode[]>([]);

    // JSON Schema state for primary language validation
    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    // Track original content for change detection
    const [originalJsonContent, setOriginalJsonContent] = useState<string>('');

    const [didInit, setDidInit] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);

    // Backend queries and mutations
    const applyChangeOperations = useAction(api.languages.applyChangeOperations);

    // Get current workspace
    const clerkId = organization?.id || user?.id;
    const currentWorkspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Get language details with workspace ownership verification
    const language = useQuery(
        api.languages.getLanguageWithContext,
        languageId && currentWorkspace
            ? {
                  languageId,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip'
    );

    // Get language content as JSON object directly
    const getLanguageContent = useAction(api.languages.getLanguageContent);

    const getJsonSchema = useAction(api.languages.getJsonSchema);

    // Derive current values from backend data
    const selectedLanguage = language?.languageCode || 'en';

    // Check if this is the primary language
    const isPrimaryLanguage = !!language?.isPrimary;

    // Generate changes using json-diff for primary language saves
    const generateLanguageChanges = (oldJson: any, newJson: any): LanguageChanges => {
        const fullDiff = diff.diff(oldJson, newJson, { full: true });

        // Create structured changes with precise array indexing
        const changes = createStructuredChanges(fullDiff);

        return {
            changes,
            timestamp: Date.now(),
            languageId: languageId!,
            isPrimaryLanguage,
        };
    };

    // Navigation function to go back
    const handleGoBack = () => {
        if (hasUnsavedChanges$.get()) {
            const confirmSwitch = window.confirm('You have unsaved changes. Going back will discard them. Continue?');
            if (!confirmSwitch) return;
        }

        if (language) {
            // Navigate back to the language's version page
            router.push(
                `/dashboard/projects/${language.projectId}/namespaces/${language.namespaceId}/versions/${language.namespaceVersionId}`
            );
        } else {
            router.push('/dashboard');
        }
    };

    const getContentOnInit = async () => {
        try {
            if (!languageId || !currentWorkspace || !language) return;

            setLoadingContent(true);

            const languageContent = await getLanguageContent({
                languageId,
                workspaceId: currentWorkspace._id,
            });

            const primarySchema = await getJsonSchema({
                namespaceVersionId: language.namespaceVersionId,
                workspaceId: currentWorkspace._id,
            });

            if (primarySchema) {
                setPrimaryLanguageSchema(JSON.parse(primarySchema));
            }
            // languageContent is already parsed JSON object from the query
            // It will be {} (empty object) if no content exists, which is fine
            const initialNodes = createNodesFromJson(languageContent);
            nodes$.set(initialNodes);
            hasUnsavedChanges$.set(false);

            // Initialize original content for change detection
            setOriginalJsonContent(JSON.stringify(languageContent, null, 2));
            setDidInit(true);
        } catch (error) {
            console.error('Failed to process language content:', error);
            // Fallback to empty state if content is invalid
            nodes$.set([]);
            hasUnsavedChanges$.set(false);
        } finally {
            setLoadingContent(false);
        }
    };

    // Load language content from backend using the new query
    useEffect(() => {
        if (!didInit && languageId && currentWorkspace?._id && language) {
            getContentOnInit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [languageId, currentWorkspace, didInit, language]);

    // Navigate to and select an empty value node
    const navigateToEmptyValue = (nodeId: string) => {
        const nodes = nodes$.get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Select the node
        selectedNode$.set(node);

        // Expand parent nodes to make sure the node is visible
        const keyParts = node.key.split('.');
        const newExpandedKeys = new Set(expandedKeys$.get());

        for (let i = 1; i < keyParts.length; i++) {
            const parentKey = keyParts.slice(0, i).join('.');
            const parentNode = nodes.find(n => n.key === parentKey);
            if (parentNode) {
                newExpandedKeys.add(parentNode.id);
            }
        }
        expandedKeys$.set(newExpandedKeys);
    };

    const onNodeDelete = (newNodes: TranslationNode[]) => {
        nodes$.set(newNodes);
        selectedNode$.set(null);
        hasUnsavedChanges$.set(true);
    };

    const onAddParentNode = (nodeId: string) => {
        const objectNodes = nodes$
            .get()
            .filter(node => node.type === 'object')
            .map(node => ({ id: node.id, key: node.key }))
            .sort((a, b) => a.key.localeCompare(b.key));
        setAvailableParents(objectNodes);
        setAddKeyParent(nodeId);
        setShowAddKeyModal(true);
    };

    const handleSave = async () => {
        if (!hasUnsavedChanges$.get() || !languageId || !currentWorkspace) return;

        const nodes = nodes$.get();

        // Validate before saving
        const isValid = validateNodes(nodes);
        if (!isValid) {
            alert(`Cannot save: ${emptyValueNodes.length} empty values found. Please fill in all required fields.`);
            return;
        }

        setIsSaving(true);

        try {
            // Convert nodes back to JSON structure
            const jsonContent = convertNodesToJson(nodes);

            // Validate against JSON schema if available (for non-primary languages)
            if (!isPrimaryLanguage && primaryLanguageSchema) {
                const validation = validateWithAjv(jsonContent, primaryLanguageSchema);

                if (!validation.isValid) {
                    const errorMessage =
                        validation.errors
                            ?.slice(0, 3)
                            .map(err => `• ${err.instancePath || 'root'}: ${err.message}`)
                            .join('\n') || 'Unknown validation errors';

                    alert(
                        `Schema validation failed:\n${errorMessage}${validation.errors && validation.errors.length > 3 ? '\n... and more errors' : ''}`
                    );
                    setIsSaving(false);
                    return; // Don't save if validation fails
                }
            }

            // Generate changes using json-diff for primary language saves
            const originalJson = originalJsonContent ? JSON.parse(originalJsonContent) : {};
            const languageChanges = generateLanguageChanges(originalJson, jsonContent);

            // Save with changes for backend sync - only send changes for primary language
            await applyChangeOperations({
                languageId,
                workspaceId: currentWorkspace._id,
                ...(languageChanges.changes !== undefined ? { languageChanges } : {}),
            });

            // Update original content for next time
            setOriginalJsonContent(JSON.stringify(jsonContent, null, 2));

            // Update the original state to reflect saved changes
            hasUnsavedChanges$.set(false);
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Add new key functionality
    const addNewKey = (keyName: string, finalValue: string, addKeyMode: 'ui' | 'json', uiData: any) => {
        try {
            // Validate and parse the value
            let parsedValue;
            let nodeType: 'object' | 'string' | 'array' | 'number' | 'boolean' = 'string';

            // Check if it's valid JSON
            if (isValidJson(finalValue)) {
                try {
                    parsedValue = JSON.parse(finalValue);
                    if (Array.isArray(parsedValue)) {
                        nodeType = 'array';
                    } else if (typeof parsedValue === 'object' && parsedValue !== null) {
                        nodeType = 'object';
                    } else if (typeof parsedValue === 'number') {
                        nodeType = 'number';
                    } else if (typeof parsedValue === 'boolean') {
                        nodeType = 'boolean';
                    } else {
                        nodeType = 'string';
                    }
                } catch {
                    alert('Invalid JSON format');
                    return;
                }
            } else {
                alert('Please enter valid JSON or fix the syntax');
                return;
            }

            const nodes = nodes$.get();

            if (addKeyParent) {
                // Adding to a parent node
                const parentNode = nodes.find(n => n.id === addKeyParent);
                if (!parentNode) {
                    alert('Parent node not found');
                    return;
                }

                // Check if parent is an object type
                if (parentNode.type !== 'object') {
                    alert('Can only add keys to object nodes');
                    return;
                }

                // Check if key already exists at this level
                const newNodeKey = `${parentNode.key}.${keyName.trim()}`;
                const existingNode = nodes.find(n => n.key === newNodeKey);
                if (existingNode) {
                    alert('A key with this name already exists at this level');
                    return;
                }

                const newNodeId = `node-${newNodeKey}`;

                const newNode: TranslationNode = {
                    id: newNodeId,
                    key: newNodeKey,
                    value: parsedValue,
                    type: nodeType,
                    parent: addKeyParent,
                    children: [],
                };

                // Only create child nodes for objects (not for strings or arrays)
                const newNodes = [newNode];
                if (nodeType === 'object') {
                    const childNodes = createNodesFromJson(parsedValue);
                    const updatedChildNodes = childNodes.map(childNode => ({
                        ...childNode,
                        id: `node-${newNodeKey}.${childNode.key}`,
                        key: `${newNodeKey}.${childNode.key}`,
                        parent: newNodeId,
                    }));
                    newNodes.push(...updatedChildNodes);
                    newNode.children = updatedChildNodes.map(child => child.id);
                }

                // Update the parent's children array
                nodes$.set(prev => [
                    ...prev.map(node =>
                        node.id === addKeyParent ? { ...node, children: [...node.children, newNodeId] } : node
                    ),
                    ...newNodes,
                ]);

                // Mark as unsaved
                hasUnsavedChanges$.set(true);
            } else {
                // Adding to root level - merge with existing JSON structure
                const rootKeyName = keyName.trim();

                // Check if key already exists at root level
                const existingRootNode = nodes.find(n => !n.parent && n.key === rootKeyName);
                if (existingRootNode) {
                    alert('A key with this name already exists at the root level');
                    return;
                }

                // Get current JSON structure
                const currentJson = convertNodesToJson(nodes);

                // Add new key to the structure
                const updatedJson = {
                    ...currentJson,
                    [rootKeyName]: parsedValue,
                };

                // Rebuild all nodes from the merged JSON
                const newNodes = createNodesFromJson(updatedJson);
                nodes$.set(newNodes);

                // Mark as unsaved
                hasUnsavedChanges$.set(true);
            }

            // Reset modal state
            setShowAddKeyModal(false);
            setAvailableParents([]);
            setAddKeyParent(null);
            hasUnsavedChanges$.set(true);
        } catch {
            alert('Failed to add key. Please check your input.');
        }
    };

    // Search and filter functionality
    const filterNodes = (query: string): TranslationNode[] => {
        const nodes = nodes$.get();
        if (!query.trim()) return nodes;

        const lowerQuery = query.toLowerCase();
        const matchingNodes = new Set<string>();

        // Find nodes that match the search query
        nodes.forEach(node => {
            const keyMatches = node.key.toLowerCase().includes(lowerQuery);
            let valueMatches = false;

            if (typeof node.value === 'string') {
                valueMatches = node.value.toLowerCase().includes(lowerQuery);
            } else if (typeof node.value === 'object' && node.value !== null) {
                // Search in translation values
                const values = Object.values(node.value);
                valueMatches = values.some(val => typeof val === 'string' && val.toLowerCase().includes(lowerQuery));
            }

            if (keyMatches || valueMatches) {
                matchingNodes.add(node.id);

                // Include parent chain
                let current = node;
                while (current.parent) {
                    matchingNodes.add(current.parent);
                    current = nodes.find(n => n.id === current.parent)!;
                }

                // Include all children
                const addChildren = (childId: string) => {
                    const node = nodes.find(n => n.id === childId);
                    if (node) {
                        node.children.forEach(child => {
                            matchingNodes.add(childId);
                            addChildren(child);
                        });
                    }
                };
                addChildren(node.id);
            }
        });

        return nodes.filter(node => matchingNodes.has(node.id));
    };

    // Update filtered nodes when search query or nodes change
    useObserve(searchQuery$, ({ value }) => {
        if (value !== undefined) {
            const filtered = filterNodes(value);
            filteredNodes$.set(filtered);
        }
    });

    useObserve(nodes$, ({ value }) => {
        if (value !== undefined) {
            const searchQuery = searchQuery$.get();
            const filtered = filterNodes(searchQuery);
            filteredNodes$.set(filtered);
            setEmptyValueNodes(collectEmptyValueNodes(value));
        }
    });

    useObserve(() => {
        if (nodes$.get().length > 0 && expandedKeys$.get().size === 0) {
            const rootNodes = nodes$.get().filter(node => !node.parent);
            const newExpanded = new Set(rootNodes.map(node => node.id));
            expandedKeys$.set(newExpanded);
        }
    });

    // Handle loading and error states
    if (!currentWorkspace && clerkId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading workspace...</p>
                </div>
            </div>
        );
    }

    if (!languageId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-xl font-semibold text-gray-400 mb-2'>No Language Selected</h2>
                    <p className='text-gray-500'>Please select a language from the project dashboard.</p>
                    <Button onClick={() => router.push('/dashboard')} className='mt-4 bg-blue-600 hover:bg-blue-700'>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (language === null) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-xl font-semibold text-red-400 mb-2'>Access Denied</h2>
                    <p className='text-gray-500'>
                        You don't have permission to edit this language or it doesn't exist.
                    </p>
                    <Button onClick={() => router.push('/dashboard')} className='mt-4 bg-blue-600 hover:bg-blue-700'>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (!language || loadingContent) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading language...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='h-screen bg-black text-white flex flex-col overflow-hidden'>
            {/* Elegant Header */}
            <header className='bg-gray-950/95 border-b border-gray-800/50 px-6 py-4 backdrop-blur-md'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-6'>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={handleGoBack}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50 cursor-pointer transition-all rounded-lg'>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back
                        </Button>

                        <div className='flex items-center space-x-4'>
                            <div className='w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30'>
                                <Code className='h-5 w-5 text-cyan-400' />
                            </div>
                            <div>
                                <div className='flex items-center space-x-2'>
                                    <h1 className='text-xl font-semibold text-white'>Translation Editor</h1>
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                className='h-6 w-6 p-0 text-gray-400 hover:text-white'>
                                                <Info className='h-4 w-4' />
                                            </Button>
                                        </HoverCardTrigger>
                                        <HoverCardContent className='w-80 bg-gray-950/95 border-gray-800/50 text-white backdrop-blur-md'>
                                            <div className='space-y-3'>
                                                <div className='flex items-center space-x-2'>
                                                    <Info className='h-4 w-4 text-blue-400' />
                                                    <h4 className='text-sm font-semibold text-blue-400'>
                                                        JSON Editor Tips
                                                    </h4>
                                                </div>
                                                <div className='space-y-2 text-xs text-gray-300'>
                                                    <div>
                                                        <p className='font-medium text-yellow-400 mb-1'>
                                                            ⚠️ Common Mistakes:
                                                        </p>
                                                        <ul className='space-y-1 text-gray-400'>
                                                            <li>
                                                                •{' '}
                                                                <code className='bg-gray-800 px-1 rounded'>
                                                                    ['1', '2']
                                                                </code>{' '}
                                                                saves as strings, not array
                                                            </li>
                                                            <li>
                                                                •{' '}
                                                                <code className='bg-gray-800 px-1 rounded'>{`{key: 'value'}`}</code>{' '}
                                                                is invalid - keys need quotes
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className='font-medium text-green-400 mb-1'>
                                                            ✅ Correct Format:
                                                        </p>
                                                        <ul className='space-y-1 text-gray-400'>
                                                            <li>
                                                                •{' '}
                                                                <code className='bg-gray-800 px-1 rounded'>
                                                                    [1, 2, 3]
                                                                </code>{' '}
                                                                for numbers
                                                            </li>
                                                            <li>
                                                                •{' '}
                                                                <code className='bg-gray-800 px-1 rounded'>
                                                                    ["one", "two"]
                                                                </code>{' '}
                                                                for strings
                                                            </li>
                                                            <li>
                                                                •{' '}
                                                                <code className='bg-gray-800 px-1 rounded'>{`{"key": "value"}`}</code>{' '}
                                                                for objects
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div className='pt-2 border-t border-gray-800/50'>
                                                        <p className='text-amber-400 text-xs'>
                                                            💡 <strong>Pro tip:</strong> If JSON is invalid, values are
                                                            automatically saved as strings to prevent data loss.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
                                </div>
                                <div className='flex items-center space-x-2 text-xs text-gray-400'>
                                    <span className='px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700/50'>
                                        {language.namespaceName}
                                    </span>
                                    <span className='px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700/50'>
                                        {language.version}
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-md border font-medium ${
                                            isPrimaryLanguage
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        }`}>
                                        {selectedLanguage.toUpperCase()} {isPrimaryLanguage ? '(Primary)' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center space-x-3'>
                        <EmptyValuesButton emptyNodes={emptyValueNodes} onNavigateToEmptyValue={navigateToEmptyValue} />
                        <JsonEditModeModal
                            isPrimaryLanguage={isPrimaryLanguage}
                            primaryLanguageSchema={primaryLanguageSchema}
                        />
                        <SaveButton
                            isSaving={isSaving}
                            emptyValueNodesLength={emptyValueNodes.length}
                            onSave={handleSave}
                        />
                    </div>
                </div>
            </header>

            {/* Enhanced Toolbar */}
            <div className='bg-gray-900/50 border-b border-gray-800/50 px-6 py-4 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <SearchField />
                    </div>

                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!isPrimaryLanguage}
                        className={`transition-all ${
                            isPrimaryLanguage
                                ? 'cursor-pointer border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50'
                                : 'cursor-not-allowed opacity-50'
                        }`}
                        onClick={() => {
                            if (!isPrimaryLanguage) {
                                alert(
                                    'Only the primary language can add translation keys. Non-primary languages can only edit values.'
                                );
                                return;
                            }
                            const objectNodes = nodes$
                                .get()
                                .filter(node => node.type === 'object')
                                .map(node => ({ id: node.id, key: node.key }))
                                .sort((a, b) => a.key.localeCompare(b.key));
                            setAvailableParents(objectNodes);
                            setAddKeyParent(null);
                            setShowAddKeyModal(true);
                        }}
                        title={isPrimaryLanguage ? 'Add new translation key' : 'Only primary language can add keys'}>
                        <Plus className='h-4 w-4 mr-2' />
                        Add Key
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className='flex flex-1 min-h-0'>
                {/* Tree View */}
                <ScrollArea className='flex-1 bg-gray-900/30'>
                    <TreeView />
                </ScrollArea>

                <NodeInfoContainer
                    isPrimaryLanguage={isPrimaryLanguage}
                    onDeleteNode={onNodeDelete}
                    onAddParentNode={onAddParentNode}
                />
            </div>

            {/* Elegant Add Key Dialog */}
            <AddKeyModal
                isOpen={showAddKeyModal}
                onClose={() => setShowAddKeyModal(false)}
                onAddKey={addNewKey}
                availableParents={availableParents}
                addKeyParent={addKeyParent}
                onAddKeyParentChange={setAddKeyParent}
            />
        </div>
    );
}
