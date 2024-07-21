import { Timestamp, GeoPoint, DocumentReference } from '@google-cloud/firestore';
import { IEntityConstructor } from './types';

export function isTimestamp(x: unknown): x is Timestamp {
  return typeof x === 'object' && x !== null && 'toDate' in x;
}

export function isGeoPoint(x: unknown): x is GeoPoint {
  return typeof x === 'object' && x !== null && x.constructor.name === 'GeoPoint';
}

export function isDocumentReference(x: unknown): x is DocumentReference {
  return typeof x === 'object' && x !== null && x.constructor.name === 'DocumentReference';
}

export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object';
}

export function isConstructor(obj: any): obj is IEntityConstructor {
  return obj && typeof obj === 'function' && obj.prototype;
}