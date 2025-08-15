import { Search, X } from 'lucide-react';
import { searchQuery$ } from '../store';
import { use$ } from '@legendapp/state/react';

export default function SearchField() {
    const searchQuery = use$(searchQuery$);

    return (
        <div className='relative'>
            <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
                type='text'
                placeholder='Search keys and values...'
                value={searchQuery}
                onChange={e => searchQuery$.set(e.target.value)}
                className='pl-11 pr-10 py-3 bg-black/30 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 w-80 transition-all'
            />
            {searchQuery && (
                <button
                    onClick={() => searchQuery$.set('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700/50 cursor-pointer p-1 rounded-lg transition-all'>
                    <X className='h-4 w-4' />
                </button>
            )}
        </div>
    );
}
