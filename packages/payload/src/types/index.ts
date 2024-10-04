import type { I18n, TFunction } from '@payloadcms/translations'
import type DataLoader from 'dataloader'
import type { Paths } from 'ts-essentials'
import type { URL } from 'url'

import type { TypeWithID, TypeWithTimestamps } from '../collections/config/types.js'
import type payload from '../index.js'
import type { TypedLocale, TypedUser } from '../index.js'
import type { validOperators } from './constants.js'
export type { Payload as Payload } from '../index.js'

export type CustomPayloadRequestProperties = {
  context: RequestContext
  /** The locale that should be used for a field when it is not translated to the requested locale */
  fallbackLocale?: string
  i18n: I18n
  /**
   * The requested locale if specified
   * Only available for localized collections
   */
  locale?: TypedLocale
  /**
   * The payload object
   */
  payload: typeof payload
  /**
   * The context in which the request is being made
   */
  payloadAPI: 'GraphQL' | 'local' | 'REST'
  /** Optimized document loader */
  payloadDataLoader?: DataLoader<string, TypeWithID>
  /** Resized versions of the image that was uploaded during this request */
  payloadUploadSizes?: Record<string, Buffer>
  /** Query params on the request */
  query: Record<string, unknown>
  /** Any response headers that are required to be set when a response is sent */
  responseHeaders?: Headers
  /** The route parameters
   * @example
   * /:collection/:id -> /posts/123
   * { collection: 'posts', id: '123' }
   */
  routeParams?: Record<string, unknown>
  /** Translate function - duplicate of i18n.t */
  t: TFunction
  /**
   * Identifier for the database transaction for interactions in a single, all-or-nothing operation.
   * Can also be used to ensure consistency when multiple operations try to create a transaction concurrently on the same request.
   */
  transactionID?: number | Promise<number | string> | string
  /**
   * Used to ensure consistency when multiple operations try to create a transaction concurrently on the same request
   */
  transactionIDPromise?: Promise<void>
  /** The signed-in user */
  user: null | TypedUser
} & Pick<
  URL,
  'hash' | 'host' | 'href' | 'origin' | 'pathname' | 'port' | 'protocol' | 'search' | 'searchParams'
>
type PayloadRequestData = {
  /**
   * Data from the request body
   *
   * Within Payload operations, i.e. hooks, data will be there
   * BUT in custom endpoints it will not be, you will need to
   * use either:
   *  1. `const data = await req.json()`
   *
   *  2. import { addDataAndFileToRequest } from '@payloadcms/next/utilities'
   *    `await addDataAndFileToRequest(req)`
   * */
  data?: JsonObject
  /** The file on the request, same rules apply as the `data` property */
  file?: {
    data: Buffer
    mimetype: string
    name: string
    size: number
    tempFilePath?: string
  }
}
export type PayloadRequest = CustomPayloadRequestProperties &
  Partial<Request> &
  PayloadRequestData &
  Required<Pick<Request, 'headers'>>

export interface RequestContext {
  [key: string]: unknown
}

export type Operator = (typeof validOperators)[number]

// Makes it so things like passing new Date() will error
export type JsonValue = JsonArray | JsonObject | unknown //Date | JsonArray | JsonObject | boolean | null | number | string // TODO: Evaluate proper, strong type for this

export type JsonArray = Array<JsonValue>

export interface JsonObject {
  [key: string]: any
}

export type WhereField = {
  // any json-serializable value
  [key in Operator]?: JsonValue
}

export type Where = {
  [key: string]: Where[] | WhereField
  and?: Where[]
  or?: Where[]
}

/**
 * Applies pagination for join fields for including collection relationships
 */
export type JoinQuery =
  | {
      [schemaPath: string]: {
        limit?: number
        sort?: string
        where?: Where
      }
    }
  | false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Document = any

export type Operation = 'create' | 'delete' | 'read' | 'update'
export type VersionOperations = 'readVersions'
export type AuthOperations = 'unlock'
export type AllOperations = AuthOperations | Operation | VersionOperations

export function docHasTimestamps(doc: any): doc is TypeWithTimestamps {
  return doc?.createdAt && doc?.updatedAt
}

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N // This is a commonly used trick to detect 'any'
export type IsAny<T> = IfAny<T, true, false>
export type ReplaceAny<T, DefaultType> = IsAny<T> extends true ? DefaultType : T

type PathImpl<T, Key extends keyof T> = Key extends string
  ? IsAny<T[Key]> extends true
    ? never
    : T[Key] extends Record<string, any>
      ?
          | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
          | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}`
      : never
  : never

type PathImpl2<T> = keyof T | PathImpl<T, keyof T>

type Path<T> = keyof T extends string
  ? PathImpl2<T> extends infer P
    ? P extends keyof T | string
      ? P
      : keyof T
    : keyof T
  : never

type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never

export type ToPathsObject<
  Data extends Record<string, any>,
  DataPaths = Paths<Data>,
  DataPathsWithValue = {
    // @ts-expect-error-error
    [K in DataPaths]: PathValue<Data, K>
  },
> = {
  [K in keyof DataPathsWithValue as DataPathsWithValue[K] extends object
    ? never
    : K]: DataPathsWithValue[K]
}

export type GetSelectMode<Select extends SelectType> =
  ToPathsObject<Select> extends Record<string, infer V>
    ? V extends false
      ? 'exclude'
      : 'include'
    : 'include'

export type SelectType = {
  [k: string]: boolean | SelectType
}

export type TransformDataWithSelect<
  Data extends Record<string, any>,
  Select = undefined,
  SelectMode = Select extends SelectType ? GetSelectMode<Select> : never,
> = SelectMode extends never
  ? Data
  : SelectMode extends 'include'
    ? {
        [K in keyof Data as K extends keyof Select
          ? Select[K] extends object | true
            ? K
            : never
          : K extends 'id'
            ? K
            : never]: Data[K]
      }
    : {
        [K in keyof Data as K extends keyof Select
          ? Select[K] extends object | undefined
            ? K
            : never
          : K]: Data[K]
      }
