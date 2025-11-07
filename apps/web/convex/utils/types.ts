interface LanguageItem {
    key: string;
    value: any;
    primaryValue: any;
}

export interface ChangeItem {
    key: string;
    item: LanguageItem;
    newValue?: any;
}

export interface IChanges {
    add: ChangeItem[];
    modify: ChangeItem[];
    delete: ChangeItem[];
}

export interface LanguageContentInterface {
    [key: string]: LanguageItem;
}
