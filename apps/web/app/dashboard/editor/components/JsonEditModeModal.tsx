'use client';

import { useState } from 'react';
import { Code, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { validateWithAjv } from '@/lib/zodSchemaGenerator';
import { convertNodesToJson } from '../utils/convertNodesToJson';
import { createNodesFromJson } from '../utils/createNodesFromJson';
import { Textarea } from '@/components/ui/textarea';
import { hasUnsavedChanges$, nodes$, selectedNode$ } from '../store';
import { isValidJson } from '../utils/isValidJson';

interface Props {
    isPrimaryLanguage: boolean;
    primaryLanguageSchema: any;
}

export default function JsonEditModeModal({ isPrimaryLanguage, primaryLanguageSchema }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [originalJson, setOriginalJson] = useState('');
    const [rawJsonEdit, setRawJsonEdit] = useState('');
    const [hasEmptyKeys, setHasEmptyKeys] = useState(false);

    // Function to check for empty keys in JSON object recursively
    const checkForEmptyKeys = (obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;

        if (Array.isArray(obj)) {
            return obj.some(item => checkForEmptyKeys(item));
        }

        return Object.keys(obj).some(key => {
            if (key.trim() === '') return true;
            return checkForEmptyKeys(obj[key]);
        });
    };

    // Handle JSON text changes with validation
    const handleJsonChange = (value: string) => {
        setRawJsonEdit(value);

        if (isValidJson(value)) {
            try {
                const parsed = JSON.parse(value);
                setHasEmptyKeys(checkForEmptyKeys(parsed));
            } catch {
                setHasEmptyKeys(false);
            }
        } else {
            setHasEmptyKeys(false);
        }
    };

    const openDialog = () => {
        const jsonStructure = convertNodesToJson(nodes$.get());
        const jsonString = JSON.stringify(jsonStructure, null, 2);
        setRawJsonEdit(jsonString);
        setOriginalJson(jsonString);
        setHasEmptyKeys(checkForEmptyKeys(jsonStructure));
        setIsOpen(true);
    };

    const saveJsonEdit = () => {
        if (rawJsonEdit === originalJson) {
            return;
        }

        try {
            const parsedJson = JSON.parse(rawJsonEdit);

            // Validate against JSON schema (mandatory for non-primary languages)
            if (!isPrimaryLanguage && !primaryLanguageSchema) {
                alert(
                    'Cannot save: Primary language schema not available. Please ensure the primary language has been saved first.'
                );
                return;
            }

            if (!isPrimaryLanguage && primaryLanguageSchema) {
                const validation = validateWithAjv(parsedJson, primaryLanguageSchema);

                if (!validation.isValid) {
                    console.error('❌ Validation Errors:', validation.errors);

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
                }
                console.groupEnd();
            }

            const newNodes = createNodesFromJson(parsedJson);

            nodes$.set(newNodes);
            hasUnsavedChanges$.set(true);
            
            // Update the selected node if it exists in the new structure
            const currentSelectedNode = selectedNode$.get();
            if (currentSelectedNode) {
                const updatedSelectedNode = newNodes.find(node => node.key === currentSelectedNode.key);
                if (updatedSelectedNode) {
                    selectedNode$.set(updatedSelectedNode);
                } else {
                    // If the selected node no longer exists, clear selection
                    selectedNode$.set(null);
                }
            }
            
            setIsOpen(false);
            setRawJsonEdit('');
            setOriginalJson('');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Invalid JSON format');
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={open => {
                setIsOpen(open);
                if (!open) {
                    setRawJsonEdit('');
                    setHasEmptyKeys(false);
                }
            }}>
            <DialogTrigger asChild>
                <Button variant='outline' size='sm' onClick={openDialog} className='cursor-pointer'>
                    <Code className='h-4 w-4 mr-2' />
                    JSON Mode
                </Button>
            </DialogTrigger>

            <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-7xl w-[95vw] max-h-[90vh] backdrop-blur-md'>
                <DialogHeader className='pb-6 border-b border-gray-800/50 flex-shrink-0'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-purple-500/30'>
                            <Code className='h-6 w-6 text-purple-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>JSON Editor</DialogTitle>
                            <p className='text-gray-400 text-sm'>
                                Edit the entire JSON structure. Perfect for copy/pasting from existing codebases.
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className='flex flex-col flex-1 py-6 space-y-4'>
                    <div className='relative flex-1'>
                        <Textarea
                            value={rawJsonEdit}
                            onChange={e => handleJsonChange(e.target.value)}
                            className='w-full h-full min-h-[500px] max-h-[500px] px-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 overflow-y-auto transition-all
                            scrollbar-thin scrollbar-track-gray-800/50 scrollbar-thumb-purple-600/50 hover:scrollbar-thumb-purple-600/70 scrollbar-thumb-rounded-full scrollbar-track-rounded-full'
                            placeholder='Paste your JSON here...\n\n{\n  "welcome": {\n    "title": "Hello World",\n    "subtitle": "Welcome to our app"\n  },\n  "navigation": {\n    "home": "Home",\n    "about": "About"\n  }\n}'
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(147, 51, 234, 0.5) rgba(31, 41, 55, 0.5)',
                            }}
                        />

                        {/* JSON Validation Indicator */}
                        <div className='absolute top-3 right-3 z-10'>
                            {rawJsonEdit.trim() ? (
                                isValidJson(rawJsonEdit) && !hasEmptyKeys ? (
                                    <div className='flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm'>
                                        <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                        <span className='text-xs text-green-400 font-medium'>Valid</span>
                                    </div>
                                ) : (
                                    <div className='flex items-center space-x-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm'>
                                        <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                                        <span className='text-xs text-red-400 font-medium'>Invalid</span>
                                    </div>
                                )
                            ) : (
                                <div className='flex items-center space-x-1 px-2 py-1 bg-gray-500/10 border border-gray-500/30 rounded-lg backdrop-blur-sm'>
                                    <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
                                    <span className='text-xs text-gray-400 font-medium'>Empty</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error message for empty keys */}
                    {hasEmptyKeys && (
                        <div className='px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl'>
                            <p className='text-sm text-red-400'>
                                ⚠️ Error: Object keys cannot be empty strings. Please provide valid keys for all
                                properties.
                            </p>
                        </div>
                    )}

                    <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='ghost'
                            onClick={() => setIsOpen(false)}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50 cursor-pointer transition-all'>
                            Cancel
                        </Button>
                        <Button
                            onClick={saveJsonEdit}
                            disabled={!isValidJson(rawJsonEdit) || hasEmptyKeys || rawJsonEdit === originalJson}
                            className={`bg-purple-600 text-white hover:bg-purple-700 cursor-pointer transition-all px-6 ${
                                !isValidJson(rawJsonEdit) || hasEmptyKeys ? 'cursor-not-allowed opacity-50' : ''
                            }`}>
                            <Code className='h-4 w-4 mr-2' />
                            Apply Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
