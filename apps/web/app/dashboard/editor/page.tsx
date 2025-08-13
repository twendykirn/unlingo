'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { debugZodSchema, validateWithAjv } from '@/lib/zodSchemaGenerator';
import * as diff from 'json-diff';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [addKeyMode, setAddKeyMode] = useState<'ui' | 'json'>('ui');
    const [uiValueType, setUiValueType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>('string');
    const [uiStringValue, setUiStringValue] = useState('');
    const [uiNumberValue, setUiNumberValue] = useState('');
    const [uiBooleanValue, setUiBooleanValue] = useState(true);
    const [uiArrayItems, setUiArrayItems] = useState<
        { value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[]
    >([{ value: '', type: 'string' }]);
    const [uiObjectKeys, setUiObjectKeys] = useState<
        { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[]
    >([{ key: '', value: '', type: 'string' }]);
    const [availableParents, setAvailableParents] = useState<{ id: string; key: string }[]>([]);
    const [emptyValueNodes, setEmptyValueNodes] = useState<TranslationNode[]>([]);

    // JSON Schema state for primary language validation
    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    // Change tracking state

    // Track original content for change detection
    const [originalJsonContent, setOriginalJsonContent] = useState<string>('');

    // Backend queries and mutations
    const updateLanguageContent = useMutation(api.languages.updateLanguageContent);
    const applyChangeOperations = useMutation(api.languages.applyChangeOperations);

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
    const languageContent = useQuery(
        api.languages.getLanguageContent,
        languageId && currentWorkspace && language
            ? {
                  languageId,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip'
    );

    const getJsonSchema = useQuery(
        api.languages.getJsonSchema,
        languageId && currentWorkspace && language?.namespaceVersionId
            ? {
                  namespaceVersionId: language.namespaceVersionId,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip'
    );

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

    // Load language content from backend using the new query
    useEffect(() => {
        if (languageContent === undefined) return;

        try {
            // languageContent is already parsed JSON object from the query
            // It will be {} (empty object) if no content exists, which is fine
            const initialNodes = createNodesFromJson(languageContent);
            nodes$.set(initialNodes);
            hasUnsavedChanges$.set(false);

            // Initialize original content for change detection
            setOriginalJsonContent(JSON.stringify(languageContent, null, 2));
        } catch (error) {
            console.error('Failed to process language content:', error);
            // Fallback to empty state if content is invalid
            nodes$.set([]);
            hasUnsavedChanges$.set(false);
        }
    }, [languageContent]);

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

            // For primary language, generate schema for local validation
            if (isPrimaryLanguage) {
                const schemas = debugZodSchema(
                    jsonContent,
                    `Primary Language Schema - ${selectedLanguage.toUpperCase()}`
                );

                // Update local schema state for immediate validation
                setPrimaryLanguageSchema(schemas.jsonSchema);
            }

            // Generate changes using json-diff for primary language saves
            const originalJson = originalJsonContent ? JSON.parse(originalJsonContent) : {};
            const languageChanges = generateLanguageChanges(originalJson, jsonContent);

            console.log('📝 Generated language changes:', languageChanges);

            // Save with changes for backend sync - only send changes for primary language
            const result = await applyChangeOperations({
                languageId,
                workspaceId: currentWorkspace._id,
                ...(languageChanges.changes !== undefined ? { languageChanges } : {}),
            });

            // Update original content for next time
            setOriginalJsonContent(JSON.stringify(jsonContent, null, 2));

            // Show results to user
            if (result.syncErrors.length > 0) {
                alert(
                    `Changes saved successfully! Applied ${result.operationsApplied} operations.\n\nSynchronization warnings:\n${result.syncErrors.slice(0, 3).join('\n')}${result.syncErrors.length > 3 ? '\n... and more' : ''}`
                );
            } else if (result.synchronized > 0) {
                alert(
                    `✅ Changes saved successfully! Applied ${result.operationsApplied} operations.\n\nAutomatically synchronized ${result.synchronized} other languages.`
                );
            } else {
                alert(`✅ Changes saved successfully! Applied ${result.operationsApplied} operations.`);
            }

            // Update the original state to reflect saved changes
            hasUnsavedChanges$.set(false);

            // Success notification
            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Convert JSON string to UI values
    const setUIValuesFromJSON = (jsonString: string) => {
        if (!jsonString.trim()) {
            setUiValueType('string');
            setUiStringValue('');
            return;
        }

        try {
            const parsed = JSON.parse(jsonString);

            if (typeof parsed === 'string') {
                setUiValueType('string');
                setUiStringValue(parsed);
            } else if (typeof parsed === 'number') {
                setUiValueType('number');
                setUiNumberValue(parsed.toString());
            } else if (typeof parsed === 'boolean') {
                setUiValueType('boolean');
                setUiBooleanValue(parsed);
            } else if (Array.isArray(parsed)) {
                setUiValueType('array');
                setUiArrayItems(
                    parsed.length > 0
                        ? parsed.map(item => ({
                              value: JSON.stringify(item, null, 2),
                              type: Array.isArray(item)
                                  ? 'array'
                                  : typeof item === 'object' && item !== null
                                    ? 'object'
                                    : (typeof item as 'string' | 'number' | 'boolean'),
                          }))
                        : [{ value: '', type: 'string' }]
                );
            } else if (typeof parsed === 'object' && parsed !== null) {
                setUiValueType('object');
                const entries = Object.entries(parsed);
                setUiObjectKeys(
                    entries.length > 0
                        ? entries.map(([key, value]) => ({
                              key,
                              value: JSON.stringify(value, null, 2),
                              type: Array.isArray(value)
                                  ? 'array'
                                  : typeof value === 'object' && value !== null
                                    ? 'object'
                                    : (typeof value as 'string' | 'number' | 'boolean'),
                          }))
                        : [{ key: '', value: '', type: 'string' }]
                );
            } else {
                setUiValueType('string');
                setUiStringValue('');
            }
        } catch {
            // Invalid JSON, keep current UI state
        }
    };

    // Handle mode switching for Add Key
    const switchToUIMode = () => {
        if (isValidJson(newKeyValue) || !newKeyValue.trim()) {
            setUIValuesFromJSON(newKeyValue);
            setAddKeyMode('ui');
        }
    };

    const switchToJSONMode = () => {
        const jsonValue = getUIValueAsJSON({
            uiValueType,
            uiStringValue,
            uiNumberValue,
            uiBooleanValue,
            uiArrayItems,
            uiObjectKeys,
        });
        setNewKeyValue(jsonValue);
        setAddKeyMode('json');
    };

    // Add new key functionality
    const addNewKey = () => {
        if (!newKeyName.trim()) {
            alert('Please enter a key name');
            return;
        }

        // Get the value based on current mode
        let finalValue;
        if (addKeyMode === 'ui') {
            finalValue = getUIValueAsJSON({
                uiValueType,
                uiStringValue,
                uiNumberValue,
                uiBooleanValue,
                uiArrayItems,
                uiObjectKeys,
            });
        } else {
            finalValue = newKeyValue;
        }

        if (!finalValue.trim()) {
            alert('Please enter a value');
            return;
        }

        try {
            // Validate and parse the value
            let parsedValue;
            let nodeType: 'object' | 'string' | 'array' = 'string';

            // Check if it's valid JSON
            if (isValidJson(finalValue)) {
                try {
                    parsedValue = JSON.parse(finalValue);
                    const isArray = Array.isArray(parsedValue);
                    const isObject = typeof parsedValue === 'object' && parsedValue !== null && !isArray;
                    nodeType = isArray ? 'array' : isObject ? 'object' : 'string';
                } catch {
                    // Should not happen since we checked isValidJson, but fallback
                    alert('Invalid JSON format');
                    return;
                }
            } else {
                // If it's not valid JSON, don't allow saving
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
                const newNodeKey = `${parentNode.key}.${newKeyName.trim()}`;
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
                const rootKeyName = newKeyName.trim();

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
            setAddKeyParent(null);
            setNewKeyName('');
            setNewKeyValue('');
            setAddKeyMode('ui');
            setUiValueType('string');
            setUiStringValue('');
            setUiNumberValue('');
            setUiBooleanValue(true);
            setUiArrayItems([{ value: '', type: 'string' }]);
            setUiObjectKeys([{ key: '', value: '', type: 'string' }]);
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
            const objectNodes = value
                .filter(node => node.type === 'object')
                .map(node => ({ id: node.id, key: node.key }))
                .sort((a, b) => a.key.localeCompare(b.key));
            setAvailableParents(objectNodes);
        }
    });

    useObserve(() => {
        if (nodes$.get().length > 0 && expandedKeys$.get().size === 0) {
            const rootNodes = nodes$.get().filter(node => !node.parent);
            const newExpanded = new Set(rootNodes.map(node => node.id));
            expandedKeys$.set(newExpanded);
        }
    });

    // Load schema from backend when component mounts or language changes
    useEffect(() => {
        if (getJsonSchema) {
            setPrimaryLanguageSchema(getJsonSchema);
            console.log('📋 Loaded JSON schema from backend:', getJsonSchema);
        }
    }, [getJsonSchema]);

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

    if (!language) {
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
            {/* Header */}
            <div className='bg-gray-950 border-b border-gray-800 px-6 py-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={handleGoBack}
                            className='text-gray-400 hover:text-white cursor-pointer'>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back
                        </Button>
                        <h1 className='text-2xl font-bold'>Translation Editor</h1>
                        <div className='flex items-center space-x-2 text-sm text-gray-400'>
                            <span>{language.namespaceName}</span>
                            <span>•</span>
                            <span>{language.version}</span>
                            <span>•</span>
                            <span>{selectedLanguage.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className='flex items-center space-x-2'>
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
            </div>

            {/* Toolbar */}
            <div className='bg-gray-900 border-b border-gray-800 px-6 py-3'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        {/* Search Field */}
                        <SearchField />
                    </div>

                    <div className='flex items-center space-x-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={!isPrimaryLanguage}
                            className={isPrimaryLanguage ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                            onClick={() => {
                                if (!isPrimaryLanguage) {
                                    alert(
                                        'Only the primary language can add translation keys. Non-primary languages can only edit values.'
                                    );
                                    return;
                                }
                                setAddKeyParent(null); // Ensure adding to root level
                                setShowAddKeyModal(true);
                            }}
                            title={
                                isPrimaryLanguage ? 'Add new translation key' : 'Only primary language can add keys'
                            }>
                            <Plus className='h-4 w-4 mr-2' />
                            Add Key
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className='flex flex-1 min-h-0'>
                {/* Tree View */}
                <ScrollArea className='flex-1 bg-gray-900'>
                    <TreeView />
                </ScrollArea>

                <NodeInfoContainer
                    isPrimaryLanguage={isPrimaryLanguage}
                    onDeleteNode={onNodeDelete}
                    onAddParentNode={onAddParentNode}
                />
            </div>

            {/* Add Key Modal */}
            {showAddKeyModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                    <div className='bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
                        <AddNewTranslationKeyTitle addKeyParent={addKeyParent} />
                        <div className='space-y-4'>
                            {/* Parent Selector - show when opened from toolbar or when a parent is selected */}
                            {availableParents.length > 0 && (
                                <div>
                                    <label className='block text-sm font-medium text-gray-400 mb-2'>
                                        Parent Object (Optional)
                                    </label>
                                    <Select
                                        value={addKeyParent || '__root__'}
                                        onValueChange={value => setAddKeyParent(value === '__root__' ? null : value)}>
                                        <SelectTrigger className='w-full bg-gray-800 border-gray-700 text-white'>
                                            <SelectValue placeholder='Root Level' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='__root__'>Root Level</SelectItem>
                                            {availableParents.map(parent => (
                                                <SelectItem key={parent.id} value={parent.id}>
                                                    {parent.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className='text-xs text-gray-500 mt-1'>
                                        Select an object to add the key as its child, or leave as "Root Level"
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>Key Name</label>
                                <input
                                    type='text'
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='e.g., title, description, button'
                                />
                            </div>

                            {/* Mode Selector */}
                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>Value Mode</label>
                                <div className='flex space-x-2'>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant={addKeyMode === 'ui' ? 'default' : 'outline'}
                                        onClick={() => {
                                            if (addKeyMode === 'json') {
                                                switchToUIMode();
                                            }
                                        }}
                                        disabled={
                                            addKeyMode === 'json' && !!newKeyValue.trim() && !isValidJson(newKeyValue)
                                        }
                                        className={`cursor-pointer ${
                                            addKeyMode === 'json' && !!newKeyValue.trim() && !isValidJson(newKeyValue)
                                                ? 'opacity-50 cursor-not-allowed'
                                                : ''
                                        }`}>
                                        UI Mode
                                    </Button>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant={addKeyMode === 'json' ? 'default' : 'outline'}
                                        onClick={switchToJSONMode}
                                        className='cursor-pointer'>
                                        JSON Mode
                                    </Button>
                                </div>
                            </div>

                            {/* Value Input */}
                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>Value</label>

                                {addKeyMode === 'ui' ? (
                                    <div className='space-y-4'>
                                        {/* Type Selector */}
                                        <Select
                                            value={uiValueType}
                                            onValueChange={value => {
                                                setUiValueType(value as typeof uiValueType);
                                                // Reset all UI values when type changes
                                                setUiStringValue('');
                                                setUiNumberValue('');
                                                setUiBooleanValue(true);
                                                setUiArrayItems([{ value: '', type: 'string' }]);
                                                setUiObjectKeys([{ key: '', value: '', type: 'string' }]);
                                            }}>
                                            <SelectTrigger className='w-full bg-gray-800 border-gray-700 text-white'>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value='string'>String</SelectItem>
                                                <SelectItem value='number'>Number</SelectItem>
                                                <SelectItem value='boolean'>Boolean</SelectItem>
                                                <SelectItem value='array'>Array</SelectItem>
                                                <SelectItem value='object'>Object</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Value Input Based on Type */}
                                        {uiValueType === 'string' && (
                                            <input
                                                type='text'
                                                value={uiStringValue}
                                                onChange={e => setUiStringValue(e.target.value)}
                                                className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                placeholder='Enter string value...'
                                            />
                                        )}

                                        {uiValueType === 'number' && (
                                            <input
                                                type='number'
                                                value={uiNumberValue}
                                                onChange={e => setUiNumberValue(e.target.value)}
                                                className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                placeholder='Enter number value...'
                                            />
                                        )}

                                        {uiValueType === 'boolean' && (
                                            <Select
                                                value={uiBooleanValue.toString()}
                                                onValueChange={value => setUiBooleanValue(value === 'true')}>
                                                <SelectTrigger className='w-full bg-gray-800 border-gray-700 text-white'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value='true'>true</SelectItem>
                                                    <SelectItem value='false'>false</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {uiValueType === 'array' && (
                                            <div className='space-y-3'>
                                                <label className='text-xs text-gray-500'>Array Items</label>
                                                {uiArrayItems.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className='space-y-2 p-3 bg-gray-800/50 rounded-md border border-gray-700'>
                                                        {/* Type selector */}
                                                        <div className='flex items-center space-x-2'>
                                                            <label className='text-xs text-gray-500 w-12 flex-shrink-0'>
                                                                Type:
                                                            </label>
                                                            <Select
                                                                value={item.type}
                                                                onValueChange={value => {
                                                                    const newItems = [...uiArrayItems];
                                                                    newItems[index] = {
                                                                        ...item,
                                                                        type: value as typeof item.type,
                                                                        value: '',
                                                                    };
                                                                    setUiArrayItems(newItems);
                                                                }}>
                                                                <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white'>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value='string'>String</SelectItem>
                                                                    <SelectItem value='number'>Number</SelectItem>
                                                                    <SelectItem value='boolean'>Boolean</SelectItem>
                                                                    <SelectItem value='array'>Array</SelectItem>
                                                                    <SelectItem value='object'>Object</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() => {
                                                                    if (uiArrayItems.length > 1) {
                                                                        const newItems = uiArrayItems.filter(
                                                                            (_, i) => i !== index
                                                                        );
                                                                        setUiArrayItems(newItems);
                                                                    } else {
                                                                        const newItems = [...uiArrayItems];
                                                                        newItems[index] = { value: '', type: 'string' };
                                                                        setUiArrayItems(newItems);
                                                                    }
                                                                }}
                                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0'>
                                                                ✕
                                                            </Button>
                                                        </div>
                                                        {/* Value input */}
                                                        <div className='flex items-center space-x-2'>
                                                            <label className='text-xs text-gray-500 w-12 flex-shrink-0'>
                                                                Value:
                                                            </label>
                                                            {item.type === 'boolean' ? (
                                                                <Select
                                                                    value={item.value || 'true'}
                                                                    onValueChange={value => {
                                                                        const newItems = [...uiArrayItems];
                                                                        newItems[index] = { ...item, value };
                                                                        setUiArrayItems(newItems);
                                                                    }}>
                                                                    <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white'>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value='true'>true</SelectItem>
                                                                        <SelectItem value='false'>false</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <input
                                                                    type={item.type === 'number' ? 'number' : 'text'}
                                                                    value={item.value}
                                                                    onChange={e => {
                                                                        const newItems = [...uiArrayItems];
                                                                        newItems[index] = {
                                                                            ...item,
                                                                            value: e.target.value,
                                                                        };
                                                                        setUiArrayItems(newItems);
                                                                    }}
                                                                    className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                    placeholder={
                                                                        item.type === 'string'
                                                                            ? 'String value'
                                                                            : item.type === 'number'
                                                                              ? 'Enter number'
                                                                              : item.type === 'object'
                                                                                ? '{"key": "value"}'
                                                                                : item.type === 'array'
                                                                                  ? '[1, 2, 3]'
                                                                                  : 'Enter value'
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    type='button'
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() =>
                                                        setUiArrayItems([
                                                            ...uiArrayItems,
                                                            { value: '', type: 'string' },
                                                        ])
                                                    }
                                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400'>
                                                    + Add Item
                                                </Button>
                                            </div>
                                        )}

                                        {uiValueType === 'object' && (
                                            <div className='space-y-3'>
                                                <label className='text-xs text-gray-500'>Object Properties</label>
                                                {uiObjectKeys.map((entry, index) => (
                                                    <div
                                                        key={index}
                                                        className='space-y-2 p-3 bg-gray-800/50 rounded-md border border-gray-700'>
                                                        {/* Property Key */}
                                                        <div className='flex items-center space-x-2'>
                                                            <label className='text-xs text-gray-500 w-12 flex-shrink-0'>
                                                                Key:
                                                            </label>
                                                            <input
                                                                type='text'
                                                                value={entry.key}
                                                                onChange={e => {
                                                                    const newEntries = [...uiObjectKeys];
                                                                    if (newEntries[index]) {
                                                                        newEntries[index].key = e.target.value;
                                                                        setUiObjectKeys(newEntries);
                                                                    }
                                                                }}
                                                                className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                placeholder='Property key'
                                                            />
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() => {
                                                                    if (uiObjectKeys.length > 1) {
                                                                        const newEntries = uiObjectKeys.filter(
                                                                            (_, i) => i !== index
                                                                        );
                                                                        setUiObjectKeys(newEntries);
                                                                    } else {
                                                                        // Clear the values if it's the only item
                                                                        const newEntries = [...uiObjectKeys];
                                                                        newEntries[index] = {
                                                                            key: '',
                                                                            value: '',
                                                                            type: 'string',
                                                                        };
                                                                        setUiObjectKeys(newEntries);
                                                                    }
                                                                }}
                                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0'>
                                                                <X className='h-4 w-4' />
                                                            </Button>
                                                        </div>
                                                        {/* Value Type selector */}
                                                        <div className='flex items-center space-x-2'>
                                                            <label className='text-xs text-gray-500 w-12 flex-shrink-0'>
                                                                Type:
                                                            </label>
                                                            <Select
                                                                value={entry.type}
                                                                onValueChange={value => {
                                                                    const newEntries = [...uiObjectKeys];
                                                                    newEntries[index] = {
                                                                        ...entry,
                                                                        type: value as typeof entry.type,
                                                                        value: '',
                                                                    };
                                                                    setUiObjectKeys(newEntries);
                                                                }}>
                                                                <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white'>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value='string'>String</SelectItem>
                                                                    <SelectItem value='number'>Number</SelectItem>
                                                                    <SelectItem value='boolean'>Boolean</SelectItem>
                                                                    <SelectItem value='array'>Array</SelectItem>
                                                                    <SelectItem value='object'>Object</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        {/* Property Value based on type */}
                                                        <div className='flex items-center space-x-2'>
                                                            <label className='text-xs text-gray-500 w-12 flex-shrink-0'>
                                                                Value:
                                                            </label>
                                                            {entry.type === 'string' && (
                                                                <input
                                                                    type='text'
                                                                    value={entry.value}
                                                                    onChange={e => {
                                                                        const newEntries = [...uiObjectKeys];
                                                                        if (newEntries[index]) {
                                                                            newEntries[index].value = e.target.value;
                                                                            setUiObjectKeys(newEntries);
                                                                        }
                                                                    }}
                                                                    className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                    placeholder='Enter string value...'
                                                                />
                                                            )}
                                                            {entry.type === 'number' && (
                                                                <input
                                                                    type='number'
                                                                    value={entry.value}
                                                                    onChange={e => {
                                                                        const newEntries = [...uiObjectKeys];
                                                                        if (newEntries[index]) {
                                                                            newEntries[index].value = e.target.value;
                                                                            setUiObjectKeys(newEntries);
                                                                        }
                                                                    }}
                                                                    className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                    placeholder='Enter number...'
                                                                />
                                                            )}
                                                            {entry.type === 'boolean' && (
                                                                <Select
                                                                    value={entry.value || 'true'}
                                                                    onValueChange={value => {
                                                                        const newEntries = [...uiObjectKeys];
                                                                        if (newEntries[index]) {
                                                                            newEntries[index].value = value;
                                                                            setUiObjectKeys(newEntries);
                                                                        }
                                                                    }}>
                                                                    <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white'>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value='true'>true</SelectItem>
                                                                        <SelectItem value='false'>false</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                            {(entry.type === 'array' || entry.type === 'object') && (
                                                                <input
                                                                    type='text'
                                                                    value={entry.value}
                                                                    onChange={e => {
                                                                        const newEntries = [...uiObjectKeys];
                                                                        if (newEntries[index]) {
                                                                            newEntries[index].value = e.target.value;
                                                                            setUiObjectKeys(newEntries);
                                                                        }
                                                                    }}
                                                                    className='flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                    placeholder={
                                                                        entry.type === 'array'
                                                                            ? 'Enter valid JSON array: [1, 2, 3]'
                                                                            : 'Enter valid JSON object: {"key": "value"}'
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    type='button'
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() =>
                                                        setUiObjectKeys([
                                                            ...uiObjectKeys,
                                                            { key: '', value: '', type: 'string' },
                                                        ])
                                                    }
                                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400'>
                                                    + Add Property
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className='relative'>
                                        <textarea
                                            value={newKeyValue}
                                            onChange={e => setNewKeyValue(e.target.value)}
                                            className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 overflow-y-auto min-h-[6rem] max-h-48 ${
                                                !newKeyValue.trim()
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : newKeyValue.trim() && !isValidJson(newKeyValue)
                                                      ? 'border-red-500 focus:ring-red-500'
                                                      : 'border-gray-700 focus:ring-blue-500'
                                            }`}
                                            placeholder={`Enter valid JSON value...\n\nExamples:\n- "Hello World" (string)\n- {"en": "Hello", "es": "Hola"} (object)\n- ["item1", "item2"] (array)\n- 42 (number)\n- true (boolean)`}
                                        />
                                        {newKeyValue.trim() && isValidJson(newKeyValue) && (
                                            <div className='absolute top-2 right-2'>
                                                <div
                                                    className='w-2 h-2 bg-green-500 rounded-full'
                                                    title='Valid JSON'></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Validation Messages */}
                            <div className='text-xs text-gray-500'>
                                {addKeyMode === 'ui' ? (
                                    (() => {
                                        const uiValue = getUIValueAsJSON({
                                            uiValueType,
                                            uiStringValue,
                                            uiNumberValue,
                                            uiBooleanValue,
                                            uiArrayItems,
                                            uiObjectKeys,
                                        });
                                        // Allow empty objects {} and arrays [] as valid values
                                        const isEmptyContainer = uiValue === '{}' || uiValue === '[]';
                                        return !uiValue.trim() && !isEmptyContainer ? (
                                            <p className='text-red-400'>
                                                ⚠ Value is required - please fill in the required fields
                                            </p>
                                        ) : !isValidJson(uiValue) ? (
                                            <p className='text-red-400'>
                                                ⚠ Invalid configuration - please check your input
                                            </p>
                                        ) : (
                                            <p>
                                                <strong>Preview:</strong> {uiValue}
                                            </p>
                                        );
                                    })()
                                ) : !newKeyValue.trim() ? (
                                    <p className='text-red-400'>
                                        ⚠ Value is required - please enter a valid JSON value
                                    </p>
                                ) : newKeyValue.trim() && !isValidJson(newKeyValue) ? (
                                    <p className='text-red-400'>
                                        ⚠ Invalid JSON format - please fix the syntax or use proper JSON
                                    </p>
                                ) : (
                                    <p>
                                        <strong>Tip:</strong> Use valid JSON syntax for all values (strings must be
                                        quoted).
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className='flex justify-end space-x-2 mt-6'>
                            <Button
                                variant='outline'
                                onClick={() => {
                                    setShowAddKeyModal(false);
                                    setAddKeyParent(null);
                                    setNewKeyName('');
                                    setNewKeyValue('');
                                    setAddKeyMode('ui');
                                    setUiValueType('string');
                                    setUiStringValue('');
                                    setUiNumberValue('');
                                    setUiBooleanValue(true);
                                    setUiArrayItems([{ value: '', type: 'string' }]);
                                    setUiObjectKeys([{ key: '', value: '', type: 'string' }]);
                                }}
                                className='cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={addNewKey}
                                disabled={
                                    !newKeyName.trim() ||
                                    (() => {
                                        if (addKeyMode === 'ui') {
                                            const uiValue = getUIValueAsJSON({
                                                uiValueType,
                                                uiStringValue,
                                                uiNumberValue,
                                                uiBooleanValue,
                                                uiArrayItems,
                                                uiObjectKeys,
                                            });
                                            const isEmptyContainer = uiValue === '{}' || uiValue === '[]';
                                            return (!uiValue.trim() && !isEmptyContainer) || !isValidJson(uiValue);
                                        } else {
                                            return !newKeyValue.trim() || !isValidJson(newKeyValue);
                                        }
                                    })()
                                }
                                className={`${
                                    !newKeyName.trim() ||
                                    (() => {
                                        if (addKeyMode === 'ui') {
                                            const uiValue = getUIValueAsJSON({
                                                uiValueType,
                                                uiStringValue,
                                                uiNumberValue,
                                                uiBooleanValue,
                                                uiArrayItems,
                                                uiObjectKeys,
                                            });
                                            const isEmptyContainer = uiValue === '{}' || uiValue === '[]';
                                            return (!uiValue.trim() && !isEmptyContainer) || !isValidJson(uiValue);
                                        } else {
                                            return !newKeyValue.trim() || !isValidJson(newKeyValue);
                                        }
                                    })()
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'cursor-pointer'
                                }`}>
                                Add Key
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
