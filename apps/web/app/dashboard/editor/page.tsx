'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Save,
    Plus,
    Trash2,
    Code,
    Search,
    ChevronRight,
    X,
    Copy,
    AlertTriangle,
    ArrowLeft,
    Undo,
    Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { debugZodSchema, validateWithAjv } from '@/lib/zodSchemaGenerator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TranslationNode {
    id: string;
    key: string;
    value: any;
    type: 'object' | 'string' | 'array';
    parent?: string;
    children: string[];
    collapsed: boolean;
    hasEmptyValues?: boolean; // Track if node has empty values
}

interface ChangeOperation {
    type: 'add' | 'delete' | 'modify' | 'move';
    path: string; // JSON path like "user.profile.name" or "items[2].title"
    value?: any; // New value for add/modify operations
    oldValue?: any; // Old value for modify/delete operations (for rollback)
    index?: number; // For array operations, the exact index
    parentType: 'object' | 'array' | 'root';
}

interface ChangeSet {
    operations: ChangeOperation[];
    affectedPaths: string[];
    hasStructuralChanges: boolean;
    metadata: {
        timestamp: number;
        languageId: string;
        isPrimaryLanguage: boolean;
    };
}

interface ChangeRecord {
    id: string;
    timestamp: number;
    type: 'add_key' | 'edit_value' | 'delete_key' | 'json_bulk_edit';
    operation: {
        // For add_key operations
        added?: {
            nodeId: string;
            key: string;
            value: any;
            type: 'object' | 'string' | 'array';
            parentKey?: string;
        };
        // For edit_value operations
        edited?: {
            nodeId: string;
            key: string;
            oldValue: any;
            newValue: any;
            type: 'object' | 'string' | 'array';
        };
        // For delete_key operations
        deleted?: {
            nodeId: string;
            key: string;
            value: any;
            type: 'object' | 'string' | 'array';
            parentKey?: string;
            children?: TranslationNode[]; // Store deleted children for complete restoration
        };
        // For json_bulk_edit operations
        bulkEdit?: {
            oldNodes: TranslationNode[];
            newNodes: TranslationNode[];
            addedKeys: string[];
            deletedKeys: string[];
            modifiedKeys: string[];
        };
    };
    // Metadata for backend sync
    metadata: {
        affectedKeys: string[]; // All keys that were affected by this change
        requiresSync: boolean; // Whether other languages need to be updated
        syncType: 'structure_change' | 'value_only' | 'key_rename' | 'key_delete';
        languageId?: string;
        isPrimaryLanguage: boolean;
    };
}

