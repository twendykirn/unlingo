import { reactive, useEffectOnce, useObservable } from '@legendapp/state/react';
import { Textarea } from '@/components/ui/textarea';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { Label } from '@/components/ui/field';

const $Textarea = reactive(TextField);
const $Button = reactive(Button);

interface Props {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    originalKey: string;
    originalValue: string;
    primaryValue: string;
    onApply: (params: { oldValue: string; newValue: string; key: string; primaryValue: null | string }) => void;
    isPrimaryLanguage: boolean;
}

const EditValueModal = ({
    isOpen,
    setIsOpen,
    originalKey,
    originalValue,
    primaryValue,
    onApply,
    isPrimaryLanguage,
}: Props) => {
    const value$ = useObservable('');
    const isDisabled$ = useObservable(() => value$.get() === originalValue);

    useEffectOnce(() => {
        if (!isOpen && originalValue === value$.get()) return;
        value$.set(originalValue);
    }, [isOpen, originalValue]);

    return (
        <ModalContent
            isBlurred
            isOpen={isOpen}
            onOpenChange={value => {
                if (!value) {
                    value$.set('');
                }

                setIsOpen(value);
            }}>
            <ModalHeader>
                <ModalTitle>Edit your translation</ModalTitle>
                <ModalDescription>
                    Change the value of the translation key. Keep in mind that updating the primary language value will
                    affect all languages in the environment.
                </ModalDescription>
            </ModalHeader>
            <Form
                onSubmit={() => {
                    onApply({
                        oldValue: originalValue,
                        newValue: value$.get(),
                        key: originalKey,
                        primaryValue,
                    });
                    setIsOpen(false);
                    value$.set('');
                }}>
                <ModalBody className='pb-1 space-y-2'>
                    {!isPrimaryLanguage ? (
                        <TextField isReadOnly defaultValue={primaryValue}>
                            <Label>Original (Primary)</Label>
                            <Textarea />
                        </TextField>
                    ) : null}
                    <$Textarea
                        isRequired
                        autoFocus
                        $value={value$}
                        onChange={value => {
                            value$.set(value);
                        }}>
                        <Label>Translation</Label>
                        <Textarea />
                    </$Textarea>
                </ModalBody>
                <ModalFooter>
                    <ModalClose>Cancel</ModalClose>
                    <$Button type='submit' $isDisabled={isDisabled$}>
                        Save
                    </$Button>
                </ModalFooter>
            </Form>
        </ModalContent>
    );
};

export default EditValueModal;
