import { ignoreKey, serializeKey } from './Decorators';
import { SubCollectionMetadata } from './MetadataStorage';
import { IEntity } from '.';

/**
 * Extract getters and object in form of data properties
 * @param {T} Entity object
 * @returns {Object} with only data properties
 */
export function extractAllGetters(obj: Record<string, unknown>) {
  const prototype = Object.getPrototypeOf(obj);
  const fromInstanceObj = Object.keys(obj);
  const fromInstance = Object.getOwnPropertyNames(obj);
  const fromPrototype = Object.getOwnPropertyNames(Object.getPrototypeOf(obj));

  const keys = [...fromInstanceObj, ...fromInstance, ...fromPrototype];

  const getters = keys
    .map(key => Object.getOwnPropertyDescriptor(prototype, key))
    .map((descriptor, index) => {
      if (descriptor && typeof descriptor.get === 'function') {
        return keys[index];
      } else {
        return undefined;
      }
    })
    .filter(d => d !== undefined);

  return getters.reduce<Record<string, unknown>>((accumulator, currentValue) => {
    if (typeof currentValue === 'string' && obj[currentValue]) {
      accumulator[currentValue] = obj[currentValue];
    }
    return accumulator;
  }, {});
}

/**
 * FirestoreSerializable type. A more specific type than Record<string, unknown>
 * 
 * @typedef {Object} FirestoreSerializable
 * @property {FirebaseFirestore.FieldValue | Partial<unknown> | undefined} [key: string] Firestore FieldValue or Partial<unknown>
 */
type FirestoreSerializable = { [key: string]: FirebaseFirestore.FieldValue | Partial<unknown> | undefined };

/**
 * Returns a serializable object from entity<T>
 *
 * @template T - The entity type
 * @param {Partial<T>} obj - The entity object
 * @param {SubCollectionMetadata[]} subColMetadata - Subcollection metadata to remove runtime-created fields
 * @returns {FirestoreSerializable} - A serializable object
 */
export function serializeEntity<T extends IEntity>(
  obj: Partial<T>,
  subColMetadata: SubCollectionMetadata[]
): FirestoreSerializable {
  const objectGetters = extractAllGetters(obj as Record<string, unknown>);
  const serializableObj: FirestoreSerializable = {};

  // Merge original properties and getters
  const combinedObj = { ...obj, ...objectGetters };

  // Remove sub-collection metadata properties
  subColMetadata.forEach(scm => {
    delete combinedObj[scm.propertyKey];
  });

  // Process each property and ensure it fits the expected return type
  Object.entries(combinedObj).forEach(([propertyKey, propertyValue]) => {
    if (Reflect.getMetadata(ignoreKey, obj, propertyKey) === true) {
      return; // Skip properties marked with ignoreKey
    }
    if (Reflect.getMetadata(serializeKey, obj, propertyKey) !== undefined) {
      if (Array.isArray(propertyValue)) {
        serializableObj[propertyKey] = propertyValue.map(element =>
          serializeEntity(element, [])
        ) as unknown as FirebaseFirestore.FieldValue | Partial<unknown>;
      } else if (typeof propertyValue === 'object' && propertyValue !== null) {
        serializableObj[propertyKey] = serializeEntity(
          propertyValue as Partial<T>,
          []
        ) as unknown as FirebaseFirestore.FieldValue | Partial<unknown>;
      } else {
        serializableObj[propertyKey] = propertyValue as FirebaseFirestore.FieldValue | Partial<unknown> | undefined;
      }
    } else {
      serializableObj[propertyKey] = propertyValue as FirebaseFirestore.FieldValue | Partial<unknown> | undefined;
    }
  });

  return serializableObj;
}


/**
 * Returns true if arrays are equal
 *
 * @export
 * @param {Array<unknown>} arr1
 * @param {Array<unknown>} arr2
 * @returns {boolean}
 */
export function arraysAreEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  return arr1.every((a, i) => a === arr2[i]);
}
