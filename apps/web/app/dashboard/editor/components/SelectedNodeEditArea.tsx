'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copyToClipboard } from '../utils/copyToClipboard';
import { isValidJson } from '../utils/isValidJson';
import { getUIValueAsJSON } from '../utils/getUIValueAsJson';
import { createNodesFromJson } from '../utils/createNodesFromJson';
import { buildJsonFromNodes } from '../utils/buildJsonFromNodes';
import { Textarea } from '@/components/ui/textarea';
import { hasUnsavedChanges$, nodes$, selectedNode$ } from '../store';
import { use$ } from '@legendapp/state/react';
import { TranslationNode } from '../types';

export default function SelectedNodeEditArea() {
    const [editValue, setEditValue] = useState('');
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
    const [isChanged, setIsChanged] = useState(false);

    const selectedNode = use$(selectedNode$);

    // Wrapper functions to track changes when UI arrays/objects are modified
    const setEditUIArrayItemsWithChange = (items: typeof editUIArrayItems) => {
        setEditUIArrayItems(items);
        setIsChanged(true);
    };

    const setEditUIObjectKeysWithChange = (keys: typeof editUIObjectKeys) => {
        setEditUIObjectKeys(keys);
        setIsChanged(true);
    };

    // Validation function to check if all object keys are filled
    const hasValidObjectKeys = () => {
        // Check UI mode object keys
        if (editUIValueType === 'object') {
            return editUIObjectKeys.every(entry => entry.key.trim() !== '');
        }

        // Check JSON mode for empty object keys
        if (editValue && isValidJson(editValue)) {
            try {
                const parsed = JSON.parse(editValue);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    return Object.keys(parsed).every(key => key.trim() !== '');
                }
            } catch {
                // Invalid JSON, will be caught by other validation
            }
        }

        return true;
    };

    // Apply current edit changes
    const applyEdit = () => {
        if (!selectedNode) return;

        try {
            let newValue: any;

            // Get the value based on the current edit mode
            if (editMode === 'ui') {
                // Use UI values to construct the new value
                const jsonValue = getUIValueAsJSON({
                    uiValueType: editUIValueType,
                    uiStringValue: editUIStringValue,
                    uiNumberValue: editUINumberValue,
                    uiBooleanValue: editUIBooleanValue,
                    uiArrayItems: editUIArrayItems,
                    uiObjectKeys: editUIObjectKeys,
                });
                newValue = JSON.parse(jsonValue);
            } else {
                // Use JSON mode value
                if (!editValue.trim()) return;
                newValue = JSON.parse(editValue);
            }

            const nodes = nodes$.get();

            // Update the selected node's value
            const updatedNodes = nodes.map(node => (node.id === selectedNode.id ? { ...node, value: newValue } : node));

            // If the node has children, we need to update or recreate them based on the new value
            let finalNodes: TranslationNode[];

            if (selectedNode.children.length > 0) {
                // Remove existing children of this node
                const filteredNodes = updatedNodes.filter(
                    node => !isDescendantOf(node.id, selectedNode.id, updatedNodes)
                );

                // Create new child nodes from the new value
                if (
                    selectedNode.type === 'object' &&
                    typeof newValue === 'object' &&
                    newValue !== null &&
                    !Array.isArray(newValue)
                ) {
                    const childNodes = createNodesFromJson(newValue, selectedNode.key, selectedNode.id);
                    const directChildren = Object.keys(newValue).map(
                        childKey => `node-${selectedNode.key}.${childKey}`
                    );

                    // Update the parent node's children array
                    const parentNodeIndex = filteredNodes.findIndex(node => node.id === selectedNode.id);
                    if (parentNodeIndex !== -1 && filteredNodes[parentNodeIndex]) {
                        filteredNodes[parentNodeIndex].children = directChildren;
                    }

                    filteredNodes.push(...childNodes);
                } else if (selectedNode.type === 'array' && Array.isArray(newValue)) {
                    const childNodes = createNodesFromJson({ temp: newValue }, selectedNode.key, selectedNode.id);
                    // Filter out the temporary parent node and adjust the children
                    const arrayChildNodes = childNodes.filter(node => node.id !== `node-${selectedNode.key}.temp`);
                    const directChildren = arrayChildNodes
                        .filter(node => node.parent === selectedNode.id)
                        .map(node => node.id);

                    // Update the parent node's children array
                    const parentNodeIndex = filteredNodes.findIndex(node => node.id === selectedNode.id);
                    if (parentNodeIndex !== -1 && filteredNodes[parentNodeIndex]) {
                        filteredNodes[parentNodeIndex].children = directChildren;
                    }

                    filteredNodes.push(...arrayChildNodes);
                }

                finalNodes = filteredNodes;
            } else {
                finalNodes = updatedNodes;
            }

            // Update ancestor nodes to reflect the changes
            const finalNodesWithUpdatedAncestors = updateAncestorNodes(selectedNode.id, finalNodes);

            nodes$.set(finalNodesWithUpdatedAncestors);

            // Update selectedNode$ with the updated node to trigger useEffect
            const updatedSelectedNode = finalNodesWithUpdatedAncestors.find(node => node.id === selectedNode.id);
            if (updatedSelectedNode) {
                selectedNode$.set(updatedSelectedNode);
            }

            hasUnsavedChanges$.set(true);
            setIsChanged(false);
        } catch (error) {
            console.error('Failed to apply edit:', error);
            alert('Invalid JSON format. Please fix the syntax before applying.');
        }
    };

    // Helper function to check if a node is a descendant of another node
    const isDescendantOf = (nodeId: string, ancestorId: string, nodes: TranslationNode[]): boolean => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.parent) return false;
        if (node.parent === ancestorId) return true;
        return isDescendantOf(node.parent, ancestorId, nodes);
    };

    // Function to update all ancestor nodes with their rebuilt values
    const updateAncestorNodes = (nodeId: string, nodes: TranslationNode[]): TranslationNode[] => {
        const updatedNodes = [...nodes];
        const node = updatedNodes.find(n => n.id === nodeId);

        if (!node || !node.parent) return updatedNodes;

        // Find the parent node
        const parentNode = updatedNodes.find(n => n.id === node.parent);
        if (!parentNode) return updatedNodes;

        // Rebuild the parent's value from its children
        const rebuiltValue = buildJsonFromNodes({
            nodes: updatedNodes,
            nodeId: parentNode.id,
            action: '',
        });

        // Update the parent node's value
        const parentIndex = updatedNodes.findIndex(n => n.id === parentNode.id);
        if (parentIndex !== -1) {
            updatedNodes[parentIndex] = { ...parentNode, value: rebuiltValue };
        }

        // Recursively update grandparents
        return updateAncestorNodes(parentNode.id, updatedNodes);
    };

    // Real-time JSON editing with validation and visual feedback
    const handleJsonValueChange = (newJsonValue: string, isUserEdit = true) => {
        setEditValue(newJsonValue);
        if (isUserEdit) {
            setIsChanged(true);
        }

        // Sync with edit UI values when in JSON mode
        if (editMode === 'json') {
            setEditUIValuesFromJSON(newJsonValue);
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
        const jsonValue = getUIValueAsJSON({
            uiValueType: editUIValueType,
            uiStringValue: editUIStringValue,
            uiNumberValue: editUINumberValue,
            uiBooleanValue: editUIBooleanValue,
            uiArrayItems: editUIArrayItems,
            uiObjectKeys: editUIObjectKeys,
        });
        setEditValue(jsonValue);
        setEditMode('json');
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
                              value:
                                  Array.isArray(item) || (typeof item === 'object' && item !== null)
                                      ? JSON.stringify(item, null, 2)
                                      : String(item),
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
                              value:
                                  Array.isArray(value) || (typeof value === 'object' && value !== null)
                                      ? JSON.stringify(value, null, 2)
                                      : String(value),
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

    // Handle UI value changes and sync with JSON
    const handleEditUIValueChange = () => {
        if (editMode === 'ui') {
            const jsonValue = getUIValueAsJSON({
                uiValueType: editUIValueType,
                uiStringValue: editUIStringValue,
                uiNumberValue: editUINumberValue,
                uiBooleanValue: editUIBooleanValue,
                uiArrayItems: editUIArrayItems,
                uiObjectKeys: editUIObjectKeys,
            });
            setEditValue(jsonValue);
            handleJsonValueChange(jsonValue, false); // false because this is internal sync, not user edit
        }
    };

    // Handle UI value changes for uncommitted tracking (without auto-applying)
    const handleEditUIValueChangeUncommitted = () => {
        if (editMode === 'ui' && selectedNode) {
            const jsonValue = getUIValueAsJSON({
                uiValueType: editUIValueType,
                uiStringValue: editUIStringValue,
                uiNumberValue: editUINumberValue,
                uiBooleanValue: editUIBooleanValue,
                uiArrayItems: editUIArrayItems,
                uiObjectKeys: editUIObjectKeys,
            });
            setEditValue(jsonValue);
            setIsChanged(true);
        }
    };

    useEffect(() => {
        if (selectedNode) {
            // Initialize editValue with the current node's value for JSON editing
            const jsonValue = JSON.stringify(selectedNode.value, null, 2);
            setEditValue(jsonValue);
            // Initialize edit UI values
            setEditUIValuesFromJSON(jsonValue);
            // Reset change tracking
            setIsChanged(false);
        }

        return () => {
            setEditValue('');
            setIsChanged(false);
        };
    }, [selectedNode]);

    if (!selectedNode) return null;

    return (
        <div className='flex-1'>
            <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-medium text-gray-400'>Value</label>
                <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                        let valueText = '';
                        if (selectedNode.type === 'object' || selectedNode.type === 'array') {
                            valueText = JSON.stringify(selectedNode.value, null, 2);
                        } else {
                            valueText = String(selectedNode.value || '');
                        }
                        copyToClipboard(valueText);
                    }}
                    className='text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer h-6 w-6 p-0'>
                    <Copy className='h-3 w-3' />
                </Button>
            </div>
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
                        disabled={editMode === 'json' && !!editValue.trim() && !isValidJson(editValue)}
                        className={`cursor-pointer ${
                            editMode === 'json' && editValue.trim() && !isValidJson(editValue)
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
                    <div className='mb-2'>
                        {/* Value Input Based on Type */}
                        {editUIValueType === 'string' && (
                            <input
                                type='text'
                                value={editUIStringValue}
                                onChange={e => {
                                    setEditUIStringValue(e.target.value);
                                    setTimeout(handleEditUIValueChangeUncommitted, 0);
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
                                    setTimeout(handleEditUIValueChangeUncommitted, 0);
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
                                    setTimeout(handleEditUIValueChangeUncommitted, 0);
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
                                <label className='text-xs text-gray-500'>Array Items</label>
                                {editUIArrayItems.map((item, index) => (
                                    <div key={index} className='space-y-1'>
                                        {/* Type selector */}
                                        <div className='flex items-center space-x-2'>
                                            <label className='text-xs text-gray-500 w-8 flex-shrink-0'>Type:</label>
                                            <Select
                                                value={item.type}
                                                onValueChange={value => {
                                                    const newItems = [...editUIArrayItems];
                                                    newItems[index] = {
                                                        ...item,
                                                        type: value as typeof item.type,
                                                        value: '',
                                                    };
                                                    setEditUIArrayItemsWithChange(newItems);
                                                    setTimeout(handleEditUIValueChange, 0);
                                                }}>
                                                <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
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
                                                    if (editUIArrayItems.length > 1) {
                                                        const newItems = editUIArrayItems.filter((_, i) => i !== index);
                                                        setEditUIArrayItemsWithChange(newItems);
                                                    } else {
                                                        const newItems = [...editUIArrayItems];
                                                        newItems[index] = {
                                                            value: '',
                                                            type: 'string',
                                                        };
                                                        setEditUIArrayItemsWithChange(newItems);
                                                    }
                                                    setTimeout(handleEditUIValueChange, 0);
                                                }}
                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs cursor-pointer'>
                                                ✕
                                            </Button>
                                        </div>
                                        {/* Value input */}
                                        <div className='flex items-center space-x-2'>
                                            <label className='text-xs text-gray-500 w-8 flex-shrink-0'>Val:</label>
                                            {item.type === 'boolean' ? (
                                                <Select
                                                    value={item.value || 'true'}
                                                    onValueChange={value => {
                                                        const newItems = [...editUIArrayItems];
                                                        newItems[index] = {
                                                            ...item,
                                                            value,
                                                        };
                                                        setEditUIArrayItemsWithChange(newItems);
                                                        setTimeout(handleEditUIValueChange, 0);
                                                    }}>
                                                    <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
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
                                                        const newItems = [...editUIArrayItems];
                                                        newItems[index] = {
                                                            ...item,
                                                            value: e.target.value,
                                                        };
                                                        setEditUIArrayItemsWithChange(newItems);
                                                        setTimeout(handleEditUIValueChange, 0);
                                                    }}
                                                    className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                    placeholder={
                                                        item.type === 'string'
                                                            ? 'String value'
                                                            : item.type === 'number'
                                                              ? 'Number'
                                                              : item.type === 'object'
                                                                ? '{"key": "value"}'
                                                                : item.type === 'array'
                                                                  ? '[1, 2, 3]'
                                                                  : 'Value'
                                                    }
                                                />
                                            )}
                                        </div>
                                        {/* Separator */}
                                        {index < editUIArrayItems.length - 1 && (
                                            <div className='border-t border-gray-700'></div>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                    onClick={() => {
                                        setEditUIArrayItemsWithChange([
                                            ...editUIArrayItems,
                                            { value: '', type: 'string' },
                                        ]);
                                    }}
                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs cursor-pointer'>
                                    + Add Item
                                </Button>
                            </div>
                        )}

                        {editUIValueType === 'object' && (
                            <div className='space-y-2'>
                                <label className='text-xs text-gray-500'>Object Properties</label>
                                {editUIObjectKeys.map((entry, index) => (
                                    <div key={index} className='space-y-1'>
                                        {/* Property Key */}
                                        <div className='flex items-center space-x-2'>
                                            <label className='text-xs text-gray-500 w-8 flex-shrink-0'>Key:</label>
                                            <input
                                                type='text'
                                                value={entry.key}
                                                onChange={e => {
                                                    const newEntries = [...editUIObjectKeys];
                                                    if (newEntries[index]) {
                                                        newEntries[index].key = e.target.value;
                                                        setEditUIObjectKeysWithChange(newEntries);
                                                        setTimeout(handleEditUIValueChange, 0);
                                                    }
                                                }}
                                                className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                placeholder='Property key'
                                            />
                                            <Button
                                                type='button'
                                                size='sm'
                                                variant='outline'
                                                onClick={() => {
                                                    if (editUIObjectKeys.length > 1) {
                                                        const newEntries = editUIObjectKeys.filter(
                                                            (_, i) => i !== index
                                                        );
                                                        setEditUIObjectKeysWithChange(newEntries);
                                                    } else {
                                                        const newEntries = [...editUIObjectKeys];
                                                        newEntries[index] = {
                                                            key: '',
                                                            value: '',
                                                            type: 'string',
                                                        };
                                                        setEditUIObjectKeysWithChange(newEntries);
                                                    }
                                                    setTimeout(handleEditUIValueChange, 0);
                                                }}
                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs cursor-pointer'>
                                                ✕
                                            </Button>
                                        </div>
                                        {/* Value Type */}
                                        <div className='flex items-center space-x-2'>
                                            <label className='text-xs text-gray-500 w-8 flex-shrink-0'>Type:</label>
                                            <Select
                                                value={entry.type}
                                                onValueChange={value => {
                                                    const newEntries = [...editUIObjectKeys];
                                                    newEntries[index] = {
                                                        ...entry,
                                                        type: value as typeof entry.type,
                                                        value: '',
                                                    };
                                                    setEditUIObjectKeysWithChange(newEntries);
                                                    setTimeout(handleEditUIValueChange, 0);
                                                }}>
                                                <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
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
                                        {/* Property Value */}
                                        <div className='flex items-center space-x-2'>
                                            <label className='text-xs text-gray-500 w-8 flex-shrink-0'>Val:</label>
                                            {entry.type === 'boolean' ? (
                                                <Select
                                                    value={entry.value || 'true'}
                                                    onValueChange={value => {
                                                        const newEntries = [...editUIObjectKeys];
                                                        if (newEntries[index]) {
                                                            newEntries[index].value = value;
                                                            setEditUIObjectKeysWithChange(newEntries);
                                                            setTimeout(handleEditUIValueChange, 0);
                                                        }
                                                    }}>
                                                    <SelectTrigger className='flex-1 bg-gray-800 border-gray-700 text-white h-6 text-xs'>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value='true'>true</SelectItem>
                                                        <SelectItem value='false'>false</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <input
                                                    type={entry.type === 'number' ? 'number' : 'text'}
                                                    value={entry.value}
                                                    onChange={e => {
                                                        const newEntries = [...editUIObjectKeys];
                                                        if (newEntries[index]) {
                                                            newEntries[index].value = e.target.value;
                                                            setEditUIObjectKeysWithChange(newEntries);
                                                            setTimeout(handleEditUIValueChange, 0);
                                                        }
                                                    }}
                                                    className='flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'
                                                    placeholder={
                                                        entry.type === 'string'
                                                            ? 'String value'
                                                            : entry.type === 'number'
                                                              ? 'Number'
                                                              : entry.type === 'object'
                                                                ? '{"key": "value"}'
                                                                : entry.type === 'array'
                                                                  ? '[1, 2, 3]'
                                                                  : 'Value'
                                                    }
                                                />
                                            )}
                                        </div>
                                        {/* Separator line except for last item */}
                                        {index < editUIObjectKeys.length - 1 && (
                                            <div className='border-t border-gray-700'></div>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                    onClick={() => {
                                        setEditUIObjectKeysWithChange([
                                            ...editUIObjectKeys,
                                            {
                                                key: '',
                                                value: '',
                                                type: 'string',
                                            },
                                        ]);
                                    }}
                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs cursor-pointer'>
                                    + Add Property
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className='mb-2 relative'>
                        <Textarea
                            value={editValue || JSON.stringify(selectedNode.value, null, 2)}
                            onChange={e => handleJsonValueChange(e.target.value)}
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
                )}
                {/* Apply button for UI mode */}
                <div className='flex items-center justify-between mt-4'>
                    <div
                        className={`text-xs ${
                            editValue && !isValidJson(editValue) ? 'text-red-400' : 'text-gray-500'
                        }`}>
                        {editValue && !isValidJson(editValue)
                            ? 'Invalid JSON format'
                            : 'Apply changes to update the value'}
                    </div>
                    <Button
                        size='sm'
                        onClick={applyEdit}
                        disabled={
                            !isChanged ||
                            !editValue?.trim() ||
                            !!(editValue && !isValidJson(editValue)) ||
                            !hasValidObjectKeys()
                        }
                        className={`ml-2 ${
                            editValue?.trim() && isValidJson(editValue || '{}')
                                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer text-white'
                                : 'bg-gray-600 cursor-not-allowed'
                        }`}>
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
}
