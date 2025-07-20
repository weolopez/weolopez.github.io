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
            corsProxy: 'http://localhost:8081/cors-proxy', // Local CORS proxy
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
        
        await this.initialize();
        
        // Check if repository is already cloned
        try {
            await this.pfs.stat('/repo/.git');
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