'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Save, Plus, Globe, ChevronDown, Trash2, Code, Search, ChevronRight, X, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

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

export default function TranslationEditor() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Extract URL parameters
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;
    const workspaceId = searchParams.get('workspaceId') as Id<'workspaces'> | null;
    const namespaceVersionId = searchParams.get('namespaceVersionId') as Id<'namespaceVersions'> | null;
    const namespaceId = searchParams.get('namespaceId') as Id<'namespaces'> | null;
    
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNodes, setFilteredNodes] = useState<TranslationNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [emptyValueCount, setEmptyValueCount] = useState(0);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Backend queries and mutations
    const updateLanguageContent = useMutation(api.languages.updateLanguageContent);
    const getLanguageFileUrl = useMutation(api.languages.getLanguageFileUrl);
    
    // Get current workspace
    const clerkId = organization?.id || user?.id;
    const currentWorkspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );
    
    // Get language details
    const language = useQuery(
        api.languages.getLanguage,
        languageId && workspaceId ? { languageId, workspaceId } : 'skip'
    );
    
    // Get namespace version details
    const namespaceVersion = useQuery(
        api.namespaceVersions.getNamespaceVersion,
        namespaceVersionId && workspaceId ? { 
            namespaceVersionId, 
            workspaceId 
        } : 'skip'
    );
    
    // Simplified: we'll derive namespace data from the namespaceVersion
    // Since we have the namespaceVersion, we can get the namespace from that
    const namespaceFromVersion = namespaceVersion?.namespaceId;
    
    // For simplicity, we'll use the data we have rather than making complex queries
    
    // Get all versions for this namespace
    const allVersions = useQuery(
        api.namespaceVersions.getNamespaceVersions,
        namespaceFromVersion && workspaceId ? {
            namespaceId: namespaceFromVersion,
            workspaceId,
            paginationOpts: { numItems: 50, cursor: null }
        } : 'skip'
    );
    
    // Get all languages for current version
    const allLanguages = useQuery(
        api.languages.getLanguages,
        namespaceVersionId && workspaceId ? {
            namespaceVersionId,
            workspaceId,
            paginationOpts: { numItems: 50, cursor: null }
        } : 'skip'
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
    const currentNamespace = 'namespace'; // We'll show a generic name for now
    const currentVersion = namespaceVersion?.version || '1.0.0';
    
    // Available options from backend
    const availableVersions = allVersions?.page?.map(v => v.version) || ['1.0.0'];
    const availableLanguages = allLanguages?.page?.map(l => l.languageCode) || ['en'];
    
    // Navigation functions
    const handleLanguageChange = async (newLanguageCode: string) => {
        if (hasUnsavedChanges) {
            const confirmSwitch = window.confirm(
                'You have unsaved changes. Switching language will discard them. Continue?'
            );
            if (!confirmSwitch) return;
        }
        
        // Find the new language in the current version
        const targetLanguage = allLanguages?.page?.find(l => l.languageCode === newLanguageCode);
        if (targetLanguage && workspaceId && namespaceVersionId && namespaceId) {
            // Update URL to switch to new language
            const newUrl = `/dashboard/editor?languageId=${targetLanguage._id}&workspaceId=${workspaceId}&namespaceVersionId=${namespaceVersionId}&namespaceId=${namespaceId}`;
            router.push(newUrl);
        }
    };
    
    const handleVersionChange = async (newVersion: string) => {
        if (hasUnsavedChanges) {
            const confirmSwitch = window.confirm(
                'You have unsaved changes. Switching version will discard them. Continue?'
            );
            if (!confirmSwitch) return;
        }
        
        // Find the new version
        const targetVersion = allVersions?.page?.find(v => v.version === newVersion);
        if (targetVersion && workspaceId && namespaceId) {
            // Find a language in the new version (prefer same language code if available)
            const newVersionLanguages = await fetch(`/api/languages?namespaceVersionId=${targetVersion._id}&workspaceId=${workspaceId}`);
            // For now, redirect to the version's first available language
            // In a real implementation, you'd query the languages for the new version
            const newUrl = `/dashboard/editor?namespaceVersionId=${targetVersion._id}&workspaceId=${workspaceId}&namespaceId=${namespaceId}`;
            router.push(newUrl);
        }
    };

    // Sample translation data
    const sampleTranslations = {
        welcome: {
            title: {
                en: 'Welcome to our app',
                es: 'Bienvenido a nuestra aplicación',
                fr: 'Bienvenue dans notre application',
            },
            subtitle: {
                en: 'Get started today',
                es: 'Comienza hoy',
                fr: "Commencez aujourd'hui",
            },
        },
        auth: {
            login: {
                button: {
                    en: 'Sign In',
                    es: 'Iniciar Sesión',
                    fr: 'Se Connecter',
                },
                email: {
                    en: 'Email Address',
                    es: 'Dirección de Correo',
                    fr: 'Adresse Email',
                },
            },
            register: {
                title: {
                    en: 'Create Account',
                    es: 'Crear Cuenta',
                    fr: 'Créer un Compte',
                },
            },
        },
        navigation: {
            home: {
                en: 'Home',
                es: 'Inicio',
                fr: 'Accueil',
            },
            about: {
                en: 'About',
                es: 'Acerca de',
                fr: 'À Propos',
            },
        },
        categories: ['food', 'drinks', 'desserts', 'appetizers'],
        prices: [9.99, 12.5, 8.75, 15.0],
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

    // Initialize nodes from sample data (fallback when no backend language is loaded)
    useEffect(() => {
        if (!languageId && nodes.length === 0) {
            const initialNodes = createNodesFromJson(sampleTranslations);
            setNodes(initialNodes);
            setOriginalNodes(initialNodes);
            setHasUnsavedChanges(false);
        }
    }, [createNodesFromJson, languageId, nodes.length]);

    // Track changes to nodes
    useEffect(() => {
        if (originalNodes.length > 0) {
            const hasChanges = JSON.stringify(nodes) !== JSON.stringify(originalNodes);
            setHasUnsavedChanges(hasChanges);
        }
    }, [nodes, originalNodes]);

    // Handle loading state
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
    
    if (!languageId || !workspaceId) {
        return (
            <div className='min-h-screen bg-black text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-xl font-semibold text-gray-400 mb-2'>No Language Selected</h2>
                    <p className='text-gray-500'>Please select a language from the project dashboard.</p>
                    <Button 
                        onClick={() => router.push('/dashboard')}
                        className='mt-4 bg-blue-600 hover:bg-blue-700'
                    >
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    };

    // Load language content from backend
    useEffect(() => {
        const loadLanguageContent = async () => {
            if (!languageId || !workspaceId || !language) return;
            
            try {
                if (language.fileId) {
                    const fileUrl = await getLanguageFileUrl({ languageId, workspaceId });
                    const response = await fetch(fileUrl);
                    const content = await response.text();
                    const parsedContent = JSON.parse(content);
                    
                    const initialNodes = createNodesFromJson(parsedContent);
                    setNodes(initialNodes);
                    setOriginalNodes(initialNodes);
                    setHasUnsavedChanges(false);
                } else {
                    // Language has no file yet, start with empty
                    setNodes([]);
                    setOriginalNodes([]);
                    setHasUnsavedChanges(false);
                }
            } catch (error) {
                console.error('Failed to load language content:', error);
                // Fallback to sample data or empty state
                const initialNodes = createNodesFromJson(sampleTranslations);
                setNodes(initialNodes);
                setOriginalNodes(initialNodes);
                setHasUnsavedChanges(false);
            }
        };
        
        if (language) {
            loadLanguageContent();
        }
    }, [language, languageId, workspaceId, createNodesFromJson]);

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
    
    // Update validation when nodes change
    useEffect(() => {
        validateNodes(nodes);
    }, [nodes, validateNodes]);

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

    // Real-time JSON editing with validation and structural change detection
    const handleJsonValueChange = (newJsonValue: string) => {
        setEditValue(newJsonValue);

        // Try to parse and apply changes in real-time if valid JSON
        if (selectedNode && newJsonValue.trim()) {
            try {
                const parsedValue = JSON.parse(newJsonValue);
                const currentNode = nodes.find(n => n.id === selectedNode);

                if (currentNode) {
                    // Check if this is a structural change to an object
                    const isStructuralChange = hasStructuralChanges(currentNode.value, parsedValue);

                    if (isStructuralChange && (currentNode.type === 'object' || currentNode.type === 'array')) {
                        // For structural changes, we need to rebuild the entire tree
                        // First, update the specific node
                        const updatedNodes = nodes.map(node =>
                            node.id === selectedNode ? { ...node, value: parsedValue } : node
                        );

                        // Build the complete JSON structure from updated nodes
                        const completeJson: any = {};
                        const rootNodes = updatedNodes.filter(node => !node.parent);

                        const buildJsonFromNodes = (nodeId: string, nodeList: TranslationNode[]): any => {
                            const node = nodeList.find(n => n.id === nodeId);
                            if (!node) return {};

                            if (node.id === selectedNode) {
                                // Use the new parsed value for the selected node
                                return parsedValue;
                            } else if (node.type === 'object') {
                                const obj: any = {};
                                node.children.forEach(childId => {
                                    const childNode = nodeList.find(n => n.id === childId);
                                    if (childNode) {
                                        const key = childNode.key.split('.').pop() || childNode.key;
                                        obj[key] = buildJsonFromNodes(childId, nodeList);
                                    }
                                });
                                return obj;
                            } else if (node.type === 'array') {
                                // For arrays, just return the value directly since we don't create child nodes for array items
                                return node.value;
                            } else {
                                return node.value;
                            }
                        };

                        rootNodes.forEach(rootNode => {
                            const key = rootNode.key.split('.').pop() || rootNode.key;
                            completeJson[key] = buildJsonFromNodes(rootNode.id, updatedNodes);
                        });

                        // Rebuild the entire node structure
                        const newNodes = createNodesFromJson(completeJson);
                        setNodes(newNodes);

                        // Try to preserve selection by finding the node with the same key
                        const currentKey = currentNode.key;
                        const newSelectedNode = newNodes.find(n => n.key === currentKey);
                        if (newSelectedNode) {
                            setSelectedNode(newSelectedNode.id);
                            setEditValue(JSON.stringify(newSelectedNode.value, null, 2));
                            setEditKey(newSelectedNode.key.split('.').pop() || newSelectedNode.key);
                        } else {
                            setSelectedNode(null);
                            setEditValue('');
                            setEditKey('');
                        }
                    } else {
                        // Simple value update, no structural changes
                        setNodes(prev =>
                            prev.map(node => (node.id === selectedNode ? { ...node, value: parsedValue } : node))
                        );
                    }
                }
            } catch (error) {
                // Invalid JSON - don't update the node, just keep the edit value
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
        if (!hasUnsavedChanges || !languageId || !workspaceId) return;
        
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
            
            // Save to backend
            await updateLanguageContent({
                languageId,
                workspaceId,
                content: JSON.stringify(jsonContent, null, 2)
            });
            
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
            const newNodes = createNodesFromJson(parsedJson);
            setNodes(newNodes);
            setJsonEditMode(false);
            setRawJsonEdit('');
        } catch (error) {
            alert('Invalid JSON format');
        }
    };

    // Add new key functionality
    const addNewKey = () => {
        if (!addKeyParent || !newKeyName.trim()) return;

        const parentNode = nodes.find(n => n.id === addKeyParent);
        if (!parentNode) return;

        try {
            // Try to parse the value as JSON, fallback to string
            let parsedValue;
            try {
                parsedValue = JSON.parse(newKeyValue);
            } catch {
                // If it's not valid JSON, treat as string and create translation object
                if (newKeyValue.trim()) {
                    parsedValue = { [selectedLanguage]: newKeyValue.trim() };
                } else {
                    parsedValue = { [selectedLanguage]: '' };
                }
            }

            // Determine the type
            const isObject = typeof parsedValue === 'object' && parsedValue !== null && !Array.isArray(parsedValue);

            // Create the new node
            const newNodeKey = `${parentNode.key}.${newKeyName}`;
            const newNodeId = `node-${newNodeKey}`;

            const newNode: TranslationNode = {
                id: newNodeId,
                key: newNodeKey,
                value: parsedValue,
                type: isObject ? 'object' : 'string',
                parent: addKeyParent,
                children: [],
                collapsed: false,
            };

            // If the new value is an object, create child nodes
            let newNodes = [newNode];
            if (isObject) {
                const childNodes = createNodesFromJson(parsedValue);
                // Update the child nodes to have the correct parent and key prefixes
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

            // Reset modal state
            setShowAddKeyModal(false);
            setAddKeyParent(null);
            setNewKeyName('');
            setNewKeyValue('');
        } catch (error) {
            alert('Invalid JSON format');
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

    // Tree view component
    const TreeView = () => {
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
                setEditValue(JSON.stringify(node.value, null, 2));
                // Initialize editKey with just the node's name (not the full path)
                setEditKey(node.key.split('.').pop() || node.key);
            };

            const getDisplayValue = () => {
                if (node.type === 'object') {
                    return `{${Object.keys(node.value || {}).length} keys}`;
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
                <div key={node.id} className='select-none'>
                    <div
                        className={`flex items-center py-2 px-3 hover:bg-gray-800 cursor-pointer rounded-md transition-colors ${
                            selectedNode === node.id ? 'bg-blue-900 border-l-4 border-blue-500' : ''
                        } ${
                            hasEmptyValue ? 'border-l-2 border-yellow-500 bg-yellow-900/20' : ''
                        }`}
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
            <div className='h-full overflow-auto bg-gray-900 p-4'>
                <div className='space-y-1'>
                    {rootNodes.length > 0 ? (
                        rootNodes.map(node => renderTreeNode(node))
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
            </div>
        );
    };

    // Auto-expand root nodes on first load
    useEffect(() => {
        if (nodes.length > 0 && expandedKeys.size === 0) {
            const rootNodes = nodes.filter(node => !node.parent);
            const newExpanded = new Set(rootNodes.map(node => node.id));
            setExpandedKeys(newExpanded);
        }
    }, [nodes, expandedKeys.size]);

    return (
        <div className='min-h-screen bg-black text-white flex flex-col'>
            {/* Header */}
            <div className='bg-gray-950 border-b border-gray-800 px-6 py-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <h1 className='text-2xl font-bold'>Translation Editor</h1>
                        <div className='flex items-center space-x-2 text-sm text-gray-400'>
                            <Globe className='h-4 w-4' />
                            <span>{currentNamespace}</span>
                            <span>•</span>
                            <span>v{currentVersion}</span>
                            <span>•</span>
                            <span>{selectedLanguage.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className='flex items-center space-x-4'>
                        {/* Version Selector */}
                        <div className='flex items-center space-x-2'>
                            <span className='text-sm text-gray-400'>Version:</span>
                            <div className='relative'>
                                <select
                                    value={currentVersion}
                                    onChange={e => handleVersionChange(e.target.value)}
                                    className='bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'
                                    disabled={!allVersions?.page || allVersions.page.length <= 1}>
                                    {availableVersions.map(ver => (
                                        <option key={ver} value={ver}>
                                            v{ver}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className='absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div className='flex items-center space-x-2'>
                            <span className='text-sm text-gray-400'>Language:</span>
                            <div className='relative'>
                                <select
                                    value={selectedLanguage}
                                    onChange={e => handleLanguageChange(e.target.value)}
                                    className='bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'
                                    disabled={!allLanguages?.page || allLanguages.page.length <= 1}>
                                    {availableLanguages.map(lang => (
                                        <option key={lang} value={lang}>
                                            {lang.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className='absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                            </div>
                        </div>

                        <div className='flex items-center space-x-2'>
                            {emptyValueCount > 0 && (
                                <div className='flex items-center space-x-2 px-3 py-1 bg-yellow-900/50 border border-yellow-500/50 rounded-md'>
                                    <AlertTriangle className='h-4 w-4 text-yellow-500' />
                                    <span className='text-sm text-yellow-400'>
                                        {emptyValueCount} empty value{emptyValueCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
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
                        <Button variant='outline' size='sm' className='cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Add Key
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className='flex-1 flex'>
                {/* Tree View */}
                <div className='flex-1 relative overflow-hidden'>
                    <TreeView />
                </div>

                {/* Side Panel */}
                <div className='w-80 bg-gray-950 border-l border-gray-800 flex flex-col'>
                    {selectedNode ? (
                        <div className='p-6 flex flex-col h-full'>
                            <div className='flex items-center justify-between mb-6'>
                                <h3 className='text-lg font-semibold'>Selected Key</h3>
                                <div className='flex items-center space-x-2'>
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
                                        onClick={deleteSelectedKey}
                                        className='text-red-400 hover:text-red-300 hover:border-red-400 cursor-pointer'>
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>

                            {(() => {
                                const node = nodes.find(n => n.id === selectedNode);
                                if (!node) return null;

                                return (
                                    <div className='space-y-6 flex-1'>
                                        {/* Full Path */}
                                        <div>
                                            <div className='flex items-center justify-between mb-2'>
                                                <label className='text-sm font-medium text-gray-400'>Full Path</label>
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
                                            <label className='block text-sm font-medium text-gray-400 mb-2'>Type</label>
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
                                                            const currentValue = (node.value as any)[selectedLanguage];
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

                                            {node.type === 'string' && typeof node.value === 'object' && node.value ? (
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
                                                                        n.id === node.id ? { ...n, value: newValue } : n
                                                                    )
                                                                );
                                                            }}
                                                            className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                            rows={4}
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
                                                // Raw JSON editing for all other types (including objects)
                                                <div className='space-y-2'>
                                                    <div className='relative'>
                                                        <textarea
                                                            value={editValue || JSON.stringify(node.value, null, 2)}
                                                            onChange={e => handleJsonValueChange(e.target.value)}
                                                            className={`w-full px-3 py-2 bg-gray-800 border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 ${
                                                                editValue && !isValidJson(editValue)
                                                                    ? 'border-red-500 focus:ring-red-500'
                                                                    : 'border-gray-700 focus:ring-blue-500'
                                                            }`}
                                                            rows={8}
                                                            placeholder='Edit JSON value...'
                                                        />
                                                        {editValue && !isValidJson(editValue) && (
                                                            <div className='absolute top-2 right-2'>
                                                                <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`text-xs ${
                                                            editValue && !isValidJson(editValue)
                                                                ? 'text-red-400'
                                                                : 'text-gray-500'
                                                        }`}>
                                                        {editValue && !isValidJson(editValue)
                                                            ? 'Invalid JSON format - fix syntax to apply changes'
                                                            : 'Changes apply automatically when JSON is valid'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
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
                                className='flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-gray-900 rounded-lg p-6 w-96 max-w-full'>
                        <h3 className='text-lg font-semibold mb-4'>Add New Translation Key</h3>

                        <div className='space-y-4'>
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

                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>Value</label>
                                <textarea
                                    value={newKeyValue}
                                    onChange={e => setNewKeyValue(e.target.value)}
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    rows={4}
                                    placeholder={`Enter translation text or JSON object...\n\nExamples:\n- "Hello World" (string)\n- {"en": "Hello", "es": "Hola"} (translation object)`}
                                />
                            </div>

                            <div className='text-xs text-gray-500'>
                                <p>
                                    <strong>Tip:</strong> Enter plain text for simple translations, or valid JSON for
                                    complex structures.
                                </p>
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
                                }}
                                className='cursor-pointer'>
                                Cancel
                            </Button>
                            <Button onClick={addNewKey} disabled={!newKeyName.trim()} className='cursor-pointer'>
                                Add Key
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
