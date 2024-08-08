/**
 * Mememo
 * @author: Jay Wang (jay@zijie.wang)
 */
import type { Table, PromiseExtended, IndexableType } from 'dexie';
type BuiltInDistanceFunction = 'cosine' | 'cosine-normalized';
interface SearchNodeCandidate {
    key: string;
    distance: number;
}
export interface MememoIndexJSON {
    distanceFunctionType: BuiltInDistanceFunction | 'custom';
    m: number;
    efConstruction: number;
    mMax0: number;
    ml: number;
    seed: number;
    useIndexedDB: boolean;
    useDistanceCache: boolean;
    entryPointKey: string | null;
    graphLayers: Record<string, Record<string, number>>[];
}
interface HNSWConfig {
    /** Distance function. */
    distanceFunction?: 'cosine' | 'cosine-normalized' | ((a: number[], b: number[]) => number);
    /** Number of decimals to store for node distances. Default: 6 */
    distancePrecision?: number;
    /** The max number of neighbors for each node. A reasonable range of m is from
     * 5 to 48. Smaller m generally produces better results for lower recalls
     * and/or lower dimensional data, while bigger m is better for high recall
     * and/or high dimensional data. */
    m?: number;
    /** The number of neighbors to consider in construction's greedy search. */
    efConstruction?: number;
    /** The number of neighbors to keep for each node at the first level. */
    mMax0?: number;
    /** Normalizer parameter controlling number of overlaps across layers. */
    ml?: number;
    /** Optional random seed. */
    seed?: number;
    /** Whether to use indexedDB. If this is false, store all embeddings in
     * the memory. Default to true.
     */
    useIndexedDB?: boolean;
}
/**
 * A node in the HNSW graph.
 */
declare class Node {
    /** The unique key of an element. */
    key: string;
    /** The embedding value of the element. */
    value: number[];
    /** Whether the node is marked as deleted. */
    isDeleted: boolean;
    constructor(key: string, value: number[]);
}
/**
 * An abstraction of a map storing nodes in memory
 */
declare class NodesInMemory {
    nodesMap: Map<string, Node>;
    shouldPreComputeDistance: boolean;
    distanceCache: Map<string, number>;
    constructor();
    size(): Promise<number>;
    has(key: string): Promise<boolean>;
    get(key: string, _level: number): Promise<Node | undefined>;
    set(key: string, value: Node): Promise<void>;
    keys(): Promise<string[]>;
    bulkSet(keys: string[], values: Node[]): Promise<void>;
    clear(): Promise<void>;
    preComputeDistance(insertKey: string): void;
}
/**
 * An abstraction of a map storing nodes in indexedDB
 */
declare class NodesInIndexedDB {
    nodesMap: Map<string, Node>;
    dbPromise: PromiseExtended<Table<Node, IndexableType>>;
    /**
     * Graph layers from the index. We need it to pre-fetch data from indexedDB
     */
    graphLayers: GraphLayer[];
    prefetchSize: number;
    hasSetPrefetchSize: boolean;
    _prefetchTimes: number;
    shouldPreComputeDistance: boolean;
    distanceCache: Map<string, number>;
    distanceCacheMaxSize: number;
    /**
     *
     * @param graphLayers Graph layers used to pre-fetch embeddings form indexedDB
     * @param prefetchSize Number of items to prefetch.
     */
    constructor(graphLayers: GraphLayer[], shouldPreComputeDistance: boolean, prefetchSize?: number, distanceCacheMaxSize?: number);
    size(): Promise<number>;
    has(key: string): Promise<boolean>;
    get(key: string, level: number): Promise<Node | undefined>;
    set(key: string, value: Node): Promise<void>;
    keys(): Promise<string[]>;
    bulkSet(keys: string[], values: Node[]): Promise<void>;
    clear(): Promise<void>;
    /**q
     * Automatically update the prefetch size based on the size of embeddings.
     * The goal is to control the memory usage under 50MB.
     * 50MB ~= 6.25M numbers (8 bytes) ~= 16k 384-dim arrays
     */
    _updateAutoPrefetchSize(embeddingDim: number): void;
    /**
     * Prefetch the embeddings of the current nodes and its neighbors from the
     * indexedDB. We use BFS prioritizing closest neighbors until hitting the
     * `this.prefetchSize` limit
     * @param key Current node key
     */
    _prefetch(key: string, level: number): Promise<void>;
    preComputeDistance(insertKey: string): void;
}
/**
 * One graph layer in the HNSW index
 */
