export class GitFileSystemService {
    constructor() {
        this.fs = null;
        this.pfs = null; // promises filesystem
        this.git = null;
        this.http = null;
        this.initialized = false;
        this.initPromise = null;
        
        // Git repository config
        this.repoConfig = {
            url: '', // Remote repository URL
            dir: '/repo', // Local directory in LightningFS
            corsProxy: 'https://weolopez.com/cors-proxy', // Local CORS proxy
            fallbackCorsProxy: 'https://cors.isomorphic-git.org', // Fallback CORS proxy
            author: {
                name: 'Finder User',
                email: 'user@finder.local'
            },
            token: '', // GitHub personal access token
            branch: 'main',
            isRemoteRepo: false
        };
    }

    async initialize() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            // Load all dependencies as ES modules
            const [LightningFSModule, gitModule, httpModule] = await Promise.all([
                import('https://unpkg.com/@isomorphic-git/lightning-fs@4.6.0/dist/lightning-fs.min.js'),
                import('https://unpkg.com/isomorphic-git@1.25.0/index.umd.min.js'),
                import('https://unpkg.com/isomorphic-git@1.25.0/http/web/index.js')
            ]);

            // Extract the actual classes/functions (handle different module formats)
            this.LightningFS = LightningFSModule.default || LightningFSModule.LightningFS || window.LightningFS;
            this.git = gitModule.default || gitModule.git || window.git;
            this.http = httpModule.default;

            if (!this.LightningFS) {
                throw new Error('LightningFS not available');
            }

            // Initialize filesystem
            this.fs = new this.LightningFS('finder-fs');
            this.pfs = this.fs.promises;

            // Setup initial directory structure
            await this.setupInitialStructure();
            this.initialized = true;
            
