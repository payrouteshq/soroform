import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";
import type { xdr } from "@stellar/stellar-sdk";
import type { Spec } from "@stellar/stellar-sdk/contract";

export function sorobanTypeToZod(type: xdr.ScSpecTypeDef, spec: Spec): z.ZodTypeAny {
  switch (type.type) {
    case "scSpecTypeU32":
    case "scSpecTypeI32":
      return z.number();

    // u64/i64/u128/i128/u256/i256, and the u64-valued timepoint/duration
    // aliases, all decode to JS numbers above 2^53, so they must be
    // bigint to avoid silent precision loss.
    case "scSpecTypeU64":
    case "scSpecTypeI64":
    case "scSpecTypeU128":
    case "scSpecTypeI128":
    case "scSpecTypeU256":
    case "scSpecTypeI256":
    case "scSpecTypeTimepoint":
    case "scSpecTypeDuration":
      return z.bigint();

    case "scSpecTypeBool":
      return z.boolean();

    case "scSpecTypeSymbol":
    case "scSpecTypeString":
      return z.string();

    case "scSpecTypeBytes":
      return z.instanceof(Uint8Array);

    case "scSpecTypeBytesN": {
      const length = type.bytesN.n;
      return z.instanceof(Uint8Array).refine((value) => value.length === length, {
        message: `Expected exactly ${length} bytes`,
      });
    }

    case "scSpecTypeAddress":
      return z
        .string()
        .refine((value) => StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value), {
          message: "Expected a valid Stellar account (G...) or contract (C...) address",
        });

    case "scSpecTypeMuxedAddress":
      return z
        .string()
        .refine(
          (value) =>
            StrKey.isValidEd25519PublicKey(value) ||
            StrKey.isValidContract(value) ||
            StrKey.isValidMed25519PublicKey(value),
          {
            message:
              "Expected a valid Stellar account (G...), contract (C...), or muxed account (M...) address",
          },
        );

    case "scSpecTypeVec":
      return z.array(sorobanTypeToZod(type.vec.elementType, spec));

    // The SDK's encoder accepts either a JS Map or an array of [key, value]
    // pairs for a map-typed argument; a Map is used here since Soroban map
    // keys are not restricted to strings the way z.record()'s keys are.
    case "scSpecTypeMap":
      return z.map(
        sorobanTypeToZod(type.map.keyType, spec),
        sorobanTypeToZod(type.map.valueType, spec),
      );

    // The SDK's encoder treats both null and undefined as "absent" for an
    // option type (encoding to scvVoid), so both must validate here.
    case "scSpecTypeOption":
      return sorobanTypeToZod(type.option.valueType, spec).optional().nullable();

    // There is no dedicated Result encoding helper in the SDK; a Result is
    // represented as a plain ok/error tagged object at the JS boundary.
    case "scSpecTypeResult":
      return z.union([
        z.object({ ok: sorobanTypeToZod(type.result.okType, spec) }),
        z.object({ error: sorobanTypeToZod(type.result.errorType, spec) }),
      ]);

    case "scSpecTypeTuple": {
      const items = type.tuple.valueTypes;
      if (items.length === 0) return z.tuple([]);
      const [first, ...rest] = items.map((item) => sorobanTypeToZod(item, spec));
      return z.tuple([first as z.ZodTypeAny, ...rest]);
    }

    case "scSpecTypeUdt":
      return udtToZod(type.udt.name.toString(), spec);

    case "scSpecTypeVoid":
      return z.void();

    // scSpecTypeVal is a generic "any ScVal" placeholder (used for generic
    // type parameters) and scSpecTypeError is a generic "any contract
    // error" marker; neither has a more specific shape to validate.
    case "scSpecTypeVal":
    case "scSpecTypeError":
    default:
      return z.unknown();
  }
}

/**
 * Resolves a user-defined type (struct, union, or enum) by name against
 * the contract's spec and converts it to a Zod schema.
 */
function udtToZod(name: string, spec: Spec): z.ZodTypeAny {
  const entry = spec.findEntry(name);

  switch (entry.type) {
    case "scSpecEntryUdtStructV0": {
      const fields = entry.udtStructV0.fields;

      // A struct whose fields are all named "0", "1", "2", ... is a Rust
      // tuple struct; the SDK encodes/decodes it as a positional array
      // rather than a keyed object.
      const isTupleStruct =
        fields.length > 0 &&
        fields.every((field, index) => field.name.toString() === String(index));

      if (isTupleStruct) {
        const items = fields.map((field) => sorobanTypeToZod(field.type, spec));
        const [first, ...rest] = items;
        return z.tuple([first as z.ZodTypeAny, ...rest]);
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const field of fields) {
        shape[field.name.toString()] = sorobanTypeToZod(field.type, spec);
      }
      return z.object(shape);
    }

    case "scSpecEntryUdtUnionV0": {
      const cases = entry.udtUnionV0.cases;
      const variants = cases.map((udtCase) => {
        if (udtCase.type === "scSpecUdtUnionCaseVoidV0") {
          return z.object({ tag: z.literal(udtCase.voidCase.name.toString()) });
        }
        const tupleCase = udtCase.tupleCase;
        // The SDK always represents a tuple case's payload as an array
        // under `values`, even when the case carries exactly one value.
        const valueTypes = tupleCase.type.map((valueType) => sorobanTypeToZod(valueType, spec));
        return z.object({
          tag: z.literal(tupleCase.name.toString()),
          values:
            valueTypes.length === 0
              ? z.tuple([])
              : z.tuple([valueTypes[0] as z.ZodTypeAny, ...valueTypes.slice(1)]),
        });
      });
      const [first, second, ...rest] = variants;
      if (!first) return z.never();
      if (!second) return first;
      return z.discriminatedUnion("tag", [first, second, ...rest]);
    }

    // A plain (unit-variant) Soroban enum's native JS representation is
    // its raw numeric case value, not the case's name: Spec.nativeToEnum
    // and Spec.enumToNative both operate on the numeric `value`, never the
    // string `name`. Case names are folded into the schema's description
    // for editor tooltips, since the number alone loses that context.
    case "scSpecEntryUdtEnumV0": {
      const cases = entry.udtEnumV0.cases;
      const literals = cases.map((enumCase) => z.literal(enumCase.value));
      const description = cases
        .map((enumCase) => `${enumCase.value} = ${enumCase.name.toString()}`)
        .join(", ");
      const schema =
        literals.length <= 1
          ? (literals[0] ?? z.never())
          : z.union([
              literals[0] as z.ZodTypeAny,
              literals[1] as z.ZodTypeAny,
              ...literals.slice(2),
            ]);
      return schema.describe(`Enum ${entry.udtEnumV0.name.toString()}: ${description}`);
    }

    // Error enums describe a contract's declared error codes; they are
    // never a valid argument or return type themselves.
    case "scSpecEntryUdtErrorEnumV0":
    default:
      return z.unknown();
  }
}