declare class GraphLayer {
    /** The graph maps a key to its neighbor and distances */
    graph: Map<string, Map<string, number>>;
    /**
     * Initialize a new graph layer.
     * @param key The first key to insert into the graph layer.
     */
    constructor(key: string);
    toJSON(): Record<string, Record<string, number>>;
    loadJSON(graph: Record<string, Record<string, number>>): void;
}
/**
 * HNSW (Hierarchical Navigable Small World) class.
 */
export declare class HNSW {
    distanceFunction: (a: number[], b: number[], aKey: string | null, bKey: string | null) => number;
    distanceFunctionType: BuiltInDistanceFunction | 'custom';
    _distanceFunctionCallTimes: number;
    _distanceFunctionSkipTimes: number;
    useDistanceCache: boolean;
    distancePrecision: number;
    /** The max number of neighbors for each node. */
    m: number;
    /** The number of neighbors to consider in construction's greedy search. */
    efConstruction: number;
    /** The number of neighbors to keep for each node at the first level. */
    mMax0: number;
    /** Normalizer parameter controlling number of overlaps across layers. */
    ml: number;
    /** Seeded random number generator */
    seed: number;
    rng: () => number;
    /** A collection all the nodes */
    nodes: NodesInMemory | NodesInIndexedDB;
    /** A list of all layers */
    graphLayers: GraphLayer[];
    /** Current entry point of the graph */
    entryPointKey: string | null;
    useIndexedDB: boolean;
    /**
     * Constructs a new instance of the class.
     * @param config - The configuration object.
     * @param config.distanceFunction - Distance function. Default: 'cosine'
     * @param config.m -  The max number of neighbors for each node. A reasonable
     * range of m is from 5 to 48. Smaller m generally produces better results for
     * lower recalls and/or lower dimensional data, while bigger m is better for
     * high recall and/or high dimensional data. Default: 16
     * @param config.efConstruction - The number of neighbors to consider in
     * construction's greedy search. Default: 100
     * @param config.mMax0 - The maximum number of connections that a node can
     * have in the zero layer. Default 2 * m.
     * @param config.ml - Normalizer parameter. Default 1 / ln(m)
     * @param config.seed - Optional random seed.
     * @param config.useIndexedDB - Whether to use indexedDB
     * @param config.distancePrecision - How many decimals to store for distances
     */
    constructor({ distanceFunction, m, efConstruction, mMax0, ml, seed, useIndexedDB, distancePrecision }: HNSWConfig);
    /**
     * Serialize the index into a JSON string
     */
    exportIndex(): MememoIndexJSON;
    /**
     * Load HNSW index from a JSON object. Note that the nodes' embeddings ARE NOT
     * loaded. You need to call insertSkipIndexing() to insert node embeddings
     * AFTER this call.
     * @param mememoIndex JSON format of the created index
     */
    loadIndex(mememoIndex: MememoIndexJSON): void;
    /**
     * Insert a new element to the index.
     * @param key Key of the new element.
     * @param value The embedding of the new element to insert.
     * @param maxLevel The max layer to insert this element. You don't need to set
     * this value in most cases. We add this parameter for testing purpose.
     */
    insert(key: string, value: number[], maxLevel?: number | undefined): Promise<void>;
    /**
     * Insert new elements to the index.
     * @param keys Key of the new elements.
     * @param values The embeddings of the new elements to insert.
     * @param maxLevel The max layer to insert this element. You don't need to set
     * this value in most cases. We add this parameter for testing purpose.
     */
    bulkInsert(keys: string[], values: number[][], maxLevels?: number[]): Promise<void>;
    /**
     * Insert a new element's embedding to the index. It assumes this element is
     * already in the index.
     * @param key Key of the new element.
     * @param value The embedding of the new element to insert.
     */
    insertSkipIndex(key: string, value: number[]): Promise<void>;
    /**
     * Insert new elements' embeddings to the index. It assumes elements are
     * already in the index.
     * @param keys Key of the new elements.
     * @param values The embeddings of the new elements to insert.
     */
    bulkInsertSkipIndex(keys: string[], values: number[][]): Promise<void>;
    /**
     * Helper function to insert the new element to the graphs
     * @param key Key of the new element
     * @param value Embeddings of the new element
     * @param level Max level for this insert
     */
    _insertToGraph(key: string, value: number[], level: number): Promise<void>;
    /**
     * Update an element in the index
     * @param key Key of the element.
     * @param value The new embedding of the element
     */
    update(key: string, value: number[]): Promise<void>;
    /**
     * Mark an element in the index as deleted.
     * This function does not delete the node from memory, but just remove it from
     * query result in the future. Future queries can still use this node to reach
     * other nodes. Future insertions will not add new edge to this node.
     *
     * See https://github.com/nmslib/hnswlib/issues/4 for discussion on the
     * challenges of deleting items in HNSW
     *
     * @param key Key of the node to delete
     */
    markDeleted(key: string): Promise<void>;
    /**
     * UnMark a deleted element in the index.
     *
     * See https://github.com/nmslib/hnswlib/issues/4 for discussion on the
     * challenges of deleting items in HNSW
     *
     * @param key Key of the node to recover
     */
    unMarkDeleted(key: string): Promise<void>;
    /**
     * Reset the index.
     */
    clear(): Promise<void>;
    /**
     * Find k nearest neighbors of the query point
     * @param value Embedding value
     * @param k k nearest neighbors of the query value
     * @param ef Number of neighbors to search at each step
     */
    query(value: number[], k?: number | undefined, ef?: number | undefined): Promise<{
        keys: string[];
        distances: number[];
    }>;
    /**
     * Re-index an existing element's outgoing edges by repeating the insert()
     * algorithm (without updating its neighbor's edges)
     * @param key Key of an existing element
     * @param value Embedding value of an existing element
     */
    _reIndexNode(key: string, value: number[]): Promise<void>;
    /**
     * Greedy search the closest neighbor in a layer.
     * @param queryKey The key of the query
     * @param queryValue The embedding value of the query
     * @param entryPointKey Current entry point of this layer
     * @param entryPointDistance Distance between query and entry point
     * @param level Current graph layer level
     * @param canReturnDeletedNodes Whether to return deleted nodes
     */
    _searchLayerEF1(queryKey: string | null, queryValue: number[], entryPointKey: string, entryPointDistance: number, level: number, canReturnDeletedNode?: boolean): Promise<{
        minNodeKey: string;
        minDistance: number;
    }>;
    /**
     * Greedy search `ef` closest points in a given layer
     * @param queryKey The key of the query
     * @param queryValue Embedding value of the query point
     * @param entryPoints Entry points of this layer
     * @param level Current layer level to search
     * @param ef Number of neighbors to consider during search
     * @param canReturnDeletedNodes Whether to return deleted nodes
     */
    _searchLayer(queryKey: string | null, queryValue: number[], entryPoints: SearchNodeCandidate[], level: number, ef: number, canReturnDeletedNodes?: boolean): Promise<SearchNodeCandidate[]>;
    /**
     * Simple heuristic to select neighbors. This function is different from
     * SELECT-NEIGHBORS-HEURISTIC in the HNSW paper. This function is based on
     * hnswlib and datasketch's implementations.
     * When selecting a neighbor, we compare the distance between selected
     * neighbors and the potential neighbor to the distance between the inserted
     * point and the potential neighbor. We favor neighbors that are further
     * away from selected neighbors to improve diversity.
     *
     * https://github.com/nmslib/hnswlib/blob/978f7137bc9555a1b61920f05d9d0d8252ca9169/hnswlib/hnswalg.h#L382
     * https://github.com/ekzhu/datasketch/blob/9973b09852a5018f23d831b1868da3a5d2ce6a3b/datasketch/hnsw.py#L832
     *
     * @param candidates Potential neighbors to select from
     * @param maxSize Max neighbors to connect to
     * @param level Current graph layer level
     */
    _selectNeighborsHeuristic(candidates: SearchNodeCandidate[], maxSize: number, level: number): Promise<SearchNodeCandidate[]>;
    /**
     * Generate a random level for a node using a exponentially decaying
     * probability distribution
     */
    _getRandomLevel(): number;
    /**
     * Helper function to get the node in the global index
     * @param key Node key
     * @param level The current graph level. Note the node's embedding is the same
     * across levels, but we need the level number to pre-fetch node / neighbor
     * embeddings from indexedDB
     */
    _getNodeInfo(key: string, level: number): Promise<Node>;
}
/**
 * Round a number to a given decimal.
 * @param {number} num Number to round
 * @param {number} decimal Decimal place
 * @returns number
 */
export declare const round: (num: number, decimal: number) => number;
export {};
