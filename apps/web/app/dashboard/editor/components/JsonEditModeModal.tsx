'use client';

import { useState } from 'react';
import { Code, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateWithAjv } from '@/lib/zodSchemaGenerator';
import { convertNodesToJson } from '../utils/convertNodesToJson';
import { createNodesFromJson } from '../utils/createNodesFromJson';
import { Textarea } from '@/components/ui/textarea';
import { hasUnsavedChanges$, nodes$ } from '../store';
import { isValidJson } from '../utils/isValidJson';

interface Props {
    isPrimaryLanguage: boolean;
    primaryLanguageSchema: any;
}

export default function JsonEditModeModal({ isPrimaryLanguage, primaryLanguageSchema }: Props) {
    const [jsonEditMode, setJsonEditMode] = useState(false);
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

    const enterJsonEditMode = () => {
        const jsonStructure = convertNodesToJson(nodes$.get());
        const jsonString = JSON.stringify(jsonStructure, null, 2);
        setRawJsonEdit(jsonString);
        setHasEmptyKeys(checkForEmptyKeys(jsonStructure));
        setJsonEditMode(true);
    };

    const saveJsonEdit = () => {
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
            setJsonEditMode(false);
            setRawJsonEdit('');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert('Invalid JSON format');
        }
    };

    return (
        <>
            <Button variant='outline' size='sm' onClick={enterJsonEditMode} className='cursor-pointer'>
                <Code className='h-4 w-4 mr-2' />
                JSON Mode
            </Button>

            {/* JSON Edit Mode Modal */}
            {jsonEditMode && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-gray-900 rounded-lg p-6 w-4/5 h-4/5 max-w-6xl flex flex-col'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold'>JSON Edit Mode</h3>
                            <Button variant='outline' onClick={() => setJsonEditMode(false)} className='cursor-pointer'>
                                <X className='h-4 w-4' />
                            </Button>
                        </div>

                        <div className='flex-1 flex flex-col min-h-0'>
                            <p className='text-sm text-gray-400 mb-4'>
                                Edit the entire JSON structure. Perfect for developers who want to copy/paste from
                                existing codebases.
                            </p>

                            <Textarea
                                value={rawJsonEdit}
                                onChange={e => handleJsonChange(e.target.value)}
                                className='flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto'
                                placeholder='Paste your JSON here...'
                            />

                            {/* Error message for empty keys */}
                            {hasEmptyKeys && (
                                <div className='mt-2 text-sm text-red-400'>
                                    ⚠️ Error: Object keys cannot be empty strings. Please provide valid keys for all properties.
                                </div>
                            )}

                            <div className='flex justify-end space-x-2 mt-4'>
                                <Button
                                    variant='outline'
                                    onClick={() => setJsonEditMode(false)}
                                    className='cursor-pointer'>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={saveJsonEdit} 
                                    disabled={!isValidJson(rawJsonEdit) || hasEmptyKeys}
                                    className={`${
                                        !isValidJson(rawJsonEdit) || hasEmptyKeys
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}>
                                    Apply Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
