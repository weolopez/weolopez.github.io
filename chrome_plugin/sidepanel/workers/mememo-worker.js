var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { HNSW } from 'mememo';
import { timeit, splitStreamTransform, parseJSONTransform } from '@xiaohk/utils';
import Index from 'flexsearch';
import Dexie from 'dexie';
// const DEV_MODE = import.meta.env.DEV;
const POINT_THRESHOLD_INDEX = 500;
const POINT_THRESHOLD_SKIP_INDEX = 500;
// Data loading
let pendingDataPoints = [];
let loadedPointCount = 0;
let lastDrawnPoints = null;
let finishedLoadingResolve = () => { };
const finishedLoading = new Promise(resolve => {
    finishedLoadingResolve = resolve;
});
// Indexes
// const flexIndex: Flexsearch.Index = new Flexsearch.Index({
//   tokenize: 'forward'
// }) as Flexsearch.Index;
// @ts-ignore
const flexIndex = new Index({
    tokenize: 'forward'
});
let documentDBPromise = null;
const hnswIndex = new HNSW({
    distanceFunction: 'cosine-normalized',
    seed: 123,
    useIndexedDB: true,
    efConstruction: 40
});
//==========================================================================||
//                                Functions                                 ||
//==========================================================================||
/**
 * Handle message events from the main thread
 * @param e Message event
 */
self.onmessage = (e) => {
    // Stream point data
    switch (e.data.command) {
        case 'startLoadData': {
            console.log('Worker: start streaming data');
            timeit('Stream data', true);
            const { url, indexURL } = e.data.payload;
            startLoadCompressedData(url, indexURL).then(() => { }, () => { });
            break;
        }
        case 'startLexicalSearch': {
            const { query, limit, requestID } = e.data.payload;
            searchPoint(query, limit, requestID).then(() => { }, () => { });
            break;
        }
        case 'startExportIndex': {
            const indexJSON = hnswIndex.exportIndex();
            const message = {
                command: 'finishExportIndex',
                payload: {
                    indexJSON: indexJSON
                }
            };
            postMessage(message);
            break;
        }
        case 'startSemanticSearch': {
            const { requestID, embedding, topK, efSearch, maxDistance } = e.data.payload;
            semanticSearch(embedding, topK, maxDistance, efSearch, requestID).then(() => { }, () => { });
            break;
        }
        default: {
            console.error('Worker: unknown message', e.data.command);
            break;
        }
    }
};
/**
 * Start loading the text data
 * @param url URL to the zipped NDJSON file
 * @param datasetName Name of the dataset
 */
const startLoadCompressedData = (url, indexURL) => __awaiter(void 0, void 0, void 0, function* () {
    // Create a new store, clear content from previous sessions
    const myDexie = new Dexie('mememo-document-store');
    myDexie.version(1).stores({
        mememo: 'id'
    });
    const db = myDexie.table('mememo');
    documentDBPromise = db.clear().then(() => db);
    // Load the index if the url is given
    let skipIndex = false;
    if (indexURL !== undefined) {
        try {
            console.time('Load index');
            const ds = new DecompressionStream('gzip');
            const response = yield fetch(indexURL);
            const blobIn = yield response.blob();
            const streamIn = blobIn.stream().pipeThrough(ds);
            const blobOut = yield new Response(streamIn).blob();
            const indexJSON = JSON.parse(yield blobOut.text());
            hnswIndex.loadIndex(indexJSON);
            console.timeEnd('Load index');
            skipIndex = true;
        }
        catch (error) {
            console.error(error);
        }
    }
    fetch(url).then((response) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        if (!response.ok) {
            console.error('Failed to load data', response);
            return;
        }
        const reader = (_e = (_d = (_c = (_b = (_a = response.body) === null || _a === void 0 ? void 0 : _a.pipeThrough(new DecompressionStream('gzip'))) === null || _b === void 0 ? void 0 : _b.pipeThrough(new TextDecoderStream())) === null || _c === void 0 ? void 0 : _c.pipeThrough(splitStreamTransform('\n'))) === null || _d === void 0 ? void 0 : _d.pipeThrough(parseJSONTransform())) === null || _e === void 0 ? void 0 : _e.getReader();
        while (true && reader !== undefined) {
            const result = yield reader.read();
            const point = result.value;
            const done = result.done;
            if (done) {
                timeit('Stream data', true);
                pointStreamFinished();
                break;
            }
            else {
                yield processPointStream(point, skipIndex);
            }
        }
    }), () => { });
});
/**
 * Process one data point
 * @param point Loaded data point
 */