            console.log('✅ GitFileSystemService initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize GitFileSystemService:', error);
            throw error;
        }
    }

    async initializeRepository(repoUrl, token, branch = 'main') {
        this.repoConfig.url = repoUrl;
        this.repoConfig.token = token;
        this.repoConfig.branch = branch;
        this.repoConfig.isRemoteRepo = true;
        
        // Generate a unique directory for this repository
        this.repoConfig.dir = this.generateRepoDirectory(repoUrl, branch);
        console.log('📁 Using repository directory:', this.repoConfig.dir);
        
        await this.initialize();
        
        // Check if repository is already cloned
        try {
            await this.pfs.stat(`${this.repoConfig.dir}/.git`);
            console.log('📂 Repository already exists, fetching latest changes...');
            try {
                await this.fetchRemote();
            } catch (error) {
                console.warn('⚠️ Failed to fetch remote changes:', error);
                // Continue anyway, we can work with the existing local copy
            }
        } catch (error) {
            console.log('📥 Cloning repository...');
            await this.cloneRepository();
        }
        
        console.log('✅ Remote repository initialized successfully');
    }

    async testCorsProxy() {
        try {
            // Test if local CORS proxy is working
            const testResponse = await fetch(`${this.repoConfig.corsProxy}/https://api.github.com`);
            if (testResponse.ok || testResponse.status === 404) {
                console.log('✅ Local CORS proxy is working');
                return this.repoConfig.corsProxy;
            }
        } catch (error) {
            console.warn('⚠️ Local CORS proxy not available, using fallback');
        }
        
        // Fallback to external proxy
        this.repoConfig.corsProxy = this.repoConfig.fallbackCorsProxy;
        return this.repoConfig.corsProxy;
    }

    generateRepoDirectory(repoUrl, branch = 'main') {
        try {
            // Create a unique directory name based on repository URL and branch
            const url = new URL(repoUrl);
            const pathname = url.pathname.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
            const repoName = pathname.replace(/\.git$/, ''); // Remove .git extension
            const safeName = repoName.replace(/[^a-zA-Z0-9_-]/g, '_'); // Make filesystem-safe
            
            // Include branch if not main/master to avoid conflicts
            if (branch && branch !== 'main' && branch !== 'master') {
                return `/repo_${safeName}_${branch}`;
            }
            
            return `/repo_${safeName}`;
        } catch (error) {
            // Fallback to hash if URL parsing fails
            const hash = btoa(repoUrl + '#' + branch).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
            return `/repo_${hash}`;
        }
    }

    // Helper method to convert finder paths to actual filesystem paths
    getActualPath(finderPath) {
        if (!this.repoConfig.isRemoteRepo) {
            console.log(`🔗 Local repo: ${finderPath} -> ${finderPath}`);
            return finderPath;
        }
        
        let actualPath;
        if (finderPath === '/') {
            actualPath = this.repoConfig.dir;
        } else {
            const relativePath = finderPath.startsWith('/') ? finderPath.slice(1) : finderPath;
            actualPath = `${this.repoConfig.dir}/${relativePath}`;
        }
        
        console.log(`🔗 Remote repo: ${finderPath} -> ${actualPath} (repo dir: ${this.repoConfig.dir})`);
        return actualPath;
    }

    async cloneRepository() {
        if (!this.repoConfig.url) {
            throw new Error('Repository URL not configured');
        }

        try {
            // Test CORS proxy before cloning
            const corsProxy = await this.testCorsProxy();

            await this.git.clone({
                fs: this.fs,
                http: this.http,
                dir: this.repoConfig.dir,
                corsProxy: corsProxy,
                url: this.repoConfig.url,
                ref: this.repoConfig.branch,
                singleBranch: true,
                depth: 1, // Shallow clone for faster initial load
                headers: this.repoConfig.token ? {
                    Authorization: `token ${this.repoConfig.token}`
                } : {}
            });
            
            console.log('✅ Repository cloned successfully');
        } catch (error) {
            console.error('❌ Failed to clone repository:', error);
            throw new Error(`Failed to clone repository: ${error.message}`);
        }
    }

    async fetchRemote() {
        if (!this.repoConfig.url || !this.repoConfig.isRemoteRepo) {
            return; // Skip fetch for local-only repos
        }

        try {
            await this.git.fetch({
                fs: this.fs,
                http: this.http,
                dir: this.repoConfig.dir,
                corsProxy: this.repoConfig.corsProxy,
                url: this.repoConfig.url,
                ref: this.repoConfig.branch,
                headers: this.repoConfig.token ? {
                    Authorization: `token ${this.repoConfig.token}`
                } : {}
            });
            
            console.log('✅ Repository fetched successfully');
        } catch (error) {
            console.warn('⚠️ Failed to fetch from remote:', error);
            // Don't throw here - we can still work with local copy
        }
    }

    async commitAndPush(message = 'Update from Finder') {
        if (!this.repoConfig.isRemoteRepo) {
            console.log('ℹ️ Local repository, skipping push operation');
            return;
        }

        try {
            // Stage all changes
            const statusMatrix = await this.git.statusMatrix({
                fs: this.fs,
                dir: this.repoConfig.dir
            });
            
            let hasChanges = false;
            for (const [filepath, , worktreeStatus] of statusMatrix) {
                if (worktreeStatus === 1) { // Modified
                    await this.git.add({
                        fs: this.fs,
                        dir: this.repoConfig.dir,
                        filepath
                    });
                    hasChanges = true;
                }
            }

            if (!hasChanges) {
                console.log('ℹ️ No changes to commit');
                return null;
            }

            // Commit changes
            const sha = await this.git.commit({
                fs: this.fs,
                dir: this.repoConfig.dir,
                author: this.repoConfig.author,
                message
            });

            // Push to remote
            await this.git.push({
                fs: this.fs,
                http: this.http,
                dir: this.repoConfig.dir,
                corsProxy: this.repoConfig.corsProxy,
                remote: 'origin',
                ref: this.repoConfig.branch,
                headers: this.repoConfig.token ? {
                    Authorization: `token ${this.repoConfig.token}`
                } : {}
            });

            console.log('✅ Changes committed and pushed:', sha);
            return sha;
        } catch (error) {
            console.error('❌ Failed to commit and push:', error);
            throw new Error(`Failed to commit and push: ${error.message}`);
        }
    }

    async getFileGitStatus(filepath) {
        if (!this.repoConfig.isRemoteRepo) {
            return 'untracked'; // Local files are not tracked
        }

        try {
            const status = await this.git.status({
                fs: this.fs,
                dir: this.repoConfig.dir,
                filepath
            });
            return status; // Returns status like "unmodified", "modified", etc.
        } catch (error) {
            return 'unknown';
        }
    }

    async getDirectoryContents(path) {
        await this.initialize();
        
        const actualPath = this.getActualPath(path);
        console.log(`🔍 Getting directory contents for finder path: "${path}" -> actual path: "${actualPath}"`);
        
        try {
            const entries = await this.pfs.readdir(actualPath);
            console.log(`📁 Found ${entries.length} entries in ${actualPath}:`, entries);
            const contents = [];

            for (const entry of entries) {
                // Skip .git directory and metadata files
                if (entry === '.git' || entry.endsWith('.metadata.json')) continue;
                
                const entryPath = `${actualPath}/${entry}`;
                
                let stats;
                try {
                    stats = await this.pfs.stat(entryPath);
                } catch (error) {
                    console.warn(`⚠️ Skipping entry "${entry}" due to stat error:`, error.message);
                    // Skip broken symlinks or inaccessible entries
                    continue;
                }

                // Get git status for this file (relative to repo root)
                let gitStatus = 'untracked';
                if (this.repoConfig.isRemoteRepo) {
                    const relativePath = path === '/' ? entry : `${path.slice(1)}/${entry}`;
                    gitStatus = await this.getFileGitStatus(relativePath);
                }

                // Check for metadata file
                let metadata = {};
                try {
                    const metadataPath = `${entryPath}.metadata.json`;
                    const metadataContent = await this.pfs.readFile(metadataPath, 'utf8');
                    metadata = JSON.parse(metadataContent);
                } catch (error) {
                    // No metadata file, use defaults
                }

                contents.push({
                    name: entry,
                    type: stats.isDirectory() ? 'folder' : 'file',
                    path: path === '/' ? `/${entry}` : `${path}/${entry}`,
                    size: stats.isFile() ? stats.size : 0,
                    modified: new Date(stats.mtime),
                    created: new Date(stats.birthtime || stats.mtime),
                    gitStatus, // Add git status to file info
                    ...metadata // Include any stored metadata (like app configs)
                });
            }

            console.log(`✅ Returning ${contents.length} items for path "${path}"`);
            return contents;
        } catch (error) {
            console.error(`❌ Failed to read directory "${actualPath}":`, error);
            if (error.code === 'ENOENT') {
                throw new Error(`Directory not found: ${path} (actual path: ${actualPath})`);
            }
            throw error;
        }
    }

    async createFolder(parentPath, name, autoCommit = false) {
        await this.initialize();
        
        const actualParentPath = this.getActualPath(parentPath);
        const actualNewPath = `${actualParentPath}/${name}`.replace('//', '/');

        try {
            await this.pfs.mkdir(actualNewPath);
            
            const result = {
                name,
                type: 'folder',
                path: parentPath === '/' ? `/${name}` : `${parentPath}/${name}`,
                size: 0,
                modified: new Date(),
                created: new Date()
            };
            
            if (autoCommit && this.repoConfig.isRemoteRepo) {
                await this.commitAndPush(`Create folder ${name}`);
            }
            
            return result;
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw new Error(`Item already exists: ${name}`);
            }
            throw error;
        }
    }

    async createFile(parentPath, name, content = '', autoCommit = false) {
        await this.initialize();
        
        const actualParentPath = this.getActualPath(parentPath);
        const actualNewPath = `${actualParentPath}/${name}`.replace('//', '/');

        try {
            await this.pfs.writeFile(actualNewPath, content, 'utf8');
            const stats = await this.pfs.stat(actualNewPath);

            const result = {
                name,
                type: 'file',
                path: parentPath === '/' ? `/${name}` : `${parentPath}/${name}`,
                size: stats.size,
                modified: new Date(stats.mtime),
                created: new Date(stats.birthtime || stats.mtime),
                content
            };
            
            if (autoCommit && this.repoConfig.isRemoteRepo) {
                await this.commitAndPush(`Add ${name}`);
            }
            
            return result;
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw new Error(`File already exists: ${name}`);
            }
            throw error;
        }
    }

    async deleteItem(path) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        
        try {
            const stats = await this.pfs.stat(actualPath);

            if (stats.isDirectory()) {
                // Recursive delete for directories
                await this.recursiveDelete(actualPath);
            } else {
                await this.pfs.unlink(actualPath);
                // Also delete metadata file if it exists
                try {
                    await this.pfs.unlink(`${actualPath}.metadata.json`);
                } catch (e) {
                    // Metadata file doesn't exist, ignore
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${path}`);
            }
            throw error;
        }
    }

    async recursiveDelete(dirPath) {
        const entries = await this.pfs.readdir(dirPath);

        for (const entry of entries) {
            const entryPath = `${dirPath}/${entry}`;
            const stats = await this.pfs.stat(entryPath);

            if (stats.isDirectory()) {
                await this.recursiveDelete(entryPath);
            } else {
                await this.pfs.unlink(entryPath);
            }
        }

        await this.pfs.rmdir(dirPath);
    }

    async renameItem(path, newName) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const newPath = `${parentPath}/${newName}`.replace('//', '/');
        const actualNewPath = this.getActualPath(newPath);

        try {
            await this.pfs.rename(actualPath, actualNewPath);

            // Also rename metadata file if it exists
            try {
                await this.pfs.rename(`${actualPath}.metadata.json`, `${actualNewPath}.metadata.json`);
            } catch (e) {
                // Metadata file doesn't exist, ignore
            }

            const stats = await this.pfs.stat(actualNewPath);
            return {
                name: newName,
                type: stats.isDirectory() ? 'folder' : 'file',
                path: newPath,
                size: stats.isFile() ? stats.size : 0,
                modified: new Date(stats.mtime)
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${path}`);
            }
            if (error.code === 'EEXIST') {
                throw new Error(`Item already exists: ${newName}`);
            }
            throw error;
        }
    }

    async moveItem(fromPath, toPath) {
        await this.initialize();
        const actualFromPath = this.getActualPath(fromPath);
        const actualToPath = this.getActualPath(toPath);
        try {
            await this.pfs.rename(actualFromPath, actualToPath);

            // Also move metadata file if it exists
            try {
                await this.pfs.rename(`${actualFromPath}.metadata.json`, `${actualToPath}.metadata.json`);
            } catch (e) {
                // Metadata file doesn't exist, ignore
            }

            const stats = await this.pfs.stat(actualToPath);
            const name = toPath.split('/').pop();

            return {
                name,
                type: stats.isDirectory() ? 'folder' : 'file',
                path: toPath,
                size: stats.isFile() ? stats.size : 0,
                modified: new Date(stats.mtime)
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${fromPath}`);
            }
            if (error.code === 'EEXIST') {
                throw new Error(`Destination already exists: ${toPath}`);
            }
            throw error;
        }
    }

    async duplicateItem(path, newName) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const newPath = `${parentPath}/${newName}`.replace('//', '/');
        const actualNewPath = this.getActualPath(newPath);

        try {
            const stats = await this.pfs.stat(actualPath);

            if (stats.isDirectory()) {
                await this.recursiveCopy(actualPath, actualNewPath);
            } else {
                const content = await this.pfs.readFile(actualPath);
                await this.pfs.writeFile(actualNewPath, content);

                // Copy metadata file if it exists
                try {
                    const metadata = await this.pfs.readFile(`${actualPath}.metadata.json`, 'utf8');
                    await this.pfs.writeFile(`${actualNewPath}.metadata.json`, metadata);
                } catch (e) {
                    // Metadata file doesn't exist, ignore
                }
            }

            const newStats = await this.pfs.stat(actualNewPath);
            return {
                name: newName,
                type: newStats.isDirectory() ? 'folder' : 'file',
                path: newPath,
                size: newStats.isFile() ? newStats.size : 0,
                modified: new Date(newStats.mtime)
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${path}`);
            }
            if (error.code === 'EEXIST') {
                throw new Error(`Item already exists: ${newName}`);
            }
            throw error;
        }
    }

    async recursiveCopy(sourcePath, destPath) {
        await this.pfs.mkdir(destPath);
        const entries = await this.pfs.readdir(sourcePath);

        for (const entry of entries) {
            const sourceEntryPath = `${sourcePath}/${entry}`;
            const destEntryPath = `${destPath}/${entry}`;
            const stats = await this.pfs.stat(sourceEntryPath);

            if (stats.isDirectory()) {
                await this.recursiveCopy(sourceEntryPath, destEntryPath);
            } else {
                const content = await this.pfs.readFile(sourceEntryPath);
                await this.pfs.writeFile(destEntryPath, content);
            }
        }
    }

    async searchFiles(query, basePath = '/') {
        await this.initialize();
        const results = [];
        await this.recursiveSearch(basePath, query.toLowerCase(), results);
        return results;
    }

    async recursiveSearch(dirPath, searchTerm, results) {
        try {
            const entries = await this.pfs.readdir(dirPath);

            for (const entry of entries) {
                // Skip metadata files
                if (entry.endsWith('.metadata.json')) continue;
                
                const entryPath = `${dirPath}/${entry}`.replace('//', '/');
                const stats = await this.pfs.stat(entryPath);

                if (entry.toLowerCase().includes(searchTerm)) {
                    results.push({
                        name: entry,
                        type: stats.isDirectory() ? 'folder' : 'file',
                        path: entryPath,
                        size: stats.isFile() ? stats.size : 0,
                        modified: new Date(stats.mtime)
                    });
                }

                if (stats.isDirectory()) {
                    await this.recursiveSearch(entryPath, searchTerm, results);
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
    }

    async getItemInfo(path) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        try {
            const stats = await this.pfs.stat(actualPath);
            const name = path.split('/').pop();

            // Load metadata if available
            let metadata = {};
            try {
                const metadataContent = await this.pfs.readFile(`${actualPath}.metadata.json`, 'utf8');
                metadata = JSON.parse(metadataContent);
            } catch (e) {
                // No metadata file
            }

            return {
                name,
                type: stats.isDirectory() ? 'folder' : 'file',
                path,
                size: stats.isFile() ? stats.size : 0,
                modified: new Date(stats.mtime),
                created: new Date(stats.birthtime || stats.mtime),
                permissions: 'read-write', // LightningFS doesn't have real permissions
                ...metadata
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${path}`);
            }
            throw error;
        }
    }

    async updateItemUrl(path, newUrl) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        try {
            // Load existing metadata or create new
            let metadata = {};
            try {
                const existing = await this.pfs.readFile(`${actualPath}.metadata.json`, 'utf8');
                metadata = JSON.parse(existing);
            } catch (e) {
                // No existing metadata
            }

            // Update URL
            metadata.url = newUrl;

            // Save metadata
            await this.pfs.writeFile(`${actualPath}.metadata.json`, JSON.stringify(metadata, null, 2), 'utf8');

            const stats = await this.pfs.stat(actualPath);
            const name = path.split('/').pop();

            return {
                name,
                type: stats.isDirectory() ? 'folder' : 'file',
                path,
                size: stats.isFile() ? stats.size : 0,
                modified: new Date(stats.mtime),
                url: newUrl
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Item not found: ${path}`);
            }
            throw error;
        }
    }

    async readFileContent(path, options = {}) {
        await this.initialize();
        const actualPath = this.getActualPath(path);
        
        const {
            maxSize = 10 * 1024 * 1024, // 10MB default limit
            encoding = 'auto', // 'auto', 'utf8', 'binary', 'base64'
            timeout = 5000 // 5 second timeout
        } = options;

        try {
            const stats = await this.pfs.stat(actualPath);
            
            if (stats.isDirectory()) {
                throw new Error('Cannot read content of directory');
            }

            if (stats.size > maxSize) {
                return {
                    success: false,
                    reason: 'file_too_large',
                    size: stats.size,
                    maxSize,
                    message: `File size (${this.formatBytes(stats.size)}) exceeds maximum allowed size (${this.formatBytes(maxSize)})`
                };
            }

            // Set up timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('File read timeout')), timeout);
            });

            // Read file with timeout - isomorphic-git only supports 'utf8' encoding
            let readPromise;
            let content;
            let detectedEncoding = encoding;
            let isBinary = false;
            
            if (encoding === 'auto') {
                // For auto-detection, try to read as UTF-8 first
                try {
                    readPromise = this.pfs.readFile(actualPath, 'utf8');
                    content = await Promise.race([readPromise, timeoutPromise]);
                    detectedEncoding = 'utf8';
                    
                    // Check if this looks like binary content despite being read as UTF-8
                    isBinary = this.isBinaryContent(content);
                    
                } catch (utf8Error) {
                    // If UTF-8 reading fails, treat as binary and read as buffer
                    console.log('UTF-8 read failed, treating as binary:', utf8Error.message);
                    isBinary = true;
                    
                    // For binary files, we need to read the raw buffer differently
                    // Since isomorphic-git doesn't support binary mode, we'll work with what we have
                    content = null;
                    detectedEncoding = 'binary';
                }
            } else {
                // For explicit encoding, use it directly (should be 'utf8')
                readPromise = this.pfs.readFile(actualPath, encoding);
                content = await Promise.race([readPromise, timeoutPromise]);
            }

            // Process the content based on detection
            let finalContent = content;

            if (encoding === 'auto' && isBinary && content !== null) {
                // For binary content that was read as UTF-8, we can't properly convert it
                // Return a reference instead of trying to process corrupted binary data
                return {
                    success: false,
                    reason: 'binary_file_detected',
                    isBinary: true,
                    encoding: 'binary',
                    message: 'Binary file detected - content not suitable for text processing'
                };
            } else if (encoding === 'auto' && !isBinary && content !== null) {
                // Text content is already properly decoded
                finalContent = content;
                detectedEncoding = 'utf8';
            } else if (content === null) {
                // Handle case where binary file couldn't be read properly
                return {
                    success: false,
                    reason: 'binary_read_failed',
                    isBinary: true,
                    message: 'Unable to read binary file content'
                };
            }

            // Additional validation for text content
            if (!isBinary && finalContent) {
                // Ensure content is valid UTF-8 text
                if (typeof finalContent !== 'string') {
                    return {
                        success: false,
                        reason: 'invalid_text_content',
                        message: 'Content is not valid text'
                    };
                }
            }

            return {
                success: true,
                content: finalContent,
                encoding: detectedEncoding,
                size: stats.size,
                isBinary,
                stats: {
                    modified: new Date(stats.mtime),
                    created: new Date(stats.birthtime || stats.mtime)
                }
            };

        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    success: false,
                    reason: 'file_not_found',
                    message: `File not found: ${path}`
                };
            }
            
            return {
                success: false,
                reason: 'read_error',
                message: error.message,
                error: error.code || 'UNKNOWN'
            };
        }
    }

    isBinaryContent(content) {
        // Simple binary detection: check for null bytes or high ratio of non-printable characters
        const bytes = new Uint8Array(content);
        const sampleSize = Math.min(1024, bytes.length); // Check first 1KB
        let nonPrintableCount = 0;

        for (let i = 0; i < sampleSize; i++) {
            const byte = bytes[i];
            
            // Null byte = definitely binary
            if (byte === 0) return true;
            
            // Count non-printable characters (excluding common whitespace)
            if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
                nonPrintableCount++;
            }
        }

        // If more than 30% non-printable characters, consider it binary
        return (nonPrintableCount / sampleSize) > 0.3;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMimeType(filename, content = null) {
        const ext = filename.split('.').pop().toLowerCase();
        
        // Comprehensive MIME type mapping
        const mimeTypes = {
            // Text files
            'txt': 'text/plain',
            'md': 'text/markdown',
            'markdown': 'text/markdown',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'mjs': 'text/javascript',
            'ts': 'text/typescript',
            'json': 'application/json',
            'xml': 'text/xml',
            'csv': 'text/csv',
            'yaml': 'text/yaml',
            'yml': 'text/yaml',
            'toml': 'text/toml',
            'ini': 'text/plain',
            'log': 'text/plain',
            'sh': 'text/x-shellscript',
            'bash': 'text/x-shellscript',
            'zsh': 'text/x-shellscript',
            'fish': 'text/x-shellscript',
            'py': 'text/x-python',
            'rb': 'text/x-ruby',
            'php': 'text/x-php',
            'java': 'text/x-java-source',
            'c': 'text/x-c',
            'cpp': 'text/x-c++',
            'h': 'text/x-c-header',
            'go': 'text/x-go',
            'rs': 'text/x-rust',
            'swift': 'text/x-swift',
            'kt': 'text/x-kotlin',
            'scala': 'text/x-scala',
            'sql': 'text/x-sql',
            'r': 'text/x-r',
            'matlab': 'text/x-matlab',
            'm': 'text/x-matlab',

            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'avif': 'image/avif',
            'heic': 'image/heic',
            'heif': 'image/heif',

            // Audio
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'm4a': 'audio/mp4',
            'wma': 'audio/x-ms-wma',

            // Video
            'mp4': 'video/mp4',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
            'm4v': 'video/mp4',

            // Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'odt': 'application/vnd.oasis.opendocument.text',
            'ods': 'application/vnd.oasis.opendocument.spreadsheet',
            'odp': 'application/vnd.oasis.opendocument.presentation',
            'rtf': 'application/rtf',

            // Archives
            'zip': 'application/zip',
            'rar': 'application/vnd.rar',
            '7z': 'application/x-7z-compressed',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            'bz2': 'application/x-bzip2',
            'xz': 'application/x-xz',

            // Fonts
            'woff': 'font/woff',
            'woff2': 'font/woff2',
            'ttf': 'font/ttf',
            'otf': 'font/otf',
            'eot': 'application/vnd.ms-fontobject',

            // Application specific
            'exe': 'application/x-msdownload',
            'dmg': 'application/x-apple-diskimage',
            'pkg': 'application/x-newton-compatible-pkg',
            'deb': 'application/vnd.debian.binary-package',
            'rpm': 'application/x-rpm',
            'apk': 'application/vnd.android.package-archive'
        };

        let mimeType = mimeTypes[ext] || 'application/octet-stream';

        // Content-based detection for ambiguous cases
        if (content && ext === '') {
            // Try to detect based on content
            if (typeof content === 'string') {
                if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html')) {
                    mimeType = 'text/html';
                } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                    try {
                        JSON.parse(content);
                        mimeType = 'application/json';
                    } catch (e) {
                        mimeType = 'text/plain';
                    }
                } else if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) {
                    mimeType = 'text/x-shellscript';
                } else if (content.includes('#!/usr/bin/env python') || content.includes('#!/usr/bin/python')) {
                    mimeType = 'text/x-python';
                } else {
                    mimeType = 'text/plain';
                }
            }
        }

        return mimeType;
    }

    getFileCategory(mimeType) {
        if (mimeType.startsWith('text/')) return 'text';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.includes('pdf')) return 'document';
        if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
        if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed')) return 'archive';
        if (mimeType.includes('font')) return 'font';
        if (mimeType === 'application/json' || mimeType.includes('javascript')) return 'code';
        return 'binary';
    }

    shouldReadContent(mimeType, size) {
        const category = this.getFileCategory(mimeType);
        const maxSizes = {
            'text': 10 * 1024 * 1024,    // 10MB for text files
            'code': 5 * 1024 * 1024,     // 5MB for code files
            'image': 50 * 1024 * 1024,   // 50MB for images (for base64)
            'document': 100 * 1024,      // 100KB for documents (usually binary)
            'audio': 0,                  // Don't read audio content
            'video': 0,                  // Don't read video content
            'archive': 0,                // Don't read archive content
            'font': 0,                   // Don't read font content
            'binary': 0                  // Don't read binary content
        };

        return size <= (maxSizes[category] || 0);
    }

    async setupInitialStructure() {
        // Skip creating initial structure for remote repositories
        if (this.repoConfig.isRemoteRepo) {
            console.log('📁 Using remote repository structure, skipping local setup');
            return;
        }

        try {
            // Check if Desktop already exists
            await this.pfs.stat('/Desktop');
            console.log('📁 Desktop folder already exists');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📁 Creating initial directory structure...');
                
                // Create Desktop folder and subdirectories
                await this.pfs.mkdir('/Desktop');
                await this.pfs.mkdir('/Desktop/Config');

                // Create sample files
                await this.pfs.writeFile('/Desktop/Notes.txt', 'Welcome to the Finder!\n\nThis is a real filesystem powered by LightningFS.', 'utf8');
                await this.pfs.writeFile('/Desktop/Config/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a sample HTML file created by the Finder.</p>
</body>
</html>`, 'utf8');
                
                await this.pfs.writeFile('/Desktop/Config/style.css', `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 40px;
    line-height: 1.6;
}

h1 {
    color: #007AFF;
}`, 'utf8');

                await this.pfs.writeFile('/Desktop/Config/script.js', `console.log("Hello from Finder!");

// Sample JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded in Finder filesystem!');
});`, 'utf8');

                // Create application entries with metadata
                const apps = [
                    {
                        name: 'Finder',
                        metadata: {
                            id: 'finder',
                            icon: '📁',
                            sourceUrl: 'https://weolopez.com/apps/finder/finder-webapp.js',
                            tag: 'finder-webapp',
                            onstartup: false
                        }
                    },
                    {
                        name: 'Chat',
                        metadata: {
                            id: 'chat',
                            icon: '💬',
                            sourceUrl: '/chat/chat-component.js',
                            tag: 'chat-component',
                            onstartup: false
                        }
                    },
                    {
                        name: 'Notification',
                        metadata: {
                            id: 'notification',
                            icon: '🔔',
                            sourceUrl: '/apps/notification/notification-display-component.js',
                            tag: 'notification-display-component',
                            onstartup: true
                        }
                    }
                ];

                for (const app of apps) {
                    // Create app file
                    await this.pfs.writeFile(`/Desktop/${app.name}`, `# ${app.name} Application

