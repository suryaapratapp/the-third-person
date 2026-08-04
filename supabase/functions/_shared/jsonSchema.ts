// Helpers for OpenAI Structured Outputs (response_format json_schema, strict).
//
// Strict mode has two rules that are easy to get wrong by hand and fatal when
// missed: EVERY object must set additionalProperties:false, and EVERY property
// must be listed in `required`. `obj()` derives `required` from the property
// keys so the two can never drift apart.
//
// "Optional" fields don't exist in strict mode — model must return the key. For
// genuinely-absent values we ask for an empty string/array, which is what the
// UI already treats as "not enough evidence".

export type JsonSchema = Record<string, unknown>;

export const S = {
  str(description?: string): JsonSchema {
    return description ? { type: 'string', description } : { type: 'string' };
  },
  int(description?: string): JsonSchema {
    return description ? { type: 'integer', description } : { type: 'integer' };
  },
  enum(values: string[], description?: string): JsonSchema {
    return description ? { type: 'string', enum: values, description } : { type: 'string', enum: values };
  },
  arr(items: JsonSchema, description?: string): JsonSchema {
    return description ? { type: 'array', items, description } : { type: 'array', items };
  },
  obj(properties: Record<string, JsonSchema>, description?: string): JsonSchema {
    const schema: JsonSchema = {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
    if (description) schema.description = description;
    return schema;
  },
};

export const CONFIDENCE = ['Early Signal', 'Repeated Pattern', 'Strong Pattern', 'Not Enough Evidence'];

export function responseFormatFor(name: string, schema: JsonSchema) {
  return {
    type: 'json_schema',
    json_schema: { name, strict: true, schema },
  };
}
