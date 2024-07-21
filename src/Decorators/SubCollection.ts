import { isConstructor } from '../TypeGuards';
import { IEntityConstructor } from '../types';

/**
 * Decorator to mark a property as a subcollection within a Firestore document.
 * This decorator registers metadata about the subcollection, linking it to the parent collection.
 *
 * @param {IEntityConstructor} entityConstructor - The constructor function of the subcollection entity.
 * @returns {Function} - A decorator function that registers the subcollection metadata.
 */
export function SubCollection(entityConstructor: IEntityConstructor) {
  return function (target: Object, propertyKey: string | symbol) {
    entityConstructor.prototype.collectionName = propertyKey;

    if (isConstructor(target.constructor)) {
      const constructor = target.constructor as IEntityConstructor;

      // Store metadata temporarily
      if (!constructor.prototype._pendingSubCollections) {
        constructor.prototype._pendingSubCollections = [];
      }
      constructor.prototype._pendingSubCollections.push({
        entityConstructor,
        propertyKey: propertyKey.toString(),
      });
    } else {
      throw new Error('Constructor not found on subcollection target');
    }
  };
}
