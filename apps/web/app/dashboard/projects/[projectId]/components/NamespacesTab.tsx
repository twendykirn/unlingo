'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NamespacesTab() {
    return (
        <div className='text-center py-12'>
            <Globe className='h-12 w-12 text-gray-600 mx-auto mb-4' />
            <h3 className='text-xl font-medium text-gray-400 mb-2'>No namespaces yet</h3>
            <p className='text-gray-500 mb-6'>
                Create your first namespace to organize your translations.
            </p>
            <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                Create Namespace
            </Button>
        </div>
    );
}