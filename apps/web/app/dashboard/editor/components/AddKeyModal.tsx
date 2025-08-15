'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { isValidJson } from '../utils/isValidJson';
import { getUIValueAsJSON } from '../utils/getUIValueAsJson';

interface AddKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddKey: (keyName: string, finalValue: string, addKeyMode: 'ui' | 'json', uiData: UIData) => void;
    availableParents: { id: string; key: string }[];
    addKeyParent: string | null;
    onAddKeyParentChange: (parentId: string | null) => void;
}

interface UIData {
    uiValueType: 'string' | 'number' | 'boolean' | 'array' | 'object';
    uiStringValue: string;
    uiNumberValue: string;
    uiBooleanValue: boolean;
    uiArrayItems: { value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
    uiObjectKeys: { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
}

export default function AddKeyModal({
    isOpen,
    onClose,
    onAddKey,
    availableParents,
    addKeyParent,
    onAddKeyParentChange,
}: AddKeyModalProps) {
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
    const [parentSelectorOpen, setParentSelectorOpen] = useState(false);
    const [filteredParents, setFilteredParents] = useState<{ id: string; key: string }[]>([]);

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

    const handleSubmit = () => {
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

        const uiData: UIData = {
            uiValueType,
            uiStringValue,
            uiNumberValue,
            uiBooleanValue,
            uiArrayItems,
            uiObjectKeys,
        };

        onAddKey(newKeyName, finalValue, addKeyMode, uiData);
        handleClose();
    };

    const handleClose = () => {
        // Reset all state
        setNewKeyName('');
        setNewKeyValue('');
        setAddKeyMode('ui');
        setUiValueType('string');
        setUiStringValue('');
        setUiNumberValue('');
        setUiBooleanValue(true);
        setUiArrayItems([{ value: '', type: 'string' }]);
        setUiObjectKeys([{ key: '', value: '', type: 'string' }]);
        onClose();
    };

    // Validation function to check if all object keys are filled
    const hasValidObjectKeys = () => {
        // Check UI mode object keys
        if (uiValueType === 'object') {
            return uiObjectKeys.every(entry => entry.key.trim() !== '');
        }

        // Check JSON mode for empty object keys
        if (newKeyValue && isValidJson(newKeyValue)) {
            try {
                const parsed = JSON.parse(newKeyValue);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    return Object.keys(parsed).every(key => key.trim() !== '');
                }
            } catch {
                // Invalid JSON, will be caught by other validation
            }
        }

        return true;
    };

    const getCurrentParentLabel = () => {
        if (!addKeyParent) return '🏠 Root Level';
        const parent = availableParents.find(p => p.id === addKeyParent);
        return parent ? `📁 ${parent.key}` : 'Select parent...';
    };

    const handleValueChange = (value: string) => {
        const filteredItems = availableParents.filter(items => items.key.includes(value.toLowerCase()));
        setFilteredParents(filteredItems);
    };

    // Limit parent options to first 20 for performance
    const limitedParents = filteredParents.slice(0, 20);

    useEffect(() => {
        if (availableParents.length > 0) {
            setFilteredParents(availableParents);
        }
    }, [availableParents]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950/95 border-gray-800/50 text-white backdrop-blur-md'>
                <DialogHeader>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-green-500/30'>
                            <Plus className='h-6 w-6 text-green-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                {addKeyParent ? 'Add Child Key' : 'Add Translation Key'}
                            </DialogTitle>
                            <p className='text-gray-400 text-sm'>
                                {addKeyParent
                                    ? `Adding to ${availableParents.find(n => n.id === addKeyParent)?.key}`
                                    : 'Create a new translation key at the root level'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className='space-y-6 py-6'>
                    {/* Parent Selector with Command */}
                    {availableParents.length > 0 && (
                        <div className='space-y-2'>
                            <label className='block text-sm font-medium text-gray-300'>Parent Location</label>

                            {/* Optimization Hint - Always Visible */}
                            <div className='bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3'>
                                <div className='flex items-start space-x-2'>
                                    <span className='text-amber-400 text-sm'>💡</span>
                                    <div className='text-amber-200 text-xs'>
                                        <strong>Performance Optimization:</strong> Showing first 20 of{' '}
                                        {availableParents.length} locations. Use search below to find specific parents.
                                    </div>
                                </div>
                            </div>

                            <Popover open={parentSelectorOpen} onOpenChange={setParentSelectorOpen} modal>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant='outline'
                                        role='combobox'
                                        aria-expanded={parentSelectorOpen}
                                        className='w-full justify-between bg-black/30 border-gray-700/50 text-white h-11 hover:bg-gray-800/50 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'>
                                        {getCurrentParentLabel()}
                                        <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className='w-full p-0 bg-gray-900 border-gray-700'>
                                    <Command>
                                        <CommandInput
                                            placeholder='Search parent locations...'
                                            className='h-9 text-white'
                                            onValueChange={handleValueChange}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No parent found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value='root'
                                                    onSelect={() => {
                                                        onAddKeyParentChange(null);
                                                        setParentSelectorOpen(false);
                                                    }}
                                                    className='text-white hover:bg-gray-800'>
                                                    🏠 Root Level
                                                    <Check
                                                        className={cn(
                                                            'ml-auto h-4 w-4',
                                                            !addKeyParent ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                </CommandItem>
                                                {limitedParents.map(parent => (
                                                    <CommandItem
                                                        key={parent.id}
                                                        value={parent.key}
                                                        onSelect={() => {
                                                            onAddKeyParentChange(
                                                                parent.id === addKeyParent ? null : parent.id
                                                            );
                                                            setParentSelectorOpen(false);
                                                            setFilteredParents(availableParents);
                                                        }}
                                                        className='text-white hover:bg-gray-800'>
                                                        📁 {parent.key}
                                                        <Check
                                                            className={cn(
                                                                'ml-auto h-4 w-4',
                                                                addKeyParent === parent.id ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className='text-xs text-gray-500'>Choose where to add your new translation key</p>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <label className='block text-sm font-medium text-gray-300'>Key Name</label>
                        <input
                            type='text'
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'
                            placeholder='e.g., title, description, navigation.home'
                            autoFocus
                        />
                        <p className='text-xs text-gray-500'>
                            Use descriptive names like "welcome.title" or "button.submit"
                        </p>
                    </div>

                    {/* Mode Selector */}
                    <div className='space-y-3'>
                        <label className='block text-sm font-medium text-gray-300'>Input Mode</label>
                        <div className='flex p-1 bg-gray-800/50 rounded-xl border border-gray-700/50'>
                            <button
                                type='button'
                                onClick={() => {
                                    if (addKeyMode === 'json') {
                                        switchToUIMode();
                                    }
                                }}
                                disabled={addKeyMode === 'json' && !!newKeyValue.trim() && !isValidJson(newKeyValue)}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    addKeyMode === 'ui'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                } ${
                                    addKeyMode === 'json' && !!newKeyValue.trim() && !isValidJson(newKeyValue)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer'
                                }`}>
                                🎨 Visual Editor
                            </button>
                            <button
                                type='button'
                                onClick={switchToJSONMode}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    addKeyMode === 'json'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}>
                                📝 JSON Editor
                            </button>
                        </div>
                        <p className='text-xs text-gray-500'>
                            Visual editor for simple values, JSON editor for complex structures
                        </p>
                    </div>

                    {/* Value Input */}
                    <div className='space-y-4'>
                        <label className='block text-sm font-medium text-gray-300'>Translation Value</label>

                        {addKeyMode === 'ui' ? (
                            <div className='space-y-4'>
                                {/* Type Selector */}
                                <div className='space-y-2'>
                                    <label className='text-sm font-medium text-gray-400'>Value Type</label>
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
                                        <SelectTrigger className='w-full bg-black/30 border-gray-700/50 text-white h-11 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className='bg-gray-900 border-gray-700'>
                                            <SelectItem value='string' className='text-white hover:bg-gray-800'>
                                                📝 Text
                                            </SelectItem>
                                            <SelectItem value='number' className='text-white hover:bg-gray-800'>
                                                🔢 Number
                                            </SelectItem>
                                            <SelectItem value='boolean' className='text-white hover:bg-gray-800'>
                                                ✅ True/False
                                            </SelectItem>
                                            <SelectItem value='array' className='text-white hover:bg-gray-800'>
                                                📋 List
                                            </SelectItem>
                                            <SelectItem value='object' className='text-white hover:bg-gray-800'>
                                                📦 Object
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Value Input Based on Type */}
                                <div className='space-y-2'>
                                    {uiValueType === 'string' && (
                                        <>
                                            <input
                                                type='text'
                                                value={uiStringValue}
                                                onChange={e => setUiStringValue(e.target.value)}
                                                className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'
                                                placeholder='Enter your text here...'
                                            />
                                            <p className='text-xs text-gray-500'>
                                                Simple text value like "Welcome" or "Click here"
                                            </p>
                                        </>
                                    )}

                                    {uiValueType === 'number' && (
                                        <>
                                            <input
                                                type='number'
                                                value={uiNumberValue}
                                                onChange={e => setUiNumberValue(e.target.value)}
                                                className='w-full px-4 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'
                                                placeholder='Enter a number...'
                                            />
                                            <p className='text-xs text-gray-500'>Numeric value like 42, 3.14, or -10</p>
                                        </>
                                    )}

                                    {uiValueType === 'boolean' && (
                                        <>
                                            <Select
                                                value={uiBooleanValue.toString()}
                                                onValueChange={value => setUiBooleanValue(value === 'true')}>
                                                <SelectTrigger className='w-full bg-black/30 border-gray-700/50 text-white h-11 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className='bg-gray-900 border-gray-700'>
                                                    <SelectItem value='true' className='text-white hover:bg-gray-800'>
                                                        ✅ True
                                                    </SelectItem>
                                                    <SelectItem value='false' className='text-white hover:bg-gray-800'>
                                                        ❌ False
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className='text-xs text-gray-500'>Boolean value for toggles and flags</p>
                                        </>
                                    )}
                                </div>

                                {uiValueType === 'array' && (
                                    <div className='space-y-3'>
                                        <div className='text-xs text-gray-500 flex items-center space-x-2'>
                                            <span>📋 Array Items</span>
                                            <span className='text-amber-400'>⚠️ For complex arrays, use JSON mode</span>
                                        </div>
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
                                                setUiArrayItems([...uiArrayItems, { value: '', type: 'string' }])
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
                                        <div className='w-2 h-2 bg-green-500 rounded-full' title='Valid JSON'></div>
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
                                    <p className='text-red-400'>⚠ Invalid configuration - please check your input</p>
                                ) : (
                                    <p>
                                        <strong>Preview:</strong> {uiValue}
                                    </p>
                                );
                            })()
                        ) : !newKeyValue.trim() ? (
                            <p className='text-red-400'>⚠ Value is required - please enter a valid JSON value</p>
                        ) : newKeyValue.trim() && !isValidJson(newKeyValue) ? (
                            <p className='text-red-400'>
                                ⚠ Invalid JSON format - please fix the syntax or use proper JSON
                            </p>
                        ) : (
                            <p>
                                <strong>Tip:</strong> Use valid JSON syntax for all values (strings must be quoted).
                            </p>
                        )}
                    </div>
                </div>

                <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                    <Button
                        type='button'
                        variant='ghost'
                        onClick={handleClose}
                        className='text-gray-400 hover:text-white hover:bg-gray-800/50 cursor-pointer transition-all'>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
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
                            })() ||
                            !hasValidObjectKeys()
                        }
                        className={`bg-green-600 text-white hover:bg-green-700 transition-all px-6 ${
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
                            })() ||
                            !hasValidObjectKeys()
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                        }`}>
                        <Plus className='h-4 w-4 mr-2' />
                        Add Key
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
