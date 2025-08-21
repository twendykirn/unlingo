import { getUIValueAsJSON } from '../utils/getUIValueAsJson';
import { isValidJson } from '../utils/isValidJson';

interface Props {
    uiValueType: string;
    uiStringValue: string;
    uiNumberValue: string;
    uiBooleanValue: boolean;
    uiArrayItems: { value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
    uiObjectKeys: { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
}

const AddKeyFooterNote = ({
    uiValueType,
    uiStringValue,
    uiNumberValue,
    uiBooleanValue,
    uiArrayItems,
    uiObjectKeys,
}: Props) => {
    const uiValue = getUIValueAsJSON({
        uiValueType,
        uiStringValue,
        uiNumberValue,
        uiBooleanValue,
        uiArrayItems,
        uiObjectKeys,
    });

    const isEmptyContainer = uiValue === '{}' || uiValue === '[]';

    if (!uiValue.trim() && !isEmptyContainer) {
        return <p className='text-red-400'>⚠ Value is required - please fill in the required fields</p>;
    }

    if (!isValidJson(uiValue)) {
        return <p className='text-red-400'>⚠ Invalid configuration - please check your input</p>;
    }

    return (
        <p>
            <strong>Preview:</strong> {uiValue}
        </p>
    );
};

export default AddKeyFooterNote;
