// Utility functions
export const isValidJson = (str: string) => {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
};