This is a desktop application that can be launched from the Finder.

Application ID: ${app.metadata.id}
Icon: ${app.metadata.icon}
`, 'utf8');

                    // Create metadata file
                    await this.pfs.writeFile(`/Desktop/${app.name}.metadata.json`, JSON.stringify(app.metadata, null, 2), 'utf8');
                }

                console.log('✅ Initial directory structure created successfully');
            }
        }
    }
}

export class FileSystemServiceFactory {
    static async createService(repoConfig = null) {
        try {
            const gitService = new GitFileSystemService();
            
            if (repoConfig && repoConfig.url) {
                console.log('🔗 Initializing with remote repository...');
                try {
                    await gitService.initializeRepository(
                        repoConfig.url,
                        repoConfig.token,
                        repoConfig.branch
                    );
                    console.log('✅ Using Git-based filesystem with remote repository');
                } catch (error) {
                    console.error('❌ Failed to initialize remote repository:', error);
                    // Initialize without remote repo for now, user can try to reconnect
                    await gitService.initialize();
                    console.log('⚠️ Falling back to local filesystem, repository connection failed');
                }
            } else {
                await gitService.initialize();
                console.log('✅ Using LightningFS-based filesystem (local)');
            }
            
            return gitService;
        } catch (error) {
            console.warn('⚠️ Git filesystem failed, using mock filesystem:', error);
            const { FinderService } = await import('./finder-service.js');
            return new FinderService();
        }
    }
}