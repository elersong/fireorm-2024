import { getMetadataStorage } from '../MetadataUtils';
import { plural } from 'pluralize';
import type { IEntityConstructor } from '../types';

/**
 * Decorator to mark a class as a Firestore collection.
 * This decorator registers metadata about the collection and processes any pending subcollections.
 *
 * @param {string} [collectionPathSlug] - Optional custom path slug for the collection. If not provided, the plural form of the entity constructor's name will be used.
 * @returns {Function} - A decorator function that registers the collection metadata and processes subcollections.
 */
export function Collection(collectionPathSlug?: string) {
  return function (entityConstructor: IEntityConstructor, _?: any) {
    entityConstructor.prototype.pathSlug = collectionPathSlug || plural(entityConstructor.name);

    // Recursively process any subcollections to ensure all levels get registered
    const processSubcollections = (constructor: IEntityConstructor) => {
      if (constructor.prototype._pendingSubCollections) {
        for (const subCollection of constructor.prototype._pendingSubCollections) {
          getMetadataStorage().setCollection({
            entityConstructor: subCollection.entityConstructor,
            path: 'PENDING_RESOLUTION', 
            parentProps: {
              parentEntityConstructor: constructor,
              parentPropertyKey: subCollection.propertyKey,
              parentId: 'PENDING_RESOLUTION', 
              parentPathSlug: entityConstructor.prototype.pathSlug, 
            },
            pathSlug: subCollection.propertyKey, // Pass the subcollection's property key as the pathSlug
          });

          // Recursively process deeper subcollection levels
          processSubcollections(subCollection.entityConstructor);
        }

        // Clear out the pending subcollections after processing
        delete constructor.prototype._pendingSubCollections;
      }
    };

    // Start processing any subcollections linked to this entity
    processSubcollections(entityConstructor);

    // Register the main collection with MetadataStorage
    getMetadataStorage().setCollection({
      entityConstructor,
      path: 'PENDING_RESOLUTION',
      parentProps: null,
      pathSlug: entityConstructor.prototype.pathSlug,
    });

    // Clear out the pathSlug property from the prototype
    delete entityConstructor.prototype.pathSlug;
  };
}