export default function TranslationEditor() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Extract URL parameters - only languageId is needed
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;

    const [nodes, setNodes] = useState<TranslationNode[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editKey, setEditKey] = useState('');
    const [jsonEditMode, setJsonEditMode] = useState(false);
    const [rawJsonEdit, setRawJsonEdit] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalNodes, setOriginalNodes] = useState<TranslationNode[]>([]);
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNodes, setFilteredNodes] = useState<TranslationNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [emptyValueCount, setEmptyValueCount] = useState(0);
    const [showEmptyValuesDialog, setShowEmptyValuesDialog] = useState(false);
    const [emptyValueNodes, setEmptyValueNodes] = useState<TranslationNode[]>([]);

    // JSON Schema state for primary language validation
    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Change tracking state
    const [changeHistory, setChangeHistory] = useState<ChangeRecord[]>([]);
    const [currentChangeIndex, setCurrentChangeIndex] = useState(-1);
    const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);

    // Track original content for change detection
    const [originalJsonContent, setOriginalJsonContent] = useState<string>('');

    // Edit mode state for existing nodes
    const [editMode, setEditMode] = useState<'ui' | 'json'>('json');
    const [editUIValueType, setEditUIValueType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>(
        'string'
    );
    const [editUIStringValue, setEditUIStringValue] = useState('');
    const [editUINumberValue, setEditUINumberValue] = useState('');
    const [editUIBooleanValue, setEditUIBooleanValue] = useState(true);
    const [editUIArrayItems, setEditUIArrayItems] = useState<
        { value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[]
    >([{ value: '', type: 'string' }]);
    const [editUIObjectKeys, setEditUIObjectKeys] = useState<
        { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[]
    >([{ key: '', value: '', type: 'string' }]);

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

    // Copy to clipboard utility
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    };

    // Derive current values from backend data
    const selectedLanguage = language?.languageCode || 'en';

    // Check if this is the primary language
    const isPrimaryLanguage = !!language?.isPrimary;

    // Helper function to detect precise structural changes with exact node paths
    const detectPreciseStructuralChanges = (
        oldJson: any,
        newJson: any
    ): {
        hasStructuralChanges: boolean;
        addedNodes: { path: string; value: any; parentType: 'object' | 'array'; index?: number }[];
        deletedNodes: { path: string; value: any; parentType: 'object' | 'array'; index?: number }[];
        changedTypes: { path: string; oldValue: any; newValue: any; oldType: string; newType: string }[];
        modifiedValues: { path: string; oldValue: any; newValue: any }[];
    } => {
        const result = {
            hasStructuralChanges: false,
            addedNodes: [] as { path: string; value: any; parentType: 'object' | 'array'; index?: number }[],
            deletedNodes: [] as { path: string; value: any; parentType: 'object' | 'array'; index?: number }[],
            changedTypes: [] as { path: string; oldValue: any; newValue: any; oldType: string; newType: string }[],
            modifiedValues: [] as { path: string; oldValue: any; newValue: any }[],
        };

        const getType = (value: any): string => {
            if (value === null) return 'null';
            if (Array.isArray(value)) return 'array';
            return typeof value;
        };

        const compareObjects = (oldObj: any, newObj: any, path = '') => {
            const oldType = getType(oldObj);
            const newType = getType(newObj);

            // Type change
            if (oldType !== newType) {
                result.changedTypes.push({
                    path,
                    oldValue: oldObj,
                    newValue: newObj,
                    oldType,
                    newType,
                });
                result.hasStructuralChanges = true;
                return;
            }

            // Handle arrays
            if (Array.isArray(oldObj) && Array.isArray(newObj)) {
                const maxLength = Math.max(oldObj.length, newObj.length);

                for (let i = 0; i < maxLength; i++) {
                    const currentPath = path ? `${path}[${i}]` : `[${i}]`;

                    if (i >= oldObj.length) {
                        // Added array element
                        result.addedNodes.push({
                            path: currentPath,
                            value: newObj[i],
                            parentType: 'array',
                            index: i,
                        });
                        result.hasStructuralChanges = true;
                    } else if (i >= newObj.length) {
                        // Deleted array element
                        result.deletedNodes.push({
                            path: currentPath,
                            value: oldObj[i],
                            parentType: 'array',
                            index: i,
                        });
                        result.hasStructuralChanges = true;
                    } else {
                        // Compare existing array elements
                        compareObjects(oldObj[i], newObj[i], currentPath);
                    }
                }
                return;
            }

            // Handle objects
            if (oldType === 'object' && newType === 'object' && oldObj !== null && newObj !== null) {
                const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

                for (const key of allKeys) {
                    const currentPath = path ? `${path}.${key}` : key;

                    if (!(key in oldObj)) {
                        // Added object property
                        result.addedNodes.push({
                            path: currentPath,
                            value: newObj[key],
                            parentType: 'object',
                        });
                        result.hasStructuralChanges = true;
                    } else if (!(key in newObj)) {
                        // Deleted object property
                        result.deletedNodes.push({
                            path: currentPath,
                            value: oldObj[key],
                            parentType: 'object',
                        });
                        result.hasStructuralChanges = true;
                    } else {
                        // Compare existing property
                        compareObjects(oldObj[key], newObj[key], currentPath);
                    }
                }
                return;
            }

            // Handle primitive values
            if (oldObj !== newObj) {
                result.modifiedValues.push({
                    path,
                    oldValue: oldObj,
                    newValue: newObj,
                });
                // Primitive value changes don't count as structural changes
            }
        };

        compareObjects(oldJson, newJson);
        return result;
    };

    // Generate precise change operations from old and new JSON
    const generateChangeOperations = (oldJson: any, newJson: any): ChangeSet => {
        const operations: ChangeOperation[] = [];
        const affectedPaths: string[] = [];
        let hasStructuralChanges = false;

        const compareAndGenerate = (
            oldObj: any,
            newObj: any,
            path = '',
            parentType: 'object' | 'array' | 'root' = 'root'
        ) => {
            const oldType = oldObj === null ? 'null' : Array.isArray(oldObj) ? 'array' : typeof oldObj;
            const newType = newObj === null ? 'null' : Array.isArray(newObj) ? 'array' : typeof newObj;

            // Handle type changes
            if (oldType !== newType) {
                operations.push({
                    type: 'modify',
                    path,
                    value: newObj,
                    oldValue: oldObj,
                    parentType,
                });
                affectedPaths.push(path);
                hasStructuralChanges = true;
                return;
            }

            // Handle arrays
            if (Array.isArray(oldObj) && Array.isArray(newObj)) {
                const maxLength = Math.max(oldObj.length, newObj.length);

                for (let i = 0; i < maxLength; i++) {
                    const currentPath = path ? `${path}[${i}]` : `[${i}]`;

                    if (i >= oldObj.length) {
                        // Added array element
                        operations.push({
                            type: 'add',
                            path: currentPath,
                            value: newObj[i],
                            index: i,
                            parentType: 'array',
                        });
                        affectedPaths.push(currentPath);
                        hasStructuralChanges = true;
                    } else if (i >= newObj.length) {
                        // Deleted array element
                        operations.push({
                            type: 'delete',
                            path: currentPath,
                            oldValue: oldObj[i],
                            index: i,
                            parentType: 'array',
                        });
                        affectedPaths.push(currentPath);
                        hasStructuralChanges = true;
                    } else {
                        // Compare existing elements
                        compareAndGenerate(oldObj[i], newObj[i], currentPath, 'array');
                    }
                }
            }
            // Handle objects
            else if (oldType === 'object' && newType === 'object' && oldObj !== null && newObj !== null) {
                const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

                for (const key of allKeys) {
                    const currentPath = path ? `${path}.${key}` : key;

                    if (!(key in oldObj)) {
                        // Added property
                        operations.push({
                            type: 'add',
                            path: currentPath,
                            value: newObj[key],
                            parentType: 'object',
                        });
                        affectedPaths.push(currentPath);
                        hasStructuralChanges = true;
                    } else if (!(key in newObj)) {
                        // Deleted property
                        operations.push({
                            type: 'delete',
                            path: currentPath,
                            oldValue: oldObj[key],
                            parentType: 'object',
                        });
                        affectedPaths.push(currentPath);
                        hasStructuralChanges = true;
                    } else {
                        // Compare existing properties
                        compareAndGenerate(oldObj[key], newObj[key], currentPath, 'object');
                    }
                }
            }
            // Handle primitive value changes
            else if (oldObj !== newObj) {
                operations.push({
                    type: 'modify',
                    path,
                    value: newObj,
                    oldValue: oldObj,
                    parentType,
                });
                affectedPaths.push(path);
                // Primitive value changes are not structural changes
            }
        };

        compareAndGenerate(oldJson, newJson);

        return {
            operations,
            affectedPaths,
            hasStructuralChanges,
            metadata: {
                timestamp: Date.now(),
                languageId: languageId!,
                isPrimaryLanguage,
            },
        };
    };

    // Navigation function to go back
    const handleGoBack = () => {
        if (hasUnsavedChanges) {
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

    // Convert JSON to graph nodes with proper hierarchy and positioning
    const jsonToNodes = useCallback((obj: any, parentKey = '', parentId?: string): TranslationNode[] => {
        const nodes: TranslationNode[] = [];
        const entries = Object.entries(obj);

        entries.forEach(([key, value]) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            const nodeId = `node-${fullKey}`;

            const isArray = Array.isArray(value);
            const isObject = typeof value === 'object' && value !== null && !isArray;

            let nodeType: 'object' | 'string' | 'array' = 'string';
            if (isArray) {
                nodeType = 'array';
            } else if (isObject) {
                nodeType = 'object';
            }

            const node: TranslationNode = {
                id: nodeId,
                key: fullKey,
                value: value,
                type: nodeType,
                parent: parentId,
                children: [],
                collapsed: false,
            };

            nodes.push(node);

            // Handle object children
            if (isObject) {
                const childEntries = Object.entries(value);
                const childNodes = jsonToNodes(value, fullKey, nodeId);
                nodes.push(...childNodes);

                // Only add direct children to the children array
                const directChildren = childEntries.map(([childKey]) => `node-${fullKey}.${childKey}`);
                node.children = directChildren;
            }
        });

        return nodes;
    }, []);

    // Create nodes from JSON (simplified interface)
    const createNodesFromJson = useCallback(
        (obj: any): TranslationNode[] => {
            return jsonToNodes(obj);
        },
        [jsonToNodes]
    );

    // Load language content from backend using the new query
    useEffect(() => {
        if (languageContent === undefined) return;

        try {
            // languageContent is already parsed JSON object from the query
            // It will be {} (empty object) if no content exists, which is fine
            const initialNodes = createNodesFromJson(languageContent);
            setNodes(initialNodes);
            setOriginalNodes(initialNodes);
            setHasUnsavedChanges(false);

            // Initialize original content for change detection
            setOriginalJsonContent(JSON.stringify(languageContent, null, 2));
        } catch (error) {
            console.error('Failed to process language content:', error);
            // Fallback to empty state if content is invalid
            setNodes([]);
            setOriginalNodes([]);
            setHasUnsavedChanges(false);
        }
    }, [languageContent, createNodesFromJson]);

    // Track changes to nodes
    useEffect(() => {
        if (originalNodes.length > 0) {
            const hasChanges = JSON.stringify(nodes) !== JSON.stringify(originalNodes);
            setHasUnsavedChanges(hasChanges);
        }
    }, [nodes, originalNodes]);

    // Utility functions
    const isValidJson = (str: string) => {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    };

    // Check if a value is empty or contains only empty values
    const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (typeof value === 'object' && !Array.isArray(value)) {
            // For translation objects, check if all language values are empty
            const values = Object.values(value);
            return values.length === 0 || values.every(v => typeof v === 'string' && v.trim() === '');
        }
        if (Array.isArray(value)) {
            return value.length === 0 || value.every(isEmptyValue);
        }
        return false;
    };

    // Validate nodes and count empty values
    const validateNodes = useCallback((nodesToValidate: TranslationNode[]) => {
        let emptyCount = 0;
        const errors: string[] = [];

        nodesToValidate.forEach(node => {
            if (node.type === 'string' && isEmptyValue(node.value)) {
                emptyCount++;
                errors.push(`Empty value at key: ${node.key}`);
            }
        });

        setEmptyValueCount(emptyCount);
        setValidationErrors(errors);

        return emptyCount === 0;
    }, []);

    // Collect all empty value nodes
    const collectEmptyValueNodes = useCallback(() => {
        const emptyNodes: TranslationNode[] = [];

        nodes.forEach(node => {
            if (node.type === 'string' && isEmptyValue(node.value)) {
                emptyNodes.push(node);
            }
        });

        return emptyNodes.sort((a, b) => a.key.localeCompare(b.key));
    }, [nodes]);

    // Update validation when nodes change
    useEffect(() => {
        validateNodes(nodes);
        setEmptyValueNodes(collectEmptyValueNodes());
    }, [nodes, validateNodes, collectEmptyValueNodes]);

    // Update available parents when nodes change
    useEffect(() => {
        const objectNodes = nodes
            .filter(node => node.type === 'object')
            .map(node => ({ id: node.id, key: node.key }))
            .sort((a, b) => a.key.localeCompare(b.key));
        setAvailableParents(objectNodes);
    }, [nodes]);

    // Navigate to and select an empty value node
    const navigateToEmptyValue = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Select the node
        setSelectedNode(nodeId);
        setShowEmptyValuesDialog(false);

        // Expand parent nodes to make sure the node is visible
        const keyParts = node.key.split('.');
        const newExpandedKeys = new Set(expandedKeys);

        for (let i = 1; i < keyParts.length; i++) {
            const parentKey = keyParts.slice(0, i).join('.');
            const parentNode = nodes.find(n => n.key === parentKey);
            if (parentNode) {
                newExpandedKeys.add(parentNode.id);
            }
        }
        setExpandedKeys(newExpandedKeys);

        // Scroll to the node
        setTimeout(() => {
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                });

                // Add a brief highlight effect
                element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
                }, 2000);
            }
        }, 100);
    };

    // Record a change in the history
    const recordChange = useCallback(
        (changeRecord: Omit<ChangeRecord, 'id' | 'timestamp'>) => {
            const newChange: ChangeRecord = {
                ...changeRecord,
                id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
            };

            setChangeHistory(prev => {
                // Remove any changes after current index (when user makes new change after undo)
                const newHistory = prev.slice(0, currentChangeIndex + 1);
                newHistory.push(newChange);
                return newHistory;
            });

            setCurrentChangeIndex(prev => prev + 1);
            setHasUncommittedChanges(false); // Reset uncommitted flag after recording
        },
        [currentChangeIndex]
    );

    // Undo last change
    const undoChange = useCallback(() => {
        if (currentChangeIndex < 0) return;

        const changeToUndo = changeHistory[currentChangeIndex];

        // Apply the reverse operation
        switch (changeToUndo.type) {
            case 'add_key':
                if (changeToUndo.operation.added) {
                    // Remove the added node
                    setNodes(prev => prev.filter(node => node.id !== changeToUndo.operation.added!.nodeId));
                }
                break;

            case 'edit_value':
                if (changeToUndo.operation.edited) {
                    // Restore old value
                    setNodes(prev =>
                        prev.map(node =>
                            node.id === changeToUndo.operation.edited!.nodeId
                                ? { ...node, value: changeToUndo.operation.edited!.oldValue }
                                : node
                        )
                    );
                }
                break;

            case 'delete_key':
                if (changeToUndo.operation.deleted) {
                    // Restore deleted node and its children
                    const restoredNode: TranslationNode = {
                        id: changeToUndo.operation.deleted.nodeId,
                        key: changeToUndo.operation.deleted.key,
                        value: changeToUndo.operation.deleted.value,
                        type: changeToUndo.operation.deleted.type,
                        parent: changeToUndo.operation.deleted.parentKey,
                        children: changeToUndo.operation.deleted.children?.map(c => c.id) || [],
                        collapsed: false,
                    };

                    setNodes(prev => {
                        const newNodes = [...prev, restoredNode];
                        // Also restore children if any
                        if (changeToUndo.operation.deleted!.children) {
                            newNodes.push(...changeToUndo.operation.deleted!.children);
                        }
                        return newNodes;
                    });
                }
                break;

            case 'json_bulk_edit':
                if (changeToUndo.operation.bulkEdit) {
                    // Restore old nodes state
                    setNodes(changeToUndo.operation.bulkEdit.oldNodes);
                }
                break;
        }

        setCurrentChangeIndex(prev => prev - 1);
    }, [currentChangeIndex, changeHistory]);

    // Redo change
    const redoChange = useCallback(() => {
        if (currentChangeIndex >= changeHistory.length - 1) return;

        const nextIndex = currentChangeIndex + 1;
        const changeToRedo = changeHistory[nextIndex];

        // Apply the original operation
        switch (changeToRedo.type) {
            case 'add_key':
                if (changeToRedo.operation.added) {
                    const newNode: TranslationNode = {
                        id: changeToRedo.operation.added.nodeId,
                        key: changeToRedo.operation.added.key,
                        value: changeToRedo.operation.added.value,
                        type: changeToRedo.operation.added.type,
                        parent: changeToRedo.operation.added.parentKey,
                        children: [],
                        collapsed: false,
                    };
                    setNodes(prev => [...prev, newNode]);
                }
                break;

            case 'edit_value':
                if (changeToRedo.operation.edited) {
                    setNodes(prev =>
                        prev.map(node =>
                            node.id === changeToRedo.operation.edited!.nodeId
                                ? { ...node, value: changeToRedo.operation.edited!.newValue }
                                : node
                        )
                    );
                }
                break;

            case 'delete_key':
                if (changeToRedo.operation.deleted) {
                    setNodes(prev =>
                        prev.filter(
                            node =>
                                node.id !== changeToRedo.operation.deleted!.nodeId &&
                                !changeToRedo.operation.deleted!.children?.find(c => c.id === node.id)
                        )
                    );
                }
                break;

            case 'json_bulk_edit':
                if (changeToRedo.operation.bulkEdit) {
                    setNodes(changeToRedo.operation.bulkEdit.newNodes);
                }
                break;
        }

        setCurrentChangeIndex(nextIndex);
    }, [currentChangeIndex, changeHistory]);

    // Apply current edit changes and record them in history
    const applyEdit = useCallback(() => {
        if (!selectedNode || !editValue.trim()) return;

        const currentNode = nodes.find(n => n.id === selectedNode);
        if (!currentNode) return;

        try {
            const newValue = JSON.parse(editValue);
            const oldValue = currentNode.value;

            // Don't record if value hasn't changed
            if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
                setHasUncommittedChanges(false);
                return;
            }

            // Update the node
            setNodes(prev => prev.map(node => (node.id === selectedNode ? { ...node, value: newValue } : node)));

            // Record the change
            recordChange({
                type: 'edit_value',
                operation: {
                    edited: {
                        nodeId: selectedNode,
                        key: currentNode.key,
                        oldValue,
                        newValue,
                        type: currentNode.type,
                    },
                },
                metadata: {
                    affectedKeys: [currentNode.key],
                    requiresSync: isPrimaryLanguage, // Only sync if editing primary language
                    syncType: 'value_only',
                    languageId: languageId || undefined,
                    isPrimaryLanguage: !!isPrimaryLanguage,
                },
            });

            setHasUncommittedChanges(false);
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to apply edit:', error);
            alert('Invalid JSON format. Please fix the syntax before applying.');
        }
    }, [selectedNode, editValue, nodes, recordChange, isPrimaryLanguage, languageId]);

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' && selectedNode) {
                // Check if user is currently editing an input/textarea
                const activeElement = document.activeElement;
                const isEditingInput =
                    activeElement &&
                    (activeElement.tagName === 'INPUT' ||
                        activeElement.tagName === 'TEXTAREA' ||
                        activeElement.contentEditable === 'true');

                // Only delete the node if not editing an input
                if (!isEditingInput) {
                    e.preventDefault();
                    deleteSelectedKey();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNode]);

    const deleteSelectedKey = () => {
        if (!selectedNode) return;

        // Safety check: Only primary language can delete keys
        if (!isPrimaryLanguage) {
            alert('Only the primary language can delete translation keys. Non-primary languages can only edit values.');
            return;
        }

        const nodeToDelete = nodes.find(n => n.id === selectedNode);
        if (!nodeToDelete) return;

        // Rebuild the complete JSON structure without the deleted node
        const buildJsonFromNodes = (nodeId: string): any => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node || node.id === selectedNode) return null; // Skip deleted node

            if (node.type === 'object') {
                const obj: any = {};
                node.children.forEach(childId => {
                    if (childId !== selectedNode) {
                        // Skip deleted child
                        const childNode = nodes.find(n => n.id === childId);
                        if (childNode) {
                            const key = childNode.key.split('.').pop() || childNode.key;
                            const childResult = buildJsonFromNodes(childId);
                            if (childResult !== null) {
                                obj[key] = childResult;
                            }
                        }
                    }
                });
                return obj;
            } else if (node.type === 'array') {
                return node.value;
            } else {
                return node.value;
            }
        };

        // Build complete JSON from all root nodes
        const completeJson: any = {};
        const rootNodes = nodes.filter(node => !node.parent);

        rootNodes.forEach(rootNode => {
            if (rootNode.id !== selectedNode) {
                // Skip if root is being deleted
                const key = rootNode.key.split('.').pop() || rootNode.key;
                const result = buildJsonFromNodes(rootNode.id);
                if (result !== null) {
                    completeJson[key] = result;
                }
            }
        });

        // Rebuild the entire node structure from the updated JSON
        const newNodes = createNodesFromJson(completeJson);
        setNodes(newNodes);
        setSelectedNode(null);
        setEditValue('');
        setEditKey('');
        setHasUnsavedChanges(true);
    };

    // Check if object structure has changed (keys added/removed)
    const hasStructuralChanges = (oldValue: any, newValue: any) => {
        if (typeof oldValue !== 'object' || typeof newValue !== 'object') return false;
        if (oldValue === null || newValue === null) return false;
        if (Array.isArray(oldValue) !== Array.isArray(newValue)) return true;

        const oldKeys = Object.keys(oldValue).sort();
        const newKeys = Object.keys(newValue).sort();

        return JSON.stringify(oldKeys) !== JSON.stringify(newKeys);
    };

    // Real-time JSON editing with validation and visual feedback
    const handleJsonValueChange = (newJsonValue: string) => {
        setEditValue(newJsonValue);

        // Sync with edit UI values when in JSON mode
        if (editMode === 'json') {
            setEditUIValuesFromJSON(newJsonValue);
        }

        // Mark as having uncommitted changes if the value has changed
        if (selectedNode) {
            const currentNode = nodes.find(n => n.id === selectedNode);
            if (currentNode) {
                try {
                    const newParsedValue = JSON.parse(newJsonValue);
                    const currentParsedValue = currentNode.value;

                    const hasChanged = JSON.stringify(currentParsedValue) !== JSON.stringify(newParsedValue);
                    setHasUncommittedChanges(hasChanged);
                } catch {
                    // Invalid JSON, still mark as uncommitted if text has changed
                    const currentValueString = JSON.stringify(currentNode.value, null, 2);
                    setHasUncommittedChanges(newJsonValue !== currentValueString);
                }
            }
        }
    };

    // Handle key renaming
    const handleKeyChange = (newKeyName: string) => {
        if (!selectedNode || !newKeyName.trim()) return;

        const currentNode = nodes.find(n => n.id === selectedNode);
        if (!currentNode) return;

        // Build new key path
        const keyParts = currentNode.key.split('.');
        keyParts[keyParts.length - 1] = newKeyName.trim();
        const newKey = keyParts.join('.');

        // Check if key already exists at the same level
        const parentPath = keyParts.slice(0, -1).join('.');
        const sameLevelNodes = nodes.filter(n => {
            const nParts = n.key.split('.');
            const nParentPath = nParts.slice(0, -1).join('.');
            return nParentPath === parentPath && n.id !== selectedNode;
        });

        if (sameLevelNodes.some(n => n.key === newKey)) {
            alert('A key with this name already exists at this level');
            return;
        }

        // Rebuild complete JSON with the new key
        const buildJsonFromNodes = (nodeId: string): any => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return {};

            if (node.id === selectedNode) {
                // Use the renamed key for the selected node
                return node.value;
            } else if (node.type === 'object') {
                const obj: any = {};
                node.children.forEach(childId => {
                    const childNode = nodes.find(n => n.id === childId);
                    if (childNode) {
                        let key = childNode.key.split('.').pop() || childNode.key;
                        if (childNode.id === selectedNode) {
                            key = newKeyName.trim();
                        }
                        obj[key] = buildJsonFromNodes(childId);
                    }
                });
                return obj;
            } else if (node.type === 'array') {
                return node.value;
            } else {
                return node.value;
            }
        };

        const completeJson: any = {};
        const rootNodes = nodes.filter(node => !node.parent);

        rootNodes.forEach(rootNode => {
            let key = rootNode.key.split('.').pop() || rootNode.key;
            if (rootNode.id === selectedNode) {
                key = newKeyName.trim();
            }
            completeJson[key] = buildJsonFromNodes(rootNode.id);
        });

        // Rebuild nodes and find the renamed node
        const newNodes = createNodesFromJson(completeJson);
        setNodes(newNodes);

        // Find and select the renamed node
        const renamedNode = newNodes.find(n => n.key === newKey);
        if (renamedNode) {
            setSelectedNode(renamedNode.id);
            setEditValue(JSON.stringify(renamedNode.value, null, 2));
            setEditKey(newKeyName.trim());
        }

        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        if (!hasUnsavedChanges || !languageId || !currentWorkspace) return;

        // Validate before saving
        const isValid = validateNodes(nodes);
        if (!isValid) {
            alert(`Cannot save: ${emptyValueCount} empty values found. Please fill in all required fields.`);
            return;
        }

        setIsSaving(true);

        try {
            // Convert nodes back to JSON structure
            const jsonContent = convertNodesToJson(nodes);

            // Validate against JSON schema if available (for non-primary languages)
            if (!isPrimaryLanguage && primaryLanguageSchema) {
                const validation = validateWithAjv(jsonContent, primaryLanguageSchema);

                console.group(`🔍 AJV Schema Validation - ${selectedLanguage.toUpperCase()}`);
                console.log('📄 Input JSON:', jsonContent);
                console.log('📋 Schema:', primaryLanguageSchema);
                console.log('✅ Validation Result:', validation.isValid ? 'PASSED' : 'FAILED');

                if (!validation.isValid) {
                    console.error('❌ Validation Errors:', validation.errors);
                    setValidationErrors(
                        validation.errors?.map(err => `${err.instancePath || 'root'}: ${err.message}`) || []
                    );

                    const errorMessage =
                        validation.errors
                            ?.slice(0, 3)
                            .map(err => `• ${err.instancePath || 'root'}: ${err.message}`)
                            .join('\n') || 'Unknown validation errors';

                    alert(
                        `Schema validation failed:\n${errorMessage}${validation.errors && validation.errors.length > 3 ? '\n... and more errors' : ''}`
                    );
                    console.groupEnd();
                    setIsSaving(false);
                    return; // Don't save if validation fails
                } else {
                    setValidationErrors([]);
                }
                console.groupEnd();
            }

            // For primary language, generate schema for local validation
            if (isPrimaryLanguage) {
                const schemas = debugZodSchema(
                    jsonContent,
                    `Primary Language Schema - ${selectedLanguage.toUpperCase()}`
                );

                // Update local schema state for immediate validation
                setPrimaryLanguageSchema(schemas.jsonSchema);
                console.log('📋 JSON Schema generated for local validation');
            }

            // Generate change operations from differences
            const originalJson = originalJsonContent ? JSON.parse(originalJsonContent) : {};
            const changeSet = generateChangeOperations(originalJson, jsonContent);

            console.log('📝 Generated change operations:', changeSet);

            // Save using change operations for precise updates and synchronization
            const result = await applyChangeOperations({
                languageId,
                workspaceId: currentWorkspace._id,
                changeSet,
            });

            // Update original content for next time
            setOriginalJsonContent(JSON.stringify(jsonContent, null, 2));

            // Show results to user
            if (result.syncErrors.length > 0) {
                console.warn('⚠️ Some languages could not be synchronized:', result.syncErrors);
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
            setOriginalNodes([...nodes]);
            setHasUnsavedChanges(false);

            // Success notification
            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Convert nodes back to JSON structure
    const convertNodesToJson = (nodesToConvert: TranslationNode[]) => {
        const result: any = {};

        // Get all root level nodes (nodes without parents)
        const rootNodes = nodesToConvert.filter(node => !node.parent);

        const buildObject = (nodeId: string): any => {
            const node = nodesToConvert.find(n => n.id === nodeId);
            if (!node) return {};

            if (node.type === 'object') {
                const obj: any = {};
                node.children.forEach(childId => {
                    const childNode = nodesToConvert.find(n => n.id === childId);
                    if (childNode) {
                        const key = childNode.key.split('.').pop() || childNode.key;
                        obj[key] = buildObject(childId);
                    }
                });
                return obj;
            } else {
                return node.value;
            }
        };

        rootNodes.forEach(rootNode => {
            const key = rootNode.key.split('.').pop() || rootNode.key;
            result[key] = buildObject(rootNode.id);
        });

        return result;
    };

    const enterJsonEditMode = () => {
        // Convert current nodes back to JSON structure
        const reconstructJson = () => {
            const result: any = {};

            // Get all root level nodes (nodes without parents)
            const rootNodes = nodes.filter(node => !node.parent);

            const buildObject = (nodeId: string): any => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return {};

                if (node.type === 'object') {
                    const obj: any = {};
                    node.children.forEach(childId => {
                        const childNode = nodes.find(n => n.id === childId);
                        if (childNode) {
                            const key = childNode.key.split('.').pop() || childNode.key;
                            obj[key] = buildObject(childId);
                        }
                    });
                    return obj;
                } else {
                    return node.value;
                }
            };

            rootNodes.forEach(rootNode => {
                const key = rootNode.key.split('.').pop() || rootNode.key;
                result[key] = buildObject(rootNode.id);
            });

            return result;
        };

        const jsonStructure = reconstructJson();
        setRawJsonEdit(JSON.stringify(jsonStructure, null, 2));
        setJsonEditMode(true);
    };

    const saveJsonEdit = () => {
        try {
            const parsedJson = JSON.parse(rawJsonEdit);
            const currentJson = convertNodesToJson(nodes);

            // Detect precise structural changes
            const structuralChanges = detectPreciseStructuralChanges(currentJson, parsedJson);

            // For non-primary languages, prevent any structural changes
            if (!isPrimaryLanguage && structuralChanges.hasStructuralChanges) {
                const changeDetails = [];
                if (structuralChanges.addedNodes.length > 0) {
                    changeDetails.push(`• Added nodes: ${structuralChanges.addedNodes.map(n => n.path).join(', ')}`);
                }
                if (structuralChanges.deletedNodes.length > 0) {
                    changeDetails.push(
                        `• Deleted nodes: ${structuralChanges.deletedNodes.map(n => n.path).join(', ')}`
                    );
                }
                if (structuralChanges.changedTypes.length > 0) {
                    changeDetails.push(
                        `• Type changes: ${structuralChanges.changedTypes.map(c => `${c.path} (${c.oldType} → ${c.newType})`).join(', ')}`
                    );
                }

                alert(
                    `Non-primary languages cannot make structural changes:\n${changeDetails.join('\n')}\n\nOnly primitive values can be modified.`
                );
                return;
            }

            // For primary language, warn about structural changes that will affect other languages
            if (isPrimaryLanguage && structuralChanges.hasStructuralChanges) {
                const changeDetails = [];
                if (structuralChanges.addedNodes.length > 0) {
                    changeDetails.push(`• Adding ${structuralChanges.addedNodes.length} new nodes`);
                }
                if (structuralChanges.deletedNodes.length > 0) {
                    changeDetails.push(`• Deleting ${structuralChanges.deletedNodes.length} nodes`);
                }
                if (structuralChanges.changedTypes.length > 0) {
                    changeDetails.push(`• Changing ${structuralChanges.changedTypes.length} node types`);
                }

                const proceed = confirm(
                    `Primary language structural changes detected:\n${changeDetails.join('\n')}\n\nThis will automatically synchronize all other languages using values from the primary language. Continue?`
                );

                if (!proceed) {
                    return;
                }
            }

            // Validate against JSON schema (mandatory for non-primary languages)
            if (!isPrimaryLanguage && !primaryLanguageSchema) {
                alert(
                    'Cannot save: Primary language schema not available. Please ensure the primary language has been saved first.'
                );
                return;
            }

            if (!isPrimaryLanguage && primaryLanguageSchema) {
                const validation = validateWithAjv(parsedJson, primaryLanguageSchema);

                console.group(`🔍 AJV Schema Validation - ${selectedLanguage.toUpperCase()}`);
                console.log('📄 Input JSON:', parsedJson);
                console.log('📋 Schema:', primaryLanguageSchema);
                console.log('✅ Validation Result:', validation.isValid ? 'PASSED' : 'FAILED');

                if (!validation.isValid) {
                    console.error('❌ Validation Errors:', validation.errors);
                    setValidationErrors(
                        validation.errors?.map(err => `${err.instancePath || 'root'}: ${err.message}`) || []
                    );

                    const errorMessage =
                        validation.errors
                            ?.slice(0, 3)
                            .map(err => `• ${err.instancePath || 'root'}: ${err.message}`)
                            .join('\n') || 'Unknown validation errors';

                    alert(
                        `Schema validation failed:\n${errorMessage}${validation.errors && validation.errors.length > 3 ? '\n... and more errors' : ''}`
                    );
                    console.groupEnd();
                    return; // Don't save if validation fails
                } else {
                    setValidationErrors([]);
                }
                console.groupEnd();
            }

            // Record the bulk edit change before applying
            const oldNodes = [...nodes];
            const newNodes = createNodesFromJson(parsedJson);

            // Analyze the changes for metadata
            const oldKeys = new Set(oldNodes.map(n => n.key));
            const newKeys = new Set(newNodes.map(n => n.key));

            const addedKeys = [...newKeys].filter(k => !oldKeys.has(k));
            const deletedKeys = [...oldKeys].filter(k => !newKeys.has(k));
            const modifiedKeys = newNodes
                .filter(newNode => {
                    const oldNode = oldNodes.find(n => n.key === newNode.key);
                    return oldNode && JSON.stringify(oldNode.value) !== JSON.stringify(newNode.value);
                })
                .map(n => n.key);

            // For primary language, generate schema for local validation
            if (isPrimaryLanguage) {
                const schemas = debugZodSchema(
                    parsedJson,
                    `Primary Language Schema - ${selectedLanguage.toUpperCase()}`
                );

                // Update local schema state for immediate validation
                setPrimaryLanguageSchema(schemas.jsonSchema);
                console.log('📋 JSON Schema generated for local validation');
            }

            // Apply the changes to local state only - save happens when Save button is pressed
            setNodes(newNodes);
            setHasUnsavedChanges(true);

            // Record the bulk edit in change history
            recordChange({
                type: 'json_bulk_edit',
                operation: {
                    bulkEdit: {
                        oldNodes,
                        newNodes,
                        addedKeys,
                        deletedKeys,
                        modifiedKeys,
                    },
                },
                metadata: {
                    affectedKeys: [...addedKeys, ...deletedKeys, ...modifiedKeys],
                    requiresSync: isPrimaryLanguage && (addedKeys.length > 0 || deletedKeys.length > 0),
                    syncType: addedKeys.length > 0 || deletedKeys.length > 0 ? 'structure_change' : 'value_only',
                    languageId: languageId || undefined,
                    isPrimaryLanguage: !!isPrimaryLanguage,
                },
            });

            setJsonEditMode(false);
            setRawJsonEdit('');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Invalid JSON format');
        }
    };

    // Convert typed value to proper JSON based on type
    const convertTypedValueToJSON = (
        value: string,
        type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    ): string => {
        if (!value.trim()) return '""';

        switch (type) {
            case 'string':
                return JSON.stringify(value);
            case 'number':
                const num = parseFloat(value);
                return isNaN(num) ? '"0"' : num.toString();
            case 'boolean':
                return value.toLowerCase() === 'true' ? 'true' : 'false';
            case 'object':
            case 'array':
                try {
                    JSON.parse(value);
                    return value;
                } catch {
                    return JSON.stringify(value);
                }
            default:
                return JSON.stringify(value);
        }
    };

    // Convert UI values to JSON string
    const getUIValueAsJSON = () => {
        try {
            switch (uiValueType) {
                case 'string':
                    return JSON.stringify(uiStringValue);
                case 'number':
                    const num = parseFloat(uiNumberValue);
                    return isNaN(num) ? '""' : num.toString();
                case 'boolean':
                    return uiBooleanValue.toString();
                case 'array':
                    const arrayItems = uiArrayItems
                        .filter(item => item.value.trim() !== '')
                        .map(item => convertTypedValueToJSON(item.value, item.type));
                    return `[${arrayItems.join(', ')}]`;
                case 'object':
                    const objectEntries = uiObjectKeys
                        .filter(entry => entry.key.trim() !== '')
                        .map(entry => {
                            const key = JSON.stringify(entry.key);
                            const value = convertTypedValueToJSON(entry.value, entry.type);
                            return `${key}: ${value}`;
                        });
                    return `{${objectEntries.join(', ')}}`;
                default:
                    return '""';
            }
        } catch {
            return '""';
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
                              value: JSON.stringify(item),
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
                              value: JSON.stringify(value),
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
        const jsonValue = getUIValueAsJSON();
        setNewKeyValue(jsonValue);
        setAddKeyMode('json');
    };

    // Convert Edit UI values to JSON string
    const getEditUIValueAsJSON = () => {
        try {
            switch (editUIValueType) {
                case 'string':
                    return JSON.stringify(editUIStringValue);
                case 'number':
                    const num = parseFloat(editUINumberValue);
                    return isNaN(num) ? '""' : num.toString();
                case 'boolean':
                    return editUIBooleanValue.toString();
                case 'array':
                    const arrayItems = editUIArrayItems
                        .filter(item => item.value.trim() !== '')
                        .map(item => convertTypedValueToJSON(item.value, item.type));
                    return `[${arrayItems.join(', ')}]`;
                case 'object':
                    const objectEntries = editUIObjectKeys
                        .filter(entry => entry.key.trim() !== '')
                        .map(entry => {
                            const key = JSON.stringify(entry.key);
                            const value = convertTypedValueToJSON(entry.value, entry.type);
                            return `${key}: ${value}`;
                        });
                    return `{${objectEntries.join(', ')}}`;
                default:
                    return '""';
            }
        } catch {
            return '""';
        }
    };

    // Convert JSON string to Edit UI values
    const setEditUIValuesFromJSON = (jsonString: string) => {
        if (!jsonString.trim()) {
            setEditUIValueType('string');
            setEditUIStringValue('');
            return;
        }

        try {
            const parsed = JSON.parse(jsonString);

            if (typeof parsed === 'string') {
                setEditUIValueType('string');
                setEditUIStringValue(parsed);
            } else if (typeof parsed === 'number') {
                setEditUIValueType('number');
                setEditUINumberValue(parsed.toString());
            } else if (typeof parsed === 'boolean') {
                setEditUIValueType('boolean');
                setEditUIBooleanValue(parsed);
            } else if (Array.isArray(parsed)) {
                setEditUIValueType('array');
                setEditUIArrayItems(
                    parsed.length > 0
                        ? parsed.map(item => ({
                              value: JSON.stringify(item),
                              type: Array.isArray(item)
                                  ? 'array'
                                  : typeof item === 'object' && item !== null
                                    ? 'object'
                                    : (typeof item as 'string' | 'number' | 'boolean'),
                          }))
                        : [{ value: '', type: 'string' }]
                );
            } else if (typeof parsed === 'object' && parsed !== null) {
                setEditUIValueType('object');
                const entries = Object.entries(parsed);
                setEditUIObjectKeys(
                    entries.length > 0
                        ? entries.map(([key, value]) => ({
                              key,
                              value: JSON.stringify(value),
                              type: Array.isArray(value)
                                  ? 'array'
                                  : typeof value === 'object' && value !== null
                                    ? 'object'
                                    : (typeof value as 'string' | 'number' | 'boolean'),
                          }))
                        : [{ key: '', value: '', type: 'string' }]
                );
            } else {
                setEditUIValueType('string');
                setEditUIStringValue('');
            }
        } catch {
            // Invalid JSON, keep current UI state
        }
    };

    // Handle mode switching for Edit
    const switchToEditUIMode = () => {
        if (isValidJson(editValue) || !editValue.trim()) {
            setEditUIValuesFromJSON(editValue);
            setEditMode('ui');
        }
    };

    const switchToEditJSONMode = () => {
        const jsonValue = getEditUIValueAsJSON();
        setEditValue(jsonValue);
        setEditMode('json');
    };

    // Handle UI value changes and sync with JSON
    const handleEditUIValueChange = () => {
        if (editMode === 'ui') {
            const jsonValue = getEditUIValueAsJSON();
            setEditValue(jsonValue);
            handleJsonValueChange(jsonValue);
        }
    };

    // Handle UI value changes for uncommitted tracking (without auto-applying)
    const handleEditUIValueChangeUncommitted = () => {
        if (editMode === 'ui' && selectedNode) {
            const jsonValue = getEditUIValueAsJSON();
            setEditValue(jsonValue);

            // Mark as uncommitted if changed
            const currentNode = nodes.find(n => n.id === selectedNode);
            if (currentNode) {
                try {
                    const newParsedValue = JSON.parse(jsonValue);
                    const currentParsedValue = currentNode.value;

                    const hasChanged = JSON.stringify(currentParsedValue) !== JSON.stringify(newParsedValue);
                    setHasUncommittedChanges(hasChanged);
                } catch {
                    // Invalid JSON, mark as uncommitted if text has changed
                    const currentValueString = JSON.stringify(currentNode.value, null, 2);
                    setHasUncommittedChanges(jsonValue !== currentValueString);
                }
            }
        }
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
            finalValue = getUIValueAsJSON();
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
                    collapsed: false,
                };

                // Only create child nodes for objects (not for strings or arrays)
                let newNodes = [newNode];
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
                setNodes(prev => [
                    ...prev.map(node =>
                        node.id === addKeyParent ? { ...node, children: [...node.children, newNodeId] } : node
                    ),
                    ...newNodes,
                ]);

                // Record the add key change
                recordChange({
                    type: 'add_key',
                    operation: {
                        added: {
                            nodeId: newNodeId,
                            key: newNodeKey,
                            value: parsedValue,
                            type: nodeType,
                            parentKey: parentNode.key,
                        },
                    },
                    metadata: {
                        affectedKeys: [newNodeKey],
                        requiresSync: isPrimaryLanguage, // Sync structure changes if primary
                        syncType: 'structure_change',
                        languageId: languageId || undefined,
                        isPrimaryLanguage: !!isPrimaryLanguage,
                    },
                });
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
                setNodes(newNodes);

                // Record the root level add key change
                const newNodeId = newNodes.find(n => n.key === rootKeyName)?.id || `node-${rootKeyName}`;
                recordChange({
                    type: 'add_key',
                    operation: {
                        added: {
                            nodeId: newNodeId,
                            key: rootKeyName,
                            value: parsedValue,
                            type: nodeType,
                        },
                    },
                    metadata: {
                        affectedKeys: [rootKeyName],
                        requiresSync: isPrimaryLanguage, // Sync structure changes if primary
                        syncType: 'structure_change',
                        languageId: languageId || undefined,
                        isPrimaryLanguage: !!isPrimaryLanguage,
                    },
                });
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
            setHasUnsavedChanges(true);
        } catch (error) {
            alert('Failed to add key. Please check your input.');
        }
    };

    // Search and filter functionality
    const filterNodes = useCallback((nodes: TranslationNode[], query: string): TranslationNode[] => {
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
                const addChildren = (nodeId: string) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.children.forEach(childId => {
                            matchingNodes.add(childId);
                            addChildren(childId);
                        });
                    }
                };
                addChildren(node.id);
            }
        });

        return nodes.filter(node => matchingNodes.has(node.id));
    }, []);

    // Update filtered nodes when search query or nodes change
    useEffect(() => {
        const filtered = filterNodes(nodes, searchQuery);
        setFilteredNodes(filtered);
    }, [nodes, searchQuery, filterNodes]);

    // Tree view component - memoized for better performance
    const TreeView = useCallback(() => {
        const displayNodes = searchQuery ? filteredNodes : nodes;
        const rootNodes = displayNodes.filter(node => !node.parent);

        const renderTreeNode = (node: TranslationNode, level = 0) => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedKeys.has(node.id);
            const childNodes = displayNodes.filter(n => node.children.includes(n.id));

            const toggleExpanded = () => {
                const newExpanded = new Set(expandedKeys);
                if (isExpanded) {
                    newExpanded.delete(node.id);
                } else {
                    newExpanded.add(node.id);
                }
                setExpandedKeys(newExpanded);
            };

            const handleNodeClick = () => {
                setSelectedNode(node.id);
                // Initialize editValue with the current node's value for JSON editing
                const jsonValue = JSON.stringify(node.value, null, 2);
                setEditValue(jsonValue);
                // Initialize editKey with just the node's name (not the full path)
                setEditKey(node.key.split('.').pop() || node.key);
                // Initialize edit UI values
                setEditUIValuesFromJSON(jsonValue);
                // Reset to JSON mode by default for existing nodes
                setEditMode('json');
            };

            const getDisplayValue = () => {
                if (node.type === 'object') {
                    // Count actual child nodes instead of relying on node.value
                    const childCount = node.children.length;
                    return `{${childCount} keys}`;
                } else if (node.type === 'array') {
                    const arr = Array.isArray(node.value) ? node.value : [];
                    return `[${arr.length} items]`;
                } else if (typeof node.value === 'object' && node.value) {
                    const currentLangValue = (node.value as any)[selectedLanguage];
                    return currentLangValue || Object.values(node.value)[0] || '';
                }
                return String(node.value || '');
            };

            // Check if this node has empty values for highlighting
            const hasEmptyValue = node.type === 'string' && isEmptyValue(node.value);

            return (
                <div key={node.id} className='select-none' data-node-id={node.id}>
                    <div
                        className={`flex items-center py-2 px-3 hover:bg-gray-800 cursor-pointer rounded-md transition-colors ${
                            selectedNode === node.id ? 'bg-blue-900 border-l-4 border-blue-500' : ''
                        } ${hasEmptyValue ? 'border-l-2 border-yellow-500 bg-yellow-900/20' : ''}`}
                        style={{ marginLeft: level * 20 }}
                        onClick={handleNodeClick}>
                        {hasChildren && (
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    toggleExpanded();
                                }}
                                className='mr-2 p-1 hover:bg-gray-700 rounded cursor-pointer'>
                                <ChevronRight
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                                />
                            </button>
                        )}
                        {!hasChildren && <div className='w-6 mr-2' />}

                        <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-2 min-w-0'>
                                    <span className='font-medium text-blue-400 truncate'>
                                        {node.key.split('.').pop()}
                                    </span>
                                    <span className='text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded'>
                                        {node.type}
                                    </span>
                                </div>
                                <div className='text-sm text-gray-300 truncate ml-2 max-w-48'>{getDisplayValue()}</div>
                            </div>
                        </div>
                    </div>

                    {hasChildren && isExpanded && (
                        <div>{childNodes.map(childNode => renderTreeNode(childNode, level + 1))}</div>
                    )}
                </div>
            );
        };

        return (
            <div className='p-4'>
                {rootNodes.length > 0 ? (
                    rootNodes.map(node => renderTreeNode(node, 0))
                ) : (
                    <div className='text-center py-12'>
                        <Search className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                        <h3 className='text-lg font-medium text-gray-400 mb-2'>
                            {searchQuery ? 'No matches found' : 'No translations loaded'}
                        </h3>
                        <p className='text-gray-500'>
                            {searchQuery
                                ? 'Try adjusting your search query'
                                : 'Load some translation data to get started'}
                        </p>
                    </div>
                )}
            </div>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, filteredNodes, searchQuery, expandedKeys, selectedNode, selectedLanguage]);

    // Auto-expand root nodes on first load
    useEffect(() => {
        if (nodes.length > 0 && expandedKeys.size === 0) {
            const rootNodes = nodes.filter(node => !node.parent);
            const newExpanded = new Set(rootNodes.map(node => node.id));
            setExpandedKeys(newExpanded);
        }
    }, [nodes, expandedKeys.size]);

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
                        {/* Undo/Redo buttons */}
                        {changeHistory.length > 0 && (
                            <div className='flex items-center border border-gray-700 rounded-md'>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={undoChange}
                                    disabled={currentChangeIndex < 0}
                                    className='px-2 py-1 h-8 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-none border-r border-gray-700'
                                    title={`Undo (${currentChangeIndex + 1}/${changeHistory.length})`}>
                                    <Undo className='h-3 w-3' />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={redoChange}
                                    disabled={currentChangeIndex >= changeHistory.length - 1}
                                    className='px-2 py-1 h-8 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-none'
                                    title={`Redo (${currentChangeIndex + 1}/${changeHistory.length})`}>
                                    <Redo className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        {emptyValueCount > 0 && (
                            <button
                                onClick={() => setShowEmptyValuesDialog(true)}
                                className='flex items-center space-x-2 px-3 py-1 bg-yellow-900/50 border border-yellow-500/50 rounded-md hover:bg-yellow-900/70 transition-colors cursor-pointer'>
                                <AlertTriangle className='h-4 w-4 text-yellow-500' />
                                <span className='text-sm text-yellow-400'>
                                    {emptyValueCount} empty value{emptyValueCount !== 1 ? 's' : ''}
                                </span>
                            </button>
                        )}
                        <Button variant='outline' size='sm' onClick={enterJsonEditMode} className='cursor-pointer'>
                            <Code className='h-4 w-4 mr-2' />
                            JSON Mode
                        </Button>
                        <Button
                            size='sm'
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving || emptyValueCount > 0}
                            className={`cursor-pointer ${
                                hasUnsavedChanges && emptyValueCount === 0
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-600 cursor-not-allowed'
                            }`}>
                            <Save className='h-4 w-4 mr-2' />
                            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className='bg-gray-900 border-b border-gray-800 px-6 py-3'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        {/* Search Field */}
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                            <input
                                type='text'
                                placeholder='Search keys and values...'
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className='pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64'
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer'>
                                    <X className='h-4 w-4' />
                                </button>
                            )}
                        </div>
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

                {/* Side Panel */}
                <div className='w-80 bg-gray-950 border-l border-gray-800 flex flex-col'>
                    {selectedNode ? (
                        <div className='flex flex-col h-full'>
                            {/* Fixed header */}
                            <div className='p-6 pb-4 flex-shrink-0 border-b border-gray-800'>
                                <div className='flex items-center justify-between mb-6'>
                                    <h3 className='text-lg font-semibold'>Selected Key</h3>
                                    <div className='flex items-center space-x-2'>
                                        {(() => {
                                            const node = nodes.find(n => n.id === selectedNode);
                                            return node?.type === 'object' ? (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    disabled={!isPrimaryLanguage}
                                                    onClick={() => {
                                                        if (!isPrimaryLanguage) {
                                                            alert(
                                                                'Only the primary language can add translation keys. Non-primary languages can only edit values.'
                                                            );
                                                            return;
                                                        }
                                                        setAddKeyParent(selectedNode);
                                                        setShowAddKeyModal(true);
                                                    }}
                                                    className={
                                                        isPrimaryLanguage
                                                            ? 'text-green-400 hover:text-green-300 hover:border-green-400 cursor-pointer'
                                                            : 'text-gray-500 cursor-not-allowed opacity-50'
                                                    }
                                                    title={
                                                        isPrimaryLanguage
                                                            ? 'Add child key'
                                                            : 'Only primary language can add keys'
                                                    }>
                                                    <Plus className='h-4 w-4' />
                                                </Button>
                                            ) : null;
                                        })()}
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => {
                                                setSelectedNode(null);
                                                setEditValue('');
                                                setEditKey('');
                                            }}
                                            className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer'>
                                            <X className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            disabled={!isPrimaryLanguage}
                                            onClick={deleteSelectedKey}
                                            className={
                                                isPrimaryLanguage
                                                    ? 'text-red-400 hover:text-red-300 hover:border-red-400 cursor-pointer'
                                                    : 'text-gray-500 cursor-not-allowed opacity-50'
                                            }
                                            title={
                                                isPrimaryLanguage
                                                    ? 'Delete key'
                                                    : 'Only primary language can delete keys'
                                            }>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable content area */}
                            <div className='flex-1 overflow-y-auto p-6 pt-4'>
                                {(() => {
                                    const node = nodes.find(n => n.id === selectedNode);
                                    if (!node) return null;

                                    return (
                                        <div className='space-y-6 flex-1'>
                                            {/* Full Path */}
                                            <div>
                                                <div className='flex items-center justify-between mb-2'>
                                                    <label className='text-sm font-medium text-gray-400'>
                                                        Full Path
                                                    </label>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => copyToClipboard(node.key)}
                                                        className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-6 w-6 p-0'>
                                                        <Copy className='h-3 w-3' />
                                                    </Button>
                                                </div>
                                                <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-gray-300 break-all'>
                                                    {node.key}
                                                </div>
                                            </div>

                                            {/* Parent Path */}
                                            {(() => {
                                                const keyParts = node.key.split('.');
                                                const parentPath = keyParts.slice(0, -1).join('.');

                                                if (parentPath) {
                                                    return (
                                                        <div>
                                                            <div className='flex items-center justify-between mb-2'>
                                                                <label className='text-sm font-medium text-gray-400'>
                                                                    Parents
                                                                </label>
                                                                <Button
                                                                    variant='outline'
                                                                    size='sm'
                                                                    onClick={() => copyToClipboard(parentPath)}
                                                                    className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-6 w-6 p-0'>
                                                                    <Copy className='h-3 w-3' />
                                                                </Button>
                                                            </div>
                                                            <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-gray-300 break-all'>
                                                                {parentPath}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Editable Key Name */}
                                            <div>
                                                <div className='flex items-center justify-between mb-2'>
                                                    <label className='text-sm font-medium text-gray-400'>Key</label>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => copyToClipboard(editKey)}
                                                        className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-6 w-6 p-0'>
                                                        <Copy className='h-3 w-3' />
                                                    </Button>
                                                </div>
                                                <input
                                                    type='text'
                                                    value={editKey}
                                                    onChange={e => setEditKey(e.target.value)}
                                                    onBlur={() => handleKeyChange(editKey)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleKeyChange(editKey);
                                                        }
                                                    }}
                                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                    placeholder='Enter key name'
                                                />
                                            </div>

                                            {/* Type */}
                                            <div>
                                                <label className='block text-sm font-medium text-gray-400 mb-2'>
                                                    Type
                                                </label>
                                                <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300'>
                                                    {node.type}
                                                </div>
                                            </div>

                                            {/* Value */}
                                            <div className='flex-1'>
                                                <div className='flex items-center justify-between mb-2'>
                                                    <label className='text-sm font-medium text-gray-400'>Value</label>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => {
                                                            let valueText = '';
                                                            if (node.type === 'object' || node.type === 'array') {
                                                                valueText = JSON.stringify(node.value, null, 2);
                                                            } else if (typeof node.value === 'object' && node.value) {
                                                                const currentValue = (node.value as any)[
                                                                    selectedLanguage
                                                                ];
                                                                valueText =
                                                                    currentValue || JSON.stringify(node.value, null, 2);
                                                            } else {
                                                                valueText = String(node.value || '');
                                                            }
                                                            copyToClipboard(valueText);
                                                        }}
                                                        className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-6 w-6 p-0'>
                                                        <Copy className='h-3 w-3' />
                                                    </Button>
                                                </div>

                                                {node.type === 'string' &&
                                                typeof node.value === 'object' &&
                                                node.value ? (
                                                    <div className='space-y-4'>
                                                        {/* Current language editing */}
                                                        <div>
                                                            <div className='flex items-center justify-between mb-1'>
                                                                <label className='text-xs text-gray-500'>
                                                                    {selectedLanguage.toUpperCase()} Translation
                                                                </label>
                                                                <Button
                                                                    variant='outline'
                                                                    size='sm'
                                                                    onClick={() =>
                                                                        copyToClipboard(
                                                                            (node.value as any)[selectedLanguage] || ''
                                                                        )
                                                                    }
                                                                    className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-5 w-5 p-0'>
                                                                    <Copy className='h-2.5 w-2.5' />
                                                                </Button>
                                                            </div>
                                                            <textarea
                                                                value={(node.value as any)[selectedLanguage] || ''}
                                                                onChange={e => {
                                                                    const newValue = {
                                                                        ...(typeof node.value === 'object'
                                                                            ? node.value
                                                                            : {}),
                                                                        [selectedLanguage]: e.target.value,
                                                                    };
                                                                    setNodes(prev =>
                                                                        prev.map(n =>
                                                                            n.id === node.id
                                                                                ? { ...n, value: newValue }
                                                                                : n
                                                                        )
                                                                    );
                                                                }}
                                                                className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto min-h-[6rem] max-h-48'
                                                                placeholder={`Enter ${selectedLanguage.toUpperCase()} translation...`}
                                                            />
                                                        </div>

                                                        {/* Other languages (read-only display) */}
                                                        {Object.entries(node.value as object).filter(
                                                            ([lang]) =>
                                                                lang !== selectedLanguage && (node.value as any)[lang]
                                                        ).length > 0 && (
                                                            <div>
                                                                <label className='block text-xs text-gray-500 mb-1'>
                                                                    Other Languages
                                                                </label>
                                                                <div className='space-y-1 max-h-32 overflow-y-auto'>
                                                                    {Object.entries(node.value as object)
                                                                        .filter(
                                                                            ([lang]) =>
                                                                                lang !== selectedLanguage &&
                                                                                (node.value as any)[lang]
                                                                        )
                                                                        .map(([lang, text]) => (
                                                                            <div
                                                                                key={lang}
                                                                                className='text-xs text-gray-400 break-words'>
                                                                                <span className='font-mono text-gray-500'>
                                                                                    {lang.toUpperCase()}:
                                                                                </span>{' '}
                                                                                {text as string}
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // Dual-mode editing for all other types (including objects)
                                                    <div className='space-y-4'>
                                                        {/* Mode Selector for Edit */}
                                                        <div className='flex space-x-2'>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant={editMode === 'ui' ? 'default' : 'outline'}
                                                                onClick={() => {
                                                                    if (editMode === 'json') {
                                                                        switchToEditUIMode();
                                                                    }
                                                                }}
                                                                disabled={
                                                                    editMode === 'json' &&
                                                                    editValue.trim() &&
                                                                    !isValidJson(editValue)
                                                                }
                                                                className={`cursor-pointer ${
                                                                    editMode === 'json' &&
                                                                    editValue.trim() &&
                                                                    !isValidJson(editValue)
                                                                        ? 'opacity-50 cursor-not-allowed'
                                                                        : ''
                                                                }`}>
                                                                UI Mode
                                                            </Button>
                                                            <Button
                                                                type='button'
                                                                size='sm'
                                                                variant={editMode === 'json' ? 'default' : 'outline'}
                                                                onClick={switchToEditJSONMode}
                                                                className='cursor-pointer'>
                                                                JSON Mode
                                                            </Button>
                                                        </div>

                                                        {editMode === 'ui' ? (
                                                            <div className='space-y-3'>
                                                                {/* Type Display (non-editable for existing nodes) */}
                                                                <div>
                                                                    <label className='text-xs text-gray-500 mb-1 block'>
                                                                        Type (fixed)
                                                                    </label>
                                                                    <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-400'>
                                                                        {editUIValueType}
                                                                    </div>
                                                                </div>

                                                                {/* Value Input Based on Type */}
                                                                {editUIValueType === 'string' && (
                                                                    <input
                                                                        type='text'
                                                                        value={editUIStringValue}
                                                                        onChange={e => {
                                                                            setEditUIStringValue(e.target.value);
                                                                            setTimeout(
                                                                                handleEditUIValueChangeUncommitted,
                                                                                0
                                                                            );
                                                                        }}
                                                                        className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                        placeholder='Enter string value...'
                                                                    />
                                                                )}

                                                                {editUIValueType === 'number' && (
                                                                    <input
                                                                        type='number'
                                                                        value={editUINumberValue}
                                                                        onChange={e => {
                                                                            setEditUINumberValue(e.target.value);
                                                                            setTimeout(
                                                                                handleEditUIValueChangeUncommitted,
                                                                                0
                                                                            );
                                                                        }}
                                                                        className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                                        placeholder='Enter number value...'
                                                                    />
                                                                )}

                                                                {editUIValueType === 'boolean' && (
                                                                    <Select
                                                                        value={editUIBooleanValue.toString()}
                                                                        onValueChange={value => {
                                                                            setEditUIBooleanValue(value === 'true');
                                                                            setTimeout(
                                                                                handleEditUIValueChangeUncommitted,
                                                                                0
                                                                            );
                                                                        }}>
                                                                        <SelectTrigger className='w-full bg-gray-800 border-gray-700 text-white'>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value='true'>true</SelectItem>
                                                                            <SelectItem value='false'>false</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}

                                                                {editUIValueType === 'array' && (
                                                                    <div className='space-y-2'>
                                                                        <label className='text-xs text-gray-500'>
                                                                            Array Items
                                                                        </label>
                                                                        {editUIArrayItems.map((item, index) => (
                                                                            <div key={index} className='space-y-1'>
                                                                                {/* Type selector */}
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <label className='text-xs text-gray-500 w-8 flex-shrink-0'>
                                                                                        Type:
                                                                                    </label>
                                                                                    <Select
                                                                                        value={item.type}
                                                                                        onValueChange={value => {
                                                                                            const newItems = [
                                                                                                ...editUIArrayItems,
                                                                                            ];
                                                                                            newItems[index] = {
                                                                                                ...item,
                                                                                                type: value as typeof item.type,
                                                                                                value: '',
                                                                                            };
                                                                                            setEditUIArrayItems(
                                                                                                newItems
                                                                                            );
                                                                                            setTimeout(
                                                                                                handleEditUIValueChange,
                                                                                                0
                                                                                            );
                                                                                        }}>
                                                                                        <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value='string'>
                                                                                                String
                                                                                            </SelectItem>
                                                                                            <SelectItem value='number'>
                                                                                                Number
                                                                                            </SelectItem>
                                                                                            <SelectItem value='boolean'>
                                                                                                Boolean
                                                                                            </SelectItem>
                                                                                            <SelectItem value='array'>
                                                                                                Array
                                                                                            </SelectItem>
                                                                                            <SelectItem value='object'>
                                                                                                Object
                                                                                            </SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                    <Button
                                                                                        type='button'
                                                                                        size='sm'
                                                                                        variant='outline'
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                editUIArrayItems.length >
                                                                                                1
                                                                                            ) {
                                                                                                const newItems =
                                                                                                    editUIArrayItems.filter(
                                                                                                        (_, i) =>
                                                                                                            i !== index
                                                                                                    );
                                                                                                setEditUIArrayItems(
                                                                                                    newItems
                                                                                                );
                                                                                            } else {
                                                                                                const newItems = [
                                                                                                    ...editUIArrayItems,
                                                                                                ];
                                                                                                newItems[index] = {
                                                                                                    value: '',
                                                                                                    type: 'string',
                                                                                                };
                                                                                                setEditUIArrayItems(
                                                                                                    newItems
                                                                                                );
                                                                                            }
                                                                                            setTimeout(
                                                                                                handleEditUIValueChange,
                                                                                                0
                                                                                            );
                                                                                        }}
                                                                                        className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs'>
                                                                                        ✕
                                                                                    </Button>
                                                                                </div>
                                                                                {/* Value input */}
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <label className='text-xs text-gray-500 w-8 flex-shrink-0'>
                                                                                        Val:
                                                                                    </label>
                                                                                    {item.type === 'boolean' ? (
                                                                                        <Select
                                                                                            value={item.value || 'true'}
                                                                                            onValueChange={value => {
                                                                                                const newItems = [
                                                                                                    ...editUIArrayItems,
                                                                                                ];
                                                                                                newItems[index] = {
                                                                                                    ...item,
                                                                                                    value,
                                                                                                };
                                                                                                setEditUIArrayItems(
                                                                                                    newItems
                                                                                                );
                                                                                                setTimeout(
                                                                                                    handleEditUIValueChange,
                                                                                                    0
                                                                                                );
                                                                                            }}>
                                                                                            <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value='true'>
                                                                                                    true
                                                                                                </SelectItem>
                                                                                                <SelectItem value='false'>
                                                                                                    false
                                                                                                </SelectItem>
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    ) : (
                                                                                        <input
                                                                                            type={
                                                                                                item.type === 'number'
                                                                                                    ? 'number'
                                                                                                    : 'text'
                                                                                            }
                                                                                            value={item.value}
                                                                                            onChange={e => {
                                                                                                const newItems = [
                                                                                                    ...editUIArrayItems,
                                                                                                ];
                                                                                                newItems[index] = {
                                                                                                    ...item,
                                                                                                    value: e.target
                                                                                                        .value,
                                                                                                };
                                                                                                setEditUIArrayItems(
                                                                                                    newItems
                                                                                                );
                                                                                                setTimeout(
                                                                                                    handleEditUIValueChange,
                                                                                                    0
                                                                                                );
                                                                                            }}
                                                                                            className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                                                            placeholder={
                                                                                                item.type === 'string'
                                                                                                    ? 'String value'
                                                                                                    : item.type ===
                                                                                                        'number'
                                                                                                      ? 'Number'
                                                                                                      : item.type ===
                                                                                                          'object'
                                                                                                        ? '{"key": "value"}'
                                                                                                        : item.type ===
                                                                                                            'array'
                                                                                                          ? '[1, 2, 3]'
                                                                                                          : 'Value'
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                                {/* Separator */}
                                                                                {index <
                                                                                    editUIArrayItems.length - 1 && (
                                                                                    <div className='border-t border-gray-700'></div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                        <Button
                                                                            type='button'
                                                                            size='sm'
                                                                            variant='outline'
                                                                            onClick={() => {
                                                                                setEditUIArrayItems([
                                                                                    ...editUIArrayItems,
                                                                                    { value: '', type: 'string' },
                                                                                ]);
                                                                            }}
                                                                            className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs'>
                                                                            + Add Item
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                                {editUIValueType === 'object' && (
                                                                    <div className='space-y-2'>
                                                                        <label className='text-xs text-gray-500'>
                                                                            Object Properties
                                                                        </label>
                                                                        {editUIObjectKeys.map((entry, index) => (
                                                                            <div key={index} className='space-y-1'>
                                                                                {/* Property Key */}
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <label className='text-xs text-gray-500 w-8 flex-shrink-0'>
                                                                                        Key:
                                                                                    </label>
                                                                                    <input
                                                                                        type='text'
                                                                                        value={entry.key}
                                                                                        onChange={e => {
                                                                                            const newEntries = [
                                                                                                ...editUIObjectKeys,
                                                                                            ];
                                                                                            newEntries[index].key =
                                                                                                e.target.value;
                                                                                            setEditUIObjectKeys(
                                                                                                newEntries
                                                                                            );
                                                                                            setTimeout(
                                                                                                handleEditUIValueChange,
                                                                                                0
                                                                                            );
                                                                                        }}
                                                                                        className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                                                        placeholder='Property key'
                                                                                    />
                                                                                    <Button
                                                                                        type='button'
                                                                                        size='sm'
                                                                                        variant='outline'
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                editUIObjectKeys.length >
                                                                                                1
                                                                                            ) {
                                                                                                const newEntries =
                                                                                                    editUIObjectKeys.filter(
                                                                                                        (_, i) =>
                                                                                                            i !== index
                                                                                                    );
                                                                                                setEditUIObjectKeys(
                                                                                                    newEntries
                                                                                                );
                                                                                            } else {
                                                                                                const newEntries = [
                                                                                                    ...editUIObjectKeys,
                                                                                                ];
                                                                                                newEntries[index] = {
                                                                                                    key: '',
                                                                                                    value: '',
                                                                                                    type: 'string',
                                                                                                };
                                                                                                setEditUIObjectKeys(
                                                                                                    newEntries
                                                                                                );
                                                                                            }
                                                                                            setTimeout(
                                                                                                handleEditUIValueChange,
                                                                                                0
                                                                                            );
                                                                                        }}
                                                                                        className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs'>
                                                                                        ✕
                                                                                    </Button>
                                                                                </div>
                                                                                {/* Value Type */}
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <label className='text-xs text-gray-500 w-8 flex-shrink-0'>
                                                                                        Type:
                                                                                    </label>
                                                                                    <Select
                                                                                        value={entry.type}
                                                                                        onValueChange={value => {
                                                                                            const newEntries = [
                                                                                                ...editUIObjectKeys,
                                                                                            ];
                                                                                            newEntries[index] = {
                                                                                                ...entry,
                                                                                                type: value as typeof entry.type,
                                                                                                value: '',
                                                                                            };
                                                                                            setEditUIObjectKeys(
                                                                                                newEntries
                                                                                            );
                                                                                            setTimeout(
                                                                                                handleEditUIValueChange,
                                                                                                0
                                                                                            );
                                                                                        }}>
                                                                                        <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value='string'>
                                                                                                String
                                                                                            </SelectItem>
                                                                                            <SelectItem value='number'>
                                                                                                Number
                                                                                            </SelectItem>
                                                                                            <SelectItem value='boolean'>
                                                                                                Boolean
                                                                                            </SelectItem>
                                                                                            <SelectItem value='array'>
                                                                                                Array
                                                                                            </SelectItem>
                                                                                            <SelectItem value='object'>
                                                                                                Object
                                                                                            </SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                {/* Property Value */}
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <label className='text-xs text-gray-500 w-8 flex-shrink-0'>
                                                                                        Val:
                                                                                    </label>
                                                                                    {entry.type === 'boolean' ? (
                                                                                        <Select
                                                                                            value={
                                                                                                entry.value || 'true'
                                                                                            }
                                                                                            onValueChange={value => {
                                                                                                const newEntries = [
                                                                                                    ...editUIObjectKeys,
                                                                                                ];
                                                                                                newEntries[
                                                                                                    index
                                                                                                ].value = value;
                                                                                                setEditUIObjectKeys(
                                                                                                    newEntries
                                                                                                );
                                                                                                setTimeout(
                                                                                                    handleEditUIValueChange,
                                                                                                    0
                                                                                                );
                                                                                            }}>
                                                                                            <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value='true'>
                                                                                                    true
                                                                                                </SelectItem>
                                                                                                <SelectItem value='false'>
                                                                                                    false
                                                                                                </SelectItem>
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    ) : (
                                                                                        <input
                                                                                            type={
                                                                                                entry.type === 'number'
                                                                                                    ? 'number'
                                                                                                    : 'text'
                                                                                            }
                                                                                            value={entry.value}
                                                                                            onChange={e => {
                                                                                                const newEntries = [
                                                                                                    ...editUIObjectKeys,
                                                                                                ];
                                                                                                newEntries[
                                                                                                    index
                                                                                                ].value =
                                                                                                    e.target.value;
                                                                                                setEditUIObjectKeys(
                                                                                                    newEntries
                                                                                                );
                                                                                                setTimeout(
                                                                                                    handleEditUIValueChange,
                                                                                                    0
                                                                                                );
                                                                                            }}
                                                                                            className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                                                            placeholder={
                                                                                                entry.type === 'string'
                                                                                                    ? 'String value'
                                                                                                    : entry.type ===
                                                                                                        'number'
                                                                                                      ? 'Number'
                                                                                                      : entry.type ===
                                                                                                          'object'
                                                                                                        ? '{"key": "value"}'
                                                                                                        : entry.type ===
                                                                                                            'array'
                                                                                                          ? '[1, 2, 3]'
                                                                                                          : 'Value'
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                                {/* Separator line except for last item */}
                                                                                {index <
                                                                                    editUIObjectKeys.length - 1 && (
                                                                                    <div className='border-t border-gray-700'></div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                        <Button
                                                                            type='button'
                                                                            size='sm'
                                                                            variant='outline'
                                                                            onClick={() => {
                                                                                setEditUIObjectKeys([
                                                                                    ...editUIObjectKeys,
                                                                                    {
                                                                                        key: '',
                                                                                        value: '',
                                                                                        type: 'string',
                                                                                    },
                                                                                ]);
                                                                            }}
                                                                            className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs'>
                                                                            + Add Property
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                                {/* Apply button for UI mode */}
                                                                <div className='flex items-center justify-between mt-4 pt-3 border-t border-gray-700'>
                                                                    <div
                                                                        className={`text-xs ${
                                                                            hasUncommittedChanges
                                                                                ? 'text-yellow-400'
                                                                                : 'text-gray-500'
                                                                        }`}>
                                                                        {hasUncommittedChanges
                                                                            ? 'You have uncommitted changes'
                                                                            : 'No changes to apply'}
                                                                    </div>
                                                                    <Button
                                                                        size='sm'
                                                                        onClick={applyEdit}
                                                                        disabled={!hasUncommittedChanges}
                                                                        className={`ml-2 ${
                                                                            hasUncommittedChanges
                                                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                                                : 'bg-gray-600 cursor-not-allowed'
                                                                        }`}>
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className='space-y-2'>
                                                                <div className='relative'>
                                                                    <textarea
                                                                        value={
                                                                            editValue ||
                                                                            JSON.stringify(node.value, null, 2)
                                                                        }
                                                                        onChange={e =>
                                                                            handleJsonValueChange(e.target.value)
                                                                        }
                                                                        className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 overflow-y-auto min-h-[8rem] max-h-64 ${
                                                                            editValue && !isValidJson(editValue)
                                                                                ? 'border-red-500 focus:ring-red-500'
                                                                                : 'border-gray-700 focus:ring-blue-500'
                                                                        }`}
                                                                        placeholder='Edit JSON value...'
                                                                    />
                                                                    {editValue && !isValidJson(editValue) && (
                                                                        <div className='absolute top-2 right-2'>
                                                                            <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Apply button and status */}
                                                                <div className='flex items-center justify-between mt-2'>
                                                                    <div
                                                                        className={`text-xs ${
                                                                            editValue && !isValidJson(editValue)
                                                                                ? 'text-red-400'
                                                                                : hasUncommittedChanges
                                                                                  ? 'text-yellow-400'
                                                                                  : 'text-gray-500'
                                                                        }`}>
                                                                        {editValue && !isValidJson(editValue)
                                                                            ? 'Invalid JSON format'
                                                                            : hasUncommittedChanges
                                                                              ? 'You have uncommitted changes'
                                                                              : 'No changes to apply'}
                                                                    </div>
                                                                    <Button
                                                                        size='sm'
                                                                        onClick={applyEdit}
                                                                        disabled={
                                                                            !hasUncommittedChanges ||
                                                                            (editValue && !isValidJson(editValue))
                                                                        }
                                                                        className={`ml-2 ${
                                                                            hasUncommittedChanges &&
                                                                            isValidJson(editValue || '{}')
                                                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                                                : 'bg-gray-600 cursor-not-allowed'
                                                                        }`}>
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className='p-6 text-center text-gray-500'>
                            <Search className='h-12 w-12 mx-auto mb-4 opacity-50' />
                            <p>Select a key to view its details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* JSON Edit Mode Modal */}
            {jsonEditMode && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-gray-900 rounded-lg p-6 w-4/5 h-4/5 max-w-6xl flex flex-col'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold'>JSON Edit Mode</h3>
                            <Button variant='outline' onClick={() => setJsonEditMode(false)}>
                                ✕
                            </Button>
                        </div>

                        <div className='flex-1 flex flex-col'>
                            <p className='text-sm text-gray-400 mb-4'>
                                Edit the entire JSON structure. Perfect for developers who want to copy/paste from
                                existing codebases.
                            </p>

                            <textarea
                                value={rawJsonEdit}
                                onChange={e => setRawJsonEdit(e.target.value)}
                                className='flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto'
                                placeholder='Paste your JSON here...'
                            />

                            <div className='flex justify-end space-x-2 mt-4'>
                                <Button
                                    variant='outline'
                                    onClick={() => setJsonEditMode(false)}
                                    className='cursor-pointer'>
                                    Cancel
                                </Button>
                                <Button onClick={saveJsonEdit} className='cursor-pointer'>
                                    Apply Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Key Modal */}
            {showAddKeyModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                    <div className='bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
                        <h3 className='text-lg font-semibold mb-4'>
                            Add New Translation Key
                            {addKeyParent
                                ? (() => {
                                      const parentNode = nodes.find(n => n.id === addKeyParent);
                                      return parentNode ? ` (to ${parentNode.key})` : ' (to selected node)';
                                  })()
                                : ' (to root level)'}
                        </h3>

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
                                                                    newEntries[index].key = e.target.value;
                                                                    setUiObjectKeys(newEntries);
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
                                                                        newEntries[index].value = e.target.value;
                                                                        setUiObjectKeys(newEntries);
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
                                                                        newEntries[index].value = e.target.value;
                                                                        setUiObjectKeys(newEntries);
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
                                                                        newEntries[index].value = value;
                                                                        setUiObjectKeys(newEntries);
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
                                                                        newEntries[index].value = e.target.value;
                                                                        setUiObjectKeys(newEntries);
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
                                        const uiValue = getUIValueAsJSON();
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
                                            const uiValue = getUIValueAsJSON();
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
                                            const uiValue = getUIValueAsJSON();
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

            {/* Empty Values Dialog */}
            <Dialog open={showEmptyValuesDialog} onOpenChange={setShowEmptyValuesDialog}>
                <DialogContent className='max-w-md max-h-[70vh] bg-gray-900 border-gray-700 overflow-hidden flex flex-col'>
                    <DialogHeader className='flex-shrink-0'>
                        <DialogTitle className='flex items-center space-x-2 text-white'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                            <span>Empty Values ({emptyValueCount})</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className='flex-1 overflow-hidden flex flex-col mt-4'>
                        <DialogDescription className='text-sm text-gray-400 mb-4 flex-shrink-0'>
                            Click on any item below to navigate to it in the editor.
                        </DialogDescription>

                        <div className='flex flex-1 min-h-0'>
                            <ScrollArea className='flex-1 space-y-1 pr-2 max-w-full'>
                                {emptyValueNodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => navigateToEmptyValue(node.id)}
                                        className='w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group border border-transparent hover:border-gray-600 cursor-pointer'>
                                        <div className='flex items-center justify-between w-full'>
                                            <div className='flex-1 min-w-0'>
                                                <div className='text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate text-ellipsis w-[370px]'>
                                                    {node.key}
                                                </div>
                                                <div className='text-xs text-gray-500 mt-1'>
                                                    {node.type} • Empty value
                                                </div>
                                            </div>
                                            <ChevronRight className='h-4 w-4 text-gray-500 group-hover:text-blue-400 flex-shrink-0 ml-2' />
                                        </div>
                                    </button>
                                ))}

                                {emptyValueNodes.length === 0 && (
                                    <div className='text-center py-8 text-gray-500'>
                                        <AlertTriangle className='h-12 w-12 mx-auto mb-3 text-gray-600' />
                                        <p>No empty values found</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
