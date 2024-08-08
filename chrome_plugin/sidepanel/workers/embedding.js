var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { pipeline, env } from '@xenova/transformers';
env.allowRemoteModels = false;
export var EmbeddingModel;
(function (EmbeddingModel) {
    EmbeddingModel["gteSmall"] = "gte-small";
})(EmbeddingModel || (EmbeddingModel = {}));
// Initialize the models
const extractorMap = new Map();
/**
 * Helper function to handle calls from the main thread
 * @param e Message event
 */
self.onmessage = (e) => {
    switch (e.data.command) {
        case 'startExtractEmbedding': {
            const { model, sentences, requestID, detail, windowURL } = e.data.payload;
            startExtractEmbedding(model, sentences, requestID, detail, windowURL).then(() => { }, () => { });
            break;
        }
        default: {
            console.error('Worker: unknown message', e.data.command);
            break;
        }
    }
};
/**
 * Extract embedding from the input text
 * @param model Embedding model
 * @param text Input text
 */
export const startExtractEmbedding = (model, sentences, requestID, detail, windowURL) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Specify a custom location for TF models (need to use absolute path here)
        env.localModelPath = `${windowURL}models/`;
        if (!extractorMap.has(model)) {
            extractorMap.set(model, pipeline('feature-extraction', model));
        }
        const extractor = yield extractorMap.get(model);
        const output = yield extractor(sentences, {
            pooling: 'mean',
            normalize: true
        });
        const embeddings = [];
        const flattenEmbedding = Array.from(output.data);
        // Un-flatten the embedding output
        for (let i = 0; i < output.dims[0]; i++) {
            const curRow = flattenEmbedding.slice(i * output.dims[1], (i + 1) * output.dims[1]);
            embeddings.push(curRow);
        }
        // Send result to the main thread
        const message = {
            command: 'finishExtractEmbedding',
            payload: {
                model,
                requestID,
                detail,
                sentences,
                embeddings
            }
        };
        postMessage(message);
    }
    catch (error) {
        console.error(error);
        // Send error to the main thread
        const message = {
            command: 'error',
            payload: {
                message: `Failed to extract embeddings with error: ${Error}`,
                originalCommand: 'startExtractEmbedding',
                requestID
            }
        };
        postMessage(message);
    }
});
