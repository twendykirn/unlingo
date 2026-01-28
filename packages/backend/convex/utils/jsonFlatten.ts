export function flattenJson(json: any): Record<string, string> {
  const flattened: Record<string, string> = {};

  function traverse(obj: any, path: string[] = []) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        traverse(item, path.concat(index.toString()));
      });
      return;
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === "") {
          continue;
        }

        const newPath = path.concat(key);
        const value = obj[key];

        if (typeof value !== "object" || value === null) {
          flattened[newPath.join(".")] = value;
        } else {
          traverse(value, newPath);
        }
      }
    }
  }

  traverse(json);
  return flattened;
}

export function unflattenJson(flattenedObject: Record<string, string>): any {
  const result: any = {};

  for (const flatKey in flattenedObject) {
    if (Object.prototype.hasOwnProperty.call(flattenedObject, flatKey)) {
      const keys = flatKey.split(".");

      if (keys.some((key) => key === "")) {
        continue;
      }

      let currentLevel = result;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (key === undefined) {
          continue;
        }

        const isLastKey = i === keys.length - 1;

        if (isLastKey) {
          if (!flattenedObject[flatKey]) {
            continue;
          }

          currentLevel[key] = flattenedObject[flatKey];
        } else {
          const nextKey = keys[i + 1];
          const useArray = nextKey !== undefined && /^\d+$/.test(nextKey);

          if (currentLevel[key] === undefined || currentLevel[key] === null) {
            currentLevel[key] = useArray ? [] : {};
          }

          currentLevel = currentLevel[key];
        }
      }
    }
  }

  return result;
}
