import { z } from 'zod';
import Ajv2020 from 'ajv/dist/2020';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * Generates a strict Zod schema from a JSON object
 * Handles complex nested scenarios and uses tuples for arrays
 */
export function generateZodSchema(obj: JsonValue): z.ZodType<any> {
    if (obj === null) {
        return z.null();
    }

    if (typeof obj === 'string') {
        return z.string();
    }

    if (typeof obj === 'number') {
        return z.number();
    }

    if (typeof obj === 'boolean') {
        return z.boolean();
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            // Empty array - return strict empty tuple
            return z.tuple([]);
        }

        // Generate schema for each item in the array as a tuple
        const tupleSchemas = obj.map((item, index) => {
            try {
                return generateZodSchema(item);
            } catch (error) {
                console.warn(`Failed to generate schema for array item at index ${index}:`, error);
                return z.unknown();
            }
        });

        return z.tuple(tupleSchemas as [z.ZodType<any>, ...z.ZodType<any>[]]);
    }

    if (typeof obj === 'object' && obj !== null) {
        const shape: Record<string, z.ZodType<any>> = {};

        for (const [key, value] of Object.entries(obj)) {
            try {
                shape[key] = generateZodSchema(value);
            } catch (error) {
                console.warn(`Failed to generate schema for key "${key}":`, error);
                shape[key] = z.unknown();
            }
        }

        return z.object(shape).strict(); // Use strict() to prevent additional properties
    }

    // Fallback for any unhandled type
    return z.unknown();
}

/**
 * Generates both Zod and JSON schemas from a JSON object
 */
/**
 * Post-processes JSON schema to fix tuple validation issues with AJV
 */
function fixJsonSchemaForAjv(schema: any): any {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    // Handle arrays
    if (Array.isArray(schema)) {
        return schema.map(fixJsonSchemaForAjv);
    }

    const fixed = { ...schema };

    // Fix tuple schemas by adding required minItems and maxItems
    if (fixed.type === 'array' && fixed.prefixItems && Array.isArray(fixed.prefixItems)) {
        const itemCount = fixed.prefixItems.length;
        fixed.minItems = itemCount;
        fixed.maxItems = itemCount;

        // Process nested items in prefixItems
        fixed.prefixItems = fixed.prefixItems.map(fixJsonSchemaForAjv);

        console.log(`🔧 Fixed tuple schema: added minItems/maxItems = ${itemCount}`);
    }

    // Fix object schemas by processing properties
    if (fixed.type === 'object' && fixed.properties) {
        const fixedProperties: any = {};
        for (const [key, value] of Object.entries(fixed.properties)) {
            fixedProperties[key] = fixJsonSchemaForAjv(value);
        }
        fixed.properties = fixedProperties;
    }

    // Recursively fix other nested schemas
    Object.keys(fixed).forEach(key => {
        if (key !== 'properties' && key !== 'prefixItems' && typeof fixed[key] === 'object' && fixed[key] !== null) {
            fixed[key] = fixJsonSchemaForAjv(fixed[key]);
        }
    });

    return fixed;
}

export function generateSchemas(obj: JsonValue): {
    zodSchema: z.ZodType<any>;
    jsonSchema: any;
    isValid: boolean;
    errors?: z.ZodError;
} {
    try {
        const zodSchema = generateZodSchema(obj);
        const rawJsonSchema = z.toJSONSchema(zodSchema);

        // Remove $schema property that causes AJV issues
        const cleanJsonSchema = rawJsonSchema;

        // Fix tuple validation issues for AJV
        const jsonSchema = fixJsonSchemaForAjv(cleanJsonSchema);

        const result = zodSchema.safeParse(obj);

        return {
            zodSchema,
            jsonSchema,
            isValid: result.success,
            errors: result.success ? undefined : result.error,
        };
    } catch (error) {
        console.error('Schema generation failed:', error);
        const fallbackSchema = z.unknown();
        const rawFallbackSchema = z.toJSONSchema(fallbackSchema);
        const cleanFallbackSchema = rawFallbackSchema;

        return {
            zodSchema: fallbackSchema,
            jsonSchema: fixJsonSchemaForAjv(cleanFallbackSchema),
            isValid: false,
            errors: new z.ZodError([
                {
                    code: 'custom',
                    message: 'Schema generation failed',
                    path: [],
                },
            ]),
        };
    }
}

/**
 * Validates a JSON object against its generated schema
 */
export function validateWithGeneratedSchema(obj: JsonValue): {
    isValid: boolean;
    schema: z.ZodType<any>;
    errors?: z.ZodError;
} {
    const result = generateSchemas(obj);
    return {
        isValid: result.isValid,
        schema: result.zodSchema,
        errors: result.errors,
    };
}

/**
 * Validates JSON data against a JSON schema using AJV
 */
export function validateWithAjv(
    data: any,
    jsonSchema: any
): {
    isValid: boolean;
    errors: any[] | null;
    ajvInstance: Ajv2020;
} {
    const ajv = new Ajv2020({
        allErrors: true,
        verbose: true,
        strict: true,
    });

    const validate = ajv.compile(jsonSchema);
    const isValid = validate(data);

    return {
        isValid,
        errors: validate.errors || null,
        ajvInstance: ajv,
    };
}

/**
 * Debug function that logs both Zod and JSON schemas to console
 */
export function debugZodSchema(
    obj: JsonValue,
    label?: string
): {
    zodSchema: z.ZodType<any>;
    jsonSchema: any;
} {
    console.group(`🔍 Schema Debug${label ? ` - ${label}` : ''}`);

    try {
        const schemas = generateSchemas(obj);

        console.log('📄 Input JSON:', obj);
        console.log('📋 Generated JSON Schema:', schemas.jsonSchema);
        console.log('✅ Schema Validation:', schemas.isValid ? 'PASSED' : 'FAILED');

        if (!schemas.isValid && schemas.errors) {
            console.error('❌ Validation Errors:', schemas.errors);
        }

        console.log('📊 Zod Schema Object:', schemas.zodSchema);

        console.groupEnd();
        return {
            zodSchema: schemas.zodSchema,
            jsonSchema: schemas.jsonSchema,
        };
    } catch (error) {
        console.error('💥 Schema Debug Failed:', error);
        console.groupEnd();
        const fallbackSchema = z.unknown();
        return {
            zodSchema: fallbackSchema,
            jsonSchema: z.toJSONSchema(fallbackSchema),
        };
    }
}
