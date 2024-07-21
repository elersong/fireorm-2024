import { getMetadataStorage } from '../MetadataUtils';
import { plural } from 'pluralize';
import type { IEntityConstructor } from '../types';

/**
 * Decorator to mark a class as a Firestore collection.
 * This decorator registers metadata about the collection and processes any pending subcollections.
 *
 * @param {string} [collectionName] - Optional custom name for the collection. If not provided, the plural form of the entity constructor's name will be used.
 * @returns {Function} - A decorator function that registers the collection metadata and processes subcollections.
 */
export function Collection(collectionName?: string) {
  return function (entityConstructor: IEntityConstructor, _?: any) {
    entityConstructor.prototype.collectionName = collectionName || plural(entityConstructor.name);

    // process subcols recursively, to ensure that all levels of subcols get registered
    const processSubcollections = (constructor: IEntityConstructor) => {
      // check to see if any subcollections are set to pending for this entityConstructor
      // process them if so. Do nothing if not.
      if (constructor.prototype._pendingSubCollections) {
        for (const subCollection of constructor.prototype._pendingSubCollections) {
          getMetadataStorage().setCollection({
            entityConstructor: subCollection.entityConstructor,
            name: subCollection.propertyKey,
            parentProps: {
              parentEntityConstructor: constructor,
              parentPropertyKey: subCollection.propertyKey,
              parentCollectionName: constructor.prototype.collectionName,
            }
          });

          // Check and process next level down (if it exists)
          processSubcollections(subCollection.entityConstructor);
        }

        // Clear the pending subcollections after processing
        delete constructor.prototype._pendingSubCollections;
      }
    };

    // Begin with the first subcollection level
    processSubcollections(entityConstructor);

    // Register the main collection
    getMetadataStorage().setCollection({
      name: entityConstructor.prototype.collectionName,
      entityConstructor,
      parentProps: null
    });

    // Clear out the collectionName property from the prototype, so others collections
    // with the same entityConstructor don't get the same collectionName
    delete entityConstructor.prototype.collectionName;
  };
}
