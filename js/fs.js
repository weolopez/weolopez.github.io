import { Octokit } from "https://esm.sh/octokit";
import { getGithubFile, saveGithubFile } from '/experiments/editor/wc/db-manager.js';

const savedConfig = JSON.parse(localStorage.getItem('github-explorer-config') || '{}');
const config = {
    owner: savedConfig.owner || 'weolopez',
    repo: savedConfig.repo || 'weolopez.github.io',
    branch: savedConfig.branch || 'fs',
    path: savedConfig.path || 'experiments/wc',
    auth: savedConfig.auth || '',
    email: savedConfig.email || 'octocat@github.com'
};
const octokit = new Octokit({ auth: config.auth });

/**
 * Retrieves a file from local cache or remote GitHub repository.
 * @param {string} path - The file path
 * @returns {Promise<Object>} The file data including content
 */
export async function getFile(path) {
    // Check local first
    let fileData = await getGithubFile(path);

    if (!fileData || fileData.status === 'synced') {
        const { data: remoteFile } = await octokit.rest.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: path,
            ref: config.branch
        });

        const content = decodeURIComponent(escape(atob(remoteFile.content)));
        fileData = {
            path,
            content,
            sha: remoteFile.sha,
            status: 'synced'
        };
        await saveGithubFile(fileData);
    }
    
    return fileData;
}

/**
 * Saves a file to the local cache and marks it as modified.
 * @param {string} path - The file path
 * @param {string} name - The file name
 * @param {string} content - The file content
 * @param {string} sha - The file SHA
 * @returns {Promise<void>}
 */
export async function setFile(path, name, content, sha) {
    await saveGithubFile({
        path,
        name,
        content,
        sha,
        status: 'modified'
    });
    window.dispatchEvent(new CustomEvent('file-list-changed'));
}