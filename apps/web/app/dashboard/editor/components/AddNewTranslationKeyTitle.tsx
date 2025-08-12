import { use$ } from '@legendapp/state/react';
import { nodes$ } from '../store';

interface Props {
    addKeyParent: string | null;
}

export default function AddNewTranslationKeyTitle({ addKeyParent }: Props) {
    const nodes = use$(nodes$);

    return (
        <h3 className='text-lg font-semibold mb-4'>
            Add New Translation Key
            {addKeyParent
                ? (() => {
                      const parentNode = nodes.find(n => n.id === addKeyParent);
                      return parentNode ? ` (to ${parentNode.key})` : ' (to selected node)';
                  })()
                : ' (to root level)'}
        </h3>
    );
}
