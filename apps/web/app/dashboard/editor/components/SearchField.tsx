import { Search, X } from 'lucide-react';
import { searchQuery$ } from '../store';
import { use$ } from '@legendapp/state/react';

export default function SearchField() {
    const searchQuery = use$(searchQuery$);

    return (
        <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
                type='text'
                placeholder='Search keys and values...'
                value={searchQuery}
                onChange={e => searchQuery$.set(e.target.value)}
                className='pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64'
            />
            {searchQuery && (
                <button
                    onClick={() => searchQuery$.set('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer'>
                    <X className='h-4 w-4' />
                </button>
            )}
        </div>
    );
}
