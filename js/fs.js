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
 * Ensures path doesn't have leading slashes or protocol prefixes.
 * Correctly extracts relative path from full GitHub URLs.
 * @param {string} path 
 * @returns {string}
 */
export function normalizePath(path) {
    if (!path) return '';
    // Strip http/https if accidentally passed as a full URL
    if (path.startsWith('http') || path.startsWith('//')) {
        try {
            const url = new URL(path);
            let pathname = url.pathname;

            // Handle raw.githubusercontent.com/OWNER/REPO/BRANCH/PATH
            if (url.hostname === 'raw.githubusercontent.com') {
                const prefix = `/${config.owner}/${config.repo}/${config.branch}/`;
                if (pathname.startsWith(prefix)) {
                    return pathname.slice(prefix.length);
                }
            }

            // Handle github.com/OWNER/REPO/blob/BRANCH/PATH
            if (url.hostname === 'github.com') {
                const prefix = `/${config.owner}/${config.repo}/`;
                if (pathname.startsWith(prefix)) {
                    let rest = pathname.slice(prefix.length);
                    // Remove blob/BRANCH/, tree/BRANCH/, or raw/BRANCH/
                    rest = rest.replace(/^(blob|tree|raw)\/[^\/]+\//, '');
                    // Handle rare refs/heads/BRANCH/ case
                    rest = rest.replace(/^refs\/heads\/[^\/]+\//, '');
                    // Handle just /BRANCH/ case (rare for github.com UI but possible in API)
                    if (rest.startsWith(`/${config.branch}/`)) {
                        rest = rest.slice(config.branch.length + 2); // +2 for slashes
                    }
                    return rest;
                }
            }

            // Handle API URLs (api.github.com/repos/OWNER/REPO/contents/PATH)
            if (pathname.includes('/contents/')) {
                return pathname.split('/contents/')[1];
            }

            // aggressive fallback: if path contains repo name, strip up to it
            if (pathname.includes(`/${config.repo}/`)) {
                let chopped = pathname.split(`/${config.repo}/`)[1];
                // Remove branch if present at start
                if (chopped.startsWith(`${config.branch}/`)) {
                    chopped = chopped.slice(config.branch.length + 1);
                } else if (chopped.startsWith(`refs/heads/${config.branch}/`)) {
                    chopped = chopped.replace(`refs/heads/${config.branch}/`, '');
                }
                return chopped;
            }

            // If we couldn't match specific patterns, return pathname (stripped of leading / at end of fn)
            path = pathname;

        } catch(e) {
            console.warn('normalizePath error:', e);
        }
    }
    // Remove leading slashes and whitespace
    return path.replace(/^\/+/, '').trim();
}

/**
 * Retrieves a file from local cache or remote GitHub repository.
 * @param {string} rawPath - The file path
 * @returns {Promise<Object>} The file data including content
 */
export async function getFile(rawPath) {
    const path = normalizePath(rawPath);

    // Check local first
    let fileData = await getGithubFile(path);

    if (!fileData || fileData.status === 'synced') {
        try {
            const { data: remoteFile } = await octokit.rest.repos.getContent({
                owner: config.owner,
                repo: config.repo,
                path: path,
                ref: config.branch
            });

            if (Array.isArray(remoteFile)) {
                throw new Error(`Path ${path} is a directory, not a file.`);
            }

            let content = '';
            // Handle base64 content from GitHub API
            if (remoteFile.content) {
                try {
                    // Normalize newlines for consistent editing
                    const rawContent = atob(remoteFile.content.replace(/\s/g, ''));
                    content = decodeURIComponent(escape(rawContent));
                } catch (error) {
                    console.error(`Failed to decode file content for ${path}:`, error);
                    content = remoteFile.content; // Fallback to raw if decoding fails
                }
            }

            fileData = {
                path,
                name: remoteFile.name || path.split('/').pop(),
                content,
                sha: remoteFile.sha,
                status: 'synced',
                type: 'file'
            };
            await saveGithubFile(fileData);
        } catch (err) {
            console.error(`FS: Error fetching ${path}`, err);
            // If strictly needed, rethrow or return null
            throw err;
        }
    }
    
    return fileData;
}

/**
 * Saves a file to the local cache and marks it as modified.
 * @param {string} rawPath - The file path
 * @param {string} name - The file name
 * @param {string} content - The file content
 * @param {string} sha - The file SHA
 * @returns {Promise<void>}
 */
export async function setFile(rawPath, name, content, sha) {
    const path = normalizePath(rawPath);
    await saveGithubFile({
        path,
        name,
        content,
        sha,
        status: 'modified'
    });
    window.dispatchEvent(new CustomEvent('file-list-changed'));
}

/**
 * Saves a file directly to GitHub (and updates local cache).
 * Handles SHA lookup to prevent "sha not supplied" errors.
 * @param {string} rawPath 
 * @param {string} content 
 * @param {string} message 
 */
export async function saveFileToGithub(rawPath, content, message = 'Update file via Config Editor') {
    const path = normalizePath(rawPath);
    const name = path.split('/').pop();
    
    // 1. Try to find SHA from local cache first
    let sha = null;
    const local = await getGithubFile(path);
    if (local && local.sha) {
        sha = local.sha;
    } else {
        // 2. If not in cache, check remote to see if it exists (to get SHA for update)
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: config.owner,
                repo: config.repo,
                path: path,
                ref: config.branch
            });
            if (!Array.isArray(data)) {
                sha = data.sha;
            }
        } catch (e) {
            // Ignore 404 (file doesn't exist yet, so no SHA needed)
            if (e.status !== 404) {
                 console.warn("Error checking remote file existence:", e);
            }
        }
    }

    try {
        // 3. Push to GitHub
        const result = await octokit.rest.repos.createOrUpdateFileContents({
            owner: config.owner,
            repo: config.repo,
            path: path,
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha: sha, // Undefined/null for new files
            branch: config.branch,
            committer: {
                name: config.owner,
                email: config.email
            }
        });

        // 4. Update local cache as 'synced'
        await saveGithubFile({
            path,
            name,
            content,
            sha: result.data.content.sha,
            status: 'synced',
            lastSynced: Date.now()
        });
        
        window.dispatchEvent(new CustomEvent('file-list-changed'));
        return result.data;

    } catch (error) {
        console.error("GitHub Save Failed:", error);
        // Fallback: Ensure it's saved locally as modified so user can try syncing later via Explorer
        await setFile(path, name, content, sha); 
        throw error;
    }
}