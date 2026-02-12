/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import {
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  components,
} from "convex/server";
import type {
  ActionBuilder,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

/**
 * Define a query in this Convex app's public API.
 *
 * This function is used to define query functions. Example:
 *
 * ```ts
 * export default query({
 *   args: { taskId: v.id("tasks") },
 *   handler: async (ctx, args) => {
 *     return await ctx.db.get(args.taskId);
 *   },
 * });
 * ```
 */
export declare const query: QueryBuilder<DataModel, "public">;

/**
 * Define a query that is only accessible from other Convex functions (but not from the client).
 *
 * This function is used to define query functions. Example:
 *
 * ```ts
 * export default internalQuery({
 *   args: { taskId: v.id("tasks") },
 *   handler: async (ctx, args) => {
 *     return await ctx.db.get(args.taskId);
 *   },
 * });
 * ```
 */
export declare const internalQuery: QueryBuilder<DataModel, "internal">;

/**
 * Define a mutation in this Convex app's public API.
 *
 * This function is used to define mutation functions. Example:
 *
 * ```ts
 * export default mutation({
 *   args: { body: v.string(), author: v.string() },
 *   handler: async (ctx, args) => {
 *     const message = { body: args.body, author: args.author };
 *     await ctx.db.insert("messages", message);
 *   },
 * });
 * ```
 */
export declare const mutation: MutationBuilder<DataModel, "public">;

/**
 * Define a mutation that is only accessible from other Convex functions (but not from the client).
 *
 * This function is used to define mutation functions. Example:
 *
 * ```ts
 * export default internalMutation({
 *   args: { body: v.string(), author: v.string() },
 *   handler: async (ctx, args) => {
 *     const message = { body: args.body, author: args.author };
 *     await ctx.db.insert("messages", message);
 *   },
 * });
 * ```
 */
export declare const internalMutation: MutationBuilder<DataModel, "internal">;

/**
 * Define an action in this Convex app's public API.
 *
 * An action is a function that can call external services and schedule
 * other Convex functions.
 *
 * ```ts
 * export default action({
 *   args: { body: v.string(), author: v.string() },
 *   handler: async (ctx, args) => {
 *     const response = await fetch("https://api.example.com", {
 *       method: "POST",
 *       body: JSON.stringify(args),
 *     });
 *     await ctx.runMutation(internal.messages.send, args);
 *   },
 * });
 * ```
 */
export declare const action: ActionBuilder<DataModel, "public">;

/**
 * Define an action that is only accessible from other Convex functions (but not from the client).
 *
 * ```ts
 * export default internalAction({
 *   args: { body: v.string(), author: v.string() },
 *   handler: async (ctx, args) => {
 *     const response = await fetch("https://api.example.com", {
 *       method: "POST",
 *       body: JSON.stringify(args),
 *     });
 *     await ctx.runMutation(internal.messages.send, args);
 *   },
 * });
 * ```
 */
export declare const internalAction: ActionBuilder<DataModel, "internal">;

/**
 * A version of the Convex backend `ctx` object for use in Convex functions
 * that takes your app's data model as a type parameter.
 *
 * This is particularly useful for writing type-safe helper functions that
 * take a `ctx` object.
 */
export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;
