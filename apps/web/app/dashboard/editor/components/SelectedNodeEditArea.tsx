'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Sparkles, Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copyToClipboard } from '../utils/copyToClipboard';
import { isValidJson } from '../utils/isValidJson';
import { getUIValueAsJSON } from '../utils/getUIValueAsJson';
import { createNodesFromJson } from '../utils/createNodesFromJson';
import { buildJsonFromNodes } from '../utils/buildJsonFromNodes';
import { Textarea } from '@/components/ui/textarea';
import { nodes$, selectedNode$ } from '../store';
import { use$ } from '@legendapp/state/react';
import { TranslationNode } from '../types';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface SelectedNodeEditAreaProps {
    isPrimaryLanguage: boolean;
    primaryLanguageContent: any;
    selectedLanguage: string;
    isPremium: boolean;
    workspaceId?: Id<'workspaces'>;
}

export default function SelectedNodeEditArea({
    isPrimaryLanguage,
    primaryLanguageContent,
    selectedLanguage,
    isPremium,
    workspaceId,
}: SelectedNodeEditAreaProps) {
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
    const [isTranslating, setIsTranslating] = useState(false);

    const selectedNode = use$(selectedNode$);

    const translateContent = useAction(api.translation.translateContent);

    const setEditUIArrayItemsWithChange = (items: typeof editUIArrayItems) => {
        setEditUIArrayItems(items);
        setIsChanged(true);
    };

    const setEditUIObjectKeysWithChange = (keys: typeof editUIObjectKeys) => {
        setEditUIObjectKeys(keys);
        setIsChanged(true);
    };

    const hasValidObjectKeys = () => {
        if (editUIValueType === 'object') {
            return editUIObjectKeys.every(entry => entry.key.trim() !== '');
        }

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

    const handleAITranslation = async () => {
        if (!selectedNode || isTranslating || isPrimaryLanguage || !workspaceId) return;

        setIsTranslating(true);
        try {
            const getPrimaryValueByKey = (obj: any, key: string): any => {
                const keys = key.split('.');
                let current = obj;

                for (const k of keys) {
                    if (current && typeof current === 'object' && current[k] !== undefined) {
                        current = current[k];
                    } else {
                        return undefined;
                    }
                }
                return current;
            };

            const primaryValue = getPrimaryValueByKey(primaryLanguageContent, selectedNode.key);

            if (primaryValue === undefined) {
                alert('Primary language value not found for this key');
                return;
            }

            const result = await translateContent({
                primaryValue: primaryValue,
                targetLanguage: selectedLanguage,
                workspaceId: workspaceId,
            });

            const { translatedValue } = result;

            const jsonValue = JSON.stringify(translatedValue, null, 2);
            setEditValue(jsonValue);
            setEditUIValuesFromJSON(jsonValue);
            setIsChanged(true);
        } catch (error) {
            console.error('Translation error:', error);
            alert(error instanceof Error ? error.message : 'Translation failed. Please try again.');
        } finally {
            setIsTranslating(false);
        }
    };

    const applyEdit = () => {
        if (!selectedNode) return;

        try {
            let newValue: any;

            if (editMode === 'ui') {
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
                if (!editValue.trim()) return;
                newValue = JSON.parse(editValue);
            }

            const nodes = nodes$.get();

            let newType: 'object' | 'string' | 'array' | 'number' | 'boolean' = 'string';
            if (Array.isArray(newValue)) {
                newType = 'array';
            } else if (typeof newValue === 'object' && newValue !== null) {
                newType = 'object';
            } else if (typeof newValue === 'number') {
                newType = 'number';
            } else if (typeof newValue === 'boolean') {
                newType = 'boolean';
            }

            const updatedNodes = nodes.map(node =>
                node.id === selectedNode.id ? { ...node, value: newValue, type: newType } : node
            );

            let finalNodes: TranslationNode[];

            if (newType === 'object' || newType === 'array' || selectedNode.children.length > 0) {
                const filteredNodes = updatedNodes.filter(
                    node => !isDescendantOf(node.id, selectedNode.id, updatedNodes)
                );

                if (
                    newType === 'object' &&
                    typeof newValue === 'object' &&
                    newValue !== null &&
                    !Array.isArray(newValue)
                ) {
                    const childNodes = createNodesFromJson(newValue, selectedNode.key, selectedNode.id);
                    const directChildren = Object.keys(newValue).map(
                        childKey => `node-${selectedNode.key}.${childKey}`
                    );

                    const parentNodeIndex = filteredNodes.findIndex(node => node.id === selectedNode.id);
                    if (parentNodeIndex !== -1) {
                        filteredNodes[parentNodeIndex] = {
                            ...filteredNodes[parentNodeIndex],
                            children: directChildren,
                            type: newType,
                            value: newValue,
                        } as TranslationNode;
                    }

                    filteredNodes.push(...childNodes);
                } else if (newType === 'array' && Array.isArray(newValue)) {
                    const childNodes = createNodesFromJson({ temp: newValue }, selectedNode.key, selectedNode.id);
                    const arrayChildNodes = childNodes.filter(node => node.id !== `node-${selectedNode.key}.temp`);
                    const directChildren = arrayChildNodes
                        .filter(node => node.parent === selectedNode.id)
                        .map(node => node.id);

                    const parentNodeIndex = filteredNodes.findIndex(node => node.id === selectedNode.id);
                    if (parentNodeIndex !== -1) {
                        filteredNodes[parentNodeIndex] = {
                            ...filteredNodes[parentNodeIndex],
                            children: directChildren,
                            type: newType,
                            value: newValue,
                        } as TranslationNode;
                    }

                    filteredNodes.push(...arrayChildNodes);
                } else {
                    const parentNodeIndex = filteredNodes.findIndex(node => node.id === selectedNode.id);
                    if (parentNodeIndex !== -1) {
                        filteredNodes[parentNodeIndex] = {
                            ...filteredNodes[parentNodeIndex],
                            children: [],
                            type: newType,
                            value: newValue,
                        } as TranslationNode;
                    }
                }

                finalNodes = filteredNodes;
            } else {
                finalNodes = updatedNodes;
            }

            const finalNodesWithUpdatedAncestors = updateAncestorNodes(selectedNode.id, finalNodes);

            nodes$.set(finalNodesWithUpdatedAncestors);

            const updatedSelectedNode = finalNodesWithUpdatedAncestors.find(node => node.id === selectedNode.id);
            if (updatedSelectedNode) {
                selectedNode$.set(updatedSelectedNode);
            }

            setIsChanged(false);
        } catch (error) {
            console.error('Failed to apply edit:', error);
            alert('Invalid JSON format. Please fix the syntax before applying.');
        }
    };

    const isDescendantOf = (nodeId: string, ancestorId: string, nodes: TranslationNode[]): boolean => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.parent) return false;
        if (node.parent === ancestorId) return true;
        return isDescendantOf(node.parent, ancestorId, nodes);
    };

    const updateAncestorNodes = (nodeId: string, nodes: TranslationNode[]): TranslationNode[] => {
        const updatedNodes = [...nodes];
        const node = updatedNodes.find(n => n.id === nodeId);

        if (!node || !node.parent) return updatedNodes;

        const parentNode = updatedNodes.find(n => n.id === node.parent);
        if (!parentNode) return updatedNodes;

        const rebuiltValue = buildJsonFromNodes({
            nodes: updatedNodes,
            nodeId: parentNode.id,
            action: '',
        });

        const parentIndex = updatedNodes.findIndex(n => n.id === parentNode.id);
        if (parentIndex !== -1) {
            updatedNodes[parentIndex] = { ...parentNode, value: rebuiltValue };
        }

        return updateAncestorNodes(parentNode.id, updatedNodes);
    };

    const handleJsonValueChange = (newJsonValue: string, isUserEdit = true) => {
        setEditValue(newJsonValue);
        if (isUserEdit) {
            setIsChanged(true);
        }

        if (editMode === 'json') {
            setEditUIValuesFromJSON(newJsonValue);
        }
    };

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
            handleJsonValueChange(jsonValue, false);
        }
    };

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
            const jsonValue = JSON.stringify(selectedNode.value, null, 2);
            setEditValue(jsonValue);
            setEditUIValuesFromJSON(jsonValue);
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
                    className='text-gray-400 hover:text-white hover:border-gray-400 h-6 w-6 p-0'>
                    <Copy className='h-3 w-3' />
                </Button>
            </div>
            <div className='space-y-4'>
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
                        className={`${
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
                        onClick={switchToEditJSONMode}>
                        JSON Mode
                    </Button>
                </div>

                {editMode === 'ui' ? (
                    <div className='mb-2'>
                        {editUIValueType === 'string' ? (
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
                        ) : null}

                        {editUIValueType === 'number' ? (
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
                        ) : null}

                        {editUIValueType === 'boolean' ? (
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
                        ) : null}

                        {editUIValueType === 'array' ? (
                            <div className='space-y-2'>
                                <label className='text-xs text-gray-500'>Array Items</label>
                                {editUIArrayItems.map((item, index) => (
                                    <div key={index} className='space-y-1'>
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
                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs'>
                                                <X className='h-3 w-3' />
                                            </Button>
                                        </div>
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
                                        {index < editUIArrayItems.length - 1 ? (
                                            <div className='border-t border-gray-700'></div>
                                        ) : null}
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
                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs'>
                                    + Add Item
                                </Button>
                            </div>
                        ) : null}

                        {editUIValueType === 'object' ? (
                            <div className='space-y-2'>
                                <label className='text-xs text-gray-500'>Object Properties</label>
                                {editUIObjectKeys.map((entry, index) => (
                                    <div key={index} className='space-y-1'>
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
                                                className='text-red-400 hover:text-red-300 hover:border-red-400 flex-shrink-0 h-6 w-6 p-0 text-xs'>
                                                <X className='h-3 w-3' />
                                            </Button>
                                        </div>
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
                                        {index < editUIObjectKeys.length - 1 ? (
                                            <div className='border-t border-gray-700'></div>
                                        ) : null}
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
                                    className='w-full text-green-400 hover:text-green-300 hover:border-green-400 h-6 text-xs'>
                                    + Add Property
                                </Button>
                            </div>
                        ) : null}
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
                        {editValue && !isValidJson(editValue) ? (
                            <div className='absolute top-2 right-2'>
                                <div className='w-2 h-2 bg-red-500 rounded-full'></div>
                            </div>
                        ) : null}
                    </div>
                )}
                <div className='flex items-center justify-between mt-4'>
                    <div
                        className={`text-xs ${
                            editValue && !isValidJson(editValue) ? 'text-red-400' : 'text-gray-500'
                        }`}>
                        {editValue && !isValidJson(editValue)
                            ? 'Invalid JSON format'
                            : 'Apply changes to update the value'}
                    </div>
                    <div className='flex items-center space-x-2'>
                        {!isPrimaryLanguage && isPremium ? (
                            <Button
                                size='sm'
                                onClick={handleAITranslation}
                                disabled={isTranslating || !selectedNode}
                                className={`bg-purple-600 hover:bg-purple-700 text-white ${
                                    isTranslating ? 'opacity-75 cursor-not-allowed' : ''
                                }`}>
                                {isTranslating ? (
                                    <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                                ) : (
                                    <Sparkles className='h-3 w-3 mr-1' />
                                )}
                                AI
                            </Button>
                        ) : null}
                        <Button
                            size='sm'
                            onClick={applyEdit}
                            disabled={
                                !isChanged ||
                                !editValue?.trim() ||
                                !!(editValue && !isValidJson(editValue)) ||
                                !hasValidObjectKeys()
                            }
                            className={`${
                                editValue?.trim() && isValidJson(editValue || '{}')
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-600 cursor-not-allowed'
                            }`}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
