'use client';

import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReleasesTab() {
    return (
        <div className='text-center py-12'>
            <GitBranch className='h-12 w-12 text-gray-600 mx-auto mb-4' />
            <h3 className='text-xl font-medium text-gray-400 mb-2'>No releases yet</h3>
            <p className='text-gray-500 mb-6'>
                Create releases to version your translations across environments.
            </p>
            <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                Create Release
            </Button>
        </div>
    );
}