const processPointStream = (point, skipIndex) => __awaiter(void 0, void 0, void 0, function* () {
    if (documentDBPromise === null) {
        throw Error('documentDB is null');
    }
    const documentDB = yield documentDBPromise;
    const documentPoint = {
        id: String(point[0]),
        text: point[1],
        embedding: point[2]
    };
    const pointThreshold = skipIndex
        ? POINT_THRESHOLD_SKIP_INDEX
        : POINT_THRESHOLD_INDEX;
    // Index the point in flex
    pendingDataPoints.push(documentPoint);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    flexIndex.add(documentPoint.id, documentPoint.text);
    loadedPointCount += 1;
    if (pendingDataPoints.length >= pointThreshold) {
        // Batched index the documents to IndexedDB and MeMemo
        const keys = pendingDataPoints.map(d => d.id);
        const embeddings = pendingDataPoints.map(d => d.embedding);
        const documentEntries = pendingDataPoints.map(d => ({
            id: d.id,
            text: d.text
        }));
        yield documentDB.bulkPut(documentEntries);
        if (skipIndex) {
            yield hnswIndex.bulkInsertSkipIndex(keys, embeddings);
        }
        else {
            yield hnswIndex.bulkInsert(keys, embeddings);
        }
        // Notify the main thread if we have load enough data
        const result = {
            command: 'transferLoadData',
            payload: {
                isFirstBatch: lastDrawnPoints === null,
                isLastBatch: false,
                documents: pendingDataPoints.map(d => d.text),
                loadedPointCount
            }
        };
        // await new Promise<void>(resolve => {
        //   setTimeout(resolve, 100);
        // });
        postMessage(result);
        lastDrawnPoints = pendingDataPoints.slice();
        pendingDataPoints = [];
    }
});
/**
 * Construct tree and notify the main thread when finish reading all data
 */
const pointStreamFinished = () => {
    // Send any left over points
    const result = {
        command: 'transferLoadData',
        payload: {
            isFirstBatch: lastDrawnPoints === null,
            isLastBatch: true,
            documents: pendingDataPoints.map(d => d.text),
            loadedPointCount
        }
    };
    postMessage(result);
    lastDrawnPoints = pendingDataPoints.slice();
    pendingDataPoints = [];
    finishedLoadingResolve();
};
/**
 * Start a lexical query
 * @param query Query string
 * @param limit Number of query items
 */
const searchPoint = (query, limit, requestID) => __awaiter(void 0, void 0, void 0, function* () {
    if (documentDBPromise === null) {
        throw Error('documentDB is null');
    }
    const documentDB = yield documentDBPromise;
    const resultIDs = yield flexIndex.search(query, {
        limit
    });
    // Look up the indexes in indexedDB
    const results = yield documentDB.bulkGet(resultIDs);
    const documents = [];
    for (const r of results) {
        if (r !== undefined) {
            documents.push(r.text);
        }
    }
    const message = {
        command: 'finishLexicalSearch',
        payload: {
            query,
            results: documents,
            requestID
        }
    };
    postMessage(message);
});
/**
 * Semantic search relevant documents
 * @param embedding Query embedding
 * @param topK Top-k items
 * @param maxDistance Max distance threshold
 */
const semanticSearch = (embedding, topK, maxDistance, efSearch, requestID) => __awaiter(void 0, void 0, void 0, function* () {
    if (documentDBPromise === null) {
        throw Error('documentDB is null');
    }
    const documentDB = yield documentDBPromise;
    yield finishedLoading;
    const { keys, distances } = yield hnswIndex.query(embedding, topK, efSearch);
    // Batched query documents from indexedDB
    const results = yield documentDB.bulkGet(keys);
    const documents = [];
    const documentDistances = [];
    for (const [i, r] of results.entries()) {
        if (r !== undefined && distances[i] <= maxDistance) {
            documents.push(r.text);
            documentDistances.push(distances[i]);
        }
    }
    // await new Promise<void>(resolve => {
    //   setTimeout(resolve, 5000);
    // });
    const message = {
        command: 'finishSemanticSearch',
        payload: {
            embedding,
            topK,
            requestID,
            maxDistance,
            efSearch,
            documents,
            documentDistances
        }
    };
    postMessage(message);
});
